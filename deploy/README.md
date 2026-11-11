# Deployment and recovery

**Production:** https://events.ymgconsultingservices.com/ — Worker `ymg-events-website`.

## Current publishing path

Cloudflare Workers Builds watches `main` in `YourMagicGenie/Events-YMG-website`, root `/`, runs `npm run build`, then `npm run deploy:auto`. The latter uses the pinned Wrangler and explicit `wrangler.production.json`. GitHub PR unit/site/browser checks must pass before merges. Builds repeats unit/site checks before upload; it does not independently wait for GitHub checks on arbitrary direct pushes.

The current GitHub source has an inline form. It is deliberately unavailable without its Turnstile and relay runtime configuration, and offers direct email. A successful deployment is not a mailbox-delivery test. See #10 and docs/PRIVACY-DATA-FLOW.md.

The original live bundle is a generated standalone `deploy/cloudflare-worker.mjs` in the Sites-managed source. It is **not** copied as a second editable source of truth. That launch history no longer describes the active deployment path. Current releases package `src/worker.js` and editable `dist/` assets.

## Local and staged checks

- `npm ci && npm test`
- `npx playwright install chromium && npm run test:e2e:full`
- `npx wrangler deploy --config wrangler.production.json --dry-run`
- `npm run test:live -- --origin https://<approved-version-host>` before promotion, and the same read-only check against the public domain afterwards.

`wrangler.json` remains an isolated `ymg-events-preview` configuration; no production domain is attached to it. `npm run deploy:preview` selects that file. Production version URLs use their version's actual resources, not an isolated database/environment. No submission data store exists here. Never assume that a preview label isolates resources.

The first staged build was tested at the version URL for `6f991d2a-a714-4587-ba38-86bb32edfb62`: bilingual home/privacy pages, fonts/hero/portrait, robots/sitemap, 404/405, GET/HEAD and the expected unavailable config response passed. Then the owner-approved production path was activated.

## First automatic production release — 11 November 2026

- Checked PR #72 merged commit `ce7c690b3224998a170beac60b7120b3438f3c69`.
- Cloudflare push-event build `8ce03184-0c66-4d90-895c-da49c668d0eb` succeeded automatically.
- Active version `7ac94e2c-a6c7-43a0-8310-93625da9529a`, deployment `d5ba90c7-2392-4ad8-928a-f77b52433bf8`, 100% traffic at 07:24 UTC.
- Public smoke passed; served PDF SHA-256 equals the approved master. Enquiry config returns 503 / `ready:false`, accurately reflecting missing runtime settings. No test enquiry was sent. Metrics remain disabled.

## Recovery

Known previous production version: `ce4f6609-d90c-410e-8ee7-9c20d7f289d7` (original launch bundle). Its prior deployment remains listed. A recovery changes live traffic; pause automatic builds before recovery so a subsequent merge does not immediately redeploy the candidate.

With an authenticated authorized CLI:

```sh
npx wrangler rollback ce4f6609-d90c-410e-8ee7-9c20d7f289d7 --config wrangler.production.json
```

Command syntax was verified using pinned Wrangler help; **rollback has not been exercised against production**. It restores the old UI/mail-app flow, not external resource state. Record the incident, verify the public site and release a checked corrective commit before resuming automatic publishing. Do not change unrelated YMG Workers, routes or mail DNS.

See [configuration and DnD comparison](../docs/CLOUDFLARE-AUTO-PUBLISH.md).
