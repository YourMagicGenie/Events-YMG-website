# Events automatic publishing — mirror the working DnD pattern

Verified 11 November 2026 by reading the live Cloudflare Workers Builds trigger and DnD source. No Cloudflare configuration was changed during this review.

## What DnD actually does

Cloudflare Workers Builds has a GitHub repository connection to `YourMagicGenie/YMG-DnD-Character-Sheet-Builder`. It watches `main` from repository root `/`, runs `npm run build`, then `npm run deploy:auto`. The latter runs `wrangler d1 migrations apply ymg-dnd-builder --remote && wrangler deploy`. Its Wrangler file names `ymg-dnd-character-builder`, serves Vite output from `docs/`, binds its D1 database, and declares `dnd.ymgconsultingservices.com` as a custom domain.

The deployment credential is managed inside Cloudflare Builds. The GitHub Actions workflows are separate tests/container publishing; they do not implement this Cloudflare publish path. A personal CLI token in a chat workspace is not needed for each deployment. DnD's trigger watches `main`; it is not intrinsically a “wait for GitHub CI” trigger. Passing PR checks before merge is what establishes that gate.

## Events is now connected

On 11 November 2026 the owner explicitly authorized activation. The repository was connected through the Cloudflare API and the existing Cloudflare-managed build token successfully uploaded a staged Events version. Its permissions were sufficient for Events; the earlier assumption that it was DnD-only was unverified and is superseded. No secret was retrieved, no token scope expanded and no DnD setting changed.

The first checked merge (#72) triggered an automatic production build and deploy. See deploy/README.md for build/version/recovery evidence. Subsequent checked source merges to main now publish Events. Documentation-only paths (`docs/**`, `*.md`) are excluded from builds.

## Active Events configuration

| Setting | Events value |
| --- | --- |
| Existing Worker | `ymg-events-website` |
| Git provider/repository | GitHub / `YourMagicGenie/Events-YMG-website` |
| Production branch | `main` |
| Root | `/` |
| Build command | `npm run build` (buildless site; validates unit/site tests) |
| Deploy command | `npm run deploy:auto` |
| Production config | `wrangler.production.json` |
| Static output | `dist/` |
| Domain | `events.ymgconsultingservices.com` |

Pinned project-local Wrangler avoids relying on an unpinned global CLI. `npm run deploy:auto` explicitly selects the production file. `npm run deploy:preview` explicitly selects the isolated preview file. The production config has separate rate-limit namespace `2026111110`, optional metrics disabled, no analytics binding, and observability disabled to avoid unnecessary persistent invocation logs. The production namespace was checked against all listed Worker settings: no other Worker uses it. Secrets are not copied from DnD and no D1 migration is needed for Events.

## Connect and activate

In Cloudflare: Workers & Pages → **ymg-events-website** → Settings → Builds → Connect → GitHub → **Events-YMG-website**. Use the table above and a Cloudflare-managed build token with permission to deploy this Events Worker (not the DnD-only token). Restrict the branch to `main`. Leave unrelated domains, DnD resources and mail DNS untouched.

The connection and production trigger are active. No new GitHub Actions deploy workflow or chat CLI token was required. Cloudflare owns the repository checkout/build/upload path. An existing managed build credential is shared with the previously configured build service; review that dependency before rotating/deleting it, since both build connections may rely on it.

Cloudflare can create and upload static assets from its own build environment, avoiding the connector's temporary upload-header limitation. Runtime form secrets still belong in the Events Worker: `GOOGLE_RELAY_URL`, `GOOGLE_RELAY_SECRET`, `TURNSTILE_SECRET_KEY`, and non-secret `TURNSTILE_SITE_KEY`. Hostname/action expectations are checked in `src/form-handler.js`. Without them the form fails closed and offers direct email; deployment is not mailbox-delivery verification.

Once connected, each checked PR merge to `main` starts a Cloudflare build and deploy. Verify the first build logs and the live home/Italian/privacy/404/assets/API behavior. Subsequent deployments follow the same path. PR CI still runs on GitHub; deployment builds run on Cloudflare and have Cloudflare's separate usage limits.

References:
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://github.com/YourMagicGenie/YMG-DnD-Character-Sheet-Builder/blob/main/wrangler.jsonc
- https://github.com/YourMagicGenie/YMG-DnD-Character-Sheet-Builder/blob/main/package.json
