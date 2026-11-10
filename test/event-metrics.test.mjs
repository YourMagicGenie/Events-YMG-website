import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleEventsMetricsApi, eventsMetricsEnabled, recordEventsMetric } from "../src/event-metrics.js";
import { startEventsMetrics } from "../dist/assets/metrics-client.js";

const origin = "https://events.ymgconsultingservices.com";
const analyticsEnv = (points = []) => ({
  EVENTS_METRICS_ENABLED: "true",
  EVENTS_ANALYTICS: { writeDataPoint: point => points.push(point) },
  EVENTS_METRICS_LIMITER: { limit: async () => ({ success: true }) },
});

test("metrics are disabled unless the flag, dataset binding and separate limiter are present", async () => {
  const points = [];
  const env = analyticsEnv(points);
  assert.equal(eventsMetricsEnabled({ ...env, EVENTS_METRICS_ENABLED: "false" }), false);
  assert.equal(eventsMetricsEnabled({ ...env, EVENTS_ANALYTICS: undefined }), false);
  assert.equal(eventsMetricsEnabled({ ...env, EVENTS_METRICS_LIMITER: undefined }), false);
  assert.equal(recordEventsMetric(env, "page_view", { locale: "en" }), true);
  assert.equal(points.length, 1);

  const disabled = await handleEventsMetricsApi(new Request(`${origin}/api/events/metrics/config`), {
    ...env, EVENTS_METRICS_ENABLED: "false",
  });
  assert.equal(disabled.status, 200);
  assert.deepEqual(await disabled.json(), { enabled: false });
});

test("same-origin metric events accept only fixed page, section and concept dimensions", async () => {
  const points = [];
  const env = analyticsEnv(points);
  const send = body => handleEventsMetricsApi(new Request(`${origin}/api/events/metrics`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "cf-connecting-ip": "198.51.100.7" },
    body: JSON.stringify(body),
  }), env);

  const page = await send({ event: "page_view", locale: "it" });
  const section = await send({ event: "section_view", locale: "en", section: "concepts" });
  const concept = await send({ event: "concept_interest", locale: "it", intent: "venue_partnership", format: "Supper Club" });
  for (const response of [page, section, concept]) assert.equal(response.status, 204);
  assert.deepEqual(points.map(point => point.indexes[0]), ["page_view", "section_view", "concept_interest"]);
  assert.deepEqual(points[0], { indexes: ["page_view"], blobs: ["it", "", "", "", ""], doubles: [1] });
  assert.deepEqual(points[1], { indexes: ["section_view"], blobs: ["en", "concepts", "", "", ""], doubles: [1] });
  assert.deepEqual(points[2], { indexes: ["concept_interest"], blobs: ["it", "", "venue_partnership", "Supper Club", ""], doubles: [1] });
});

test("metrics endpoint rejects cross-origin, arbitrary, oversized and identity-bearing payloads", async () => {
  const points = [];
  const env = analyticsEnv(points);
  const request = (body, headers = {}) => new Request(`${origin}/api/events/metrics`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "cf-connecting-ip": "198.51.100.7", ...headers },
    body,
  });

  assert.equal((await handleEventsMetricsApi(request('{"event":"page_view","locale":"en"}', { origin: "https://attacker.example" }), env)).status, 403);
  assert.equal((await handleEventsMetricsApi(request(JSON.stringify({ event: "page_view", locale: "en", email: "jane@example.org" })), env)).status, 400);
  assert.equal((await handleEventsMetricsApi(request(JSON.stringify({ event: "page_view", locale: "en", section: "https://example.org/?email=jane@example.org" })), env)).status, 400);
  assert.equal((await handleEventsMetricsApi(request(" ".repeat(513)), env)).status, 400);
  assert.equal(points.length, 0);
});

test("separate metrics rate limiter fails closed and metrics write errors do not throw", async () => {
  const points = [];
  const request = new Request(`${origin}/api/events/metrics`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "cf-connecting-ip": "198.51.100.7" },
    body: JSON.stringify({ event: "page_view", locale: "en" }),
  });
  const limited = await handleEventsMetricsApi(request.clone(), {
    ...analyticsEnv(points), EVENTS_METRICS_LIMITER: { limit: async () => ({ success: false }) },
  });
  assert.equal(limited.status, 429);
  const unavailable = await handleEventsMetricsApi(request, {
    ...analyticsEnv(points), EVENTS_ANALYTICS: { writeDataPoint() { throw new Error("private data stays private"); } },
  });
  assert.equal(unavailable.status, 503);
  assert.equal(recordEventsMetric({ ...analyticsEnv(), EVENTS_ANALYTICS: { writeDataPoint() { throw new Error("failure"); } } }, "page_view", { locale: "en" }), false);
});

test("client emits no events while disabled and sends no identity, referrer or form fields when enabled", async () => {
  const posts = [];
  const section = { id: "concepts" };
  const concept = {
    dataset: { intent: "venue_partnership", concept: "Supper Club" },
    addEventListener(type, callback) { this.click = callback; },
  };
  let observed;
  const documentRef = {
    documentElement: { lang: "it" },
    querySelectorAll(selector) {
      if (selector === "main section[id]") return [section];
      if (selector === "[data-concept]") return [concept];
      return [];
    },
  };
  const windowRef = { IntersectionObserver: function IntersectionObserver() {} };
  const fetcher = async (url, options) => {
    if (url.endsWith("/config")) return Response.json({ enabled: true });
    posts.push({ url, options, body: JSON.parse(options.body) });
    return new Response(null, { status: 204 });
  };

  const started = await startEventsMetrics({
    documentRef, windowRef, fetcher,
    observerFactory: callback => {
      observed = callback;
      return { observe() {}, unobserve() {} };
    },
  });
  assert.equal(started, true);
  assert.deepEqual(posts.map(post => post.body), [{ event: "page_view", locale: "it" }]);
  observed([{ target: section, isIntersecting: true }]);
  observed([{ target: section, isIntersecting: true }]);
  concept.click();

  assert.deepEqual(posts.map(post => post.body), [
    { event: "page_view", locale: "it" },
    { event: "section_view", locale: "it", section: "concepts" },
    { event: "concept_interest", locale: "it", intent: "venue_partnership", format: "Supper Club" },
  ]);
  for (const post of posts) {
    assert.equal(post.options.credentials, "omit");
    assert.equal(post.options.referrerPolicy, "no-referrer");
    assert.doesNotMatch(JSON.stringify(post.body), /jane@example|198\.51\.100|name|email|budget|timing|guest/i);
  }

  let postCount = 0;
  const disabled = await startEventsMetrics({
    documentRef, windowRef,
    fetcher: async url => url.endsWith("/config")
      ? Response.json({ enabled: false })
      : (postCount++, Response.json({ enabled: false })),
  });
  assert.equal(disabled, false);
  assert.equal(postCount, 0);

  const source = readFileSync(new URL("../dist/assets/metrics-client.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie|navigator\.userAgent|document\.referrer|location\.href/);
});

test("preview metrics binding ships with the activation flag disabled", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"));
  assert.equal(config.name, "ymg-events-preview");
  assert.equal(config.vars.EVENTS_METRICS_ENABLED, "false");
  assert.equal(config.analytics_engine_datasets[0].binding, "EVENTS_ANALYTICS");
  assert.equal(config.analytics_engine_datasets[0].dataset, "ymg_events_preview_metrics");
  assert.ok(config.ratelimits.some(item => item.name === "EVENTS_METRICS_LIMITER" && item.simple.limit === 30));
});
