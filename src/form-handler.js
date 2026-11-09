// Adapted from the validated YMG Consulting Services intake Worker.
// This module is NOT connected to the live Events Worker until issue #10 is implemented.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_BODY_BYTES = 48_000;
const FORMAT_CHOICES = new Set([
  "Let's explore a partnership",
  "Rooftop evenings",
  "Live music & DJs",
  "Private celebrations",
  "A recurring nightlife series",
  "Supper Club",
  "Jazz & Cocktails",
  "Corporate Social",
]);
const GUEST_CHOICES = new Set(["Still exploring", "Under 30", "30–60", "60–100", "100+"]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
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

export function eventsNotificationSubject(name) {
  return `New YMG Events enquiry — ${subjectName(name)}`;
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

function configured(env) {
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && relayReady(env));
}

export async function handleEventsApi(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname === "/api/events/config") {
    if (request.method !== "GET") return json(405, { ready: false });
    return configured(env)
      ? json(200, { ready: true, siteKey: env.TURNSTILE_SITE_KEY })
      : json(503, { ready: false });
  }
  if (url.pathname !== "/api/events/enquiry") return json(404, { ok: false });
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
  const business = field(params, "business", 160, true);
  const format = field(params, "format", 100) || "Let's explore a partnership";
  const guests = field(params, "guests", 40) || "Still exploring";
  const timing = field(params, "timing", 300);
  const budget = field(params, "budget", 120);
  const idea = field(params, "idea", 5000);
  const token = field(params, "cf-turnstile-response", 2048, true);
  if ([name, email, business, timing, budget, idea, token].includes(null) ||
      !validEmail(email || "") || !FORMAT_CHOICES.has(format) || !GUEST_CHOICES.has(guests)) {
    return json(400, { ok: false, error: "Please check the required fields and try again." });
  }
  if (!configured(env)) return json(503, { ok: false, error: "Online submission is unavailable." });

  const verifyParams = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  const remoteIp = request.headers.get("cf-connecting-ip");
  if (remoteIp) verifyParams.set("remoteip", remoteIp);
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
    return json(503, { ok: false, error: "Spam protection is temporarily unavailable." });
  }
  if (!challenge.success || challenge.hostname !== url.hostname || challenge.action !== "events_enquiry") {
    return json(403, { ok: false, error: "Spam protection could not verify this request." });
  }

  const show = value => value || "(not provided)";
  const text = [
    "New YMG Events enquiry", "",
    `Name: ${name}`, `Reply email: ${email}`, `Venue or organisation: ${business}`,
    `Event format: ${format}`, `Guest count: ${guests}`, `Timing: ${show(timing)}`,
    `Indicative budget: ${show(budget)}`, "", "Venue or occasion details:", show(idea),
  ].join("\n");
  try {
    const response = await fetcher(env.GOOGLE_RELAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: env.GOOGLE_RELAY_SECRET,
        replyTo: email,
        subject: eventsNotificationSubject(name),
        text,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const result = response.ok ? await response.json() : null;
    if (!result || result.ok !== true) throw new Error("Relay rejected enquiry");
  } catch {
    // Do not log enquiry content, email addresses, or relay credentials.
    return json(503, { ok: false, error: "We could not send your enquiry. Please try again or email us directly." });
  }
  return json(202, { ok: true });
}
