// Renders the two-page A4 partnership and services guide (#119) from its editable JSON master.
//
//   node tools/render-partnership-guide.mjs en          review draft  -> docs/collateral/partnership-guide-en.draft.pdf (+ .png preview)
//   node tools/render-partnership-guide.mjs en --final  approved copy -> docs/collateral/partnership-guide-en.pdf and the published
//                                                       /downloads/ URL (refused unless the JSON status is "approved")
//
// Copy lives in docs/collateral/source/partnership-guide-<lang>.json. Uses only the site's self-hosted fonts, the current
// hero and founder images and the existing QR artwork; images are re-encoded as JPEG in the browser so the PDF stays small.
// DM Sans comes from static 400/700 instances (tools/build-collateral-fonts.py): Chromium would embed the site's variable
// DM Sans as Type 3 outlines, which render unhinted in some viewers.
import { chromium } from "playwright";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const final = args.includes("--final");
const langs = args.filter(a => !a.startsWith("--"));
const served = { en: "dist/downloads/ymg-events-venue-partnerships-en.pdf", it: "dist/downloads/ymg-events-collaborazioni-location-it.pdf" };
const email = "hello@ymgconsultingservices.com";
const site = "https://events.ymgconsultingservices.com/";

const asset = async file => (await readFile(path.join(root, file))).toString("base64");
const fontFiles = ["playfair-display-latin", "playfair-display-latin-ext", "playfair-display-italic-latin", "playfair-display-italic-latin-ext"];
const fonts = Object.fromEntries(await Promise.all([
  ...fontFiles.map(f => [f, `dist/assets/fonts/${f}.woff2`]),
  ...["latin", "latin-ext"].flatMap(sub => [400, 700].map(w => [`dm-sans-${sub}-${w}`, `docs/collateral/source/fonts/dm-sans-${sub}-${w}.woff2`])),
].map(async ([name, file]) => [name, `data:font/woff2;base64,${await asset(file)}`])));
const ext = "U+0100-02BA,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4";

// Palette: the live site's tokens (dist/index.html :root and section backgrounds).
const C = { ivory: "#f1eadf", card: "#f8f4ec", ink: "#172a28", deep: "#132724", night: "#111e1e", gold: "#bd9864", champagne: "#d5b47e", brown: "#815342", muted: "#5f655b", line: "#d9cfbd", soft: "#e8dfcf" };

const esc = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const two = i => String(i + 1).padStart(2, "0");

function html(c, img, qr) {
  const s = c.services;
  const head = `<header class="top"><div class="logo"><span><i>.</i>ymg events</span><small>${esc(c.tagline)}</small></div>
    <div class="where">${c.draft ? `<em>${esc(c.draftLabel)} · ${esc(c.reviewDate)}</em>` : ""}<b>${esc(c.topRight[0])}</b>${esc(c.topRight[1])}</div></header>`;
  const foot = n => `<footer><span>${esc(c.footer)}</span><span>${esc(c.disclaimer)}</span><b>${n} / 2</b></footer>`;
  const cards = s.items.map((x, i) => `<article class="svc">
      <div class="kick"><b>${two(i)}</b>${esc(x.kind)}<span>/ ${esc(x.when)}</span></div>
      <h3>${esc(x.name)}</h3><p>${esc(x.text)}</p>
      <ul>${x.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      <div class="fee"><strong>${esc(x.fee)}</strong><span>${esc(s.feeLabel)}</span></div></article>`).join("");
  const defs = (list, cls) => list.map(([t, d]) => `<div class="${cls}"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("");
  const v = c.venues, d = c.delivery, k = c.contact;
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><title>${esc(c.title)}</title><style>
${[400, 700].map(w => `@font-face{font-family:'DM Sans';font-weight:${w};src:url('${fonts[`dm-sans-latin-${w}`]}') format('woff2')}
@font-face{font-family:'DM Sans';font-weight:${w};src:url('${fonts[`dm-sans-latin-ext-${w}`]}') format('woff2');unicode-range:${ext}}`).join("")}
@font-face{font-family:'Playfair Display';font-weight:400;src:url('${fonts["playfair-display-latin"]}') format('woff2')}
@font-face{font-family:'Playfair Display';font-weight:400;src:url('${fonts["playfair-display-latin-ext"]}') format('woff2');unicode-range:${ext}}
@font-face{font-family:'Playfair Display';font-style:italic;font-weight:400;src:url('${fonts["playfair-display-italic-latin"]}') format('woff2')}
@font-face{font-family:'Playfair Display';font-style:italic;font-weight:400;src:url('${fonts["playfair-display-italic-latin-ext"]}') format('woff2');unicode-range:${ext}}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:${C.ivory}}
body{color:${C.ink};font:400 8pt/1.48 'DM Sans',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-kerning:normal}
a{color:inherit;text-decoration:none}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;padding:24pt 36pt 0;break-after:page;background:${C.ivory}}
.page:last-child{break-after:auto}
.page:before{content:"";position:absolute;left:0;right:0;top:0;height:3.5pt;background:${C.champagne}}
.serif{font-family:'Playfair Display',Georgia,serif;font-weight:400}
.top{display:flex;justify-content:space-between;align-items:flex-start;height:40pt}
.logo span{display:block;font:400 21pt/1 'Playfair Display',serif;letter-spacing:-.6pt}.logo i{font-style:normal;color:${C.gold}}
.logo small{display:block;font-size:5.6pt;letter-spacing:.8pt;text-transform:uppercase;color:${C.muted};margin-top:3pt}
.where{text-align:right;font-size:5.9pt;letter-spacing:.9pt;text-transform:uppercase;color:${C.muted};line-height:1.85}
.where b{display:block;color:${C.ink};font-weight:700}
.where em{display:inline-block;font-style:normal;color:${C.brown};border:.6pt solid ${C.brown};border-radius:8pt;padding:.5pt 6pt;margin-bottom:3pt;letter-spacing:.7pt}
.eyebrow{font-size:6pt;font-weight:700;letter-spacing:.85pt;text-transform:uppercase;color:${C.brown}}
.sec{display:flex;align-items:baseline;gap:10pt;border-bottom:.6pt solid ${C.line};padding-bottom:5pt;margin:13pt 0 7pt}
.sec .num{font:italic 400 15pt/1 'Playfair Display',serif;color:${C.gold}}
.sec h2{font:400 15pt/1.15 'Playfair Display',serif;flex:1}
.sec .eyebrow{white-space:nowrap}
.lead{font-size:8.3pt;color:#33403b;margin-bottom:10pt;max-width:440pt}
/* hero */
.hero{background:${C.deep};color:${C.ivory};border-radius:8pt;position:relative;overflow:hidden;height:166pt;margin-top:2pt}
.hero .photo{position:absolute;top:0;right:0;bottom:0;width:54%;background-size:cover;background-position:52% 55%}
.hero .photo:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,${C.deep} 0%,rgba(19,39,36,.72) 22%,rgba(19,39,36,.12) 58%,rgba(19,39,36,0) 100%)}
.hero .photo small{position:absolute;right:9pt;bottom:7pt;font-size:5.2pt;letter-spacing:.8pt;text-transform:uppercase;color:${C.ivory};opacity:.8}
.hero .copy{position:relative;z-index:1;padding:19pt 0 0 22pt;width:62%}
.hero .eyebrow{color:${C.champagne};letter-spacing:.6pt}
.hero h1{font:400 26pt/1.08 'Playfair Display',serif;margin:7pt 0 7pt;letter-spacing:-.3pt}.hero h1 i{color:${C.champagne}}
.hero .l{font-size:8.6pt;line-height:1.45;color:${C.ivory};margin-bottom:5pt;max-width:265pt}
.hero p{font-size:7.6pt;line-height:1.5;color:#d9d4c9;max-width:265pt}
/* services */
.svcs{display:grid;grid-template-columns:1fr 1fr;gap:9pt}
.svc{background:${C.card};border:.6pt solid ${C.line};border-radius:7pt;padding:10pt 12pt 9pt;display:flex;flex-direction:column}
.kick{font-size:5.9pt;font-weight:700;letter-spacing:.5pt;text-transform:uppercase;color:${C.brown};display:flex;align-items:center;gap:5pt;white-space:nowrap}
.kick b{display:inline-grid;place-items:center;width:12pt;height:12pt;border-radius:50%;background:${C.ink};color:${C.champagne};font-size:5.2pt;letter-spacing:0}
.kick span{font-weight:400;color:${C.muted};letter-spacing:.45pt;overflow:hidden;text-overflow:ellipsis}
.svc h3{font:400 12pt/1.2 'Playfair Display',serif;margin:6pt 0 3pt}
.svc p{font-size:7.6pt;color:#3d4842;line-height:1.48}
.svc ul{list-style:none;margin:5pt 0 6pt;font-size:7.4pt;line-height:1.45;color:${C.ink}}
.svc li{padding-left:9pt;position:relative;margin-bottom:1.5pt}.svc li:before{content:"";position:absolute;left:0;top:4.6pt;width:4.5pt;height:.8pt;background:${C.gold}}
.fee{margin-top:auto;border-top:.6pt solid ${C.line};padding-top:7pt;display:flex;align-items:baseline;justify-content:space-between;gap:8pt}
.fee strong{font:400 15pt/1 'Playfair Display',serif;color:${C.ink};letter-spacing:-.2pt;white-space:nowrap}
.fee span{font-size:5.9pt;letter-spacing:.5pt;text-transform:uppercase;color:${C.muted};text-align:right}
.note{font-size:7.3pt;color:${C.muted};margin-top:7pt;line-height:1.45}
.lower{display:grid;grid-template-columns:1.8fr 1fr;gap:12pt;margin-top:10pt}
.budget h3,.blk h3{font:400 12pt/1.2 'Playfair Display',serif;margin-bottom:7pt}
.cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:12pt}
.def h4{font-size:7.6pt;font-weight:700;margin-bottom:2.5pt}
.def p{font-size:7.3pt;color:#3d4842;line-height:1.46}
.def{border-top:1.1pt solid ${C.gold};padding-top:5pt}
.explore{background:${C.ink};color:${C.ivory};border-radius:7pt;padding:12pt 13pt;display:flex;flex-direction:column}
.explore h3{font:400 12pt/1.2 'Playfair Display',serif;color:${C.ivory};margin-bottom:5pt}
.explore p{font-size:7.2pt;color:#d9d4c9;line-height:1.46}
.explore .fee{border-top-color:rgba(213,180,126,.35)}
.explore .fee strong{color:${C.champagne}}.explore .fee span{color:#bdb6a8}
/* page 2 */
.agree{margin-top:11pt;display:grid;grid-template-columns:repeat(5,1fr);gap:9pt}
.agree .def h4{color:${C.brown}}
.band{background:${C.soft};border-radius:7pt;padding:8pt 12pt;margin-top:9pt;display:flex;gap:12pt;align-items:baseline}
.band h4{font:italic 400 10.5pt/1.2 'Playfair Display',serif;flex:0 0 96pt;color:${C.ink}}
.band p{font-size:7.4pt;line-height:1.48;color:#33403b}
.sub{font:400 11pt/1.2 'Playfair Display',serif;margin-top:12pt}
.contact{position:absolute;left:36pt;right:36pt;bottom:44pt;background:${C.deep};color:${C.ivory};border-radius:8pt;padding:14pt 16pt 12pt}
.contact .eyebrow{color:${C.champagne}}
.contact h2{font:400 16pt/1.12 'Playfair Display',serif;margin:6pt 0 6pt}
.contact .cl{font-size:7.6pt;line-height:1.48;color:#d9d4c9}
.cgrid{display:grid;grid-template-columns:.9fr 1.25fr 1.1fr;gap:14pt}
.paths div+div{margin-top:6pt}
.cgrid h4{font-size:7.4pt;font-weight:700;color:${C.champagne};margin-bottom:2.5pt}
.cgrid p,.cgrid li{font-size:7.1pt;line-height:1.46;color:#e4ded2}
.cgrid ul{list-style:none}.cgrid li{padding-left:8pt;position:relative;margin-bottom:1pt}.cgrid li:before{content:"";position:absolute;left:0;top:4.4pt;width:4pt;height:.8pt;background:${C.champagne}}
.cgrid .small{font-style:italic;color:#bdb6a8;margin-top:3pt}
.cfoot{display:grid;grid-template-columns:1fr auto;gap:16pt;align-items:center;border-top:.6pt solid rgba(213,180,126,.3);margin-top:9pt;padding-top:9pt}
.founder{display:flex;gap:11pt;align-items:center}
.founder img{width:58pt;height:58pt;border-radius:50%;object-fit:cover;flex:0 0 auto;border:1pt solid ${C.champagne}}
.founder .eyebrow{color:${C.champagne};font-size:5.6pt}
.founder h3{font:400 12pt/1.15 'Playfair Display',serif;margin:2pt 0 2pt}
.founder p{font-size:6.9pt;line-height:1.45;color:#d9d4c9}
.reach{display:flex;gap:11pt;align-items:center}
.reach .lines{text-align:right;font-size:7.4pt;line-height:1.75}
.reach .lines b{font-weight:700;color:${C.ivory}}
.reach .lines .site{color:${C.champagne}}
.reach .lines small{display:block;font-size:5.8pt;letter-spacing:.8pt;text-transform:uppercase;color:#bdb6a8}
.qr{display:block;background:#fff;border-radius:5pt;padding:4pt;width:60pt;height:60pt}.qr svg{display:block;width:100%;height:100%}
.qrw{text-align:center}.qrw small{display:block;font-size:5.4pt;color:#bdb6a8;margin-top:3pt;letter-spacing:.4pt}
footer{position:absolute;left:36pt;right:36pt;bottom:20pt;display:flex;justify-content:space-between;gap:12pt;font-size:5.9pt;color:${C.muted};border-top:.6pt solid ${C.line};padding-top:6pt}
footer b{color:${C.ink}}
</style></head><body>
<section class="page" id="p1">${head}
  <div class="hero"><div class="photo" role="img" aria-label="${esc(c.hero.photoAlt)}" style="background-image:url('${img.hero}')"><small>${esc(c.hero.photoCaption)}</small></div>
    <div class="copy"><div class="eyebrow">${esc(c.hero.eyebrow)}</div><h1>${esc(c.hero.headline[0])}<br><i>${esc(c.hero.headline[1])}</i></h1>
    <p class="l">${esc(c.hero.lead)}</p><p>${esc(c.hero.text)}</p></div></div>
  <div class="sec"><span class="num">01</span><h2>${esc(s.heading)}</h2><span class="eyebrow">${esc(s.title)}</span></div>
  ${s.lead ? `<p class="lead">${esc(s.lead)}</p>` : ""}
  <div class="svcs">${cards}</div>
  <p class="note">${esc(s.note)}</p>
  <div class="lower">
    <div class="budget"><h3>${esc(c.budget.heading)}</h3><div class="cols3">${defs(c.budget.items, "def")}</div></div>
    <div class="explore"><h3>${esc(c.explore.heading)}</h3><p>${esc(c.explore.text)}</p>
      <div class="fee" style="margin-top:8pt"><strong>${esc(c.explore.fee)}</strong><span>${esc(c.explore.feeLabel)}</span></div></div>
  </div>
  ${foot(1)}</section>
<section class="page" id="p2">${head}
  <div class="sec" style="margin-top:6pt"><span class="num">02</span><h2>${esc(v.heading)}</h2><span class="eyebrow">${esc(v.title)}</span></div>
  <p class="lead">${esc(v.lead)}</p>
  <div class="cols3">${defs(v.items, "def")}</div>
  <h3 class="sub">${esc(v.agreeHeading)}</h3>
  <div class="agree" style="margin-top:7pt">${defs(v.agree, "def")}</div>
  <div class="band"><h4>${esc(v.economicsHeading)}</h4><p>${esc(v.economics)}</p></div>
  <div class="sec"><span class="num">03</span><h2>${esc(d.heading)}</h2><span class="eyebrow">${esc(d.title)}</span></div>  <div class="cols3">${defs(d.items, "def")}</div>
  <div class="band"><h4>${esc(d.quoteHeading)}</h4><p>${esc(d.quote)}</p></div>
  <section class="contact">
    <div class="cgrid"><div><div class="eyebrow">${esc(k.eyebrow)}</div><h2>${esc(k.heading)}</h2><p class="cl">${esc(k.lead)}</p></div>
      <div class="paths">${k.paths.map(([t, x]) => `<div><h4>${esc(t)}</h4><p>${esc(x)}</p></div>`).join("")}</div>
      <div><h4>${esc(k.checklistHeading)}</h4><ul>${k.checklist.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="small">${esc(k.checklistNote)}</p></div></div>
    <div class="cfoot">
      <div class="founder"><img src="${img.founder}" alt="${esc(k.founderAlt)}"><div><div class="eyebrow">${esc(k.founderEyebrow)}</div><h3>${esc(k.founderName)}</h3><p>${esc(k.founderBio)}</p></div></div>
      <div class="reach"><div class="lines"><a href="mailto:${email}?subject=${c.subject}"><b>${email}</b></a><br><a class="site" href="${site}">events.ymgconsultingservices.com</a><small>${esc(k.fitCall)}</small></div>
        <div class="qrw"><a class="qr" href="mailto:${email}?subject=${c.subject}">${qr}</a><small>${esc(k.scan)}</small></div></div>
    </div></section>
  ${foot(2)}</section>
</body></html>`;
}

// Re-encode a site WebP as a sized JPEG so Chromium embeds it with DCT compression instead of lossless Flate.
async function jpeg(page, file, width, height, quality) {
  const src = `data:image/webp;base64,${await asset(file)}`;
  return page.evaluate(async ({ src, width, height, quality }) => {
    const im = new Image(); im.src = src; await im.decode();
    const scale = Math.max(width / im.naturalWidth, height / im.naturalHeight);
    const w = width / scale, h = height / scale;
    const cv = Object.assign(document.createElement("canvas"), { width, height });
    cv.getContext("2d").drawImage(im, (im.naturalWidth - w) / 2, (im.naturalHeight - h) / 2, w, h, 0, 0, width, height);
    return cv.toDataURL("image/jpeg", quality);
  }, { src, width, height, quality });
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
try {
  for (const lang of langs.length ? langs : ["en"]) {
    const c = JSON.parse(await readFile(path.join(root, `docs/collateral/source/partnership-guide-${lang}.json`), "utf8"));
    if (final && c.status !== "approved") throw new Error(`${lang}: --final needs "status": "approved" in the JSON master (currently "${c.status}")`);
    c.draft = !final;
    const out = `docs/collateral/partnership-guide-${lang}${final ? "" : ".draft"}.pdf`;
    const tab = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    const img = { hero: await jpeg(tab, "dist/assets/event-hero-1440.webp", 1000, 720, 0.8), founder: await jpeg(tab, "dist/assets/dante-david-480.webp", 240, 240, 0.85) };
    const qr = (await readFile(path.join(root, c.qr), "utf8")).replace(/#123f3e/g, C.ink);
    await tab.emulateMedia({ media: "print" });
    await tab.setContent(html(c, img, qr), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    // Layout guard: flowing content must clear the fixed contact panel / footer, and nothing may overflow its box.
    const report = await tab.evaluate(() => [...document.querySelectorAll(".page")].map(page => {
      const limit = (page.querySelector(".contact") || page.querySelector("footer")).getBoundingClientRect().top;
      const flow = [...page.children].filter(el => !el.matches(".contact, footer"));
      const clipped = [...page.querySelectorAll("h1,h2,h3,h4,p,li,.kick,strong")].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent.slice(0, 40));
      return { gap: limit - Math.max(...flow.map(el => el.getBoundingClientRect().bottom)), clipped };
    }));
    await tab.screenshot({ path: path.join(root, out.replace(/\.pdf$/, ".png")), fullPage: true });
    report.forEach(({ gap, clipped }, i) => {
      if (gap < 8) throw new Error(`${lang} page ${i + 1}: content runs into the footer/contact panel (${gap.toFixed(1)}px)`);
      if (clipped.length) throw new Error(`${lang} page ${i + 1}: clipped text: ${clipped.join(" | ")}`);
    });
    await tab.pdf({ path: path.join(root, out), format: "A4", printBackground: true, tagged: true, preferCSSPageSize: true });
    await tab.close();
    if (final) await copyFile(path.join(root, out), path.join(root, served[lang]));
    process.stdout.write(`Rendered ${out}${final ? ` and ${served[lang]}` : ""} (spare space per page: ${report.map(r => r.gap.toFixed(0) + "px").join(", ")})\n`);
  }
} finally {
  await browser.close();
}
