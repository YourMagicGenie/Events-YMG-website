# Deployment and recovery

**Production:** https://events.ymgconsultingservices.com/ — Worker `ymg-events-website`.

## Current publishing path

Cloudflare Workers Builds watches `main` in `YourMagicGenie/Events-YMG-website`, root `/`, runs `npm run build`, then `npm run deploy:auto`. The latter uses the pinned Wrangler and explicit `wrangler.production.json`. GitHub PR unit/site/browser checks must pass before merges. Builds repeats unit/site checks before upload; it does not independently wait for GitHub checks on arbitrary direct pushes.

## Current production state

Checked 27 November 2026 against the live domain and `npx wrangler deployments list --config wrangler.production.json`. Earlier sections below are dated evidence.

| Area | Current state | Where it is defined or checked |
| --- | --- | --- |
| Active version | `cf56d3e5` at 100% when checked (rollback target `79810d97`); every merge creates a new one, so read the live value | `wrangler deployments list` |
| Inquiry intake | Events Worker validates and rate-limits, then forwards over the `SCIENCE_INTAKE` service binding to `ymg-science-website`, which verifies Turnstile and relays to Google Workspace. No Turnstile secret or relay credential is set on Events. | `wrangler.production.json`, `src/science-intake.js`, [shared intake](../docs/SCIENCE-INTAKE.md) |
| Public readiness signal | `/api/events/config` → 200 `ready: true` with a site key; `/api/events/health` → 200 with `intake`, `limiter` and `metrics` all `ok` | `test/live-smoke.mjs`, `test/live-health.mjs` |
| Aggregate metrics | Enabled since 14 November 2026 (`EVENTS_METRICS_ENABLED`, `events_metrics` dataset, 30/minute limiter); `/api/events/metrics/config` → `enabled: true` | [analytics operations](../docs/ANALYTICS-OPERATIONS.md) |
| Worker logs | `observability.enabled: false` in the production config, applied on every deploy | `wrangler.production.json` |
| Previews | `wrangler.json` (`ymg-events-preview`) has no intake binding and metrics off. Version URLs of the production Worker have the binding, but the Science adapter accepts only the `events.ymgconsultingservices.com` origin, so they also report the form unavailable. | `src/science-intake.js` |
| Alerting | Hourly **Production health** workflow (GitHub emails a failed run) and the Cloudflare monitor on `inquiry_outage` / `intake_not_ready`, tested 26 November 2026 | [analytics operations](../docs/ANALYTICS-OPERATIONS.md#health-endpoint), #129 |
| Release and rollback | Owner-approved automatic release: a checked squash merge to `main` publishes; the agent or owner who merges records the rollback target and verifies the Cloudflare build | sections below |

What these checks cannot show: mailbox receipt and Reply-To (owner-only check, #129), Science's own logging and retention settings, and provider account settings that have not been read from the dashboard. A successful deployment is not a mailbox-delivery test.

The original live bundle is a generated standalone `deploy/cloudflare-worker.mjs` in the Sites-managed source. It is **not** copied as a second editable source of truth. That launch history no longer describes the active deployment path. Current releases package `src/worker.js` and editable `dist/` assets.

## Local and staged checks

- `npm ci && npm test`
- `npx playwright install chromium && npm run test:e2e:full`
- `npx wrangler deploy --config wrangler.production.json --dry-run`
- `npm run test:live -- --origin https://<version-host> --allow-intake-disabled` for a version or preview URL (intake is unavailable there by design, so the health check is skipped), and the full read-only check without the flag against the public domain afterwards.

`wrangler.json` remains an isolated `ymg-events-preview` configuration; no production domain is attached to it. `npm run deploy:preview` selects that file. Production version URLs use their version's actual resources, not an isolated database/environment. No submission data store exists here. Never assume that a preview label isolates resources.

*Dated evidence, 11 November 2026:* the first staged build was tested at the version URL for `6f991d2a-a714-4587-ba38-86bb32edfb62`: bilingual home/privacy pages, fonts/hero/portrait, robots/sitemap, 404/405, GET/HEAD and the expected unavailable config response passed. Then the owner-approved production path was activated.

## First automatic production release — 11 November 2026 (dated evidence)

At that time the form had no runtime configuration and metrics were off; both changed later (Science binding, then metrics on 14 November).

- Checked PR #72 merged commit `ce7c690b3224998a170beac60b7120b3438f3c69`.
- Cloudflare push-event build `8ce03184-0c66-4d90-895c-da49c668d0eb` succeeded automatically.
- Active version `7ac94e2c-a6c7-43a0-8310-93625da9529a`, deployment `d5ba90c7-2392-4ad8-928a-f77b52433bf8`, 100% traffic at 07:24 UTC.
- Public smoke passed; served PDF SHA-256 equals the approved master. Enquiry config returns 503 / `ready:false`, accurately reflecting missing runtime settings. No test enquiry was sent. Metrics remain disabled.

## Release verification and rollback

Before merging, record the current production version as the rollback target:

```sh
npx wrangler deployments list --config wrangler.production.json
```

`npm run deploy:auto` uploads the Worker and then runs the read-only live smoke (`test/live-smoke.mjs`) against `https://events.ymgconsultingservices.com/`, retrying for up to 240 seconds while the edge picks up the new version. It checks:

- the EN/IT home, privacy, robots, sitemap and key assets return 200 with security headers, and real 404s for unknown EN/IT pages and API paths;
- `/` links the English guide and `/it/` the Italian guide, and both served PDFs are byte-identical to this release's `dist/downloads/`;
- every same-origin script and stylesheet on both homepages and both privacy pages, plus the relative modules those scripts import, matches this release's `dist/` copy (line endings normalized), so a partial asset rollout or a stale edge copy fails the release (#141);
- `/api/events/config` answers HTTP 200 with `ready: true` and a site key (`--allow-intake-disabled` exists only for previews without form secrets);
- `/api/events/health` answers HTTP 200 with intake, submission limiter and metrics all `ok`, so a release that drops a binding fails here. The **Production health** workflow repeats this check every hour (`node test/live-health.mjs`; see `docs/ANALYTICS-OPERATIONS.md`);
- `HEAD /` returns 200 with no body.

If any check still fails when the wait runs out, the command exits non-zero, so the Cloudflare build is marked **failed** (visible in Workers & Pages → ymg-events-website → Deployments and on the merge commit's Cloudflare status). The new version is already serving at that point: inspect the failure in the build log and either roll back or ship a corrective PR. Run the same check by hand with:

```sh
node test/live-smoke.mjs --origin https://events.ymgconsultingservices.com/ --wait 60
```

The smoke never submits the form. Mail delivery and Reply-To are a separate, controlled acceptance check (see [analytics operations](../docs/ANALYTICS-OPERATIONS.md) and #129).

To roll back, pause automatic builds first so the next merge does not redeploy the candidate, then:

```sh
npx wrangler rollback <previous-version-id> --config wrangler.production.json
```

A rollback restores Worker code and assets only, not external resource state. Verify the public site with the smoke, record the incident, and release a checked corrective commit before resuming automatic publishing. Do not change unrelated YMG Workers, routes or mail DNS.

See [configuration and DnD comparison](../docs/CLOUDFLARE-AUTO-PUBLISH.md).
