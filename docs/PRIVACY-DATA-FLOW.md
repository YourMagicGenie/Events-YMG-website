# Events privacy data-flow and research record

Updated 11 November 2026. The owner directs a self-managed, best-effort policy using current comparable businesses and authoritative sources. Professional sign-off is no longer an imposed release gate; technical/factual verification remains necessary.

## Release boundary

Production remains on the earlier standalone Worker and mail-app draft flow. Source now contains the direct-send-capable UI, self-hosted fonts, founder portrait, and bilingual notice intended to ship with that source. The notice describes online delivery only **when available**, and the direct-email alternative when it is not. Do not deploy just this notice onto the old Google-Fonts page: publish source and notice together, then audit actual requests/cookies. GitHub merges do not themselves deploy Events.

## Identity

Frederic David, Genova, P.IVA 03044510992: visually verified from the VAT assignment certificate in the owner's Gmail. Public disclosure limited to those facts. No private certificate, home address or personal tax code is included. See BUSINESS-DISCLOSURE-REVIEW.md for the activity-code uncertainty.

## Source flow

| Processing | Data and purpose | Basis / controls |
| --- | --- | --- |
| Page hosting | Cloudflare receives connection/URL/browser data to serve and secure requests | Legitimate interest, Art. 6(1)(f); source does not intentionally log briefs |
| Online enquiry, when configured | Name, email, intent, organization when relevant, selected format, optional guests/timing/budget/message | Art. 6(1)(b) for requested pre-contract steps; 6(1)(f) for general/business-representative correspondence |
| Abuse checks | Turnstile technical signals/token and server IP-based rate limit | Security/abuse prevention; server verifies action/host; fails closed without config |
| Delivery | Authenticated Worker → Google Apps Script relay → fixed Workspace recipient, visitor Reply-To | No separate submissions database; acceptance is not proof of inbox delivery |
| Email fallback | Visitor's provider → Google Workspace | Visitor chooses whether to send |
| Fonts / portrait | First-party static assets | No Google Fonts request in candidate source |
| Hero | First-party responsive WebP illustration | No Unsplash resource request in candidate; AI provenance documented |
| Optional metrics | Disabled in configuration | Do not enable without corresponding notice/processing review |

## Retention and operational practice

Use purpose-based criteria rather than copying another business's arbitrary 24-month period. Review closed correspondence for deletion once response/proposal/follow-up is no longer needed. Restrict records retained for a concrete legal duty or dispute to that purpose. This is a manual operator practice, not an automated mailbox deletion job; no Gmail deletion or retention setting was changed. Provider backups and other security data have their own lifecycle.

The live Events settings read on 11 November report persisted invocation logs/traces at 10% sampling and Logpush disabled. Cloudflare documents standard Workers Logs retention of 3 days (Free) / up to 7 days (Paid). This is not proof that every Cloudflare security log has that retention. Candidate production config should avoid unnecessary logging and never log brief bodies or secrets.

## Research, checked 11 November 2026

- Keplero Agency, updated 12 May 2026: useful separation of controller, form data, purposes/bases, providers, retention, transfers and rights. https://www.kepleroagency.com/privacy-policy/
- Lavender Haze Events, updated 15 February 2026: useful event-brief categories and service-specific provider disclosure. https://lavenderhazeevents.com/en/privacy-policy
- Neither is copied verbatim. Their databases, analytics, marketing/chat tools, consent banner and retention periods do not describe YMG Events and were not adopted.
- GDPR Articles 5, 6, 12–13, 15–22 and 44–49: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- Garante’s current notice (28 May 2025), structural reference: https://www.garanteprivacy.it/informativa-protezione-dati
- Cloudflare Customer DPA and transfer safeguards: https://www.cloudflare.com/cloudflare-customer-dpa/
- Google’s current Cloud DPA (Workspace URL redirects here): https://cloud.google.com/terms/data-processing-addendum/
- Turnstile: https://www.cloudflare.com/turnstile-privacy-policy/
- Log lifecycle: https://developers.cloudflare.com/workers/observability/logs/workers-logs/

Provider terms describe standard safeguards; they do not establish a personally audited account setup. No EU-only storage guarantee, blanket GDPR certification, zero-cookie guarantee, or automatic email erasure is claimed.

## Remaining factual checks

1. Verify the actual released host's resource requests/cookies, same-origin form behavior, secrets and non-sensitive mailbox/Reply-To delivery. Keep metrics off.
2. Confirm applicable provider agreements/account retention settings and enact closed-enquiry review. No professional appointment is required by this workflow.
3. Resolve current business classification/activity-code and any required public contracting address before making unsupported registrations or transactional-sales claims.
