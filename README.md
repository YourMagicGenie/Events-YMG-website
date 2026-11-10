# YMG Events website

Canonical source and issue tracker for the live [YMG Events website](https://events.ymgconsultingservices.com/).

## Live hosting / source provenance

This repository was initialized on 2026-11-09 from the selected YMG Events Sites-managed source (`appgprj_6af1846f038c8191a5028170979bd4b3`, commit `76dd4f9580e546dac33e6605534414ad77408f10`). The live public domain is hosted separately on the Cloudflare Worker **`ymg-events-website`**. GitHub pushes are **not** wired to publish this domain. Publishing a Sites preview also does not update production.

- `dist/`: editable buildless website, privacy notice, assets, robots/sitemap copied from the current Events source.
- `deploy/`: notes and the standalone Worker bundle used by the current production architecture. A future pipeline should generate and verify the bundle from source rather than hand-editing embedded content.
- `reference/`: vetted, non-secret implementation patterns borrowed from the [main YMG website](https://github.com/YourMagicGenie/ymg-scientific-website) to accelerate Events-specific direct enquiry delivery. Reference code is **not** wired to production until tested and explicitly integrated.

## Coding-agent handoff

Use [the prioritized GPT coding handoff](docs/GPT_CODING_HANDOFF.md) when starting a new implementation session. It inventories the 33 approved issues, actual source/deployment boundaries, critical dependency order, test gates and PR/CI expectations. The handoff is a dated snapshot; recheck open issues, repository state, live Worker and Project Keeper before changing code.

## Direct enquiries

`dist/index.html` now contains the inline Events enquiry form and `src/worker.js` routes `/api/events/config` and `/api/events/enquiry` through the tested `src/form-handler.js` validation, Turnstile and existing Google Apps Script relay pattern. `dist/assets/enquiry-client.js` submits the complete form to the same-origin Worker and reports acceptance or failure without opening an email app. The runtime expects `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GOOGLE_RELAY_URL`, and `GOOGLE_RELAY_SECRET`; values belong only in the Worker environment. Direct submission also requires the non-secret `EVENTS_SUBMISSION_LIMITER` binding, configured for five requests per minute per source IP. Cloudflare documents this limiter as approximate per location; its namespace ID must be unique in the account. The current production Worker remains unchanged: the source path still needs an isolated preview and non-sensitive mailbox delivery verification before a guarded release. See [Issue #10](https://github.com/YourMagicGenie/Events-YMG-website/issues/10) and [deployment notes](deploy/README.md).

## Safety and deployment

- Record live Worker version and a working rollback before any upload. Do not transfer Events hostname back to the old Atlas placeholder.
- Do not copy Cloudflare account/zone identifiers or live credentials into public configuration or issue bodies.
- Preserve the main Atlas/Science, Porto Aperto, Brewing and DnD deployments and email DNS.
- The public repo is intentionally separate from the private scientific site; do not copy unrelated scientific source/assets.

See [Issue #3](https://github.com/YourMagicGenie/Events-YMG-website/issues/3) for the complete source/parity and guarded deployment checklist.

## Local checks

The site is buildless. With Node.js 22 or newer, run `npm test` to execute the form-handler, inline-client, Worker-route and static-site smoke tests. To preview the static files locally, run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/`. A static server does not run `src/worker.js`, so the direct-send button stays unavailable and only the visible email fallback works in this preview. These checks do not deploy or contact production.
