// Adapted from the validated YMG Consulting Services intake Worker.
// Production can reuse Science through a private service binding; no secret copies.
import { eventsMetricsEnabled, recordEventsMetric } from "./event-metrics.js";
import { hasScienceIntake, scienceConfiguration, submitThroughScience, upstreamErrorCategory } from "./science-intake.js";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_BODY_BYTES = 48_000;
const FORMAT_CHOICES = new Set([
  "Let’s explore a partnership",
  "Rooftop evenings",
  "Live music & DJs",
  "Private celebrations",
  "A recurring nightlife series",
  "Supper Club",
  "Wine pairing",
  "Corporate Social",
]);
const GUEST_CHOICES = new Set(["Still exploring", "Under 30", "30–60", "60–100", "100+"]);
const INQUIRY_TYPES = new Map([
  ["venue_partnership", "Venue partnership"],
  ["corporate_event", "Corporate event"],
  ["private_celebration", "Private celebration"],
]);
const INQUIRY_SOURCES = new Map([["events_website_form", "Events website"]]);
const DEFAULT_FORMATS = new Map([
  ["venue_partnership", "Let’s explore a partnership"],
  ["corporate_event", "Corporate Social"],
  ["private_celebration", "Private celebrations"],
]);

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

async function readBoundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const parts = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Request too large");
    }
    parts.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function field(params, key, length, required = false) {
  const value = (params.get(key) || "").trim();
  return value.length > length || (required && !value) ? null : value;
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value) && !/[\r\n]/.test(value);
}

function subjectName(value) {
  const cleaned = String(value || "").normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Co}\p{Cn}]/gu, " ")
    .replace(/\s+/gu, " ").trim();
  return Array.from(cleaned).slice(0, 60).join("") || "Unnamed sender";
}

export function eventsNotificationSubject(name, intent = "venue_partnership", format = "Let’s explore a partnership") {
  const type = INQUIRY_TYPES.get(intent) || "Events inquiry";
  return `New YMG Events inquiry — ${type} — ${subjectName(format)} — ${subjectName(name)}`;
}

function relayReady(env) {
  try {
    const url = new URL(env.GOOGLE_RELAY_URL);
    return url.protocol === "https:" && url.hostname === "script.google.com" &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search &&
      Boolean(env.GOOGLE_RELAY_SECRET);
  } catch {
    return false;
  }
}

function intakeConfigured(env) {
  return Boolean(hasScienceIntake(env) || (env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && relayReady(env)));
}

function limiterConfigured(env) {
  return typeof env.EVENTS_SUBMISSION_LIMITER?.limit === "function";
}

function configured(env) {
  return intakeConfigured(env) && limiterConfigured(env);
}

/** Resolves to { config } or { category } naming the dependency that stops the form. */
async function intakeReadiness(request, env) {
  if (!intakeConfigured(env)) return { category: "config_unavailable" };
  if (hasScienceIntake(env)) return scienceConfiguration(request, env);
  return { config: { ready: true, siteKey: env.TURNSTILE_SITE_KEY } };
}

// Read-only dependency status for the hourly external check (#129). It names
// which dependency failed but carries no keys, secrets, URLs or visitor data,
// and writes no analytics, so the check never inflates the alert count.
async function healthResponse(request, env) {
  const intake = intakeConfigured(env) ? (await intakeReadiness(request, env)).category || "ok" : "not_configured";
  const limiter = limiterConfigured(env) ? "ok" : "missing";
  const metrics = eventsMetricsEnabled(env) ? "ok" : env?.EVENTS_METRICS_ENABLED === "true" ? "unavailable" : "disabled";
  const ok = intake === "ok" && limiter === "ok" && metrics !== "unavailable";
  return json(ok ? 200 : 503, { ok, checks: { intake, limiter, metrics } });
}

export async function handleEventsApi(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname === "/api/events/health") {
    if (request.method !== "GET") return json(405, { ok: false });
    return healthResponse(request, env);
  }
  if (url.pathname === "/api/events/config") {
    if (request.method !== "GET") return json(405, { ready: false });
    const readiness = limiterConfigured(env) ? await intakeReadiness(request, env) : { category: "config_unavailable" };
    if (readiness.config) return json(200, readiness.config);
    // A visitor whose form cannot load never reaches an inquiry attempt, so the
    // readiness failure is recorded on its own, with no form dimensions.
    recordEventsMetric(env, "intake_not_ready", { locale: "en", category: readiness.category });
    return json(503, { ready: false });
  }
  if (!["/api/events/inquiry", "/api/events/enquiry"].includes(url.pathname)) return json(404, { ok: false });
  if (request.method !== "POST") return json(405, { ok: false, error: "Method not allowed." });
  if (request.headers.get("origin") !== url.origin) {
    return json(403, { ok: false, error: "Request origin was not accepted." });
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return json(415, { ok: false, error: "Unsupported form encoding." });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: "Request too large." });
  }

  let params;
  try {
    params = new URLSearchParams(await readBoundedBody(request));
  } catch (error) {
    return json(error instanceof RangeError ? 413 : 400, { ok: false, error: "Unable to read this request." });
  }
  // Honeypot prevents sending, without telling automated clients which condition fired.
  if ((params.get("bot-field") || "").trim()) return json(202, { ok: true });

  const name = field(params, "name", 120, true);
  const email = field(params, "email", 254, true);
  const intent = field(params, "intent", 40, true);
  const source = field(params, "source", 40, true);
  const business = field(params, "business", 160);
  const rawFormat = field(params, "format", 100);
  const rawGuests = field(params, "guests", 40);
  const format = rawFormat === "" ? (DEFAULT_FORMATS.get(intent) || "Let’s explore a partnership") : rawFormat;
  const guests = rawGuests === "" ? "Still exploring" : rawGuests;
  const timing = field(params, "timing", 300);
  const budget = field(params, "budget", 120);
  const idea = field(params, "idea", 5000);
  const token = field(params, "cf-turnstile-response", 2048, true);
  const businessRequired = intent !== "private_celebration";
  if ([name, email, intent, source, business, rawFormat, rawGuests, timing, budget, idea, token].includes(null) ||
      !validEmail(email || "") || !INQUIRY_TYPES.has(intent || "") || !INQUIRY_SOURCES.has(source || "") ||
      (businessRequired && !business) || !FORMAT_CHOICES.has(format) || !GUEST_CHOICES.has(guests)) {
    return json(400, { ok: false, error: "Please check the required fields and try again." });
  }
  const metricDimensions = {
    locale: params.get("locale") === "it" ? "it" : "en",
    intent,
    format,
  };
  recordEventsMetric(env, "inquiry_attempt", metricDimensions);
  // Exactly one outcome point follows the attempt: an expected visitor-side
  // rejection (inquiry_failure), a dependency outage (inquiry_outage, which the
  // alert counts) or relay_accepted.
  const rejected = category => recordEventsMetric(env, "inquiry_failure", { ...metricDimensions, category });
  const outage = category => recordEventsMetric(env, "inquiry_outage", { ...metricDimensions, category });

  if (!configured(env)) {
    outage("config_unavailable");
    return json(503, { ok: false, error: "Online submission is unavailable." });
  }

  const remoteIp = request.headers.get("cf-connecting-ip");
  if (!remoteIp) {
    outage("config_unavailable");
    return json(503, { ok: false, error: "Online submission is unavailable." });
  }
  try {
    const rateLimit = await env.EVENTS_SUBMISSION_LIMITER.limit({ key: remoteIp });
    if (!rateLimit?.success) {
      rejected("rate_limited");
      return json(429, { ok: false, error: "Please wait a little before sending another inquiry, or contact us directly." }, {
        "retry-after": "60",
      });
    }
  } catch {
    // Fail closed if abuse protection is unavailable; do not log client data.
    outage("limiter_unavailable");
    return json(503, { ok: false, error: "Online submission is temporarily unavailable." });
  }

  if (hasScienceIntake(env)) {
    let result;
    try {
      result = await submitThroughScience(request, env, {
        name, email, intent: INQUIRY_TYPES.get(intent), source: INQUIRY_SOURCES.get(source),
        business, format, guests, timing, budget, idea, token, locale: metricDimensions.locale,
      });
    } catch (error) {
      result = { accepted: false, status: 0, category: upstreamErrorCategory(error) };
    }
    if (result.accepted) {
      recordEventsMetric(env, "relay_accepted", metricDimensions);
      return json(202, { ok: true });
    }
    if (result.status === 403) {
      rejected("turnstile_rejected");
      return json(403, { ok: false, error: "Spam protection could not verify this request." });
    }
    if (result.status === 400) {
      rejected("intake_rejected");
      return json(400, { ok: false, error: "We could not confirm delivery. Please try again or email us directly." });
    }
    if (result.status === 429) {
      rejected("rate_limited");
      return json(429, { ok: false, error: "Please wait a little before sending another inquiry, or contact us directly." }, {
        "retry-after": "60",
      });
    }
    // Upstream 5xx, an unexpected success shape, a timeout or a binding error.
    outage(result.category || "upstream_error");
    return json(503, { ok: false, error: "We could not confirm delivery. Please try again or email us directly." });
  }

  const verifyParams = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  verifyParams.set("remoteip", remoteIp);
  let challenge;
  try {
    const response = await fetcher(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Turnstile unreachable");
    challenge = await response.json();
  } catch {
    outage("turnstile_unavailable");
    return json(503, { ok: false, error: "Spam protection is temporarily unavailable." });
  }
  if (!challenge.success || challenge.hostname !== url.hostname || challenge.action !== "events_inquiry") {
    rejected("turnstile_rejected");
    return json(403, { ok: false, error: "Spam protection could not verify this request." });
  }

  const show = value => value || "(not provided)";
  const businessLabel = intent === "venue_partnership"
    ? "Venue or hospitality business"
    : intent === "corporate_event" ? "Company or team" : "Preferred venue or location";
  const text = [
    "New YMG Events inquiry", "",
    `Inquiry type: ${INQUIRY_TYPES.get(intent)}`,
    `Inquiry source: ${INQUIRY_SOURCES.get(source)}`,
    `Name: ${name}`, `Reply email: ${email}`, `${businessLabel}: ${show(business)}`,
    `Event format: ${format}`, `Guest count: ${guests}`, `Timing: ${show(timing)}`,
    `Indicative budget: ${show(budget)}`, "", "Venue or occasion details:", show(idea),
  ].join("\n");
  let relayCategory = null;
  try {
    const response = await fetcher(env.GOOGLE_RELAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: env.GOOGLE_RELAY_SECRET,
        replyTo: email,
        subject: eventsNotificationSubject(name, intent, format),
        text,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const result = response.ok ? await response.json().catch(() => null) : null;
    if (!result || result.ok !== true) relayCategory = "upstream_error";
  } catch (error) {
    relayCategory = upstreamErrorCategory(error);
  }
  if (relayCategory) {
    // Do not log inquiry content, email addresses, or relay credentials.
    outage(relayCategory);
    return json(503, { ok: false, error: "We could not send your inquiry. Please try again or email us directly." });
  }
  // This confirms relay acceptance only; it is not a mailbox delivery receipt.
  recordEventsMetric(env, "relay_accepted", metricDimensions);
  return json(202, { ok: true });
}
