# Events legibility and target-size checks

This record accompanies issue #16. The design keeps its serif/sans hierarchy, ivory paper, deep green panels and gold accents while bringing supporting copy to a readable minimum and enlarging primary touch controls.

## Contrast pairs

Ratios use the WCAG relative-luminance calculation on the foreground/background color tokens used by the page. Normal-sized text needs at least 4.5:1; the tested text pairs exceed that threshold.

| Use | Foreground | Background | Contrast |
| --- | --- | --- | ---: |
| Main body | `#172a28` | `#f1eadf` | 12.57:1 |
| Muted supporting copy on paper | `#575c54` | `#f1eadf` | 5.74:1 |
| Muted supporting copy on warm ivory | `#575c54` | `#e8dfd0` | 5.19:1 |
| Muted supporting copy on enquiry surface | `#575c54` | `#eee7db` | 5.58:1 |
| Red section accent | `#815342` | `#f1eadf` | 5.41:1 |
| Red section accent on warm ivory | `#815342` | `#e8dfd0` | 4.89:1 |
| Hero eyebrow gold | `#d5b47e` | `#111e1e` | 8.68:1 |
| Hero supporting copy | `#d3d1c6` | `#111e1e` | 11.16:1 |
| Partnership supporting copy | `#ccd3c8` | `#172a28` | 9.81:1 |
| Header navigation | `#c9c8ba` | `#111e1e` | 10.14:1 |
| Hero heading accent | `#d8b880` | `#111e1e` | 9.03:1 |
| Primary CTA | `#142221` | `#d5b47e` | 8.32:1 |
| Enquiry error text | `#743037` | `#eee7db` | 7.70:1 |
| Enquiry success text | `#174c3b` | `#eee7db` | 8.01:1 |

The hero uses a dark CSS gradient behind its light text; the contrast check uses its darkest base token. The period in the logo and purely decorative artwork details are not used to convey information. Gold is reserved for dark surfaces; muted body copy is checked on the paper, warm ivory and enquiry surfaces. The warm ivory surface was the limiting case, so the muted token was darkened to retain the palette and pass AA.

## Type and touch targets

- Body text stays at 15px or larger. Supporting paragraphs and concept copy are 14px or larger; labels are 13px; secondary uppercase labels are 10–11px.
- Navigation links, buttons, carousel arrows, enquiry fields, footer links and preview-notice links use a minimum 44px height. The enquiry textarea stays taller for writing. Inline processor/statutory links on the separate privacy page remain 16px prose links with 1.8 line spacing; their rendered target height is checked against 24px.
- Playwright checks these target dimensions, horizontal overflow, and header fit at 320, 360, 390, 430, 540, 541, 768, 850, 851, 1024, 1280, 1440 and 1920 CSS-pixel viewports. CI stores full-page screenshots for review.

## Review limits

Chromium emulates CSS viewport sizes; it does not replace testing on a physical phone. The mobile-handset review remains in issue #15. A screen-reader pass remains in issue #14 and requires the isolated preview tracked by issue #3.
