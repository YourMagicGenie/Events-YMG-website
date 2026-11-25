const EVENTS = new Set([
  "page_view",
  "section_view",
  "concept_interest",
  "inquiry_attempt",
  "inquiry_failure",
  "inquiry_outage",
  "intake_not_ready",
  "relay_accepted",
]);
const LOCALES = new Set(["en", "it"]);
const SECTIONS = new Set(["approach", "concepts", "partners", "venue-offer", "inquire"]);
const INTENTS = new Set(["venue_partnership", "corporate_event", "private_celebration"]);
const FORMATS = new Set([
  "Let’s explore a partnership",
  "Rooftop evenings",
  "Live music & DJs",
  "Private celebrations",
  "A recurring nightlife series",
  "Supper Club",
  "Wine pairing",
  "Corporate Social",
]);
// Inquiry outcome taxonomy (#129). Each valid inquiry attempt ends in exactly
// one of: relay_accepted, inquiry_failure (an expected visitor-side
// rejection) or inquiry_outage (a dependency or upstream failure; the alert
// counts these). intake_not_ready is a readiness signal from the config
// endpoint, written before any attempt exists.
export const REJECTION_CATEGORIES = new Set([
  "rate_limited",
  "turnstile_rejected",
  "intake_rejected",
]);
export const OUTAGE_CATEGORIES = new Set([
  "config_unavailable",
  "limiter_unavailable",
  "turnstile_unavailable",
  "upstream_error",
  "upstream_timeout",
  "upstream_unavailable",
]);
const READINESS_CATEGORIES = new Set([
  "config_unavailable",
  "upstream_error",
  "upstream_timeout",
  "upstream_unavailable",
]);
const FAILURE_CATEGORIES = new Set([...REJECTION_CATEGORIES, ...OUTAGE_CATEGORIES]);
const EMPTY = "";

export function eventsMetricsEnabled(env) {
  return env?.EVENTS_METRICS_ENABLED === "true" &&
    typeof env.EVENTS_ANALYTICS?.writeDataPoint === "function" &&
    typeof env.EVENTS_METRICS_LIMITER?.limit === "function";
}

function normalizeMetric(event, dimensions = {}) {
  if (!EVENTS.has(event)) return null;
  const locale = LOCALES.has(dimensions.locale) ? dimensions.locale : null;
  const section = dimensions.section === EMPTY || dimensions.section === undefined || SECTIONS.has(dimensions.section)
    ? dimensions.section || EMPTY : null;
  const intent = dimensions.intent === EMPTY || dimensions.intent === undefined || INTENTS.has(dimensions.intent)
    ? dimensions.intent || EMPTY : null;
  const format = dimensions.format === EMPTY || dimensions.format === undefined || FORMATS.has(dimensions.format)
    ? dimensions.format || EMPTY : null;
  const category = dimensions.category === EMPTY || dimensions.category === undefined || FAILURE_CATEGORIES.has(dimensions.category)
    ? dimensions.category || EMPTY : null;
  if (!locale || section === null || intent === null || format === null || category === null) return null;

  if (event === "section_view" && !SECTIONS.has(section)) return null;
  if (event === "concept_interest" && (!INTENTS.has(intent) || !FORMATS.has(format))) return null;
  if (["inquiry_attempt", "relay_accepted"].includes(event) && !INTENTS.has(intent)) return null;
  if (event === "inquiry_failure" && (!INTENTS.has(intent) || !REJECTION_CATEGORIES.has(category))) return null;
  if (event === "inquiry_outage" && (!INTENTS.has(intent) || !OUTAGE_CATEGORIES.has(category))) return null;
  if (event === "intake_not_ready" && (intent || format || !READINESS_CATEGORIES.has(category))) return null;
  if (!["inquiry_failure", "inquiry_outage", "intake_not_ready"].includes(event) && category) return null;

  return { locale, section, intent, format, category };
}

/** Write one allowlisted, aggregate point. No request, visitor, or form identifiers are accepted. */
export function recordEventsMetric(env, event, dimensions = {}) {
  if (!eventsMetricsEnabled(env)) return false;
  const safe = normalizeMetric(event, dimensions);
  if (!safe) return false;
  try {
    env.EVENTS_ANALYTICS.writeDataPoint({
      indexes: [event],
      blobs: [safe.locale, safe.section, safe.intent, safe.format, safe.category],
      doubles: [1],
    });
    return true;
  } catch {
    // Metrics are best-effort and never change the visitor's inquiry outcome.
    return false;
  }
}

function response(status, body = null, extraHeaders = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      ...(body === null ? {} : { "content-type": "application/json; charset=utf-8" }),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

async function readSmallBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 512) {
      await reader.cancel();
      throw new RangeError("Metrics payload too large");
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function validClientMetric(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const allowed = {
    page_view: ["event", "locale"],
    section_view: ["event", "locale", "section"],
    concept_interest: ["event", "locale", "intent", "format"],
  };
  const keys = allowed[payload.event];
  if (!keys || Object.keys(payload).sort().join("|") !== [...keys].sort().join("|")) return null;
  const safe = normalizeMetric(payload.event, payload);
  return safe ? { event: payload.event, safe } : null;
}

export async function handleEventsMetricsApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/events/metrics/config") {
    if (request.method !== "GET") return response(405, { enabled: false });
    return response(200, { enabled: eventsMetricsEnabled(env) });
  }
  if (url.pathname !== "/api/events/metrics") return response(404, { ok: false });
  if (request.method !== "POST") return response(405, { ok: false });
  if (!eventsMetricsEnabled(env)) return response(204);
  if (request.headers.get("origin") !== url.origin) return response(403, { ok: false });
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return response(415, { ok: false });
  }

  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return response(503, { ok: false });
  try {
    const limit = await env.EVENTS_METRICS_LIMITER.limit({ key: ip });
    if (!limit?.success) return response(429, { ok: false }, { "retry-after": "60" });
  } catch {
    return response(503, { ok: false });
  }

  let payload;
  try {
    payload = JSON.parse(await readSmallBody(request));
  } catch {
    return response(400, { ok: false });
  }
  const metric = validClientMetric(payload);
  if (!metric) return response(400, { ok: false });
  if (!recordEventsMetric(env, metric.event, metric.safe)) return response(503, { ok: false });
  return response(204);
}
