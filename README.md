# YMG Events website

Canonical source and issue tracker for the live [YMG Events website](https://events.ymgconsultingservices.com/).

## Live hosting / source provenance

This repository was initialized on 2026-11-09 from the selected YMG Events Sites-managed source (`appgprj_6af1846f038c8191a5028170979bd4b3`, commit `76dd4f9580e546dac33e6605534414ad77408f10`). The live public domain is hosted separately on the Cloudflare Worker **`ymg-events-website`**. Cloudflare Workers Builds now watches `main` and runs `npm run build` followed by `npm run deploy:auto`. Checked PR merges publish automatically; a Sites preview does not control production. See [publishing configuration](docs/CLOUDFLARE-AUTO-PUBLISH.md).

- `dist/`: editable buildless website, privacy notice, assets, robots/sitemap copied from the current Events source.
- `deploy/`: deployment and recovery notes for the separate production Worker. Its original generated bundle remains in the Sites-managed source as historical provenance. Current releases package `dist/` and `src/` directly; no second editable embedded bundle is maintained.
- `reference/`: vetted, non-secret implementation patterns borrowed from the [main YMG website](https://github.com/YourMagicGenie/ymg-atlas-website) that informed Events-specific direct inquiry delivery. Reference code is **not** wired to production until tested and explicitly integrated.

## Coding-agent handoff

Use [the prioritized GPT coding handoff](docs/GPT_CODING_HANDOFF.md) when starting a new implementation session. It inventoried the 33 approved issues of its date, actual source/deployment boundaries, critical dependency order, test gates and PR/CI expectations. The handoff is a dated snapshot; recheck open issues, repository state, live Worker and Project Keeper before changing code.

## Direct inquiries

Production intake is live and aggregate metrics are on. The version, readiness signals and verification limits are kept in one place: [current production state](deploy/README.md#current-production-state).

- **Intake.** `dist/index.html` and `dist/it/index.html` contain the inline form. `dist/assets/inquiry-client.js` posts it to the same-origin `/api/events/inquiry` (`/api/events/enquiry` is a kept alias), which `src/worker.js` routes to `src/form-handler.js`. In production the Worker forwards the validated form over the private `SCIENCE_INTAKE` service binding to the existing `ymg-science-website` intake, which verifies Turnstile and relays to Google Workspace ([shared intake](docs/SCIENCE-INTAKE.md)). The production Worker holds **no** Turnstile secret or relay credentials.
- **Direct relay.** The `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` / `GOOGLE_RELAY_URL` / `GOOGLE_RELAY_SECRET` path in `src/form-handler.js` is kept only for an isolated deployment that has its own secrets. Production does not use it; it is not a recovery path for production.
- **Previews.** The Science adapter answers only for the `https://events.ymgconsultingservices.com` origin, and `wrangler.json` has no binding, so preview Workers and version URLs report the form unavailable and show the email address instead.
- **Limits and metrics.** `EVENTS_SUBMISSION_LIMITER` allows five submissions per minute per source IP (approximate per Cloudflare location; namespace IDs must be unique in the account). Aggregate counts are on in production ([analytics operations](docs/ANALYTICS-OPERATIONS.md)).
- **Monitoring.** The hourly **Production health** workflow and a Cloudflare Analytics Engine monitor alert on intake outages; mailbox receipt can only be confirmed by the owner (#129).

## Safety and deployment

- Record live Worker version and a working rollback before any upload. Do not transfer Events hostname back to the old Atlas placeholder.
- Do not copy Cloudflare account/zone identifiers or live credentials into public configuration or issue bodies.
- Preserve the main Atlas/Science, Porto Aperto, Brewing and DnD deployments and email DNS.
- The public repo is intentionally separate from the private scientific site; do not copy unrelated scientific source/assets.

See [Issue #3](https://github.com/YourMagicGenie/Events-YMG-website/issues/3) for the complete source/parity and guarded deployment checklist.

## Local checks

The site is buildless. With Node.js 22 or newer, run `npm ci` and `npm test` for the form-handler, inline-client, Worker-route and static-site smoke tests. For rendered browser coverage, install Playwright's Chromium with `npx playwright install chromium` and run `npm run test:e2e` for the focused 320px mobile, 768px tablet and 1440px desktop checks. Use `npm run test:e2e:full` before a release or after a layout-sensitive change to cover all 13 widths from 320px to 1920px. Both modes also exercise the mobile menu, carousel, keyboard and reduced-motion behavior, enquiry flows, privacy page and 404 response. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when using a compatible system Chromium instead of Playwright's downloaded browser. Screenshots are written under `test-results/responsive/`; each run clears stale screenshots first.

To preview the static files locally, run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/`. A static server does not run `src/worker.js`, so the form stays unavailable and only the visible email address works in this preview. These checks do not deploy or contact production.

For an explicitly authorized live read-only smoke check, run `npm run test:live -- --origin https://events.ymgconsultingservices.com`. It verifies public pages, assets, the approved PDF, error routes, intake readiness and the health endpoint without submitting an inquiry. See [release verification and rollback](deploy/README.md#release-verification-and-rollback).
