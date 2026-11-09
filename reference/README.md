# Reusable intake implementation — source references

The Events form handler in `src/form-handler.js` adapts the relevant validation,
Turnstile and relay behavior from the existing, tested YMG Consulting Services
website, without copying its scientific-site router or sensitive configuration.

Original implementation (separate, private repository):

- `YourMagicGenie/ymg-scientific-website/v2/src/worker.js`
- `YourMagicGenie/ymg-scientific-website/v2/integrations/google-apps-script/Code.gs`
- `YourMagicGenie/ymg-scientific-website/v2/scripts/test-assessment-worker.mjs`

Use the **existing** Google Apps Script relay deployment if it accepts the
Events-specific safe subject and body. Do not copy its secret or make a second
relay deployment by default. `src/form-handler.js` is not wired into the
generated live Events Worker yet. The client form still uses `mailto:` until
issue #10 is implemented, configured and verified with a real non-sensitive send.

The implementation intentionally uses the Events host and Turnstile action
`events_enquiry`; configure this exact action/hostname before submitting to
production. A valid relay response means the email transport accepted the
request, not proof of mailbox receipt. Use the real inbox/Reply-To acceptance
gate in issue #10. Add rate limiting as part of the integration work.
