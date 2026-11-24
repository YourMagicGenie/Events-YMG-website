# YMG Events - Partnership and services guide (#119)

**Status:** English and Italian guides **approved by the owner and published** (22 November 2026). They replace the one-page PDFs at the same URLs. The Italian terminology check for #102 is still open.

**What these guides are.** They are the owner-reviewed 17 November 2026 drafts, with the same text and layout. The only changes are the owner's marked edits, listed below. The owner's comments are in `partnership-guide-en_2.draft.pdf` and `partnership-guide-it.draft.pdf`.

**Files:**
- Masters: [partnership-guide-en.pdf](./partnership-guide-en.pdf) ([preview](./partnership-guide-en.png)) · [partnership-guide-it.pdf](./partnership-guide-it.pdf) ([preview](./partnership-guide-it.png))
- Editable copy, both languages: [source/partnership-guide-copy.mjs](./source/partnership-guide-copy.mjs)
- Renderer: [`tools/render-partnership-guide.mjs`](../../tools/render-partnership-guide.mjs). It uses the same Playwright template approach as `tools/render-partnership-pdfs.mjs`.

**Published copies** (byte-identical to the masters): `/downloads/ymg-events-venue-partnerships-en.pdf` (English page) and `/downloads/ymg-events-collaborazioni-location-it.pdf` (Italian page). The URLs and download buttons are unchanged.

The one-page PDFs (`venue-partnership-one-pager-*`) are kept as an archive only. `tools/render-partnership-pdfs.mjs` no longer writes to `/downloads/`.

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

**Follow-up, 24 November 2026 (#102):** the owner approved matching the Italian fee note to the fee labels, and the Italian process line to the English "proposal" edit:

| Before | After |
|---|---|
| Il compenso copre solo il lavoro professionale di YMG. | La tariffa copre solo il lavoro professionale di YMG. |
| La proposta scritta conferma compenso, trattamento fiscale e attività incluse. | La proposta scritta conferma tariffa, trattamento fiscale e attività incluse. |
| Confermiamo brief, responsabilità e date, … | Confermiamo proposta, responsabilità e date, … |

**Editorial pass, 24 November 2026 (#102):** the owner approved these edits from the Italian review list (`docs/editorial/ITALIAN-REVIEW.md`). The revenue-share box still fits on two lines, and both pages pass the overflow check.

| Before | After |
|---|---|
| Spazio, ospitalità e intrattenimento trovano realizzazione in un piano concreto. | Spazio, ospitalità e intrattenimento diventano un piano concreto. |
| La serata è da organizzare interamente | La serata è tutta da organizzare |
| Organizzatore in loco per sei / otto ore | Organizzatore sul posto per sei / otto ore |
| …una consulenza limitata di 2–4 ore… | …una consulenza breve di 2–4 ore… |
| …rientrano in un budget dell’evento separato. | …rientrano in un budget separato dell’evento. |
| Economia | Costi e incassi |
| Chi contrattualizza intrattenimento e fornitori, … | Chi firma i contratti con intrattenimento e fornitori, … |
| Un’eventuale ripartizione dei ricavi ha un calcolo, delle detrazioni e una data di saldo concordati; qualsiasi commissione di segnalazione è dichiarata, … | In caso di ripartizione dei ricavi, metodo di calcolo, detrazioni e data di saldo si concordano prima; qualsiasi commissione di segnalazione viene dichiarata, … |
| …consegne ai fornitori… | …indicazioni ai fornitori… |
| …l’elenco delle azioni aperte. | …l’elenco delle questioni ancora aperte. |
| …si concordano per iscritto prima di sostenerli. | …si concordano per iscritto prima di procedere. |
| (EN) Larger briefs estimated individually | Larger projects estimated individually |

The Italian eyebrow stays "Organizzazione e realizzazione eventi". Instead, the site now uses *realizzazione* to match it.

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

This renders both guides and PNG previews. While `status` is `"approved"`, it also copies each guide to its `/downloads/` URL. It and fails if content would run into the contact panel or footer. `test/partnership-guide.test.mjs` checks both languages:
- the fee bands, the indicative labels, the no-guarantee and "not a quotation" wording, and that no %, deposit or similar terms appear;
- two A4 pages, embedded TrueType fonts with extractable text, the email and website links, and a size under 400 KB;
- while approved, the published URLs serve exactly the masters. `test/site-smoke.test.mjs` also checks the language-specific download buttons and the prefilled email subject.

## Publication (22 November 2026)

The owner approved both languages and asked for them to go live. Each PDF's email link and QR code open an email with a prefilled subject ("Venue partnership with YMG Events" / "Collaborazione con YMG Events"), as the one-pagers did; this is not visible on the page. For later changes: edit the copy, re-render, check the PDFs, then merge on green checks and verify the Cloudflare build and live downloads.
