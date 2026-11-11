# Shared production inquiry service

Events production binds SCIENCE_INTAKE to the existing ymg-science-website Worker. It validates origin, fields and its own rate limit first, then forwards the form internally to /api/assessment using the Events request origin. Science verifies the single-use Turnstile token against that hostname and action assessment, then uses its existing authenticated Google Apps Script / Workspace relay. No Science secret or code is copied or changed. The existing root-domain Turnstile widget authorizes its subdomains.

The public configuration exposes only readiness, site key and action. Every event field is mapped to the existing schema; notification subject is New Live Events inquiry — sender name. Previews cannot use this production adapter. Existing independently configured direct transport is retained for isolated deployments.

A service acceptance is not final mailbox delivery. A real human form submission and inbox receipt remain the final delivery check; invalid-token checks must reject without sending mail. Do not bypass Turnstile or publish relay credentials.
