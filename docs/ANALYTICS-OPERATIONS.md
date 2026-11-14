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
| `inquiry_failure` | A valid inquiry could not proceed | locale, intent, format, fixed failure category |
| `relay_accepted` | Google Apps Script returned an affirmative acceptance response | locale, intent, format |
| `relay_failure` | The relay did not return an affirmative acceptance response | locale, intent, format, `relay_failure` category |

Each point has `double1 = 1`. Worker code never records a `delivered` event:
the relay response cannot prove final mailbox receipt. The relay-success label
means **accepted**, not delivered or confirmed.

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
4. In Cloudflare, open **Observability → Alerts → Monitors** and create an email
   threshold monitor for the `events_metrics` dataset. Use this query, a
   15-minute lookback and a threshold of at least 2 failures; send to the
   owner-controlled email destination and repeat at most hourly:

   ```sql
   SELECT COALESCE(SUM(_sample_interval * double1), 0) AS relay_failures
   FROM events_metrics
   WHERE index1 = 'relay_failure'
     AND timestamp >= NOW() - INTERVAL '15' MINUTE
   ```

   This threshold favors actionable alerts for a low-volume site. A single
   failed request will not page anyone; the Worker still returns a clear retry
   message and direct-email fallback. Review the custom query in the dashboard
   before saving it, since monitor availability depends on the Cloudflare plan
   and account permissions.
5. Verify the monitor with a controlled relay-failure test, ensure its email
   destination is restricted to the owner, and record the real alert result on
   issue #30. Do not put customer data or inquiry content in alert names,
   labels, or notes.

## Operational limits

- A monitor based on this dataset cannot alert if analytics itself is disabled
  or its binding is unavailable. Keep the feature disabled until the dataset,
  account access and monitor have all been verified.
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
