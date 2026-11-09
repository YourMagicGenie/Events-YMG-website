# YMG Events Website — Agent instructions

This repository owns the **Events** website source, implementation backlog and
site-specific form/privacy/deployment work for
https://events.ymgconsultingservices.com/. It does not own the YMG Atlas/Science,
Porto Aperto, Brewing or DnD applications.

The durable project memory is in `YourMagicGenie/Obsidian-Project-Keeper`:

- `projects/ymg-events-website/YMG Events Website.md`
- `projects/ymg-events-website/YMG Events Website - Status.md`
- `projects/ymg-events-website/YMG Events Website - Decisions.md`

Read the project hub, status and relevant decisions before substantive changes.
Persist meaningful decisions, validated findings, blockers and next-action
changes there, without changing human-assigned portfolio focus.

The original selected design lives in a Sites-managed source repository; this
repository received a non-secret baseline on 2026-11-09. **A GitHub push does
not deploy the live custom domain.** The production Worker is
`ymg-events-website`. Capture current version and verify rollback before any
future release; do not overwrite the production binding or reattach it to the
main site's old construction placeholder.

Reuse vetted validation, Turnstile, Google Apps Script relay and test patterns
from `YourMagicGenie/ymg-scientific-website` where applicable. Do not copy
secrets, scientific content, domain-specific route redirects or unrelated
production settings into this public repository. Keep conceptual event
offerings truthful: do not invent delivered event history or clients.
