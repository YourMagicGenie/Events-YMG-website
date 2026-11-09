import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");

test("main page exposes mobile navigation and a direct enquiry control", () => {
  assert.match(html, /<nav class="primary-nav" id="primary-navigation" aria-label="Main navigation">/);
  assert.match(html, /class="menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="primary-navigation"/);
  assert.match(html, /class="btn header-cta" href="#enquire"/);
  for (const section of ["approach", "concepts", "partners", "enquire"]) {
    assert.ok(html.includes(`href="#${section}"`));
    assert.match(html, new RegExp(`id="${section}"`));
  }
  const navigation = readFileSync(new URL("../dist/assets/navigation.js", import.meta.url), "utf8");
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /navigation\.contains\(event\.target\)/);
  assert.match(navigation, /target\.focus\(\{ preventScroll: true \}\)/);
});

test("main content can be reached by keyboard and reduced motion is respected", () => {
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  assert.match(interactions, /prefers-reduced-motion: reduce/);
  assert.match(html, /:focus-visible/);
});

test("local assets and public crawl files are present", () => {
  const assets = [...html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)].map(match => match[1]);
  assert.ok(assets.length > 0, "expected at least one local asset reference");
  for (const asset of assets) assert.ok(existsSync(new URL(`../dist/${asset}`, import.meta.url)), `${asset} exists`);
  for (const path of ["privacy.html", "robots.txt", "sitemap.xml"]) {
    assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), `${path} exists`);
  }
  const privacy = readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8");
  assert.match(privacy, /class="skip-link" href="#main-content"/);
  assert.match(privacy, /Cloudflare Turnstile/);
  assert.match(privacy, /Google Apps Script/);
  assert.match(privacy, /does not create a submissions database/);
});

test("event formats form a six-card carousel without filters or mockup disclaimers", () => {
  assert.match(html, /SEVERAL WAYS THE NIGHT COULD UNFOLD/);
  assert.equal([...html.matchAll(/class="concept" role="group"/g)].length, 6);
  assert.match(html, /id="concept-deck"[^>]*aria-roledescription="carousel"/);
  assert.match(html, /id="deck-previous"/);
  assert.match(html, /id="deck-next"/);
  assert.doesNotMatch(html, /data-filter|All concepts|Concept imagery|Proposed event formats|A YMG Event Concept/i);
  for (const format of ["Rooftop evenings", "Live music &amp; DJs", "Private celebrations", "Supper Club", "Jazz &amp; Cocktails", "Corporate Social"]) {
    assert.ok(html.includes(`data-concept="${format}"`), `${format} has a form preselection`);
    assert.ok(html.includes(`<option>${format}</option>`), `${format} is available in the form`);
  }
  assert.match(html, /overflow-x:auto/);
  assert.match(readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8"), /ArrowRight/);
});

test("hero copy is venue-facing and contains no artificial hero photo", () => {
  assert.match(html, /class="hero-atmosphere"/);
  assert.doesNotMatch(html, /<img[^>]+rooftop-night\.jpg|Discover the atmosphere|We’re developing/);
  assert.match(html, /talk about an event/i);
  assert.match(html, /assets\/social-card\.png/);
});

test("enquiry form collects reply email and submits inline through the Worker", () => {
  assert.match(html, /<input required id="email" name="email" type="email" autocomplete="email"/);
  assert.match(html, /id="submit-enquiry" type="submit" disabled><span class="submit-label">Send my inquiry email/);
  assert.match(html, /id="turnstile-widget"/);
  assert.match(html, /id="form-feedback"[^>]*aria-live="polite"/);
  assert.match(html, /href="mailto:hello@ymgconsultingservices\.com"/);
  assert.doesNotMatch(html, /Open email app|Prepare my enquiry email|Nothing is sent until you send/);
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  assert.match(interactions, /sendEventsEnquiry\(new FormData\(form\), turnstileToken\)/);
  assert.match(interactions, /submit\.disabled = true/);
  assert.match(interactions, /events_enquiry/);
  assert.ok(existsSync(new URL("../dist/assets/enquiry-client.js", import.meta.url)));
});

