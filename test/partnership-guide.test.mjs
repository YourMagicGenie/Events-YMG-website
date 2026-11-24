// Guards the two-page partnership and services guide (#119): its editable copy, the rendered PDFs and the rule that
// the published /downloads/ files only change once the owner has approved the guide.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { copy, status } from "../docs/collateral/source/partnership-guide-copy.mjs";

const file = path => new URL(`../${path}`, import.meta.url);

const guides = {
  en: {
    served: "dist/downloads/ymg-events-venue-partnerships-en.pdf",
    onePager: "docs/collateral/venue-partnership-one-pager-en.pdf",
    fees: ["€1,100–€1,600", "€2,000–€3,000", "€2,700–€4,200", "From €4,500"],
    working: "€4,500–€6,500", advisory: "€300–€450", fitCall: "free 15–20 minute fit call",
    feeLabel: "Indicative YMG professional fee", notQuote: "not a quotation",
    noGuarantee: "Attendance and revenue are not guaranteed", deposit: /\bdeposit\b/i,
  },
  it: {
    served: "dist/downloads/ymg-events-collaborazioni-location-it.pdf",
    onePager: "docs/collateral/venue-partnership-one-pager-it.pdf",
    fees: ["1.100–1.600 €", "2.000–3.000 €", "2.700–4.200 €", "Da 4.500 €"],
    working: "4.500–6.500 €", advisory: "300–450 €", fitCall: "chiamata conoscitiva gratuita di 15–20 minuti",
    feeLabel: "Tariffa YMG indicativa", notQuote: "non è un preventivo",
    noGuarantee: "Affluenza e incassi non sono garantiti", deposit: /\b(deposito|caparra)\b/i,
  },
};

for (const [lang, g] of Object.entries(guides)) {
  const c = copy[lang];
  const text = JSON.stringify({ ...c, subject: undefined }); // visible copy; the email subject is URL-encoded
  const out = c.out.replace(".draft.pdf", status === "approved" ? ".pdf" : ".draft.pdf");

  test(`${lang} partnership guide keeps the owner's indicative fees and commercial limits`, () => {
    assert.ok(["draft", "approved"].includes(status), "status is draft or approved");
    assert.equal(c.lang, lang);
    assert.deepEqual(c.services.map(service => service[4]), g.fees, "service fee bands match the owner's v3 document");
    assert.ok(text.includes(g.working), "complex production keeps its working guide");
    assert.ok(c.explore.includes(g.advisory), "advisory band matches v3");
    assert.ok(c.explore.includes(g.fitCall), "fit call stays free and 15–20 minutes");
    assert.equal(c.feeLabel, g.feeLabel, "fees are labelled indicative, not quotes");
    assert.ok(c.disclaimer.includes(g.notQuote), "every page says the guide is not a quotation");
    assert.ok(c.economics.includes(g.noGuarantee), "no attendance or revenue guarantee");
    assert.ok(!text.includes("%"), "no percentage terms (commission, revenue split or deposit rates) are stated");
    assert.ok(!g.deposit.test(text), "no deposit term is invented");
    if (lang === "it") assert.ok(!/compens/i.test(text), "the fee note uses the owner's \"tariffa\", like the fee labels (#102)");
  });

  test(`${lang} partnership guide PDF is two A4 pages with embedded fonts, extractable text and working links`, () => {
    const pdf = readFileSync(file(out));
    const raw = pdf.toString("latin1");
    assert.ok(pdf.subarray(0, 5).equals(Buffer.from("%PDF-")), "is a PDF");
    assert.equal(raw.match(/\/Type\s*\/Page(?![s\w])/g)?.length, 2, "exactly two pages");
    for (const box of raw.match(/\/MediaBox\s*\[[^\]]*\]/g)) {
      const [, , w, h] = box.match(/[\d.]+/g).map(Number);
      assert.ok(Math.abs(w - 595.28) < 1 && Math.abs(h - 841.89) < 1, `A4 page size, got ${w}×${h}`);
    }
    assert.ok(pdf.length < 400_000, `stays small enough for email and WhatsApp (${pdf.length} bytes)`);
    assert.ok(raw.includes(`/URI (mailto:hello@ymgconsultingservices.com?subject=${c.subject})`), "email address and QR code open a prefilled email");
    assert.ok(raw.includes("/URI (https://events.ymgconsultingservices.com/)"), "website link is clickable");
    assert.ok(/\/BaseFont \/[A-Z]{6}\+DMSans/.test(raw) && /\/BaseFont \/[A-Z]{6}\+PlayfairDisplay-Regular/.test(raw), "DM Sans and Playfair Display are embedded");
    assert.ok(!raw.includes("/Type3"), "no Type 3 outline fonts (static DM Sans instances are used)");
    assert.ok(raw.includes("/ToUnicode"), "text is extractable and searchable");
  });

  test(`${lang} published partnership PDF changes only after the owner approves the guide`, () => {
    const served = readFileSync(file(g.served));
    if (status === "approved") {
      assert.ok(served.equals(readFileSync(file(out))), "the URL serves the approved guide");
    } else {
      assert.ok(served.equals(readFileSync(file(g.onePager))), "the URL keeps the current one-pager while the guide is a draft");
      assert.ok(!existsSync(file(`docs/collateral/partnership-guide-${lang}.pdf`)), "no final guide exists before approval");
    }
  });
}
