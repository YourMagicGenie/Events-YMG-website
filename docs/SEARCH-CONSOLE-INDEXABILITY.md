# Events search indexability review

**Reviewed:** 10 November 2026  
**Scope:** `https://events.ymgconsultingservices.com/` and its English/Italian public routes only.

## Verified in the repository source

- `dist/robots.txt` allows crawling and points to the Events `sitemap.xml`.
- `dist/sitemap.xml` contains the canonical English and Italian home and privacy pages once each. The two 404 pages are excluded.
- The four public pages declare self-canonicals, titles, descriptions and Open Graph titles; none blocks indexing. The home pages explicitly set `index,follow`. English/Italian home and privacy routes publish reciprocal `hreflang` links.
- The English subdomain home page publishes `Organization` and `WebSite` JSON-LD for the visible **YMG Events** name, the Events site URL, its 180×180 brand icon and the public general-enquiry address `hello@ymgconsultingservices.com`. It does not assert an unverified legal name, physical address, phone, social profile, rating, review or event.
- The branded English and Italian 404 pages are `noindex,follow` and are absent from the sitemap.

These are source checks. They do not establish the live Worker response or Google’s crawl/index status. Structured data expresses a preference and helps describe the site; it does not promise a rich result or indexing.

## Search Console follow-up — owner required

No Search Console property report or URL Inspection result was available during this review. The connected tools do not expose Search Console, and the browser access policy blocked navigation to the Search Console page. No Search Console data was modified and no indexing request was submitted.

When access is available, inspect these URLs in the Events property:

1. `https://events.ymgconsultingservices.com/`
2. `https://events.ymgconsultingservices.com/it/`
3. `https://events.ymgconsultingservices.com/privacy.html`
4. `https://events.ymgconsultingservices.com/it/privacy.html`

For each URL, record the inspection date, whether Google knows the URL, crawl and indexing permission, last crawl, user-declared canonical, Google-selected canonical, sitemap association and any specific issue code. Request recrawling only when the live URL is accessible and a changed page needs reprocessing; a sitemap or request is a hint, not a guarantee.

Google references:

- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Site names in Google Search](https://developers.google.com/search/docs/appearance/site-names)
- [URL Inspection tool](https://support.google.com/webmasters/answer/9012289)
- [Ask Google to recrawl a URL](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
