import assert from "node:assert/strict";
import test from "node:test";
import { sendEventsEnquiry } from "../dist/assets/enquiry-client.js";

const values = new URLSearchParams({
  name: "Jane Doe",
  email: "jane@example.org",
  intent: "venue_partnership",
  source: "events_website_form",
  business: "Terrace Genova",
  format: "Jazz & Cocktails",
  guests: "30–60",
  timing: "June evening",
  budget: "€2000",
  idea: "A sunset event with live music",
  "bot-field": "",
});

test("inline client posts the complete brief and Turnstile token to the same-origin Worker", async () => {
  let request;
  const response = await sendEventsEnquiry(values, "verified-token", async (...args) => {
    request = args;
    return Response.json({ ok: true }, { status: 202 });
  });

  assert.deepEqual(response, { ok: true });
  assert.equal(request[0], "/api/events/enquiry");
  assert.equal(request[1].method, "POST");
  assert.equal(request[1].credentials, "same-origin");
  assert.equal(request[1].headers["Content-Type"], "application/x-www-form-urlencoded;charset=UTF-8");
  const body = new URLSearchParams(request[1].body);
  assert.equal(body.get("email"), "jane@example.org");
  assert.equal(body.get("format"), "Jazz & Cocktails");
  assert.equal(body.get("idea"), "A sunset event with live music");
  assert.equal(body.get("cf-turnstile-response"), "verified-token");
});

test("client requires a Turnstile token before sending", async () => {
  let called = false;
  await assert.rejects(
    sendEventsEnquiry(values, "", async () => { called = true; }),
    /Spam protection is required/,
  );
  assert.equal(called, false);
});

test("client reports backend rejection without claiming success", async () => {
  await assert.rejects(
    sendEventsEnquiry(values, "verified-token", async () =>
      Response.json({ ok: false, error: "Online submission is unavailable." }, { status: 503 })),
    /did not accept this request/,
  );
});


test("client aborts a stalled connection instead of leaving the form pending", async () => {
  // A live handle models a socket while AbortSignal.timeout uses an unref'ed timer.
  const socket = setInterval(() => {}, 1000);
  try {
    await assert.rejects(sendEventsEnquiry(values, "verified-token", async (_, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    }, 10), { name: "TimeoutError" });
  } finally {
    clearInterval(socket);
  }
});

test("client also bounds a stalled response body", async () => {
  const socket = setInterval(() => {}, 1000);
  try {
    await assert.rejects(sendEventsEnquiry(values, "verified-token", async (_, options) => ({
      ok: true,
      json: () => new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      }),
    }), 10), /did not accept this request/);
  } finally {
    clearInterval(socket);
  }
});
