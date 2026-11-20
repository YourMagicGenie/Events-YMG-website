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
repository received a non-secret baseline on 2026-11-09. **Checked merges to `main` now trigger Cloudflare Workers Builds and deploy
the live custom domain.** Run the required PR checks before merging. The production Worker is
`ymg-events-website`. Capture current version and verify rollback before any
future release; do not overwrite the production binding or reattach it to the
main site's old construction placeholder.

Reuse vetted validation, Turnstile, Google Apps Script relay and test patterns
from `YourMagicGenie/ymg-atlas-website` where applicable. Do not copy
secrets, scientific content, domain-specific route redirects or unrelated
production settings into this public repository. Keep conceptual event
offerings truthful: do not invent delivered event history or clients.

## Owner language and design decisions

Use American **inquiry / inquiries / inquiring** in all visitor-facing English copy, accessible labels, feedback and errors. Keep the current share artwork readable within square crops and match the website green/gold/ivory palette. On 20 November 2026 (#100) the owner chose the real Unsplash candlelit long-table photo as the homepage hero, replacing the AI rooftop image, and asked for the lighter phone overlay (0.86 → 0.57). Keep that photo, its crops and overlay unless the owner picks a replacement from a visual comparison; do not use AI or realism-edited hero images or a split mobile layout. Source, crops and rollback are in `docs/ASSET-PROVENANCE.md`. The owner supplied #74 specifics in the 12 November 2026 copy worksheet; follow that worksheet for homepage, privacy and footer copy.

## Pull requests and merging (owner standing rule, 12 November 2026)

For every code-related issue or change, always open a pull request against `main` and squash-merge it as soon as all required checks are green, without waiting for further approval. Merging publishes production automatically through Cloudflare Workers Builds (same pattern as the DnD site), so never merge on red or skipped required checks, and verify the Cloudflare build after merge.
