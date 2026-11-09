import { handleEventsApi } from "./form-handler.js";

const eventsRoutes = new Set(["/api/events/config", "/api/events/enquiry"]);

export function createEventsWorker(fetcher = fetch) {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      if (eventsRoutes.has(pathname)) return handleEventsApi(request, env, fetcher);
      if (pathname.startsWith("/api/")) {
        return Response.json({ ok: false, error: "Not found." }, {
          status: 404,
          headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
        });
      }
      if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
      return new Response("Not found", {
        status: 404,
        headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
      });
    },
  };
}

export default createEventsWorker();
