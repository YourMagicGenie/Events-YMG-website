# Events privacy data-flow record

Reviewed 10 November 2026 against the published `ymg-events-website` Worker and the current repository tree. Cloudflare inspection was read-only. This record separates production observations from the newer form staged in this repository; it does not authorize a production release.

## Evidence and current production flow

| Area | Observed on the production Worker | Evidence / limit |
| --- | --- | --- |
| Host and configuration | `events.ymgconsultingservices.com` is served by the Cloudflare Worker `ymg-events-website`. The read-only Worker settings returned no runtime bindings, variable names or secret names; the deployment list returned no deployment IDs in that inspection. | Cloudflare API metadata and script read on 10 November 2026. A missing API field is not proof of provider-side retention settings. |
| Enquiry transport | The published Worker contains a form that builds a `mailto:` draft. It has no `/api/events/enquiry` route, Turnstile, direct email input or Google Apps Script submission. The visitor reviews the message in their email app and must choose Send. | Published Worker script. The currently deployed draft includes name, venue/business, format, guest estimate, timing, budget and free-text idea. The sending email address is supplied by the visitor's mail provider in the resulting email. |
| Mail recipient | The generated email is addressed to `hello@ymgconsultingservices.com`. If the visitor sends it, the message goes through their selected email provider to the Google Workspace mailbox. | Worker script. Mailbox retention and access configuration were not inspected. |
| Page resources | The deployed code requests fonts from Google Fonts. The production hero image is delivered from the Worker bundle; no Unsplash image URL was present in the inspected Worker script. | Worker script inspection; this is not an independent browser network trace from the public host. |
| Tracking and cookies | No analytics, advertising pixel, marketing-cookie or analytics-cookie implementation was found in the inspected Worker script. No cookie-setting code was found in the script. | Cloudflare may provide host-level security features outside this source. Confirm actual public-host cookies and response headers in a browser before considering the notice final. |
| Connection data | Cloudflare hosts and protects the Worker and can process request/network data needed to serve and secure it. | The specific log fields, retention period and account-level configuration were not available from the inspected Worker settings. |

## Repository source is staged ahead of production

The repository's current `dist/index.html`, `src/form-handler.js` and `src/worker.js` contain the planned same-origin direct-send form, Turnstile validation and Google Apps Script relay path. The Worker configuration has no production bindings/secrets, and the public Cloudflare Worker inspected above does not contain those routes or integrations. The repository also self-hosts fonts and uses an Unsplash-hosted responsive hero, while the inspected production Worker requests Google Fonts and serves its bundled hero locally. These differences are not statements about current production processing.

The direct-send form is not deployed to the public host.

The bilingual public notices therefore describe the currently published `mailto:` flow and identify the repository's direct-send form as not deployed. Before the newer form is published, update the notice to match the actual route, Turnstile configuration, relay, recipients, request fields and verified mailbox behavior. Re-audit fonts, images, cookies and analytics whenever a production version changes.

## Owner and qualified-review items before treating the notice as final

1. Confirm the data controller's full legal identity, trading name, and the public contact details that should appear. Do not infer a registered entity or P.IVA from the YMG brand.
2. Confirm the applicable legal basis for public-site security logs and each kind of enquiry, including messages from representatives acting for a business. The notice's Article 6(1)(f) and Article 6(1)(b) descriptions are proposed classifications, not verified advice.
3. Check Cloudflare and Google account terms and settings. Record the actual international transfer mechanism and safeguards applicable to these accounts; provider privacy-policy links alone do not verify the account-specific mechanism.
4. Confirm Cloudflare host/log retention and any Google Workspace retention, deletion, access and backup settings. Keep retention expressed as a useful period or evidence-based criterion.
5. Inspect the live public host in a browser for response cookies, network requests, fonts, redirects, and its English/Italian notice and form links. API source inspection did not independently confirm the public HTTP/browser behavior.
6. Have a qualified privacy adviser review the English and Italian notice, the legal bases, transfer disclosures and whether any cookie or consent interface is required for the actual host configuration.
7. Before releasing the direct-send form, verify its configured Worker bindings, Turnstile hostname/action, relay delivery, mailbox receipt, error behavior and updated notice. A relay acceptance response is not proof of mailbox delivery.

The GDPR's information duties are summarized in [Article 13 of Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng). The Italian authority's complaint information is available from the [Garante per la protezione dei dati personali](https://www.garanteprivacy.it/diritti/come-agire-per-tutelare-i-tuoi-dati-personali/reclamo).
