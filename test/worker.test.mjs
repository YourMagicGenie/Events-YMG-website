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

test("Worker routes inline submissions through Turnstile and the shared relay", async () => {
  const calls = [];
  const worker = createEventsWorker(async (url, options) => {
    calls.push({ url, options });
    if (url.includes("turnstile")) {
      return Response.json({ success: true, hostname: "events.ymgconsultingservices.com", action: "events_enquiry" });
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
  const response = await worker.fetch(new Request(origin + "/api/events/enquiry", {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "198.51.100.24" },
    body: body.toString(),
  }), env);

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 2);
  const message = JSON.parse(calls[1].options.body);
  assert.equal(message.replyTo, "jane@example.org");
  assert.equal(message.subject, "New YMG Events enquiry — Venue partnership — Jane Doe");
  assert.match(message.text, /Supper Club/);
  assert.match(message.text, /A dinner with live music/);
});

test("Worker sends non-API requests to static assets and keeps unknown API paths closed", async () => {
  const requests = [];
  const worker = createEventsWorker();
  const assets = { fetch: async request => {
    requests.push(request.url);
    return new Response("static page", { status: 200 });
  } };

  const page = await worker.fetch(new Request(origin + "/privacy.html"), { ASSETS: assets });
  assert.equal(await page.text(), "static page");
  assert.deepEqual(requests, [origin + "/privacy.html"]);

  const unknown = await worker.fetch(new Request(origin + "/api/other"), { ASSETS: assets });
  assert.equal(unknown.status, 404);
  assert.equal(requests.length, 1);
});
