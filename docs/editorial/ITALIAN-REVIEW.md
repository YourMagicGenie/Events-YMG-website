# Italian editorial review — 11 November 2026

Owner authorizes an independent editorial pass and requests escalation only for business decisions. Reviewed Italian homepage, metadata/alt/ARIA labels, privacy, form labels, dynamic path prompts and feedback, and the approved one-page PDF.

Corrections: replaced literal “Archi dal vivo sul ritmo”, awkward “un set più tardi”, untranslated carousel “slide”, and unnecessary business jargon such as “brief”, “food & beverage”, “indoor”, “perimetro”, “concept e percorso degli ospiti”, and “ospitalità e flussi”. Kept familiar Italian event terms such as format, DJ set, location and budget. Preserved all form option values/API identifiers and factual, qualified offer language. Privacy copy retains equivalent substantive meaning in both languages. The owner-approved PDF reads coherently and was visually inspected; no regeneration was needed.

The brochure link is understated, sits within the partnership-offer section, identifies Italian / one page / PDF in both languages, and has a keyboard focus treatment and 44px target. No signup or tracking is introduced.

## Commercial terms for owner decision, not editorial blockers

- **“Produzione eventi”**: current copy describes planning and coordinating roles/suppliers by agreement. Confirm whether the public offer should be described as full event production or more narrowly event design/coordination. No guaranteed staffing, permits, catering supply or all-inclusive service was added.
- **“Biglietteria”**: current copy offers a proposal agreed per event. Decide who will be the seller/merchant for each actual event (venue, YMG or a ticket provider) before a ticket-sales flow or fixed revenue model is published. The current site makes no such commitment.

No new price, revenue split, response deadline, supplier availability, attendance guarantee, sales guarantee or registered event-agency claim has been introduced.

# Italian transcreation audit (#102) — 14 November 2026

Scope: every Italian string on `/it/`, `/it/privacy.html` and `/it/404.html`, including metadata, alt text, ARIA labels, placeholders, the dynamic form copy in `dist/assets/site-interactions.js`, and the status messages in `dist/assets/i18n.js`. **The Italian partnership PDF is excluded for now at the owner's request** (it will follow with #101). Worker error strings in `src/form-handler.js` are English-only but are never shown to visitors (the client always shows its own localized message), so they are not a leak.

This is an editorial pass by Claude, **not a review by a native Italian speaker**. Please have a native speaker read it before treating it as final.

| Area | English intent | Previous Italian | New Italian | Why |
|---|---|---|---|---|
| Hero band | Event production · Genova | Collaborazioni con location · Eventi · Genova, Italia | Produzione eventi · Genova, Italia | Matches EN and the accepted term *Produzione eventi* (#74) |
| Hero lede | thoughtful hospitality, distinctive music | ospitalità curata, musica distintiva | ospitalità attenta, musica scelta con cura | "musica distintiva" is a calque |
| Intro | one unified experience | riuniti in un’unica squadra | riuniti in un’unica esperienza | Location and music can't form a "squadra" |
| Rooftop card | golden-hour aperitivo | all’ora d’oro | al tramonto | "ora d’oro" is photography jargon |
| Private card | intimate gatherings | incontri intimi | feste tra pochi intimi | "incontri intimi" reads as romantic/sexual |
| Supper card | delight and surprise the senses… room for conversation and laughter | deliziare e sorprendere i sensi… spazio per la conversazione e le risate | sorprendere il palato… tutto il tempo per chiacchierare e ridere insieme | Less florid, more natural |
| Card CTAs | Plan a … | Progetta … | Organizza … | "Progettare" sounds technical for a guest |
| Partnerships pitch | tailored to your target demographic | su misura per il tuo pubblico di riferimento | pensata per il pubblico che vuoi attirare | Avoids repeating "su misura" from the heading; less marketing jargon |
| Partnership 01 | Decide who… we design | Decidi chi… progettiamo… portarli | Tu scegli chi… noi progettiamo… portarlo | Clear subject split; agreement with "chi" |
| Partnership 02 | Every venue requires a unique touch | Ogni location ha bisogno di un tocco unico | Ogni locale merita un tocco che lo distingua | Removes repeated "location"/"unico" |
| Founder bio | Current two-paragraph EN bio | Older one-paragraph bio with different facts | Translation of the current EN bio, same two paragraphs | Factual symmetry with EN |
| Form eyebrow | Start a conversation | Iniziamo una conversazione | Parliamone | Natural Italian |
| Inquiry type | Choose the path that best fits | Scegli il percorso più adatto | Seleziona un’opzione | "percorso" is a calque of "path" |
| Venue option/field | venue or hospitality partnership | location o attività ricettiva | locale o location | *Attività ricettiva* means hotels/B&Bs, not bars and venues |
| Name placeholder | — | Come possiamo chiamarti? | Es. Giulia Rossi | The label asks for first and last name |
| Email placeholder | — | tu@esempio.it | nome@esempio.it | Italian convention |
| Format field | Which style interests you? / Any format | Quale stile… / Nessun formato specifico | Quale format… / Nessuno in particolare, accetto proposte | One term ("format") used consistently across the site |
| Format status | Selected event format | Formato selezionato / Rimuovi il formato | Format selezionato / Rimuovi il format | Same consistency |
| Accepted status | accepted for processing (not proof of delivery) | accettata per l’elaborazione | Il sistema di invio ha preso in carico la tua richiesta | Natural wording; still means "accepted", not "delivered" (#30) |
| Footer tagline | Venue partnerships & event production | … · Genova, Italia | Collaborazioni con location e produzione eventi | Matches EN; Genova stays in the legal line |
| Privacy share alt | — | L’eleganza ha un lato notturno | YMG Events — Eventi a Genova. | Old luxury tagline no longer on the card (same fix in EN) |
| Privacy §3 | — | email di risposta; servizio autenticato Google Apps Script invia | indirizzo email per la risposta; servizio Google Apps Script autenticato inoltra | Word order and precision |

Kept on purpose: the owner-approved headline, *Contatti* as the header CTA, *Live di sera*, *format*, *DJ set*, *location* and *budget* (all normal in Italian event marketing), and the Italian-only footer inquiry link (a test pins it; the EN removal was an EN-only decision). Form option `value` attributes and API identifiers are unchanged.
