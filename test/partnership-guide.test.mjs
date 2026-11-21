// Guards the two-page partnership and services guide (#119): its editable JSON masters, the rendered PDFs and the
// rule that the published /downloads/ files only change once the owner has approved the copy.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const file = path => new URL(`../${path}`, import.meta.url);
const load = lang => JSON.parse(readFileSync(file(`docs/collateral/source/partnership-guide-${lang}.json`), "utf8"));
// Visible copy only: skip the editor note and the URL-encoded email subject.
const visible = master => JSON.stringify({ ...master, _about: undefined, subject: undefined });

const guides = {
  en: {
    served: "dist/downloads/ymg-events-venue-partnerships-en.pdf",
    onePager: "docs/collateral/venue-partnership-one-pager-en.pdf",
    fees: ["€1,100–€1,600", "€2,000–€3,000", "€2,700–€4,200", "From €4,500"],
    working: "€4,500–€6,500", advisory: "€300–€450", fitCall: "free 15–20 minute fit call",
    feeLabel: "Indicative YMG professional fee", notQuote: "not a quotation",
    noGuarantee: "Attendance and revenue are not guaranteed", caption: "Illustrative", deposit: /\bdeposit\b/i,
  },
  it: {
    served: "dist/downloads/ymg-events-collaborazioni-location-it.pdf",
    onePager: "docs/collateral/venue-partnership-one-pager-it.pdf",
    fees: ["1.100–1.600 €", "2.000–3.000 €", "2.700–4.200 €", "Da 4.500 €"],
    working: "4.500–6.500 €", advisory: "300–450 €", fitCall: "chiamata conoscitiva gratuita di 15–20 minuti",
    feeLabel: "Tariffa YMG indicativa", notQuote: "non è un preventivo",
    noGuarantee: "Affluenza e incassi non sono garantiti", caption: "Foto illustrativa", deposit: /\b(deposito|caparra)\b/i,
  },
};

for (const [lang, g] of Object.entries(guides)) {
  const master = load(lang);
  const copy = visible(master);

  test(`${lang} partnership guide keeps the owner's indicative fees and commercial limits`, () => {
    assert.ok(["draft", "approved"].includes(master.status), "status is draft or approved");
    assert.equal(master.lang, lang);
    assert.deepEqual(master.services.items.map(item => item.fee), g.fees, "service fee bands match the owner's v3 document");
    assert.ok(copy.includes(g.working), "complex production keeps its working guide");
    assert.equal(master.explore.fee, g.advisory, "advisory band matches v3");
    assert.ok(copy.includes(g.fitCall), "fit call stays free and 15–20 minutes");
    assert.equal(master.services.feeLabel, g.feeLabel, "fees are labelled indicative, not quotes");
    assert.ok(master.disclaimer.includes(g.notQuote), "every page says the guide is not a quotation");
    assert.ok(copy.includes(g.noGuarantee), "no attendance or revenue guarantee");
    assert.ok(!copy.includes("%"), "no percentage terms (commission, revenue split or deposit rates) are stated");
    assert.ok(!g.deposit.test(copy), "no deposit term is invented");
    assert.ok(master.hero.photoCaption.startsWith(g.caption), "the stock hero photo is labelled illustrative");
  });

  test(`${lang} partnership guide PDF is two A4 pages with embedded fonts, extractable text and working links`, () => {
    const pdf = readFileSync(file(`docs/collateral/partnership-guide-${lang}${master.status === "approved" ? "" : ".draft"}.pdf`));
    const raw = pdf.toString("latin1");
    assert.ok(pdf.subarray(0, 5).equals(Buffer.from("%PDF-")), "is a PDF");
    assert.equal(raw.match(/\/Type\s*\/Page(?![s\w])/g)?.length, 2, "exactly two pages");
    for (const box of raw.match(/\/MediaBox\s*\[[^\]]*\]/g)) {
      const [, , w, h] = box.match(/[\d.]+/g).map(Number);
      assert.ok(Math.abs(w - 595.28) < 1 && Math.abs(h - 841.89) < 1, `A4 page size, got ${w}×${h}`);
    }
    assert.ok(pdf.length < 400_000, `stays small enough for email and WhatsApp (${pdf.length} bytes)`);
    assert.ok(raw.includes(`/URI (mailto:hello@ymgconsultingservices.com?subject=${master.subject})`), "email and QR link open a prefilled email");
    assert.ok(raw.includes("/URI (https://events.ymgconsultingservices.com/)"), "website link is clickable");
    assert.ok(/\/BaseFont \/[A-Z]{6}\+DMSans/.test(raw) && /\/BaseFont \/[A-Z]{6}\+PlayfairDisplay-Regular/.test(raw), "DM Sans and Playfair Display are embedded");
    assert.ok(!raw.includes("/Type3"), "no Type 3 outline fonts (static DM Sans instances are used)");
    assert.ok(raw.includes("/ToUnicode"), "text is extractable and searchable");
  });

  test(`${lang} published partnership PDF changes only after the owner approves the guide`, () => {
    const served = readFileSync(file(g.served));
    if (master.status === "approved") {
      assert.ok(served.equals(readFileSync(file(`docs/collateral/partnership-guide-${lang}.pdf`))), "the URL serves the approved guide");
    } else {
      assert.ok(served.equals(readFileSync(file(g.onePager))), "the URL keeps the current one-pager while the guide is a draft");
      assert.ok(!existsSync(file(`docs/collateral/partnership-guide-${lang}.pdf`)), "no final guide exists before approval");
    }
  });
}
