# Events legibility and target-size checks

This record accompanies issue #16. The design keeps its serif/sans hierarchy, ivory paper, deep green panels and gold accents while bringing supporting copy to a readable minimum and enlarging primary touch controls.

## Contrast pairs

Ratios use the WCAG relative-luminance calculation on the foreground/background color tokens used by the page. Normal-sized text needs at least 4.5:1; the tested text pairs exceed that threshold.

| Use | Foreground | Background | Contrast |
| --- | --- | --- | ---: |
| Main body | `#172a28` | `#f1eadf` | 12.57:1 |
| Muted supporting copy on paper | `#575c54` | `#f1eadf` | 5.74:1 |
| Muted supporting copy on warm ivory | `#575c54` | `#e8dfd0` | 5.19:1 |
| Muted supporting copy on inquiry surface | `#575c54` | `#eee7db` | 5.58:1 |
| Red section accent | `#815342` | `#f1eadf` | 5.41:1 |
| Red section accent on warm ivory | `#815342` | `#e8dfd0` | 4.89:1 |
| Hero eyebrow gold | `#d5b47e` | `#111e1e` | 8.68:1 |
| Hero supporting copy | `#d3d1c6` | `#111e1e` | 11.16:1 |
| Partnership supporting copy | `#ccd3c8` | `#172a28` | 9.81:1 |
| Header navigation | `#c9c8ba` | `#111e1e` | 10.14:1 |
| Hero heading accent | `#d8b880` | `#111e1e` | 9.03:1 |
| Primary CTA | `#142221` | `#d5b47e` | 8.32:1 |
| Inquiry error text | `#743037` | `#eee7db` | 7.70:1 |
| Inquiry success text | `#174c3b` | `#eee7db` | 8.01:1 |

The table above checks color tokens. The hero's light text sits on the photograph, so it is also measured as rendered (next section). The period in the logo and purely decorative artwork details are not used to convey information. Gold is reserved for dark surfaces; muted body copy is checked on the paper, warm ivory and inquiry surfaces. The warm ivory surface was the limiting case, so the muted token was darkened to retain the palette and pass AA.

## Hero text over the photograph (#135)

`npm run test:contrast` (`test/hero-contrast-audit.mjs`, required in CI on every code change) loads the English and Italian homepages at 14 viewports: 320×640, 360×780, 390×844, 430×932, 540, 541, 768×1024, 850, 851, 1024×768, 1280×800, 1366×768, 1440×900 and 1920×1080. At each one it captures the hero twice, with the real photo, overlays and any text-shadow:

1. with the text hidden, to record the backdrop;
2. as white glyphs on black, to make a glyph mask.

Each text element is compared with the **brightest backdrop pixel** covered by its glyphs or within 2px of them. WCAG compares text with the background next to it, and empty line-box space away from the letters is not that background. The check fails below WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for text at least 24px (or 18.66px bold). Crops of every hero and `report.json` are uploaded with the CI screenshots.

**Before the fix**, three combinations failed. The two-line paragraph at 1280px runs over the white dahlias: 3.13:1 in both locales (the earlier review's 2.9:1 used line boxes). The Italian paragraph at 851px measured 4.29:1.

**Fix**: above 540px, the paragraph and audience line have a soft dark halo in the overlay's own green-black (`text-shadow`, `dist/assets/mobile-hero.css`), and the italic headline accent has a lighter one. The photograph, its crops, the desktop composition and the #100 phone overlay are unchanged. Phones (≤540px) already passed and get no halo.

| Text | Size | Needs | Lowest worst-pixel contrast now | Same spot before |
| --- | --- | ---: | ---: | ---: |
| Eyebrow | 11px | 4.5:1 | 6.16:1 (EN 320×640) | 6.16:1 |
| Headline | 46–93px | 3:1 | 5.45:1 (IT 1280×800) | 5.45:1 |
| Headline accent | 46–93px | 3:1 | 4.53:1 (EN 1440×900) | 3.43:1 |
| Paragraph | 14px | 4.5:1 | 4.62:1 (IT 1280×800) | 3.13:1 |
| Audience line | 10–11px | 4.5:1 | 4.75:1 (EN 320×640) | 4.75:1 |
| Photo note | 21px | 4.5:1 | 5.70:1 (EN 851×900) | 5.70:1 |

The CTA button is a solid gold fill (`#142221` on `#d5b47e`) and is covered by the token table. Chromium rendering is the reference; a physical-device check remains part of #136.

## Type and touch targets

- Body text stays at 15px or larger. Supporting paragraphs and concept copy are 14px or larger; labels are 13px; secondary uppercase labels are 10–11px.
- Navigation links, buttons, carousel arrows, inquiry fields, footer links and preview-notice links use a minimum 44px height. The inquiry textarea stays taller for writing. Inline processor/statutory links on the separate privacy page remain 16px prose links with 1.8 line spacing; their rendered target height is checked against 24px.
- Playwright checks these target dimensions, horizontal overflow, and header fit at 320, 360, 390, 430, 540, 541, 768, 850, 851, 1024, 1280, 1440 and 1920 CSS-pixel viewports. CI stores full-page screenshots for review.

## Review limits

Chromium emulates CSS viewport sizes; it does not replace testing on a physical phone. The iPhone Safari and VoiceOver walkthrough is in `docs/IOS-VOICEOVER-CHECK.md` (#136). Inquiry fields use 16px text so iOS Safari does not zoom on focus.
