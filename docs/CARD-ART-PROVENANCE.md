# Event card art provenance

**Approach (issue #99, 19 November 2026):** Six photographs, one per event format, replace the earlier stylized SVG illustrations in the event-format carousel. Each one shows a different activity, setting and light: a rooftop terrace, a DJ setup, a garden celebration, a shared dinner, a wine tasting and a corporate reception.

**Source and rights:** All six photographs were supplied by the site owner on 19 November 2026 for use on this website. The owner holds the usage-rights record for each original. The originals are not stored in this repository. Before adding or swapping a card photo, record its source and licence here.

**Processing:** `tools/build-card-photos.mjs` crops each original to the shared 5:4 card frame around a chosen focal window, applies a small brightness/saturation correction so the set reads together, and writes 1200 × 960 and 700 × 560 WebP files to `dist/assets/event-photos/`. The HTML serves them with `srcset`/`sizes`, lazy loading and fixed `width`/`height` (no layout shift), inside the existing `object-fit: cover` frame. Captions, card numbers and event names remain live page text outside the image.

**Truthfulness:** The ALT text opens with "Illustrative photo of" / "Foto illustrativa di" and describes what is actually in the frame. These images communicate possible formats only. They do not depict or claim a past YMG booking, a YMG venue, a named client or a confirmed partner. The rooftop photograph shows a skyline that is not Genova; its ALT text does not name a city. The DJ photograph shows the manufacturers' names on the equipment; this implies no sponsorship or partnership.

| Files | Format represented | English alternative text | Testo alternativo italiano |
|---|---|---|---|
| `rooftop-social-1200.webp`, `rooftop-social-700.webp` | The Rooftop Social | Illustrative photo of a glass-roofed rooftop terrace with tables set at dusk above a city skyline of domes and towers. | Foto illustrativa di una terrazza panoramica con copertura in vetro e tavoli apparecchiati al crepuscolo, sopra uno skyline di cupole e torri. |
| `live-at-night-1200.webp`, `live-at-night-700.webp` | Live at Night | Illustrative photo of a DJ’s hand over a turntable and mixer in a warm glow. | Foto illustrativa della mano di un DJ su giradischi e mixer, in una calda luce soffusa. |
| `private-occasion-1200.webp`, `private-occasion-700.webp` | A Private Occasion | Illustrative photo of round tables dressed in coral and gold linens with flowers in a leafy garden. | Foto illustrativa di tavoli rotondi con tovaglie corallo e oro e composizioni floreali in un giardino verde. |
| `supper-club-1200.webp`, `supper-club-700.webp` | The Supper Club | Illustrative photo of guests sharing dishes and wine around a long candlelit table. | Foto illustrativa di ospiti che condividono piatti e vino attorno a una lunga tavola a lume di candela. |
| `tasting-table-1200.webp`, `tasting-table-700.webp` | The Tasting Table (wine pairing) | Illustrative photo of guests swirling red wine beside boards of cheese, cured meats and olives. | Foto illustrativa di ospiti che fanno roteare il vino rosso nel calice, accanto a taglieri di formaggi, salumi e olive. |
| `corporate-social-1200.webp`, `corporate-social-700.webp` | The Corporate Social | Illustrative photo of guests in smart attire mingling with sparkling wine at high tables in a warm lounge. | Foto illustrativa di ospiti in abito elegante che conversano con un calice di bollicine attorno a tavoli alti, in un lounge dalla luce calda. |

The hero photograph remains separately sourced and documented in [ASSET-PROVENANCE.md](ASSET-PROVENANCE.md).

**History:** Until issue #99 the cards used six locally authored SVG illustrations (`dist/assets/event-art/*.svg`). On 12 November 2026 (issue #74) the Jazz & Cocktails format was replaced by wine pairing. The SVGs are no longer shipped; they remain in Git history.
