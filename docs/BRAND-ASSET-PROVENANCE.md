# Brand icon and sharing asset provenance

**Design source:** First-party vector assets authored in this repository for YMG Events using the established deep green, warm ivory, muted gold and coral palette. The favicon is a simple vector Y with a coral accent, designed to remain recognizable at 16px. The Apple touch icon and PNG browser-size icons are raster exports from that SVG. The English and Italian social cards are fixed-layout SVG sources exported to 1200 × 630 PNG previews. Run `tools/render-brand-assets.sh` (Inkscape and ImageMagick required) to regenerate the raster variants.

**Rights and delivery:** These files are original local artwork and text layouts. They contain no third-party photos, logos, fonts, or external resource requests. Social preview PNGs use system-serif and sans-serif fallbacks, a controlled headline/subtitle layout, and restrained decorative rings. Image width, height, type and descriptive alternate text are declared in both Open Graph and Twitter metadata. English routes point to `social-card.png`; Italian routes point to the localized `social-card-it.png`.

| File | Purpose / dimensions | Source |
|---|---|---|
| `favicon.svg` | Modern browser icon, scalable 64 × 64 viewBox | Original vector |
| `favicon-16.png` | 16 × 16 browser tab fallback | Export of `favicon.svg` |
| `favicon-32.png` | 32 × 32 browser tab fallback | Export of `favicon.svg` |
| `apple-touch-icon.png` | 180 × 180 home-screen icon | Export of `favicon.svg` |
| `social-card.svg` / `social-card.png` | English share preview, 1200 × 630 | Original vector layout and PNG export |
| `social-card-it.svg` / `social-card-it.png` | Italian share preview, 1200 × 630 | Localized vector layout and PNG export |

The HTML metadata uses the canonical production host `https://events.ymgconsultingservices.com/`. This PR changes repository source only. Actual host responses and representative WhatsApp/share previews still require the guarded Events preview or deployment; GitHub merges do not deploy the production Worker.

## 11 November owner direction
Social artwork now uses bold sans-serif YMG EVENTS lettering, cobalt, coral and lime, suitable for a broad events offer. All key lettering fits the central 630px square of the 1200 × 630 canvas. Versioned `social-card-v2.png` and `social-card-it-v2.png` URLs refresh image caches; the renderer also maintains original filenames. Preview copy no longer positions the business exclusively around luxury nightlife. Existing favicon remains unchanged. Actual WhatsApp metadata caching may outlive deployment; a fresh WhatsApp rendering remains an external check. Cloudflare Builds now automatically deploys passing main changes.

## Owner theme correction — 11 November
The owner accepts improved preview legibility but rejects cobalt/coral/lime as off-theme. The current cards use website deep green #112421, gold #d5b47e and ivory #f1eadf, large centered sans-serif lettering, fine borders and restrained rings. Versioned v3 PNGs refresh image caches. Critical content fits the central 630px square.
