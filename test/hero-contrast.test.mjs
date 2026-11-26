import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrastRatio, requiredRatio } from "./hero-contrast.mjs";
import { HERO_VIEWPORTS } from "./hero-contrast-audit.mjs";

test("contrast math matches the WCAG relative-luminance formula", () => {
  assert.equal(contrastRatio([255, 255, 255], [0, 0, 0]).toFixed(2), "21.00");
  assert.equal(contrastRatio([0x17, 0x2a, 0x28], [0xf1, 0xea, 0xdf]).toFixed(2), "12.57");
  assert.equal(contrastRatio([0xd3, 0xd1, 0xc6], [0x11, 0x1e, 0x1e]).toFixed(2), "11.16");
});

test("WCAG 2.2 large-text threshold applies at 24px, or 18.66px bold", () => {
  assert.equal(requiredRatio(14, 400), 4.5);
  assert.equal(requiredRatio(21, 400), 4.5);
  assert.equal(requiredRatio(19, 700), 3);
  assert.equal(requiredRatio(24, 400), 3);
});

test("the hero audit covers phone portrait, both breakpoints and 1280px desktop", () => {
  const widths = HERO_VIEWPORTS.map(([width]) => width);
  for (const width of [320, 390, 540, 541, 850, 851, 1280, 1440, 1920]) assert.ok(widths.includes(width), `${width}px is audited`);
  const audit = readFileSync(new URL("./hero-contrast-audit.mjs", import.meta.url), "utf8");
  assert.match(audit, /\["en", "\/"\], \["it", "\/it\/"\]/, "both locales are audited");
});

test("the #135 halo stays off phones so the approved #100 overlay is unchanged", () => {
  const css = readFileSync(new URL("../dist/assets/mobile-hero.css", import.meta.url), "utf8");
  assert.match(css, /@media\(min-width:541px\)\{\.hero-copy>p,\.hero \.geo\{text-shadow:/);
  assert.match(css, /@media\(max-width:540px\)\{\.hero-atmosphere img\{object-position:68% center\}\.hero-atmosphere:after\{background:linear-gradient\(90deg,rgba\(9,22,22,\.86\),rgba\(9,22,22,\.57\)\)\}\}/);
});
