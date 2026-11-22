// Renders the two-page partnership and services guide (#119) from one template.
// Usage: node tools/render-partnership-guide.mjs [en|it]
// Writes docs/collateral/partnership-guide-<lang>.pdf and, once the copy status is "approved", the published /downloads/ file.
// Copy: docs/collateral/source/partnership-guide-copy.mjs. Uses only the site's self-hosted fonts and the existing QR artwork.
import { chromium } from "playwright";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { copy, status } from "../docs/collateral/source/partnership-guide-copy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fonts = path.join(root, "dist/assets/fonts");
// DM Sans comes from static 400/700 instances of the site font (tools/build-collateral-fonts.py): Chromium embeds the
// variable original as Type 3 outlines, which inflate the PDF. The glyphs and spacing are the same.
const statics = path.join(root, "docs/collateral/source/fonts");
const fontFiles = [[fonts, "playfair-display-latin.woff2"], [fonts, "playfair-display-italic-latin.woff2"],
  ...["latin", "latin-ext"].flatMap(sub => [400, 700].map(w => [statics, `dm-sans-${sub}-${w}.woff2`]))];
const fontData = Object.fromEntries(await Promise.all(fontFiles.map(async ([dir, file]) => [file, (await readFile(path.join(dir, file))).toString("base64")])));
const fontUrl = file => `data:font/woff2;base64,${fontData[file]}`;
// The site's hero photo (#100, see docs/ASSET-PROVENANCE.md) and founder portrait.
const imageUrl = async file => `data:image/webp;base64,${(await readFile(path.join(root, "dist/assets", file))).toString("base64")}`;
const images = { hero: await imageUrl("event-hero-960.webp"), founder: await imageUrl("dante-david-480.webp") };
// Chromium stores WebP images losslessly in a PDF; re-encoding them as high-quality JPEG at the same pixel size keeps the
// look and makes the file far smaller.
async function asJpeg(page, src) {
  return page.evaluate(async src => {
    const im = new Image(); im.src = src; await im.decode();
    const cv = Object.assign(document.createElement("canvas"), { width: im.naturalWidth, height: im.naturalHeight });
    cv.getContext("2d").drawImage(im, 0, 0);
    return cv.toDataURL("image/jpeg", 0.92);
  }, src);
}

const esc = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function html(c, qrSvg, images) {
  const email = "hello@ymgconsultingservices.com";
  const site = "https://events.ymgconsultingservices.com/";
  const services = c.services.map(([kind, when, text, points, fee], i) => `<article class="svc">
    <div class="kicker"><b>${String(i + 1).padStart(2, "0")}</b>${esc(kind)}</div>
    <h3>${esc(when)}</h3><p>${esc(text)}</p>
    <ul>${points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
    <div class="fee"><strong>${esc(fee)}</strong><span>${esc(c.feeLabel)}</span></div></article>`).join("");
  const agree = c.agree.map(([t, d]) => `<div class="ag"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("");
  const process = c.process.map(([t, d], i) => `<div class="pr"><h4><i>${String(i + 1).padStart(2, "0")}</i>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("");
  const head = `<div class="top"><div class="logo"><span>.</span>ymg events</div><div class="where"><b>${esc(c.topRight[0])}</b><br>${esc(c.topRight[1])}</div></div>`;
  const foot = n => `<footer><span>${esc(c.footer)}</span><span>${esc(c.disclaimer)}</span><b>${n} / 2</b></footer>`;
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><title>${esc(c.title)}</title><style>
${[400, 700].map(w => `@font-face{font-family:'DM Sans';font-weight:${w};src:url('${fontUrl(`dm-sans-latin-${w}.woff2`)}') format('woff2')}
@font-face{font-family:'DM Sans';font-weight:${w};src:url('${fontUrl(`dm-sans-latin-ext-${w}.woff2`)}') format('woff2');unicode-range:U+0100-02BA,U+1E00-1EFF}`).join("")}
@font-face{font-family:'Playfair Display';font-weight:400;src:url('${fontUrl("playfair-display-latin.woff2")}') format('woff2')}
@font-face{font-family:'Playfair Display';font-style:italic;font-weight:400;src:url('${fontUrl("playfair-display-italic-latin.woff2")}') format('woff2')}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f7f3eb;color:#123f3e;font:400 8.6pt/1.45 'DM Sans',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:inherit;text-decoration:none}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;border-top:5pt solid #d8664c;padding:18pt 34pt 0;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.top{display:flex;justify-content:space-between;align-items:flex-start;height:36pt}
.logo{font:400 22pt/1 'Playfair Display',serif;letter-spacing:-.5pt}.logo span{color:#d8664c}
.where{text-align:right;font-size:6.4pt;letter-spacing:.6pt;text-transform:uppercase;color:#666d63;line-height:1.9}.where b{color:#123f3e;font-weight:700}
.eyebrow{font-size:6.4pt;font-weight:700;letter-spacing:.8pt;text-transform:uppercase}
.hero{background:#123f3e;color:#f7f3eb;border-radius:9pt;padding:20pt 21pt 19pt;position:relative;overflow:hidden;margin-top:8pt;min-height:150pt}
.hero .copy{position:relative;z-index:1;max-width:300pt}
.hero .photo{position:absolute;top:0;right:0;bottom:0;width:46%;background-size:cover;background-position:50% 55%}
.hero .photo:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#123f3e 0%,rgba(18,63,62,.55) 28%,rgba(18,63,62,0) 60%)}
.founder{display:flex;gap:16pt;align-items:center;margin-top:18pt;background:#fffdf8;border:.7pt solid #e2d8c6;border-radius:8pt;padding:13pt}
.founder img{width:82pt;height:82pt;border-radius:7pt;object-fit:cover;object-position:50% 25%;flex:0 0 auto}
.founder h3{font:400 15pt/1.2 'Playfair Display',serif;margin:4pt 0 5pt}.founder h3 i{color:#743037}
.founder p{font-size:7.8pt;color:#4f5a52;line-height:1.55}
.hero .eyebrow{color:#e9b49d}
.hero h1{font:400 25pt/1.15 'Playfair Display',serif;margin:8pt 0 8pt}.hero h1 i{color:#e9b49d}
.hero p{font-size:8.2pt;color:#e8e2d6;max-width:350pt;line-height:1.55}
h2.eyebrow{color:#743037;padding-bottom:7pt;border-bottom:.7pt solid #d5c1bd;margin:17pt 0 6pt}
.lead{font-size:8.6pt;margin-bottom:11pt;max-width:470pt}
.svcs{display:grid;grid-template-columns:1fr 1fr;gap:12pt}
.svc{background:#fffdf8;border:.7pt solid #e2d8c6;border-radius:8pt;padding:14pt 14pt 12pt;display:flex;flex-direction:column}
.kicker{font-size:6.2pt;font-weight:700;letter-spacing:.8pt;text-transform:uppercase;color:#743037;display:flex;align-items:center;gap:6pt}
.kicker b{display:inline-grid;place-items:center;width:12pt;height:12pt;border-radius:50%;background:#d8664c;color:#fff;font-size:5pt;letter-spacing:0}
.svc h3{font:400 12.5pt/1.2 'Playfair Display',serif;margin:6pt 0 4pt}
.svc p{font-size:8pt;color:#4f5a52;line-height:1.5}
.svc ul{list-style:none;margin:7pt 0 10pt;font-size:7.7pt;line-height:1.55}
.svc li{padding-left:9pt;position:relative}.svc li:before{content:"";position:absolute;left:0;top:5pt;width:4pt;height:.9pt;background:#d8664c}
.fee{margin-top:auto;border-top:.7pt solid #e2d8c6;padding-top:7pt;display:flex;align-items:baseline;justify-content:space-between;gap:8pt}
.fee strong{font:400 14pt/1 'Playfair Display',serif;color:#123f3e}.fee span{font-size:6.2pt;color:#6c7268;text-align:right}
.note{font-size:7.6pt;color:#4f5a52;margin:9pt 0 0;line-height:1.5}
.band{background:#eee9df;border-radius:8pt;padding:11pt 14pt;margin-top:12pt;display:flex;gap:14pt;align-items:baseline}
.band .eyebrow{color:#743037;flex:0 0 72pt}.band p{font-size:8.2pt;line-height:1.5}
.ags{display:grid;grid-template-columns:repeat(3,1fr);gap:9pt 16pt}
.ag h4,.pr h4{font-size:8.2pt;font-weight:700;margin-bottom:3pt}
.ag p,.pr p{font-size:7.7pt;color:#4f5a52;line-height:1.5}
.ag{border-top:1.4pt solid #d8664c;padding-top:6pt}
.prs{display:grid;grid-template-columns:repeat(4,1fr);gap:14pt}
.pr h4{display:flex;align-items:flex-end;gap:8pt}.pr h4 i{font:italic 400 15pt/1 'Playfair Display',serif;color:#d8664c}
.contact{position:absolute;left:34pt;right:34pt;bottom:52pt;background:#123f3e;color:#f7f3eb;border-radius:9pt;padding:17pt 20pt 15pt;display:flex;justify-content:space-between;align-items:center;gap:20pt}
.contact .eyebrow{color:#e9b49d}
.contact h2{font:400 15pt/1.25 'Playfair Display',serif;margin:6pt 0 6pt}
.contact p{font-size:7.6pt;color:#e8e2d6;max-width:330pt;line-height:1.5}
.contact .who{margin-top:8pt;font-size:7.2pt;color:#c9d1c8}
.contact .mail{margin-top:5pt;font-size:8.2pt}.contact .mail b{font-weight:700}
.qrbox{text-align:center;flex:0 0 auto}.qr{display:block;background:#fff;border-radius:6pt;padding:5pt;width:74pt;height:74pt}.qr svg{display:block;width:100%;height:100%}
.qrbox small{display:block;font-size:6pt;color:#c9d1c8;margin-top:5pt}
footer{position:absolute;left:34pt;right:34pt;bottom:22pt;display:flex;justify-content:space-between;gap:12pt;font-size:6.2pt;color:#6c7268;border-top:.7pt solid #d5c1bd;padding-top:7pt}footer b{color:#123f3e}
</style></head><body>
<section class="page" id="p1">${head}
<div class="hero"><div class="photo" aria-hidden="true" style="background-image:url('${images.hero}')"></div>
<div class="copy"><div class="eyebrow">${esc(c.eyebrow)}</div><h1>${esc(c.headline[0])}<br><i>${esc(c.headline[1])}</i></h1><p>${esc(c.subtitle)}</p></div></div>
<h2 class="eyebrow">${esc(c.servicesTitle)}</h2>${c.servicesLead ? `<p class="lead">${esc(c.servicesLead)}</p>` : ""}
<div class="svcs">${services}</div>
<p class="note">${esc(c.feeNote)}</p>
<div class="band"><div class="eyebrow">${esc(c.exploreTitle)}</div><p>${esc(c.explore)}</p></div>
${foot(1)}</section>
<section class="page" id="p2">${head}
<h2 class="eyebrow" style="margin-top:6pt">${esc(c.venueTitle)}</h2><p class="lead">${esc(c.venueLead)}</p>
<h3 style="font:400 12pt/1.2 'Playfair Display',serif;margin:2pt 0 9pt">${esc(c.agreeTitle)}</h3>
<div class="ags">${agree}</div>
<div class="band"><div class="eyebrow">${esc(c.economicsTitle)}</div><p>${esc(c.economics)}</p></div>
<h2 class="eyebrow">${esc(c.processTitle)}</h2>
<div class="prs">${process}</div>
<p class="note">${esc(c.quoteNote)}</p>
<div class="founder"><img src="${images.founder}" alt="${esc(c.founderAlt)}"><div><div class="eyebrow" style="color:#743037">${esc(c.founderTitle)}</div><h3>${esc(c.founderName)}</h3><p>${esc(c.founderBio)}</p></div></div>
<section class="contact"><div><div class="eyebrow">${esc(c.contactTitle)}</div><h2>${esc(c.contactHeadline)}</h2><p>${esc(c.contactText)}</p>
<p class="mail">${esc(c.write)} <a href="mailto:${email}?subject=${c.subject}"><b>${email}</b></a> · <a href="${site}">events.ymgconsultingservices.com</a></p></div>
<div class="qrbox"><a class="qr" href="mailto:${email}?subject=${c.subject}">${qrSvg}</a><small>${esc(c.scan)}</small></div></section>
${foot(2)}</section>
</body></html>`;
}

const langs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(copy);
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
try {
  for (const lang of langs) {
    const c = copy[lang];
    const qr = await readFile(path.join(root, c.qr), "utf8");
    const tab = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    const jpegs = { hero: await asJpeg(tab, images.hero), founder: await asJpeg(tab, images.founder) };
    await tab.emulateMedia({ media: "print" });
    await tab.setContent(html(c, qr, jpegs), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    // Each page's flowing content must end above its fixed contact block / footer.
    const gaps = await tab.evaluate(() => [...document.querySelectorAll(".page")].map(page => {
      const limit = (page.querySelector(".contact") || page.querySelector("footer")).getBoundingClientRect().top;
      const flow = [...page.children].filter(el => !el.matches(".contact, footer"));
      return limit - Math.max(...flow.map(el => el.getBoundingClientRect().bottom));
    }));
    gaps.forEach((gap, i) => { if (gap < 8) throw new Error(`${lang} page ${i + 1} content collides with its footer (${gap.toFixed(1)}px)`); });
    await tab.pdf({ path: path.join(root, c.out), format: "A4", printBackground: true, tagged: true });
    await tab.screenshot({ path: path.join(root, c.out.replace(/\.pdf$/, ".png")), fullPage: true });
    await tab.close();
    if (status === "approved") await copyFile(path.join(root, c.out), path.join(root, c.served));
    process.stdout.write(`Rendered ${c.out}${status === "approved" ? ` and ${c.served}` : ""} (free space per page: ${gaps.map(g => g.toFixed(0) + "px").join(", ")})\n`);
  }
} finally {
  await browser.close();
}
