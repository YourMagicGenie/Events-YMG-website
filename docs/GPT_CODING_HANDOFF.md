# YMG Events — handoff for a high-capability GPT coding agent

**Owner:** Dante David / Your Magic Genie  
**Snapshot:** 9 November 2026  
**Source repository:** https://github.com/YourMagicGenie/Events-YMG-website  
**Live public site:** https://events.ymgconsultingservices.com/  
**Source baseline at handoff:** main commit 2ffa4ecd4b21d3bcaf88e6e3cd459e96cafffc5a (before this documentation file)  
**Work status at snapshot:** 33 open, priority-labeled issues; no GitHub PRs; no Actions workflow; no new Events production deployment from this repository.

> **Mission:** Implement the approved Events backlog in priority order, prepare reviewable and tested PRs, and make the existing site a credible, responsive, secure lead-generation tool for upscale events and venue partnerships in Genova. Preserve its established midnight-green, champagne-gold and ivory editorial direction. Do not treat this handoff as permission to bypass deployment safety, invent business history, expose credentials, merge unreviewed changes or change repository visibility.

## 0. Source-of-truth rules — read before coding

1. Read this repository's [AGENTS.md](../AGENTS.md), [README.md](../README.md), [deployment notes](../deploy/README.md), and the relevant live GitHub issues. Check main HEAD, open PRs, branch state, tests, and live website before assuming this snapshot remains current.
2. Consult persistent project memory: [Project Keeper hub](https://github.com/YourMagicGenie/Obsidian-Project-Keeper/blob/main/projects/ymg-events-website/YMG%20Events%20Website.md), [Status](https://github.com/YourMagicGenie/Obsidian-Project-Keeper/blob/main/projects/ymg-events-website/YMG%20Events%20Website%20-%20Status.md), [Decisions](https://github.com/YourMagicGenie/Obsidian-Project-Keeper/blob/main/projects/ymg-events-website/YMG%20Events%20Website%20-%20Decisions.md), and [audit map](https://github.com/YourMagicGenie/Obsidian-Project-Keeper/blob/main/projects/ymg-events-website/research/Events%20Website%20Desktop%20and%20Responsive%20Audit%20-%202026-11-09.md). Keep meaningful findings/decisions/next steps updated there. **Do not change portfolio now/next/later priorities without explicit owner authorization.**
3. The canonical implementation repository is **YourMagicGenie/Events-YMG-website**. The separate [ymg-scientific-website](https://github.com/YourMagicGenie/ymg-scientific-website) is reference material for proven form infrastructure and owns Atlas/Science, not Events page implementation. Preserve all other YMG sites, email DNS and Workers.
4. Treat the issue tracker as the most up-to-date source for details and acceptance tests. Every issue has a priority label and body value. Owner approved all B01–B18 and only optional O03, O05 and O06. **Do not quietly implement rejected/not-created optional O01, O02 or O04.**
5. This repository is currently **public**. A temporary public development sprint was discussed to use free public GitHub Actions minutes; a future switch to private is not yet performed or authorized as a specific action/date. No secrets, private checkpoints, actual personal/private data, internal keys, Cloudflare credentials, relay secrets or sensitive logs belong in Git or public PRs.

## 1. What exists versus what does not

| Component | Verified repository state | Production reality / gate |
| --- | --- | --- |
| Website | dist/index.html, dist/privacy.html, dist/robots.txt, dist/sitemap.xml, dist/assets/ | Mirrored from the chosen Sites design, not a GitHub-managed production deployment |
| Source | Buildless static HTML/CSS/JS in dist/ | Do not accidentally overwrite the live Worker or assume a GitHub push deploys it |
| Forms | src/form-handler.js, test/form-handler.test.mjs | Handler is staged but **not** wired to live Worker or visitor form |
| Tests | package.json has npm test → node --test test/*.test.mjs; five form tests previously passed | Re-run locally before altering; add focused integration/browser tests |
| CI | No .github/workflows at this snapshot | Design lean PR checks under #33; no automatic production release |
| Hosting | Production Cloudflare Worker named ymg-events-website | Independent of the Sites preview and GitHub repo; original generated bundle lives in Sites-managed source |
| Email | Main YMG has a proven Cloudflare Worker → Turnstile → Google Apps Script/Workspace relay | Current Events website still prepares a mailto: message; it does **not** send directly |
| Search | Live robots and sitemap serve home/privacy; canonical and social metadata exist | Search Console inspection and structured-data work remain open |
| Mobile | Source has breakpoints at 850px and 540px; navigation links disappear below 850px | Actual mobile rendering **not yet verified** by screenshot/device audit |

The originally selected Sites project is appgprj_6af1846f038c8191a5028170979bd4b3 (source commit 76dd4f9580e546dac33e6605534414ad77408f10). Its generated standalone Worker bundle was intentionally not imported as another hand-maintained source file. [deploy/README.md](../deploy/README.md) explains the recovery boundary.

## 2. Work order: highest-value execution path

**Critical queue (first):**

1. **[#3 — trustworthy source, build, preview, deploy and rollback](https://github.com/YourMagicGenie/Events-YMG-website/issues/3).** Establish a reproducible static-asset Worker build, isolated preview host, source parity, runtime secret-name documentation, live Worker version capture and rollback. Verify GET/HEAD, redirects, 404/405, assets, privacy, sitemap, robots, cache and safety headers. Do not move/reclaim the Events custom domain from another Worker or silently wire pushes to production.
2. **[#10 — actual in-page enquiry delivery](https://github.com/YourMagicGenie/Events-YMG-website/issues/10).** Connect UI to a secure same-origin Events handler based on staged code; add required reply email, sanitize and validate, configure Turnstile for the Events hostname/action and reuse the existing trusted Google Apps Script relay where compatible. The exact owner-requested button text is **“Send my inquiry email.”** It must not open a mail app. A relay-accepted response alone is not proof that a message reached the owner's mailbox.
3. **[#13 — accessible mobile navigation](https://github.com/YourMagicGenie/Events-YMG-website/issues/13).** Restore discoverable section navigation at narrow widths without header collisions, keyboard traps or mobile overflow. It may be implemented in a separate PR from #3/#10, but production promotion still depends on #3.

**Release dependency:** [#9 Events privacy](https://github.com/YourMagicGenie/Events-YMG-website/issues/9) must match the *actual deployed* enquiry stack before publishing direct-send. [#11 form affordance](https://github.com/YourMagicGenie/Events-YMG-website/issues/11) and [#16 legibility](https://github.com/YourMagicGenie/Events-YMG-website/issues/16) should be coordinated with the form UI. If Cloudflare, Turnstile, Google relay or mailbox verification is inaccessible, stop at a tested PR and report precisely which production checks remain blocked—never claim delivery works.

**High-priority experience pass:** Implement [#2 carousel](https://github.com/YourMagicGenie/Events-YMG-website/issues/2), [#4 hero](https://github.com/YourMagicGenie/Events-YMG-website/issues/4), [#5 positioning](https://github.com/YourMagicGenie/Events-YMG-website/issues/5), [#6 prototype-language removal](https://github.com/YourMagicGenie/Events-YMG-website/issues/6), [#12 real portrait](https://github.com/YourMagicGenie/Events-YMG-website/issues/12), plus approved localization, intent pathways, genuine proof, imagery, accessibility and technical SEO issues. Follow their actual acceptance criteria; group tightly related changes in one reviewed PR only if issue links and tests remain clear.

**Medium/low work:** After critical dependencies and high-priority blockers, tackle refined spacing, further context, 404, monitoring and future-approved optional work. O05 and O06 require *real delivered/scheduled events*, so template/model preparation must not publish placeholders that suggest existing bookings.

## 3. Non-negotiable product direction

- **Audience:** Real Genova venue owners, hospitality businesses, corporate/private hosts and higher-spending event guests. This is a commercial, refined YMG Events offer; it is distinct from Porto Aperto's younger, lower-budget, party-oriented events.
- **Look and feel:** Keep the selected elegant After Hours direction (dark midnight green, warm ivory, champagne accents, refined typography, evocative nightlife atmosphere). Add energy without turning it into a generic corporate or nightclub site.
- **Tone:** Speak as a service available to collaborate with venues, not as a startup “exploring higher-end evenings for a more mature audience.” Describe concrete value and a commercially honest process. Do not invent signed venues, executed premium events, clients, testimonials, attendance, ticket sales or revenue claims.
- **Hero:** Remove the “Discover the atmosphere” secondary CTA. Replace obviously synthetic-looking imagery with owner-approved authentic/licensed media; maintain crop, text overlay and strong primary CTA.
- **Examples:** Change wording exactly to **“SEVERAL WAYS THE NIGHT COULD UNFOLD”**. Show at least six differentiated formats in a horizontal/swipeable, keyboard-accessible deck. Remove concept category filters and all visible “Concept imagery,” “Proposed event formats,” “A YMG Event Concept” mockup labels. These remain examples of services, not fabricated case studies.
- **Partnership story:** Reduce repetitive lower sections and empty desktop middle gutter. Make owner benefits, organizer responsibilities, sound planning and direct enquiry easy to understand without a very long pitch.
- **Founder:** Show a genuine owner-approved photo. Name: **Dante David / Your Magic Genie**. Location: **Genova, Italy**, never “Geneva” from voice-transcription errors. Use verifiable real event/community experience only.
- **Lead capture:** Preserve style but make fields obviously editable; real inline pending/error/success states, no second Send click, correct mail subject including Events and sender, validated Reply-To, data-loss prevention and transport fallback.
- **Localization:** Provide reviewed Italian and English experiences under [#17](https://github.com/YourMagicGenie/Events-YMG-website/issues/17), with consistent privacy/form text and real metadata/hreflang.
- **Legal and trust:** Privacy reflects verified processors and retention; legal/business footer disclosures must use owner-confirmed facts, not guesses. Do not introduce analytics cookies or external services without corresponding policy/security checks.

## 4. Existing backend: reuse, do not reinvent

- [Staged Events handler](../src/form-handler.js) exports handleEventsApi and eventsNotificationSubject. Intended Events routes are **GET /api/events/config** and **POST /api/events/enquiry**.
- Intended Turnstile action is **events_enquiry**; host must be **events.ymgconsultingservices.com**. Check Turnstile hostname/action/secret on the backend; use honeypot, origin/content-type/size validation, bounded fields and rate controls.
- The staged module expects named configuration such as TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, GOOGLE_RELAY_URL, GOOGLE_RELAY_SECRET; these are **names only**. Never copy actual values into this repo, CI logs or documentation.
- Proven main-site references are in [reference/README.md](../reference/README.md), including private main repo files v2/src/worker.js, v2/integrations/google-apps-script/Code.gs and v2/scripts/test-assessment-worker.mjs. Reuse the existing Google relay where compatible instead of deploying another provider/relay by default.
- Required final evidence: browser sends without mailto; mock success/error/rate/duplicate paths; non-sensitive real message arrives in hello@ymgconsultingservices.com; complete form body survives; sender is the Reply-To; business, format, guests, timing and budget are intact. Confirm the main Atlas/Science mail forms still work. The actual mailbox owner must verify receipt.

## 5. Issue register — authoritative GitHub links

**Critical (3)**

- [#3 — Bootstrap canonical source and safely reuse YMG website infrastructure](https://github.com/YourMagicGenie/Events-YMG-website/issues/3)
- [#10 — Replace mailto builder with tested, direct in-page Events inquiry delivery](https://github.com/YourMagicGenie/Events-YMG-website/issues/10)
- [#13 — Restore discoverable mobile navigation and narrow-header fit](https://github.com/YourMagicGenie/Events-YMG-website/issues/13)

**High (21)**

- [#2 — Expand event formats into a six-plus-card accessible horizontal carousel](https://github.com/YourMagicGenie/Events-YMG-website/issues/2)
- [#4 — Replace artificial-looking hero photography and remove secondary CTA](https://github.com/YourMagicGenie/Events-YMG-website/issues/4)
- [#5 — Reposition copy as a confident venue and event-production offering](https://github.com/YourMagicGenie/Events-YMG-website/issues/5)
- [#6 — Remove prototype and concept-imagery disclaimers throughout live site](https://github.com/YourMagicGenie/Events-YMG-website/issues/6)
- [#9 — Rewrite Events-specific privacy notice against verified processing](https://github.com/YourMagicGenie/Events-YMG-website/issues/9)
- [#11 — Make inquiry controls obviously editable without sacrificing elegance](https://github.com/YourMagicGenie/Events-YMG-website/issues/11)
- [#12 — Add authentic Dante David portrait and rebalance founder layout](https://github.com/YourMagicGenie/Events-YMG-website/issues/12)
- [#14 — Audit keyboard navigation, focus visibility, skip link, and reduced motion](https://github.com/YourMagicGenie/Events-YMG-website/issues/14)
- [#15 — Build a real-device responsive QA matrix and correct breakpoint failures](https://github.com/YourMagicGenie/Events-YMG-website/issues/15)
- [#16 — Improve sitewide text legibility, contrast, and touch target sizes](https://github.com/YourMagicGenie/Events-YMG-website/issues/16)
- [#17 — Provide a professional Italian/English content experience for Genova venues](https://github.com/YourMagicGenie/Events-YMG-website/issues/17)
- [#18 — Create context-aware enquiry pathways for venues, businesses, and private hosts](https://github.com/YourMagicGenie/Events-YMG-website/issues/18)
- [#19 — Explain the concrete venue-partnership offer and commercial FAQ](https://github.com/YourMagicGenie/Events-YMG-website/issues/19)
- [#20 — Establish trustworthy founder experience without fabricated luxury-event proof](https://github.com/YourMagicGenie/Events-YMG-website/issues/20)
- [#21 — Unify event-card imagery, provenance, cropping, and accessible descriptions](https://github.com/YourMagicGenie/Events-YMG-website/issues/21)
- [#22 — Ship branded favicon, app icons, and social-sharing thumbnail](https://github.com/YourMagicGenie/Events-YMG-website/issues/22)
- [#25 — Measure and optimize Core Web Vitals, hero media, and font loading](https://github.com/YourMagicGenie/Events-YMG-website/issues/25)
- [#26 — Verify Search Console indexability and add accurate organization metadata](https://github.com/YourMagicGenie/Events-YMG-website/issues/26)
- [#27 — Audit production security headers, external dependencies, and public repo exposure](https://github.com/YourMagicGenie/Events-YMG-website/issues/27)
- [#28 — Verify Italian business disclosures and improve professional footer identity](https://github.com/YourMagicGenie/Events-YMG-website/issues/28)
- [#33 — Introduce lean CI and cross-device visual/accessibility regression checks](https://github.com/YourMagicGenie/Events-YMG-website/issues/33)

**Medium (7)**

- [#1 — Separate header wordmark and Your Magic Genie subtitle](https://github.com/YourMagicGenie/Events-YMG-website/issues/1)
- [#7 — Rebalance desktop partnership columns and reduce empty center gutter](https://github.com/YourMagicGenie/Events-YMG-website/issues/7)
- [#8 — Consolidate repeated collaboration, founder and enquiry section storytelling](https://github.com/YourMagicGenie/Events-YMG-website/issues/8)
- [#23 — Make the selected event format explicit in the enquiry flow](https://github.com/YourMagicGenie/Events-YMG-website/issues/23)
- [#24 — Create a branded accessible 404 and recovery experience](https://github.com/YourMagicGenie/Events-YMG-website/issues/24)
- [#29 — Offer a factual one-page venue partnership PDF for outreach](https://github.com/YourMagicGenie/Events-YMG-website/issues/29)
- [#30 — Measure privacy-preserving lead conversions and monitor enquiry failures](https://github.com/YourMagicGenie/Events-YMG-website/issues/30)

**Low (2)**

- [#31 — Prepare a permission-gated template for real event case studies](https://github.com/YourMagicGenie/Events-YMG-website/issues/31)
- [#32 — Plan seasonal editorial concepts and real-events calendar only when scheduled](https://github.com/YourMagicGenie/Events-YMG-website/issues/32)

The selected optional scope is **O03 #29** (one-page venue partnership PDF), **O05 #31** (future real-event case-study template), and **O06 #32** (seasonal concepts/real-events calendar, only when actual dates exist). Do not add O01, O02 or O04. All 33 issues were open at this handoff snapshot; recheck GitHub to avoid duplicate work.

## 6. PR, CI and release discipline

- Start from current main and inspect any new PRs. Work on clearly linked issue(s) in a scoped branch. Preserve unrelated changes and do not force-push or delete others' work.
- One carefully reviewed PR may close multiple strongly related issues if the mapping and acceptance criteria are explicit. Avoid artificially triggering full hosted CI for every microcopy change. Keep PRs understandable, testable and ready for review; **do not auto-merge unless the owner or established merge coordinator authorizes it**.
- Tests to run: npm test; build/source parity; unit/API and mocked Turnstile/relay failures; responsive screenshots at 320/360/390/430/541/768/850/1024/1440; keyboard and reduced-motion flows; actual links/anchors; privacy and sitemap; failure/404 status; no secrets in logs; live smoke after an approved release.
- Keep Actions slim: dependency caching where safe, path-based triggers where sensible, concurrency cancellation for superseded PRs, and separate preview from production credentials. The repo was public for CI-minute savings, but that is not permission to expose private material or to postpone a user-authorized privacy switch.
- Never modify Cloudflare custom-domain ownership, Worker production bindings, Google email DNS, Atlas, Science, Porto Aperto, Brewing or DnD hosting as a side effect of Events work.
- Before a live release, record the current Worker version and rollback target; require owner/release authority for production promotion; deploy only reviewed artifacts; verify status/headers/asset routing on the custom domain, real mailbox receipt and correct privacy. Roll back on failure.

## 7. What the coding agent should return after each PR

1. Linked issue IDs and PR URL, with a concise outcome and **explicit statement whether production is unchanged or actually deployed**.
2. Files changed and key design/architecture decisions; explain reused code and avoided duplication.
3. Tests run and their exact results, including mobile/desktop captures when relevant. Distinguish automated checks, mocked responses, live browser evidence and owner-verified external checks.
4. Any blockers, missing photos/approval, runtime secret *names*, required Cloudflare/Google setup or unverifiable inbox requirements (never disclose secret values).
5. Next recommended action, especially any release or rollback dependency; write important state deltas to Project Keeper without changing portfolio now/next/later.

**Success condition:** The owner can hand this repo to a capable GPT agent, get safe issue-prioritized PRs with transparent evidence, and eventually publish an attractive, truthful, fast, accessible Events site whose enquiries actually arrive—without breaking the rest of the YMG ecosystem.
