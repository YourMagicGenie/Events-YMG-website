import { handleEventsApi } from "./form-handler.js";
import { handleEventsMetricsApi } from "./event-metrics.js";
import { withEventsSecurityHeaders } from "./security-headers.js";

const eventsRoutes = new Set(["/api/events/config", "/api/events/enquiry"]);
const metricsRoutes = new Set(["/api/events/metrics/config", "/api/events/metrics"]);

export function createEventsWorker(fetcher = fetch) {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      let response;
      if (metricsRoutes.has(pathname)) {
        response = await handleEventsMetricsApi(request, env);
      } else if (eventsRoutes.has(pathname)) {
        response = await handleEventsApi(request, env, fetcher);
      } else if (pathname.startsWith("/api/")) {
        response = Response.json({ ok: false, error: "Not found." }, {
          status: 404,
          headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
        });
      } else if (env.ASSETS?.fetch) {
        response = await env.ASSETS.fetch(request);
      } else {
        response = new Response("Not found", {
          status: 404,
          headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
        });
      }

      return withEventsSecurityHeaders(request, response);
    },
  };
}

export default createEventsWorker();
