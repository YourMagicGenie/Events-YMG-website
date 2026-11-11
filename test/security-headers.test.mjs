import assert from "node:assert/strict";
import test from "node:test";
import { EVENTS_CONTENT_SECURITY_POLICY, withEventsSecurityHeaders } from "../src/security-headers.js";
import { createEventsWorker } from "../src/worker.js";

const origin = "https://events.ymgconsultingservices.com";

test("HTML responses receive a restrictive policy for the site and Turnstile", async () => {
  const worker = createEventsWorker();
  const response = await worker.fetch(new Request(`${origin}/`), {
    ASSETS: {
      fetch: async () => new Response("<main>Events</main>", {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
      }),
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-security-policy"), EVENTS_CONTENT_SECURITY_POLICY);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /default-src 'self'/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.doesNotMatch(EVENTS_CONTENT_SECURITY_POLICY, /script-src[^;]*unsafe-inline/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /img-src 'self';/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /font-src 'self'/);
  assert.match(EVENTS_CONTENT_SECURITY_POLICY, /connect-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  assert.match(await response.text(), /Events/);
});

test("all worker routes receive baseline headers and preserve response behavior", async () => {
  const worker = createEventsWorker();
  const env = {
    TURNSTILE_SITE_KEY: "test-site-key",
    TURNSTILE_SECRET_KEY: "test-secret",
    GOOGLE_RELAY_URL: "https://script.google.com/macros/s/test-deployment/exec",
    GOOGLE_RELAY_SECRET: "test-relay-secret",
    EVENTS_SUBMISSION_LIMITER: { limit: async () => ({ success: true }) },
  };
  const configured = await worker.fetch(new Request(`${origin}/api/events/config`), env);
  const unknownApi = await worker.fetch(new Request(`${origin}/api/unknown`), env);
  const missingPage = await worker.fetch(new Request(`${origin}/missing`), {
    ASSETS: { fetch: async () => new Response("Recovery page", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    }) },
  });

  for (const response of [configured, unknownApi, missingPage]) {
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("permissions-policy"), "camera=(), geolocation=(), microphone=()");
    assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  }
  assert.equal(configured.headers.get("content-security-policy"), null, "JSON configuration responses do not carry a document policy");
  assert.equal(unknownApi.status, 404);
  assert.equal(unknownApi.headers.get("cache-control"), "no-store");
  assert.equal(missingPage.status, 404);
  assert.equal(missingPage.headers.get("content-security-policy"), EVENTS_CONTENT_SECURITY_POLICY);
  assert.equal(await missingPage.text(), "Recovery page");
});

test("HSTS is emitted only for HTTPS requests", async () => {
  const plain = withEventsSecurityHeaders(
    new Request("http://events.ymgconsultingservices.com/"),
    new Response("Not found", { status: 404, headers: { "strict-transport-security": "max-age=123" } }),
  );
  const secure = withEventsSecurityHeaders(
    new Request(`${origin}/`),
    new Response("Not found", { status: 404 }),
  );

  assert.equal(plain.headers.get("strict-transport-security"), null);
  assert.equal(secure.headers.get("strict-transport-security"), "max-age=31536000");
});
