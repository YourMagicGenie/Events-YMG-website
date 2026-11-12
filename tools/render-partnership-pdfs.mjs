// Renders the English and Italian venue-partnership one-pagers from one template.
// Usage: node tools/render-partnership-pdfs.mjs
// Requires the pre-installed Playwright Chromium. Uses only local fonts and QR artwork.
import { chromium } from "playwright";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fonts = path.join(root, "dist/assets/fonts");
const fontFiles = ["dm-sans-latin.woff2", "dm-sans-latin-ext.woff2", "playfair-display-latin.woff2", "playfair-display-italic-latin.woff2"];
const fontData = Object.fromEntries(await Promise.all(fontFiles.map(async file => [file, (await readFile(path.join(fonts, file))).toString("base64")])));
// Inline the site's own woff2 files: a setContent page cannot load file:// fonts.
const fontUrl = file => `data:font/woff2;base64,${fontData[file]}`;

const copy = {
  en: {
    lang: "en",
    title: "YMG Events - Venue partnerships in Genova",
    master: "docs/collateral/venue-partnership-one-pager-en.pdf",
    served: "dist/downloads/ymg-events-venue-partnerships-en.pdf",
    qr: "docs/collateral/source/qr-en.svg",
    subject: "Venue%20partnership%20with%20YMG%20Events",
    topRight: ["Events for venues", "Genova, Italy"],
    eyebrow: "Venue partnerships / Event production",
    headline: ["Elegance,", "after sunset."],
    subtitle: "Distinctive evenings, designed with your venue.",
    intro: "YMG Events creates distinctive evenings with Genova venues and hosts, bringing together music, hospitality and a memorable guest experience.",
    offerTitle: "A partnership that starts with the space",
    offer: [
      ["Creative concept", "A format and guest journey designed for the venue."],
      ["Music and entertainment", "Coordination of live music, DJs and performers."],
      ["Hospitality", "An experience consistent with the venue’s service and identity."],
      ["Ticketing", "A proposal to evaluate together with the venue."],
      ["Promotion", "A plan and materials agreed with the venue."],
      ["Practical production", "Timings, roles and responsibilities defined together."],
    ],
    stepsTitle: "From first conversation to decision",
    steps: [
      ["Start with the place", "Space, capacity, calendar and goals."],
      ["Design the evening", "Concept, entertainment, hospitality and costs."],
      ["Decide together", "Clear roles, costs and plan before going ahead."],
    ],
    clarityTitle: "Clarity from the start",
    clarity: "Every partnership is defined case by case. There is no standard revenue split; sales and attendance are not guaranteed. Costs, ticketing, responsibilities and promotion are agreed before deciding whether to proceed.",
    contactTitle: "Let’s talk about your venue",
    contactHeadline: "A first conversation, with no commitment.",
    write: "Write to",
    scan: "Visit the website or scan to email us.",
    footer: "YMG Events / Your Magic Genie Group / Genova, Italy",
  },
  it: {
    lang: "it",
    title: "YMG Events - Collaborazioni con location a Genova",
    master: "docs/collateral/venue-partnership-one-pager-it.pdf",
    served: "dist/downloads/ymg-events-collaborazioni-location-it.pdf",
    qr: "docs/collateral/source/qr-it.svg",
    subject: "Collaborazione%20con%20YMG%20Events",
    topRight: ["Eventi per location", "Genova, Italia"],
    eyebrow: "Collaborazioni con location / Produzione eventi",
    headline: ["Eleganza, dopo il", "tramonto."],
    subtitle: "Serate distintive, pensate con la tua location.",
    intro: "YMG Events crea serate distintive insieme a location e organizzatori di Genova, unendo musica, ospitalità e un’esperienza memorabile per gli ospiti.",
    offerTitle: "Una collaborazione che parte dallo spazio",
    offer: [
      ["Ideazione creativa", "Un format e un percorso ospiti pensati per la location."],
      ["Musica e intrattenimento", "Coordinamento di musica dal vivo, DJ e artisti."],
      ["Ospitalità", "Un’esperienza coerente con il servizio e l’identità del luogo."],
      ["Biglietteria", "Una proposta da valutare insieme alla location."],
      ["Promozione", "Piano e materiali da concordare con la location."],
      ["Produzione pratica", "Tempi, ruoli e responsabilità definiti insieme."],
    ],
    stepsTitle: "Dal primo confronto alla decisione",
    steps: [
      ["Partiamo dal luogo", "Spazio, capienza, calendario e obiettivi."],
      ["Disegniamo la serata", "Concept, intrattenimento, ospitalità e costi."],
      ["Decidiamo insieme", "Ruoli, costi e piano chiari prima di procedere."],
    ],
    clarityTitle: "Chiarezza fin dall’inizio",
    clarity: "Ogni collaborazione si definisce caso per caso. Non esiste una ripartizione standard dei ricavi; vendite e affluenza non sono garantite. Costi, biglietteria, responsabilità e promozione si concordano prima di decidere se procedere.",
    contactTitle: "Parliamo della tua location",
    contactHeadline: "Una prima conversazione, senza impegno.",
    write: "Scrivi a",
    scan: "Visita il sito o scansiona per scriverci una mail.",
    footer: "YMG Events / Your Magic Genie Group / Genova, Italia",
  },
};

const escape = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function page(c, qrSvg) {
  const email = "hello@ymgconsultingservices.com";
  const site = "https://events.ymgconsultingservices.com/";
  const offer = c.offer.map(([title, text], index) => `<div class="item"><h3><b>${String(index + 1).padStart(2, "0")}</b>${escape(title)}</h3><p>${escape(text)}</p></div>`).join("");
  const steps = c.steps.map(([title, text], index) => `<div class="step"><h3><i>${String(index + 1).padStart(2, "0")}</i>${escape(title)}</h3><p>${escape(text)}</p></div>`).join("");
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><title>${escape(c.title)}</title><style>
@font-face{font-family:'DM Sans';font-weight:400 700;src:url('${fontUrl("dm-sans-latin.woff2")}') format('woff2')}
@font-face{font-family:'DM Sans';font-weight:400 700;src:url('${fontUrl("dm-sans-latin-ext.woff2")}') format('woff2');unicode-range:U+0100-02BA,U+1E00-1EFF}
@font-face{font-family:'Playfair Display';font-weight:400;src:url('${fontUrl("playfair-display-latin.woff2")}') format('woff2')}
@font-face{font-family:'Playfair Display';font-style:italic;font-weight:400;src:url('${fontUrl("playfair-display-italic-latin.woff2")}') format('woff2')}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;height:297mm}
body{background:#f7f3eb;color:#123f3e;font:400 8.6pt/1.45 'DM Sans',sans-serif;border-top:5pt solid #d8664c;padding:20pt 37pt 0;position:relative;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:inherit;text-decoration:none}
.top{display:flex;justify-content:space-between;align-items:flex-start;height:43pt}
.logo{font:400 24pt/1 'Playfair Display',serif;letter-spacing:-.5pt}.logo span{color:#d8664c}
.where{text-align:right;font-size:6.6pt;letter-spacing:.6pt;text-transform:uppercase;color:#666d63;line-height:2}.where b{color:#123f3e;font-weight:700}
.hero{background:#123f3e;color:#f7f3eb;border-radius:9pt;padding:22pt 21pt 19pt;position:relative;overflow:hidden;margin-top:12pt}
.eyebrow{font-size:6.6pt;font-weight:700;letter-spacing:.7pt;text-transform:uppercase}
.hero .eyebrow{color:#e9b49d}
.hero h1{font:400 26pt/1.18 'Playfair Display',serif;margin:10pt 0 8pt;max-width:330pt}.hero h1 i{color:#e9b49d}
.hero p{font-size:8pt;color:#e8e2d6}
.rings{position:absolute;right:20pt;top:30pt;width:88pt;height:88pt}
.intro{font-size:9.2pt;line-height:1.6;margin:23pt 0 15pt;max-width:500pt}
h2.eyebrow{color:#743037;padding-bottom:9pt;border-bottom:.7pt solid #d5c1bd;margin-bottom:14pt}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22pt 20pt;margin-bottom:30pt}
.item h3{font-size:8.2pt;font-weight:700;display:flex;align-items:center;gap:6pt;margin-bottom:7pt}
.item h3 b{display:inline-grid;place-items:center;width:11pt;height:11pt;border-radius:50%;background:#d8664c;color:#fff;font-size:4.8pt}
.item p,.step p{color:#7a7f75;font-size:7.3pt;line-height:1.5;max-width:150pt}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20pt;margin-bottom:28pt}
.step h3{font-size:7.8pt;font-weight:700;display:flex;align-items:flex-end;gap:12pt;margin-bottom:8pt}
.step h3 i{font:italic 400 17pt/1 'Playfair Display',serif;color:#123f3e}
.clarity{background:#eee9df;border-radius:7pt;padding:13pt 15pt 13pt;margin-bottom:16pt}
.clarity .eyebrow{color:#743037;margin-bottom:6pt}
.clarity p{font-size:7.5pt;line-height:1.55;color:#123f3e}
.contact{background:#123f3e;color:#f7f3eb;border-radius:9pt;padding:19pt 21pt 15pt;display:flex;justify-content:space-between;align-items:center;gap:20pt}
.contact .eyebrow{color:#e9b49d}
.contact h2{font:400 15pt/1.3 'Playfair Display',serif;margin:8pt 0 9pt}
.contact p{font-size:8pt}.contact p b{font-weight:700}.contact small{display:block;margin-top:6pt;font-size:6.5pt;color:#c9d1c8}
.qr{background:#fff;border-radius:6pt;padding:5pt;width:76pt;height:76pt;flex:0 0 auto}.qr svg{display:block;width:100%;height:100%}
footer{position:absolute;left:37pt;right:37pt;bottom:28pt;display:flex;justify-content:space-between;font-size:6.6pt;color:#6c7268}footer a{color:#123f3e;font-weight:700}
</style></head><body>
<div class="top"><div class="logo"><span>.</span>ymg events</div><div class="where"><b>${escape(c.topRight[0])}</b><br>${escape(c.topRight[1])}</div></div>
<section class="hero"><div class="eyebrow">${escape(c.eyebrow)}</div><h1>${escape(c.headline[0])}<br><i>${escape(c.headline[1])}</i></h1><p>${escape(c.subtitle)}</p>
<svg class="rings" viewBox="0 0 88 88" fill="none"><circle cx="44" cy="44" r="43" stroke="#6f8980" stroke-width=".8"/><circle cx="44" cy="44" r="32" stroke="#6f8980" stroke-width=".8"/><path d="M8 66a42 42 0 0 0 72 0" stroke="#d8664c" stroke-width="2.4" stroke-linecap="round"/></svg></section>
<p class="intro">${escape(c.intro)}</p>
<h2 class="eyebrow">${escape(c.offerTitle)}</h2><div class="grid">${offer}</div>
<h2 class="eyebrow">${escape(c.stepsTitle)}</h2><div class="steps">${steps}</div>
<section class="clarity"><div class="eyebrow">${escape(c.clarityTitle)}</div><p>${escape(c.clarity)}</p></section>
<section class="contact"><div><div class="eyebrow">${escape(c.contactTitle)}</div><h2>${escape(c.contactHeadline)}</h2><p>${escape(c.write)} <a href="mailto:${email}"><b>${email}</b></a></p><small><a href="${site}">${escape(c.scan)}</a></small></div>
<a class="qr" href="mailto:${email}?subject=${c.subject}">${qrSvg}</a></section>
<footer><span>${escape(c.footer)}</span><a href="${site}">events.ymgconsultingservices.com</a></footer>
</body></html>`;
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
try {
  for (const c of Object.values(copy)) {
    const qr = await readFile(path.join(root, c.qr), "utf8");
    const tab = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await tab.emulateMedia({ media: "print" });
    await tab.setContent(page(c, qr), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    const gap = await tab.evaluate(() => document.querySelector("footer").getBoundingClientRect().top - document.querySelector(".contact").getBoundingClientRect().bottom);
    if (gap < 8) throw new Error(`${c.lang} one-pager content collides with the footer (${gap.toFixed(1)}px)`);
    await tab.pdf({ path: path.join(root, c.master), format: "A4", printBackground: true, tagged: true });
    await copyFile(path.join(root, c.master), path.join(root, c.served));
    await tab.close();
    process.stdout.write(`Rendered ${c.master} and ${c.served}\n`);
  }
} finally {
  await browser.close();
}
