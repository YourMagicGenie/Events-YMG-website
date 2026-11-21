# YMG Events - Partnership and services guide (#119)

**Status:** English and Italian **drafts for owner review** (21 November 2026). Italian terminology is still to be coordinated with #102.

**What these drafts are.** They are the owner-reviewed 17 November 2026 drafts, with the same text and layout. The only changes are the owner's marked edits, listed below. The owner's comments are in `partnership-guide-en_2.draft.pdf` and `partnership-guide-it.draft.pdf`.

**Files:**
- Drafts: [partnership-guide-en.draft.pdf](./partnership-guide-en.draft.pdf) ([preview](./partnership-guide-en.draft.png)) · [partnership-guide-it.draft.pdf](./partnership-guide-it.draft.pdf) ([preview](./partnership-guide-it.draft.png))
- Editable copy, both languages: [source/partnership-guide-copy.mjs](./source/partnership-guide-copy.mjs)
- Renderer: [`tools/render-partnership-guide.mjs`](../../tools/render-partnership-guide.mjs). It uses the same Playwright template approach as `tools/render-partnership-pdfs.mjs`.

The published URLs are unchanged until approval and still serve the one-page PDFs: `/downloads/ymg-events-venue-partnerships-en.pdf` and `/downloads/ymg-events-collaborazioni-location-it.pdf`.

## Changes from the 17 November drafts

`pdftotext` was run on the 17 November drafts and on these drafts, and the outputs were compared. They differ only in the lines below.

**English:**

| Before | After |
|---|---|
| CHOOSE THE LEVEL OF SUPPORT | CHOOSE THE LEVEL OF SUPPORT NEEDED FOR YOUR EVENT |
| Start from what is already in place and what you want us to take on. | *(deleted)* |
| Agreed brief, budget and schedule | Agreed proposal, budget and schedule |
| Up to eight hours on site | On-site lead for up to eight hours |
| We confirm the brief, responsibilities and dates, … | We confirm the proposal, responsibilities and dates, … |

**Italian:**

| Before | After |
|---|---|
| ORGANIZZAZIONE E PRODUZIONE EVENTI | ORGANIZZAZIONE E REALIZZAZIONE EVENTI |
| SERVIZI E COMPENSI (both pages) | SERVIZI E TARIFFE |
| Riuniamo spazio, ospitalità e intrattenimento in un piano concreto, poi coordiniamo chi lo realizza. | Spazio, ospitalità e intrattenimento trovano realizzazione in un piano concreto. |
| SCEGLI IL SUPPORTO CHE TI SERVE | SCEGLI IL SERVIZIO PIÙ ADATTO A TE |
| Parti da ciò che è già pronto e da quello che vuoi affidarci. | *(deleted)* |
| Il tuo evento è già organizzato | Il tuo evento è già pianificato |
| …sono già scelti. Noi mettiamo in fila orari, … | …sono già stati scelti. Noi ci occupiamo di orari, … |
| Una location e una data, fino a quattro fornitori | Una location, una data e fino a quattro fornitori |
| Referente sul posto fino a sei ore | Organizzatore in loco per sei ore |
| La serata è tutta da costruire | La serata è da organizzare interamente |
| …una festa privata che ha bisogno di un piano e di qualcuno che la gestisca. | …una festa privata da pianificare e realizzare interamente. |
| Brief, budget e programma concordati | Pianificazione condivisa, budget e programmazione |
| Un sopralluogo e coordinamento dei fornitori | Sopralluogo e coordinamento con i fornitori |
| Fino a otto ore sul posto | Organizzatore in loco per otto ore |
| Compenso professionale YMG indicativo (all four fees) | Tariffa YMG indicativa |

A few small typing fixes were made in the owner's suggested Italian wording: the accents (*ospitalità*, *più*, *già*), the spelling of *anniversario* and *interamente*, and no comma before "e" in "Spazio, ospitalità e…" and "budget e programmazione". On 21 November 2026 the owner decided to keep "per sei/otto ore" in Italian and "up to" in English.

**Not changed:** the Italian fee note under the service cards still says *compenso*, because only the header and fee labels were marked. One English line still says *brief*: "Larger briefs estimated individually".

## Other differences from 17 November

These are not text changes:

- **Hero photo.** The hero shows the current website photo, the long candlelit table chosen in #100, in place of the retired rooftop image. At the owner's request it has no caption or description; it is marked decorative.
- **File size.** It is about 1.5 MB smaller: 258 KB instead of about 1.5 MB.
  - Images are stored as high-quality JPEG at their original pixel size; Chromium otherwise stores them uncompressed.
  - DM Sans is embedded from static 400/700 copies of the site font, built by `tools/build-collateral-fonts.py` (SIL OFL). Chromium otherwise embeds the variable font as Type 3 outlines.
  - Checked against a render without the fix: the text layout is the same, and the free space on each page is the same to the pixel. In a pixel comparison the only changes were JPEG noise inside the two photos, averaging under 2 levels out of 255, plus a few edge pixels on three letters.

## Rendering and checks

```bash
node tools/render-partnership-guide.mjs
```

This renders both drafts and PNG previews, and fails if content would run into the contact panel or footer. `test/partnership-guide.test.mjs` checks both languages:
- the fee bands, the indicative labels, the no-guarantee and "not a quotation" wording, and that no %, deposit or similar terms appear;
- two A4 pages, embedded TrueType fonts with extractable text, the email and website links, and a size under 400 KB;
- the published URLs keep the one-pagers until `status` in the copy file is `"approved"`.

## After approval

1. Set `status` to `"approved"`. Render to the final file names and copy those files to the two `/downloads/` URLs.
2. Update the site-smoke expectations, which currently tie those URLs to the one-pager masters, and check the language-toggle downloads.
3. Merge only on green required checks, then verify the Cloudflare Workers build and the live downloads.
