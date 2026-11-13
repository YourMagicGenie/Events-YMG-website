# YMG Events — Visual Layout Inspector

## Open the measurement view

- **English:** https://events.ymgconsultingservices.com/?layout=1
- **Italian:** https://events.ymgconsultingservices.com/it/?layout=1

The query parameter `?layout=1` turns on a temporary visual overlay on the homepage; ordinary visits without it show the standard website. The overlay is visible to **anyone** who opens a link containing the parameter (it does not grant access to private data). The browser's Italian/English language switch preserves measurement mode. The overlay never modifies site content.

### Controls

1. **Grid ON/OFF:** overlay aligned to the document origin with 20 CSS-pixel minor lines, 100 CSS-pixel major lines and rulers. Tick numbers are document coordinates.
2. **IDs: sections / all / off:** default major section markers, all sub-elements if needed, or hide labels to inspect spacing clearly.
3. **Inspect ON/OFF:** with inspection enabled, hover previews an outline and clicking a page element selects its label *without* activating the underlying button/link/form. Turn Inspect OFF when you need to interact with the real website.
4. **Element reference dropdown:** choose an ID and scroll to it. The inspector shows its document X/Y, width/height, element padding, nearest section and viewport dimensions.
5. **Copy element reference:** copies an editable request template containing element ID, viewport, language and measured bounds. You can specify the desired deltas after copying.
6. **Minimize (−) / expand (+):** collapse the inspector panel to reveal the underlying page, especially useful when checking a selected element on mobile. Selecting an element from the dropdown on mobile places it above the control panel.
7. **Close (X):** removes the overlay and drops the URL parameter. Escape turns off inspection without closing the overlay.

For precision, leave browser zoom at 100% and include your viewport width (e.g., desktop 1440px, mobile 390px) in change requests. The inspector displays **CSS px**; physical `mm` depend on screen scaling, display density and browser settings and therefore aren't consistent layout instructions. Coordinates are measured from **the document's top-left**, not a screenshot crop or your current scroll position.

### Request examples

```text
01A (Header wordmark) — desktop 1440px:
Move X -8px (left), Y +12px (down); mobile unchanged.

07D (Founder biography) — desktop 1440px:
Move Y -18px (up), aligned with 07C (Founder portrait).
Keep paragraph width unchanged.

04 (Our approach) and 05 (Event concepts) — all desktop widths:
Reduce 04 bottom padding by 20px and 05 top padding by 20px.
Keep visual space balanced across the section transition.

08N (Form status message) — mobile 390px:
Reduce the gap above by 12px, without changing captcha/status behavior.
```

**Important:** a coordinate describes *where an element currently appears*, while a delta describes *how you want its layout changed*. Moving an item with CSS `transform` is not usually the best fix for empty space; for section transitions request a change to padding, margin, grid alignment or gap instead.

## Full label catalog

IDs are assigned dynamically to the existing matching elements in inspector mode. They are intentionally the same on English and Italian homepages and survive text translations. Their IDs do not imply permanent HTML `id` attributes and do not alter normal page semantics.

### 01 — Header

| Inspector ID | Element | Source selector |
|---|---|---|
| `01` | Header | `header` |
| `01A` | Header wordmark | `header .logo` |
| `01B` | Header subtitle | `header .logo small` |
| `01C` | Navigation | `header .primary-nav` |
| `01D` | Language switch | `header #language-switch` |
| `01E` | Header inquiry button | `header .header-cta` |

### 02 — Hero

| Inspector ID | Element | Source selector |
|---|---|---|
| `02` | Hero | `.hero` |
| `02A` | Hero eyebrow | `.hero .eyebrow` |
| `02B` | Hero headline | `.hero h1` |
| `02C` | Hero description | `.hero-copy > p` |
| `02D` | Hero inquiry button | `.hero-actions .btn` |
| `02E` | Hero audience line | `.hero .geo` |
| `02F` | Hero photograph | `.hero-atmosphere` |
| `02G` | Hero photo caption | `.hero .photo-note` |

### 03 — Highlights

| Inspector ID | Element | Source selector |
|---|---|---|
| `03` | Highlights band | `.band` |
| `03A` | Highlights tagline | `.band > span` |
| `03B` | Highlight: rooftop | `.band > div:nth-of-type(1)` |
| `03C` | Highlight: music | `.band > div:nth-of-type(2)` |
| `03D` | Highlight: dining | `.band > div:nth-of-type(3)` |

### 04 — Approach

| Inspector ID | Element | Source selector |
|---|---|---|
| `04` | Our approach | `.intro` |
| `04A` | Approach eyebrow | `.intro .eyebrow` |
| `04B` | Approach heading | `.intro h2` |
| `04C` | Approach description | `.intro > div:nth-child(2)` |

### 05 — Event concepts

| Inspector ID | Element | Source selector |
|---|---|---|
| `05` | Event concepts | `.concepts` |
| `05A` | Concepts eyebrow | `.concepts > .eyebrow` |
| `05B` | Concepts heading | `.concepts h2` |
| `05C` | Carousel controls | `.deck-toolbar` |
| `05D` | Carousel track | `#concept-deck` |
| `05D1` | Concept card 1 | `#concept-deck .concept:nth-child(1)` |
| `05D2` | Concept card 2 | `#concept-deck .concept:nth-child(2)` |
| `05D3` | Concept card 3 | `#concept-deck .concept:nth-child(3)` |
| `05D4` | Concept card 4 | `#concept-deck .concept:nth-child(4)` |
| `05D5` | Concept card 5 | `#concept-deck .concept:nth-child(5)` |
| `05D6` | Concept card 6 | `#concept-deck .concept:nth-child(6)` |

### 06 — Venue partnerships

| Inspector ID | Element | Source selector |
|---|---|---|
| `06` | Venue partnerships | `.partnerships` |
| `06A` | Partnership eyebrow | `.partnerships .eyebrow` |
| `06B` | Partnership heading | `.partnerships h2` |
| `06C` | Partnership description | `.partnerships > div:first-child > p` |
| `06D` | Partnership PDF | `.partnership-download` |
| `06E` | Partnership inquiry button | `.partnership-actions [data-inquiry-intent]` |
| `06F` | Partnership points | `.partnerships > div:nth-child(2)` |
| `06F1` | Partnership point 1 | `.partnerships .partnership:nth-child(1)` |
| `06F2` | Partnership point 2 | `.partnerships .partnership:nth-child(2)` |
| `06F3` | Partnership point 3 | `.partnerships .partnership:nth-child(3)` |

### 07 — Founder

| Inspector ID | Element | Source selector |
|---|---|---|
| `07` | Founder | `.about` |
| `07A` | Founder eyebrow | `.about .eyebrow` |
| `07B` | Founder heading | `.about h2` |
| `07C` | Founder portrait | `.founder-portrait` |
| `07D` | Founder biography (both paragraphs) | `.about .founder-bio` |
| `07E` | Founder signature | `.about .signature` |

### 08 — Inquiry

| Inspector ID | Element | Source selector |
|---|---|---|
| `08` | Inquiry section | `.inquiry` |
| `08A` | Inquiry eyebrow | `.inquiry .eyebrow` |
| `08B` | Inquiry heading | `.inquiry h2` |
| `08C` | Inquiry form | `#brief` |
| `08D` | Inquiry type | `#brief .form-grid > div:nth-child(1)` |
| `08E` | Name field | `#brief .form-grid > div:nth-child(2)` |
| `08F` | Email field | `#brief .form-grid > div:nth-child(3)` |
| `08G` | Business field | `#brief .form-grid > div:nth-child(4)` |
| `08H` | Event format field | `#brief .form-grid > div:nth-child(5)` |
| `08I` | Guest count field | `#brief .form-grid > div:nth-child(6)` |
| `08J` | Timing field | `#brief .form-grid > div:nth-child(7)` |
| `08K` | Budget field | `#brief .form-grid > div:nth-child(8)` |
| `08L` | Message field | `#brief .form-grid > div:nth-child(9)` |
| `08M` | Spam protection | `#turnstile-widget` |
| `08N` | Form status message | `#form-feedback` |
| `08O` | Submit inquiry button | `#submit-inquiry` |

### 09 — Footer

| Inspector ID | Element | Source selector |
|---|---|---|
| `09` | Footer | `.site-footer` |
| `09A` | Footer identity | `.footer-identity` |
| `09B` | Footer contact | `.footer-contact` |
| `09C` | Footer inquiry link | `.footer-cta` |

### 10 — Legal strip

| Inspector ID | Element | Source selector |
|---|---|---|
| `10` | Legal strip | `.site-note` |
| `10A` | Business details | `.site-note > p` |
| `10B` | Privacy and related links | `.site-note-links` |

## Scope and QA

- Current inspector coverage: English and Italian **homepage**, including their full scrolling document, cards, form fields and legal strip. Privacy/404 pages are outside the numeric catalog.
- Normal site behavior, visual appearance, SEO, inquiry submission, accessibility semantics and PDFs are unchanged when inspector mode is off.
- Any future layout edits should add screenshots/tests at the requested desktop/tablet/mobile widths; the inspector measures placement, it does not replace responsive QA.
- Implementation: `dist/assets/layout-inspector.js`, `dist/assets/layout-inspector.css`; [GitHub issue #82](https://github.com/YourMagicGenie/Events-YMG-website/issues/82).
