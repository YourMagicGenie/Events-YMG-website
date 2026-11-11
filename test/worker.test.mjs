import assert from "node:assert/strict";
import test from "node:test";
import { createEventsWorker } from "../src/worker.js";

const origin = "https://events.ymgconsultingservices.com";
const env = {
  TURNSTILE_SITE_KEY: "test-site-key",
  TURNSTILE_SECRET_KEY: "test-secret",
  GOOGLE_RELAY_URL: "https://script.google.com/macros/s/test-deployment/exec",
  GOOGLE_RELAY_SECRET: "test-relay-secret",
  EVENTS_SUBMISSION_LIMITER: { limit: async () => ({ success: true }) },
};

test("Worker routes configuration requests to the Events handler", async () => {
  const worker = createEventsWorker();
  const response = await worker.fetch(new Request(origin + "/api/events/config"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ready: true, siteKey: "test-site-key" });
});

test("Worker exposes the privacy-gated metrics configuration without enabling collection by default", async () => {
  const worker = createEventsWorker();
  const response = await worker.fetch(new Request(origin + "/api/events/metrics/config"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { enabled: false });
  const unknown = await worker.fetch(new Request(origin + "/api/events/other-metrics"), env);
  assert.equal(unknown.status, 404);
});

test("Worker routes inline submissions through Turnstile and the shared relay", async () => {
  const calls = [];
  const worker = createEventsWorker(async (url, options) => {
    calls.push({ url, options });
    if (url.includes("turnstile")) {
      return Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_inquiry" });
    }
    return Response.json({ ok: true });
  });
  const body = new URLSearchParams({
    name: "Jane Doe",
    email: "jane@example.org",
    intent: "venue_partnership",
    source: "events_website_form",
    business: "Terrace Genova",
    format: "Supper Club",
    guests: "30–60",
    timing: "June evening",
    budget: "€2000",
    idea: "A dinner with live music",
    "cf-turnstile-response": "verified-token",
  });
  const response = await worker.fetch(new Request(origin + "/api/events/inquiry", {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "198.51.100.24" },
    body: body.toString(),
  }), env);

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 2);
  const message = JSON.parse(calls[1].options.body);
  assert.equal(message.replyTo, "jane@example.org");
  assert.equal(message.subject, "New YMG Events inquiry — Venue partnership — Supper Club — Jane Doe");
  assert.match(message.text, /Supper Club/);
  assert.match(message.text, /A dinner with live music/);
});

test("Worker sends non-API requests to static assets and keeps unknown API paths closed", async () => {
  const requests = [];
  const worker = createEventsWorker();
  const assets = { fetch: async request => {
    requests.push(request.url);
    if (new URL(request.url).pathname === "/privacy.html") return new Response("privacy page", { status: 200 });
    return new Response("<h1>We couldn’t find that page.</h1>", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  } };

  const page = await worker.fetch(new Request(origin + "/privacy.html"), { ASSETS: assets });
  assert.equal(await page.text(), "privacy page");
  assert.deepEqual(requests, [origin + "/privacy.html"]);

  const missing = await worker.fetch(new Request(origin + "/an-unknown-route/"), { ASSETS: assets });
  assert.equal(missing.status, 404, "the Worker preserves the static asset binding's real 404 status");
  assert.match(await missing.text(), /We couldn’t find that page/, "the branded recovery body passes through the asset binding");
  assert.deepEqual(requests, [origin + "/privacy.html", origin + "/an-unknown-route/"]);

  const unknown = await worker.fetch(new Request(origin + "/api/other"), { ASSETS: assets });
  assert.equal(unknown.status, 404);
  assert.equal(requests.length, 2, "unknown API routes do not fall through to public HTML assets");
});
