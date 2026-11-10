# Font asset provenance

YMG Events uses the variable **DM Sans** and **Playfair Display** typefaces from Google Fonts. The Latin and Latin Extended WOFF2 subsets are self-hosted under `dist/assets/fonts/` to avoid a render-blocking third-party stylesheet request and to support English and Italian text without requesting font files from Google on each visit.

Both typefaces are distributed under the SIL Open Font License 1.1. The unmodified license texts are included beside the font files as `OFL-dmsans.txt` and `OFL-playfairdisplay.txt`. The files use the Google Fonts CDN releases DM Sans v17 and Playfair Display v40. The font declarations retain `font-display: swap`; the Latin regular faces used by the first viewport are preloaded, while italic and extended subsets load only when needed.

The files were downloaded from the official Google Fonts CDN on 10 November 2026. This repository change updates source only; it does not deploy the production Worker.
