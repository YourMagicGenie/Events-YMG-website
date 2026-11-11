# YMG Events website

Canonical source and issue tracker for the live [YMG Events website](https://events.ymgconsultingservices.com/).

## Live hosting / source provenance

This repository was initialized on 2026-11-09 from the selected YMG Events Sites-managed source (`appgprj_6af1846f038c8191a5028170979bd4b3`, commit `76dd4f9580e546dac33e6605534414ad77408f10`). The live public domain is hosted separately on the Cloudflare Worker **`ymg-events-website`**. Cloudflare Workers Builds now watches `main` and runs `npm run build` followed by `npm run deploy:auto`. Checked PR merges publish automatically; a Sites preview does not control production. See [publishing configuration](docs/CLOUDFLARE-AUTO-PUBLISH.md).

- `dist/`: editable buildless website, privacy notice, assets, robots/sitemap copied from the current Events source.
- `deploy/`: deployment and recovery notes for the separate production Worker. Its original generated bundle remains in the Sites-managed source as historical provenance. Current releases package `dist/` and `src/` directly; no second editable embedded bundle is maintained.
- `reference/`: vetted, non-secret implementation patterns borrowed from the [main YMG website](https://github.com/YourMagicGenie/ymg-scientific-website) to accelerate Events-specific direct enquiry delivery. Reference code is **not** wired to production until tested and explicitly integrated.

## Coding-agent handoff

Use [the prioritized GPT coding handoff](docs/GPT_CODING_HANDOFF.md) when starting a new implementation session. It inventories the 33 approved issues, actual source/deployment boundaries, critical dependency order, test gates and PR/CI expectations. The handoff is a dated snapshot; recheck open issues, repository state, live Worker and Project Keeper before changing code.

## Direct enquiries

`dist/index.html` now contains the inline Events enquiry form and `src/worker.js` routes `/api/events/config` and `/api/events/enquiry` through the tested `src/form-handler.js` validation, Turnstile and existing Google Apps Script relay pattern. `dist/assets/enquiry-client.js` submits the complete form to the same-origin Worker and reports acceptance or failure without opening an email app. The runtime expects `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GOOGLE_RELAY_URL`, and `GOOGLE_RELAY_SECRET`; values belong only in the Worker environment. Direct submission also requires the non-secret `EVENTS_SUBMISSION_LIMITER` binding, configured for five requests per minute per source IP. Cloudflare documents this limiter as approximate per location; its namespace ID must be unique in the account. Production now serves this repository source. Direct sending remains unavailable until the required runtime settings are configured and non-sensitive mailbox delivery is verified; the direct-email fallback remains available. See [Issue #10](https://github.com/YourMagicGenie/Events-YMG-website/issues/10) and [deployment notes](deploy/README.md).

## Safety and deployment

- Record live Worker version and a working rollback before any upload. Do not transfer Events hostname back to the old Atlas placeholder.
- Do not copy Cloudflare account/zone identifiers or live credentials into public configuration or issue bodies.
- Preserve the main Atlas/Science, Porto Aperto, Brewing and DnD deployments and email DNS.
- The public repo is intentionally separate from the private scientific site; do not copy unrelated scientific source/assets.

See [Issue #3](https://github.com/YourMagicGenie/Events-YMG-website/issues/3) for the complete source/parity and guarded deployment checklist.

## Local checks

The site is buildless. With Node.js 22 or newer, run `npm ci` and `npm test` for the form-handler, inline-client, Worker-route and static-site smoke tests. For rendered browser coverage, install Playwright's Chromium with `npx playwright install chromium` and run `npm run test:e2e` for the focused 320px mobile, 768px tablet and 1440px desktop checks. Use `npm run test:e2e:full` before a release or after a layout-sensitive change to cover all 13 widths from 320px to 1920px. Both modes also exercise the mobile menu, carousel, keyboard and reduced-motion behavior, enquiry flows, privacy page and 404 response. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when using a compatible system Chromium instead of Playwright's downloaded browser. Screenshots are written under `test-results/responsive/`; each run clears stale screenshots first.

To preview the static files locally, run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/`. A static server does not run `src/worker.js`, so the direct-send button stays unavailable and only the visible email fallback works in this preview. These checks do not deploy or contact production.

For an explicitly authorized live read-only smoke check, run `npm run test:live -- --origin https://events.ymgconsultingservices.com`. It verifies public pages, assets, the approved PDF, error routes and truthful form readiness without submitting an enquiry.
