import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = readFileSync(new URL("../docs/case-studies/TEMPLATE.md", import.meta.url), "utf8");
const instructions = readFileSync(new URL("../docs/case-studies/README.md", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const italianHomepage = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");

test("case-study template requires fact, client, photo, testimonial and owner gates", () => {
  for (const required of [
    "PRIVATE DRAFT", "FACT CHECKED", "RIGHTS CLEARED", "OWNER APPROVED",
    "Event date and timezone", "Venue name for public use", "YMG Events role",
    "Source for each fact", "Exact definition and period", "Creator / rights holder",
    "Permission for the exact quote", "attendee releases", "Owner approved this exact copy",
  ]) assert.ok(template.includes(required), `template includes ${required}`);
  assert.match(template, /No example data/);
  assert.match(template, /No example asset/);
});

test("private drafts and releases stay outside this public repository", () => {
  assert.match(instructions, /repository is public/i);
  assert.match(instructions, /do not put private drafts, signed releases/i);
  assert.match(instructions, /commercial terms in this repository/i);
  assert.match(instructions, /Copy.*private owner-controlled workspace/);
  assert.match(instructions, /signed releases/);
  assert.match(instructions, /only after all gates pass/i);
  assert.match(instructions, /outside\s+`dist`/);
  assert.match(template, /private owner-controlled workspace/);
});

test("no case-study cards or pages are published before a real approved event exists", () => {
  for (const [name, page] of [["English", homepage], ["Italian", italianHomepage]]) {
    assert.doesNotMatch(page, /case[- ]study|testimonial|client story|recent events/i, `${name} page has no invented case-study content`);
  }
  assert.doesNotMatch(sitemap, /case-studies/i, "unpublished case-study templates are not crawlable site pages");
});
