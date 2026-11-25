# Events aggregate measurement and inquiry monitoring

## Current state

**Enabled in production on 14 November 2026** at the owner's direction (#30). The owner accepted Analytics Engine's fixed, automatic three-month retention. `wrangler.production.json` binds the `events_metrics` dataset as `EVENTS_ANALYTICS`, adds the separate 30/minute `EVENTS_METRICS_LIMITER` and sets `EVENTS_METRICS_ENABLED` to `"true"`. Both privacy notices (section 6, plus the provider and retention sections) describe the anonymous counts, legitimate-interest basis and three-month deletion. The isolated preview config keeps metrics off.

The site checks the Worker's same-origin `/api/events/metrics/config` endpoint.
When it is disabled, the browser sends no page, section, concept or inquiry
analytics events. When enabled, Cloudflare Workers Analytics Engine receives
one unlinked aggregate point per event. No cookie, browser storage, session ID,
visitor ID, fingerprint, IP address, user agent, referrer, URL, name, email,
business name, guest count, timing, budget, Turnstile token or free-text field
is written to the analytics dataset. The API accepts only allowlisted fields
and has a separate 30 requests/minute per-IP rate limit; that IP is used only
by the Cloudflare rate-limiter and is not included in the analytics point.

## Event schema

| Index (`index1`) | Meaning | Allowlisted dimensions (`blob1`–`blob5`) |
| --- | --- | --- |
| `page_view` | A page loaded | locale |
| `section_view` | A named main section reached at least 25% visibility, once per page load | locale, fixed section ID |
| `concept_interest` | A visitor selected an event concept | locale, fixed inquiry intent, fixed event format |
| `inquiry_attempt` | A valid, non-honeypot form payload reached the Worker | locale, fixed inquiry intent and format |
| `inquiry_failure` | An expected visitor-side rejection of a valid inquiry | locale, intent, format, rejection category |
| `inquiry_outage` | A dependency or upstream failure stopped a valid inquiry (**the alert counts this**) | locale, intent, format, outage category |
| `relay_accepted` | The production Science intake (HTTP 202 `ok:true`) or the direct Apps Script relay (`ok:true`) accepted the inquiry | locale, intent, format |
| `intake_not_ready` | `/api/events/config` could not offer the form, so no inquiry attempt can happen (**the alert counts this**) | `en` placeholder locale, readiness category |

Each point has `double1 = 1`. Worker code never records a `delivered` event:
the relay response cannot prove final mailbox receipt. The relay-success label
means **accepted**, not delivered or confirmed.

### Inquiry outcome taxonomy (#129)

Every `inquiry_attempt` is followed by **exactly one** outcome point:
`relay_accepted`, `inquiry_failure` or `inquiry_outage`. The same categories are
used on the production Science path and on the direct-relay fallback, so a
failure is never counted twice. The category is in `blob5`.

| Event | Category | Production Science path | Direct-relay path |
| --- | --- | --- | --- |
| `inquiry_failure` | `rate_limited` | Events limiter refused, or Science answered 429 | Events limiter refused |
| `inquiry_failure` | `turnstile_rejected` | Science answered 403 | siteverify said no, or wrong hostname/action |
| `inquiry_failure` | `intake_rejected` | Science answered 400 | — |
| `inquiry_outage` | `config_unavailable` | Binding or limiter missing; no `cf-connecting-ip` | Turnstile keys, relay URL/secret or limiter missing; no `cf-connecting-ip` |
| `inquiry_outage` | `limiter_unavailable` | The Events limiter threw | Same |
| `inquiry_outage` | `turnstile_unavailable` | — (Science verifies) | siteverify unreachable, timed out or non-2xx |
| `inquiry_outage` | `upstream_error` | Science answered 5xx, another status, or a non-JSON or non-`ok` body | Relay answered non-2xx, non-JSON or not `ok:true` |
| `inquiry_outage` | `upstream_timeout` | The 25 s binding timeout fired | The 20 s relay timeout fired |
| `inquiry_outage` | `upstream_unavailable` | The binding threw (network, missing target) | The relay fetch threw |

`intake_not_ready` uses `config_unavailable`, `upstream_error`,
`upstream_timeout` or `upstream_unavailable` with the same meanings for the
Science `/api/assessment/config` call. The retired `relay_failure` event and the
old `service_unavailable` and `relay_failure` categories are no longer written;
points recorded before #129 keep them until Analytics Engine deletes them after
three months.

### Health endpoint

`GET /api/events/health` is read-only, `no-store`, and writes no analytics. It
answers HTTP 200 only when all three checks pass, otherwise 503:

```json
{ "ok": true, "checks": { "intake": "ok", "limiter": "ok", "metrics": "ok" } }
```

`intake` is `ok`, `not_configured` or a readiness category; `limiter` is `ok` or
`missing`; `metrics` is `ok`, `disabled` (flag off) or `unavailable` (flag on but
the dataset or limiter binding is missing). It contains no keys, secrets, URLs or
visitor data. The **Production health** GitHub workflow
(`.github/workflows/production-health.yml`) calls it hourly at minute 23 with
`test/live-health.mjs`, and also requires `metrics: "ok"`. Because it runs outside
Cloudflare, it fails even when the Analytics Engine monitor cannot fire.
GitHub emails a failed scheduled run to the account that last changed the cron.
GitHub also disables schedules after 60 days without repository activity;
re-enable the workflow under **Actions** if that happens. `deploy:auto` checks the
same endpoint after each production deploy.

Analytics Engine stores points for three months and does not provide a shorter
per-dataset retention setting. If that retention is not approved, leave the
feature off. Limit dataset and monitor access to the owner and explicitly
authorized account administrators. Review aggregate counts at most monthly;
do not export them to a visitor-level system.

## Activation checklist

Complete these steps only after #9 privacy review:

1. Update both privacy notices with the approved purpose, legal basis, data
   categories, Cloudflare recipient, three-month retention and any consent
   requirement. Keep analytics disabled until this release is approved.
2. Bind an Analytics Engine dataset named `events_metrics` to the **production**
   `ymg-events-website` Worker as `EVENTS_ANALYTICS`. Set the Worker variable
   `EVENTS_METRICS_ENABLED` to the string `true`, and add the
   `EVENTS_METRICS_LIMITER` 30/60 binding. The example `ymg_events_preview_metrics`
   dataset in `wrangler.json` is preview-only.
3. Publish through the guarded preview and production flow in issue #3. Confirm
   the privacy page, one page-view point, section/concept points, one accepted
   test submission and a simulated relay failure before enabling the feature
   publicly. The accepted test proves relay acceptance only, not mailbox receipt.
4. In Cloudflare, open **Observability → Alerts → Monitors** (Beta since
   October 2026) and select **Create a Monitor** → **Threshold** → custom SQL.
   Monitors use the Analytics SQL API dialect, so the dataset is addressed as
   `events.analyticsEngine.events_metrics`, and sample weights are applied
   automatically. Custom SQL must return one numeric column named `value`,
   include an `accountTag` filter, and (in the recommended **Automatic**
   time-range mode) omit any timestamp filter, because Cloudflare supplies the
   window itself. No trailing semicolon. Replace `<ACCOUNT_ID>` with the ID on
   the account home page (kept out of this public repository):

   ```sql
   SELECT SUM(double1) AS value
   FROM events.analyticsEngine.events_metrics
   WHERE accountTag = '<ACCOUNT_ID>'
     AND (index1 = 'inquiry_outage' OR index1 = 'intake_not_ready')
   ```

   Trigger when the result is **≥ 1**, average over **1m**, run every
   **Automatic**, repeat notification after **1h**, and send to the owner's
   email destination only. Outages are rare on this low-volume site, so
   any failure is worth one email; the hourly repeat limit prevents floods. The
   Worker still shows visitors a retry message and the direct-email fallback.
   Visitor-side rejections (`inquiry_failure`) are deliberately not counted.
   To see which dependency failed, group the same query by `blob5` in the SQL
   API. **Until #129 the monitor counted `index1 = 'relay_failure'`**, which the
   production Science path never wrote, so it could not fire for production
   intake failures. Update the existing monitor's query to the one above.
5. Verify the alert path without breaking the live relay: temporarily change
   the monitor's condition to `index1 = 'page_view'` with the
   threshold **≥ 1**, open the site once, confirm the email arrives, then
   restore the query and threshold. This proves monitor → email delivery; the
   outage counters themselves are covered by `test/inquiry-alerting.test.mjs`.
   Record the real result on the issue. Do not put customer data or inquiry
   content in alert names, labels, or notes.
6. Separately, send one controlled inquiry from the live form with an inbox the
   owner controls and confirm it arrives and that **Reply** addresses the
   visitor's email (Reply-To). This is an owner-only check; the Worker cannot
   observe mailbox delivery.

## Operational limits

- A monitor based on this dataset cannot alert if analytics itself is disabled
  or its binding is unavailable, or if the Worker cannot run at all. The hourly
  **Production health** workflow covers those cases independently, but it cannot
  see a runtime write failure inside a bound dataset, and it notices a problem
  only at the next hourly run.
- `intake_not_ready` is written once per failed config request, so during an
  outage its count follows page loads, not distinct visitors.
- The fixed 30/minute metrics limiter is separate from the form submission
  limiter. Repeated refreshes or concept clicks can be sampled out by the
  limiter; these metrics are directional counts, not billing records.
- Analytics writes are best-effort and never block or change an inquiry
  response. Use Cloudflare Worker error/status metrics as a separate check for
  runtime and HTTP failures.
- No alert or metric is configured on the live Worker by this source change.

## References

- [Workers Analytics Engine and limits](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Analytics Engine limits and three-month retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
- [Wrangler Analytics Engine bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#analytics-engine-datasets)
- [Cloudflare Monitors](https://developers.cloudflare.com/notifications/monitors/)
- [Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)

## Activation history
- 11 November 2026: kept disabled pending the owner's retention decision. The parent-zone automatic RUM injection was disabled for Events only through configuration rule 99bc03ac741e44ccab032c4d13e9b655; that stays separate from these counts.
- 14 November 2026: owner approved activation and three-month retention; privacy notices updated in the same release. The relay-failure monitor (step 4) still has to be created and tested in the Cloudflare dashboard.
