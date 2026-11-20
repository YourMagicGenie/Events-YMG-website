# Event hero provenance

## Current hero (20 November 2026, issue #100)

The owner chose option B, "The long candlelit table", from a comparison of six real photographs against the restored rooftop baseline.

| | |
|---|---|
| Photo | "Long dining table with festive flowers" |
| Photographer | M F, on Unsplash |
| Page | https://unsplash.com/photos/long-dining-table-with-festive-flowers-fb0_wj2MZk4 |
| Taken at | A wedding in Brive-la-Gaillarde, France |
| Original size | 4974 × 3316 px |
| License | Unsplash License (https://unsplash.com/license), checked 20 November 2026. Free for commercial use; attribution not required but given here. |
| People | None in the frame |

**Truthfulness:** this is a stock photograph, not a YMG event, venue, client or partner, and not a Genova location. The English and Italian alt text starts "Illustrative photo of" / "Foto illustrativa di" and describes only what is in the frame. The wine bottle's label is softened with a feathered blur so no brand is legible. No other retouching was applied.

**Delivery:** `tools/build-hero-photo.mjs` rebuilds every file from the full-size 4974 × 3316 original, with a light saturation balance (0.95) and the label blur. Desktop and landscape files (480, 960, 1440 and 2400 px) keep the **full, uncropped frame**, as in the owner-approved comparison mockup, and get a 3px median grain reduction that keeps them sharp and small. The first release (PR #122) cropped them to the left two thirds; the owner rejected that on 20 November 2026 because the zoom made the photo look soft, including on phones in landscape. Phone portrait files (480, 780 px) use a tighter 3:2 crop centered on the table. The 2400 px file serves large and high-density screens; `srcset`, `sizes` and loading priority are otherwise unchanged.

**Phone overlay:** at the owner's request the phone overlay (max-width 540px, in `dist/assets/mobile-hero.css`) is 8 points lighter, from 0.94 → 0.65 to 0.86 → 0.57, so the photo shows through. Tablet and desktop overlays are unchanged.

**Rollback:** to return to the uncropped-zoom release, revert the full-frame fix commit. To return to the rooftop hero, revert both #100 commits (PR #122 and the full-frame fix); that restores the five rooftop WebP files, the alt text and the phone overlay, and removes the 2400 px file.

## Previous hero (11 November 2026)

Owner explicitly requested restoration of the original launch hero from commit a4833fe on 11 November 2026, rejecting the later harbor and realism edits and separate mobile image layout. The original rooftop-night.jpg source was exported as responsive local WebP files. That image was AI-generated illustrative marketing imagery, not documentary evidence of a past YMG booking. Source dimensions 1536 × 1024.
