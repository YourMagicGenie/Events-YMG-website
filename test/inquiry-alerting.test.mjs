// Inquiry outcome taxonomy and readiness signals behind the production alert (#129).
import assert from "node:assert/strict";
import test from "node:test";
import { handleEventsApi } from "../src/form-handler.js";
import { OUTAGE_CATEGORIES, REJECTION_CATEGORIES, recordEventsMetric } from "../src/event-metrics.js";
import { createEventsWorker } from "../src/worker.js";

const origin = "https://events.ymgconsultingservices.com";
const PII = /Jane Doe|jane@example\.org|Test Venue|198\.51\.100\.24|Outdoor team event|test-token|relay-secret|turnstile-secret/;
const fields = {
  name: "Jane Doe", email: "jane@example.org", intent: "corporate_event", source: "events_website_form",
  business: "Test Venue", format: "Wine pairing", guests: "30–60", timing: "Next June", budget: "",
  idea: "Outdoor team event", locale: "it", "cf-turnstile-response": "test-token",
};
const inquiry = () => new Request(`${origin}/api/events/inquiry`, {
  method: "POST",
  headers: { origin, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "198.51.100.24" },
  body: new URLSearchParams(fields),
});
const timeout = () => { throw new DOMException("The operation timed out.", "TimeoutError"); };
const metrics = points => ({
  EVENTS_METRICS_ENABLED: "true",
  EVENTS_ANALYTICS: { writeDataPoint: point => points.push(point) },
  EVENTS_METRICS_LIMITER: { limit: async () => ({ success: true }) },
});
const limiter = (success = true) => ({ EVENTS_SUBMISSION_LIMITER: { limit: async () => ({ success }) } });
const science = fetch => ({ SCIENCE_INTAKE: { fetch }, ...limiter() });
const direct = {
  TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "turnstile-secret",
  GOOGLE_RELAY_URL: "https://script.google.com/macros/s/test-deployment/exec", GOOGLE_RELAY_SECRET: "relay-secret",
  ...limiter(),
};
const verified = () => Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_inquiry" });
const outcome = points => points.slice(1).map(point => [point.indexes[0], point.blobs[4]]);

async function submit(env, fetcher) {
  const points = [];
  const response = await handleEventsApi(inquiry(), { ...env, ...metrics(points) }, fetcher);
  assert.equal(points[0]?.indexes[0], "inquiry_attempt");
  assert.doesNotMatch(JSON.stringify(points), PII, "metrics carry no inquiry content, address or credential");
  return { status: response.status, outcome: outcome(points) };
}

test("rejections and outages are disjoint fixed categories", () => {
  for (const category of REJECTION_CATEGORIES) assert.ok(!OUTAGE_CATEGORIES.has(category));
  const points = [];
  const env = metrics(points);
  const base = { locale: "en", intent: "venue_partnership", format: "Wine pairing" };
  assert.equal(recordEventsMetric(env, "inquiry_outage", { ...base, category: "rate_limited" }), false, "a visitor rejection is never an outage");
  assert.equal(recordEventsMetric(env, "inquiry_failure", { ...base, category: "upstream_error" }), false, "an outage is never a visitor rejection");
  assert.equal(recordEventsMetric(env, "relay_failure", { ...base, category: "upstream_error" }), false, "the retired event name is rejected");
  assert.equal(recordEventsMetric(env, "intake_not_ready", { locale: "en", intent: "venue_partnership", category: "upstream_error" }), false);
  assert.equal(recordEventsMetric(env, "relay_accepted", { ...base, category: "upstream_error" }), false);
  assert.equal(points.length, 0);
});

test("production Science path: each attempt records exactly one outcome, and upstream failures are outages", async () => {
  const cases = [
    [async () => Response.json({ ok: true }, { status: 202 }), 202, [["relay_accepted", ""]]],
    [async () => Response.json({ ok: false }, { status: 403 }), 403, [["inquiry_failure", "turnstile_rejected"]]],
    [async () => Response.json({ ok: false }, { status: 400 }), 400, [["inquiry_failure", "intake_rejected"]]],
    [async () => Response.json({ ok: false }, { status: 429 }), 429, [["inquiry_failure", "rate_limited"]]],
    [async () => Response.json({ ok: false }, { status: 503 }), 503, [["inquiry_outage", "upstream_error"]]],
    [async () => new Response("<html>Bad gateway</html>", { status: 502 }), 503, [["inquiry_outage", "upstream_error"]]],
    [async () => new Response("not json", { status: 202 }), 503, [["inquiry_outage", "upstream_error"]]],
    [timeout, 503, [["inquiry_outage", "upstream_timeout"]]],
    [async () => { throw new Error("binding unavailable"); }, 503, [["inquiry_outage", "upstream_unavailable"]]],
  ];
  for (const [fetch, status, expected] of cases) {
    const result = await submit(science(fetch));
    assert.equal(result.status, status);
    assert.deepEqual(result.outcome, expected, `HTTP ${status}`);
  }
});

test("direct relay path uses the same taxonomy, with one outcome point per attempt", async () => {
  const relay = answer => async (url, options) => (url.includes("turnstile") ? verified() : answer(url, options));
  const cases = [
    [relay(() => Response.json({ ok: true })), 202, [["relay_accepted", ""]]],
    [relay(() => new Response("unavailable", { status: 503 })), 503, [["inquiry_outage", "upstream_error"]]],
    [relay(() => Response.json({ ok: false })), 503, [["inquiry_outage", "upstream_error"]]],
    [relay(timeout), 503, [["inquiry_outage", "upstream_timeout"]]],
    [relay(() => { throw new TypeError("network"); }), 503, [["inquiry_outage", "upstream_unavailable"]]],
    [async () => { throw new TypeError("network"); }, 503, [["inquiry_outage", "turnstile_unavailable"]]],
    [async () => Response.json({ success: false }), 403, [["inquiry_failure", "turnstile_rejected"]]],
  ];
  for (const [fetcher, status, expected] of cases) {
    const result = await submit(direct, fetcher);
    assert.equal(result.status, status);
    assert.deepEqual(result.outcome, expected);
  }
  assert.deepEqual((await submit({ ...direct, ...limiter(false) }, verified)).outcome, [["inquiry_failure", "rate_limited"]]);
  assert.deepEqual((await submit({ ...direct, EVENTS_SUBMISSION_LIMITER: { limit: async () => { throw new Error("down"); } } }, verified)).outcome,
    [["inquiry_outage", "limiter_unavailable"]]);
  assert.deepEqual((await submit({ ...direct, GOOGLE_RELAY_SECRET: "" }, verified)).outcome, [["inquiry_outage", "config_unavailable"]]);
});

test("a config failure that stops the form records a readiness signal, not an inquiry event", async () => {
  const config = async env => {
    const points = [];
    const response = await handleEventsApi(new Request(`${origin}/api/events/config`), { ...env, ...metrics(points) });
    return { status: response.status, body: await response.json(), points };
  };
  const ready = await config(science(async () => Response.json({ ready: true, siteKey: "public-key" })));
  assert.equal(ready.status, 200);
  assert.equal(ready.points.length, 0);
  for (const [env, category] of [
    [science(async () => Response.json({ ready: false })), "upstream_error"],
    [science(async () => new Response("down", { status: 503 })), "upstream_error"],
    [science(timeout), "upstream_timeout"],
    [science(async () => { throw new Error("binding"); }), "upstream_unavailable"],
    [{ SCIENCE_INTAKE: { fetch: async () => Response.json({ ready: true, siteKey: "public-key" }) } }, "config_unavailable"],
    [{ ...direct, TURNSTILE_SECRET_KEY: "" }, "config_unavailable"],
  ]) {
    const result = await config(env);
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, { ready: false });
    assert.deepEqual(result.points.map(point => [point.indexes[0], point.blobs.slice(1)]), [["intake_not_ready", ["", "", "", category]]]);
  }
});

test("the health endpoint names the failed dependency without secrets and writes no metrics", async () => {
  const worker = createEventsWorker();
  const health = async (env, method = "GET") => {
    const response = await worker.fetch(new Request(`${origin}/api/events/health`, { method }), env);
    const text = await response.text();
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(text, /site-key|public-key|secret|script\.google|turnstile-secret/);
    return { status: response.status, body: JSON.parse(text) };
  };
  const points = [];
  const live = { ...science(async () => Response.json({ ready: true, siteKey: "public-key" })), ...metrics(points) };
  assert.deepEqual(await health(live), { status: 200, body: { ok: true, checks: { intake: "ok", limiter: "ok", metrics: "ok" } } });
  assert.deepEqual((await health({ ...live, SCIENCE_INTAKE: { fetch: timeout } })).body.checks.intake, "upstream_timeout");
  assert.deepEqual(await health({ ...live, EVENTS_SUBMISSION_LIMITER: undefined }), {
    status: 503, body: { ok: false, checks: { intake: "ok", limiter: "missing", metrics: "ok" } },
  });
  assert.deepEqual(await health({ ...live, EVENTS_ANALYTICS: undefined }), {
    status: 503, body: { ok: false, checks: { intake: "ok", limiter: "ok", metrics: "unavailable" } },
  }, "telemetry that is switched on but unbound is reported separately");
  assert.deepEqual((await health({ ...direct, EVENTS_METRICS_ENABLED: "false" })).body, {
    ok: true, checks: { intake: "ok", limiter: "ok", metrics: "disabled" },
  });
  assert.equal((await health({ ...direct, GOOGLE_RELAY_URL: "" })).body.checks.intake, "not_configured");
  assert.equal((await health(live, "POST")).status, 405);
  assert.equal(points.length, 0, "health checks never add to the alert count");
});
