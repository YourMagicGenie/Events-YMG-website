# Events Worker usage baseline (#141)

Recorded 26 November 2026 from the Cloudflare dashboard (Workers & Pages →
`ymg-events-website` → Metrics, Workers plans, and the Workers & Pages usage
panel). Active version `7d4414cc`. The 30-day window starts 27 October, before
the public launch, so early days are light.

## Plan and quotas

- The account is on the **Workers Free** plan: 100,000 requests per day shared by
  **every Worker on the account** (Events, Science, DnD, Brewing, Porto Aperto
  calendar), up to 10 ms CPU per request, 50 subrequests per request.
  Analytics Engine Free allows 100,000 data points written per day.
- On Free, static-asset requests that never reach a Worker are free and
  unlimited. With `run_worker_first: true` every Events request counts as a
  Worker invocation against the shared daily quota. There is no per-request
  charge on Free; going over the quota makes requests fail instead.

## Events, last 30 days

| Metric | Value |
| --- | --- |
| Worker invocations | 11.1k (≈ 370 a day) |
| Asset requests | 7.97k (cache hit rate 88.9%) |
| Asset responses by status | about 3k 2xx, 2k 3xx, 2.66k 4xx, 0 5xx |
| Subrequests | 8.42k |
| Errors | 0 (no CPU, memory or exception failures) |
| CPU time | P50 0.61 ms, P99 2.42 ms (Free limit 10 ms) |
| Wall time | P50 25 ms, P99 102 ms |
| Memory | P99 2.6 MB |

Request mix: about 72% of invocations end in an asset response and the
rest are Worker-generated (API, health checks, redirects, headers-only
answers). About a third of asset responses are 4xx, probably scanner
probes for paths the site does not have (not checked path by path). Traffic comes from Milan first, then many
data-centre locations, which fits crawlers and the hourly health and smoke
checks as well as visitors.

Account-wide on 26 November at about 10:00 UTC: **920 / 100,000** requests
today. Events uses well under 1% of the shared daily quota.

## Decision

Keep `run_worker_first: true`. On the Free plan it costs nothing, Events uses
under 1% of the daily quota, CPU is far below the limit, and the Worker is
what applies the security headers, redirects and API routing that the release
smoke checks. Asset-only routing or extra caching would save nothing
measurable now and would risk serving assets without the Worker's headers.

## When to look again

Check Workers & Pages → Usage and this Worker's Metrics when any of these
happens:

- account-wide requests pass **50,000 a day** (half the shared Free quota), or
  Events alone passes **5,000 invocations a day**;
- CPU P99 rises above **5 ms**, or any Exceeded CPU / Exceeded Memory errors appear;
- asset 4xx grows to most of the traffic (a crawler or attack worth a WAF or
  rate-limit rule);
- the account moves to Workers Paid, where each invocation is billed after
  10 million a month. At current volume that is still well inside the
  included amount.

If a revisit shows real pressure, first consider serving fingerprinted
static assets without the Worker (`run_worker_first` as a path list), then
re-run the live smoke for HTML, API, redirects, errors and headers.
