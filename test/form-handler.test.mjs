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
  name: "Jane Doe", email: "jane@example.org", business: "Terrace Genova",
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
  assert.equal(overlongFormat.status, 400);
  const honeypot = await handleEventsApi(request(form({ "bot-field": "robot" })), env, fetcher);
  assert.equal(honeypot.status, 202);
  assert.equal(calls.length, 0);

  const valid = await handleEventsApi(request(), env, fetcher);
  assert.equal(valid.status, 202);
  assert.deepEqual(await valid.json(), { ok: true });
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.replyTo, "jane@example.org");
  assert.equal(payload.subject, "New YMG Events enquiry — Jane Doe");
  for (const expected of ["Terrace Genova", "June evening", "€2000", "A sunset event", "60–100"]) {
    assert.ok(payload.text.includes(expected));
  }
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

test("subject removes header controls from sender name", () => {
  assert.equal(eventsNotificationSubject("Jane\r\nBCC: extra@example.org"), "New YMG Events enquiry — Jane BCC: extra@example.org");
});
