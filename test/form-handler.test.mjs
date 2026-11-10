import assert from "node:assert/strict";
import test from "node:test";
import { handleEventsApi, eventsNotificationSubject } from "../src/form-handler.js";

const origin = "https://events.ymgconsultingservices.com";
const env = {
  TURNSTILE_SITE_KEY: "test-site-key",
  TURNSTILE_SECRET_KEY: "test-secret",
  GOOGLE_RELAY_URL: "https://script.google.com/macros/s/test-deployment/exec",
  GOOGLE_RELAY_SECRET: "test-relay-secret",
  EVENTS_SUBMISSION_LIMITER: { limit: async () => ({ success: true }) },
};
const form = (overrides = {}) => new URLSearchParams({
  name: "Jane Doe", email: "jane@example.org", intent: "venue_partnership", source: "events_website_form", business: "Terrace Genova",
  format: "Rooftop evenings", guests: "60–100", timing: "June evening",
  budget: "€2000", idea: "A sunset event with live music",
  "cf-turnstile-response": "test-token", ...overrides,
});
const request = (params = form(), headers = {}) => new Request(`${origin}/api/events/enquiry`, {
  method: "POST", headers: { origin, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "198.51.100.24", ...headers },
  body: params.toString(),
});

test("configuration is withheld when relay or rate limiting is not configured", async () => {
  const response = await handleEventsApi(new Request(`${origin}/api/events/config`), { ...env, GOOGLE_RELAY_SECRET: "" });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ready: false });
  const missingLimiter = await handleEventsApi(new Request(`${origin}/api/events/config`), { ...env, EVENTS_SUBMISSION_LIMITER: undefined });
  assert.equal(missingLimiter.status, 503);
});

test("direct-send path checks origin, fields, honeypot and Turnstile before relay", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("turnstile")) return Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" });
    return Response.json({ ok: true });
  };

  const wrongOrigin = await handleEventsApi(request(form(), { origin: "https://attacker.example" }), env, fetcher);
  assert.equal(wrongOrigin.status, 403);
  const invalidEmail = await handleEventsApi(request(form({ email: "nope" })), env, fetcher);
  assert.equal(invalidEmail.status, 400);
  const overlongFormat = await handleEventsApi(request(form({ format: "x".repeat(101) })), env, fetcher);
  const unlistedFormat = await handleEventsApi(request(form({ format: "Rooftop evenings\r\nBCC: extra@example.org" })), env, fetcher);
  assert.equal(overlongFormat.status, 400);
  assert.equal(unlistedFormat.status, 400, "arbitrary format text cannot be injected into the email subject");
  const honeypot = await handleEventsApi(request(form({ "bot-field": "robot" })), env, fetcher);
  assert.equal(honeypot.status, 202);
  assert.equal(calls.length, 0);

  const valid = await handleEventsApi(request(), env, fetcher);
  assert.equal(valid.status, 202);
  assert.deepEqual(await valid.json(), { ok: true });
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.replyTo, "jane@example.org");
  assert.equal(payload.subject, "New YMG Events enquiry — Venue partnership — Rooftop evenings — Jane Doe");
  for (const expected of ["Enquiry type: Venue partnership", "Enquiry source: Events website", "Terrace Genova", "June evening", "€2000", "A sunset event", "60–100"]) {
    assert.ok(payload.text.includes(expected));
  }
});

test("each enquiry pathway carries its type and source, with venue details required only for organizations", async () => {
  const cases = [
    { intent: "venue_partnership", business: "Harbor Restaurant", type: "Venue partnership", format: "Jazz & Cocktails", field: "Venue or hospitality business" },
    { intent: "corporate_event", business: "North Star Studio", type: "Corporate event", format: "Corporate Social", field: "Company or team" },
    { intent: "private_celebration", business: "", type: "Private celebration", format: "Private celebrations", field: "Preferred venue or location" },
  ];
  for (const example of cases) {
    let relayPayload;
    const response = await handleEventsApi(request(form(example)), env, async (url, options) => {
      if (url.includes("turnstile")) return Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" });
      relayPayload = JSON.parse(options.body);
      return Response.json({ ok: true });
    });
    assert.equal(response.status, 202, `${example.intent} enquiries can be submitted`);
    assert.equal(relayPayload.replyTo, "jane@example.org", "the visitor email remains the Reply-To value");
    assert.equal(relayPayload.subject, `New YMG Events enquiry — ${example.type} — ${example.format} — Jane Doe`);
    assert.ok(relayPayload.text.includes(`Enquiry type: ${example.type}`));
    assert.ok(relayPayload.text.includes("Enquiry source: Events website"));
    assert.ok(relayPayload.text.includes(`Event format: ${example.format}`));
    assert.ok(relayPayload.text.includes(`${example.field}: ${example.business || "(not provided)"}`));
  }
});

test("venue and corporate enquiries require an organization name while private enquiries do not", async () => {
  for (const intent of ["venue_partnership", "corporate_event"]) {
    const response = await handleEventsApi(request(form({ intent, business: "" })), env, async () => Response.json({ ok: true }));
    assert.equal(response.status, 400, `${intent} requires a venue or organization name`);
  }
  const invalidIntent = await handleEventsApi(request(form({ intent: "other" })), env);
  const invalidSource = await handleEventsApi(request(form({ source: "external" })), env);
  assert.equal(invalidIntent.status, 400);
  assert.equal(invalidSource.status, 400);
});

test("a Turnstile action mismatch prevents delivery", async () => {
  let calls = 0;
  const response = await handleEventsApi(request(), env, async () => {
    calls++;
    return Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "assessment" });
  });
  assert.equal(response.status, 403);
  assert.equal(calls, 1);
});

test("a relay failure reports an error instead of claiming delivery", async () => {
  const response = await handleEventsApi(request(), env, async url =>
    url.includes("turnstile")
      ? Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" })
      : Response.json({ ok: false, code: "RELAY_FAILED" }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});

test("rate limiting rejects excess requests before Turnstile or relay", async () => {
  let fetchCalls = 0;
  let rateKey;
  const response = await handleEventsApi(request(), {
    ...env,
    EVENTS_SUBMISSION_LIMITER: { limit: async ({ key }) => { rateKey = key; return { success: false }; } },
  }, async () => { fetchCalls++; return Response.json({ ok: true }); });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(rateKey, "198.51.100.24");
  assert.equal(fetchCalls, 0);
});

test("rate limiter failure fails closed without logging or forwarding the enquiry", async () => {
  let fetchCalls = 0;
  const response = await handleEventsApi(request(), {
    ...env,
    EVENTS_SUBMISSION_LIMITER: { limit: async () => { throw new Error("private limiter detail"); } },
  }, async () => { fetchCalls++; return Response.json({ ok: true }); });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Online submission is temporarily unavailable." });
  assert.equal(fetchCalls, 0);
});

test("a missing Cloudflare client address prevents submission", async () => {
  let fetchCalls = 0;
  const response = await handleEventsApi(request(form(), { "cf-connecting-ip": "" }), env, async () => {
    fetchCalls++;
    return Response.json({ ok: true });
  });
  assert.equal(response.status, 503);
  assert.equal(fetchCalls, 0);
});

test("the page's curly-apostrophe default event format passes validation", async () => {
  const defaultFormat = form({ format: "Let’s explore a partnership" });
  const response = await handleEventsApi(request(defaultFormat), env, async url =>
    url.includes("turnstile")
      ? Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" })
      : Response.json({ ok: true }));
  assert.equal(response.status, 202);
});

test("a cleared event format falls back to the selected enquiry path's generic format", async () => {
  for (const [intent, format] of [
    ["venue_partnership", "Let’s explore a partnership"],
    ["corporate_event", "Corporate Social"],
    ["private_celebration", "Private celebrations"],
  ]) {
    let relayPayload;
    const response = await handleEventsApi(request(form({ intent, format: "", business: intent === "private_celebration" ? "" : "Example venue" })), env, async (url, options) => {
      if (url.includes("turnstile")) return Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" });
      relayPayload = JSON.parse(options.body);
      return Response.json({ ok: true });
    });
    assert.equal(response.status, 202, `${intent} accepts an enquiry with no specific format`);
    assert.ok(relayPayload.text.includes(`Event format: ${format}`));
    assert.ok(relayPayload.subject.includes(`— ${format} —`));
  }
});

test("subject removes header controls from sender name and event format", () => {
  assert.equal(
    eventsNotificationSubject("Jane\r\nBCC: extra@example.org", "venue_partnership", "Jazz\r\nBCC: extra@example.org"),
    "New YMG Events enquiry — Venue partnership — Jazz BCC: extra@example.org — Jane BCC: extra@example.org",
  );
});

test("aggregate form metrics distinguish a relay acceptance from a relay failure without PII", async () => {
  const points = [];
  const metricsEnv = {
    ...env,
    EVENTS_METRICS_ENABLED: "true",
    EVENTS_ANALYTICS: { writeDataPoint: point => points.push(point) },
    EVENTS_METRICS_LIMITER: { limit: async () => ({ success: true }) },
  };
  const accepted = await handleEventsApi(request(form({ locale: "it" })), metricsEnv, async url =>
    url.includes("turnstile")
      ? Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" })
      : Response.json({ ok: true }));
  assert.equal(accepted.status, 202);
  assert.deepEqual(points.map(point => point.indexes[0]), ["enquiry_attempt", "relay_accepted"]);
  assert.deepEqual(points[0].blobs.slice(0, 4), ["it", "", "venue_partnership", "Rooftop evenings"]);
  assert.doesNotMatch(JSON.stringify(points), /Jane Doe|jane@example\.org|Terrace Genova|198\.51\.100\.24|sunset event|€2000/);
  assert.ok(!points.some(point => point.indexes[0] === "delivered" || point.indexes[0] === "confirmed"));

  points.length = 0;
  const failed = await handleEventsApi(request(form({ locale: "it" })), metricsEnv, async url =>
    url.includes("turnstile")
      ? Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" })
      : new Response("unavailable", { status: 503 }));
  assert.equal(failed.status, 503);
  assert.deepEqual(points.map(point => point.indexes[0]), ["enquiry_attempt", "enquiry_failure", "relay_failure"]);
  assert.equal(points[1].blobs[4], "relay_failure");
  assert.doesNotMatch(JSON.stringify(points), /Jane Doe|jane@example\.org|Terrace Genova|198\.51\.100\.24|sunset event|€2000/);
});
