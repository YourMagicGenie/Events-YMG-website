// Guards the two-page partnership and services guide (#119): its editable JSON master, the rendered PDF and the
// rule that the published /downloads/ files only change once the owner has approved the copy.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const file = path => new URL(`../${path}`, import.meta.url);
const master = JSON.parse(readFileSync(file("docs/collateral/source/partnership-guide-en.json"), "utf8"));
// Visible copy only: skip the editor note and the URL-encoded email subject.
const strings = JSON.stringify({ ...master, _about: undefined, subject: undefined });

test("partnership guide copy keeps the owner's indicative fees and commercial limits", () => {
  assert.ok(["draft", "approved"].includes(master.status), "status is draft or approved");
  const fees = master.services.items.map(item => item.fee);
  assert.deepEqual(fees, ["€1,100–€1,600", "€2,000–€3,000", "€2,700–€4,200", "From €4,500"], "service fee bands match the owner's v3 document");
  assert.ok(strings.includes("Working guide €4,500–€6,500"), "complex production keeps its working guide");
  assert.equal(master.explore.fee, "€300–€450", "advisory band matches v3");
  assert.ok(strings.includes("free 15–20 minute fit call"), "fit call stays free and 15–20 minutes");
  assert.equal(master.services.feeLabel, "Indicative YMG professional fee", "fees are labelled indicative, not quotes");
  assert.ok(master.disclaimer.includes("not a quotation"), "every page says the guide is not a quotation");
  assert.ok(strings.includes("Attendance and revenue are not guaranteed"), "no attendance or revenue guarantee");
  assert.ok(!strings.includes("%"), "no percentage terms (commission, revenue split or deposit rates) are stated");
  assert.ok(!/\bdeposit\b/i.test(strings), "no deposit percentage or deposit term is invented");
  assert.ok(master.hero.photoCaption.startsWith("Illustrative"), "the stock hero photo is labelled illustrative");
});

test("partnership guide draft PDF is two A4 pages with embedded fonts, extractable text and working links", () => {
  const name = master.status === "approved" ? "partnership-guide-en.pdf" : "partnership-guide-en.draft.pdf";
  const pdf = readFileSync(file(`docs/collateral/${name}`));
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

test("published partnership PDFs change only after the owner approves the guide", () => {
  const served = readFileSync(file("dist/downloads/ymg-events-venue-partnerships-en.pdf"));
  if (master.status === "approved") {
    assert.ok(served.equals(readFileSync(file("docs/collateral/partnership-guide-en.pdf"))), "the English URL serves the approved guide");
  } else {
    assert.ok(served.equals(readFileSync(file("docs/collateral/venue-partnership-one-pager-en.pdf"))), "the English URL keeps the current one-pager while the guide is a draft");
    assert.ok(!existsSync(file("docs/collateral/partnership-guide-en.pdf")), "no final English guide exists before approval");
  }
});
