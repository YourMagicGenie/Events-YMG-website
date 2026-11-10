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
  assert.match(privacy, /temporary request threshold/);
  assert.match(privacy, /does not create a submissions database/);
  assert.match(privacy, /served from Unsplash’s image CDN/);
});

test("Worker config serves this repo's assets from a separate preview worker", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"));
  assert.equal(config.name, "ymg-events-preview");
  assert.notEqual(config.name, "ymg-events-website");
  assert.equal(config.main, "src/worker.js");
  assert.equal(config.workers_dev, true);
  assert.deepEqual(config.assets, {
    directory: "./dist",
    binding: "ASSETS",
    run_worker_first: true,
  });
  assert.equal("routes" in config, false, "preview config must not attach a route");
  assert.equal("custom_domains" in config, false, "preview config must not attach a custom domain");
  assert.deepEqual(config.ratelimits, [{
    name: "EVENTS_SUBMISSION_LIMITER",
    namespace_id: "2026111010",
    simple: { limit: 5, period: 60 },
  }]);
});

test("event formats form a six-card carousel without filters or mockup disclaimers", () => {
  assert.match(html, /<div class="eyebrow">SEVERAL WAYS THE NIGHT COULD UNFOLD<\/div>/);
  assert.doesNotMatch(html, /THREE WAYS THE NIGHT COULD UNFOLD/);
  const expected = [
    "The Rooftop Social",
    "Strings After Dark",
    "The Private Occasion",
    "The Supper Club",
    "Jazz &amp; Cocktails",
    "The Corporate Social",
  ];
  const cards = [...html.matchAll(/<article class="concept" role="group" aria-roledescription="slide" aria-label="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, expected.length);
  for (const [index, [, accessibleLabel, markup]] of cards.entries()) {
    const number = String(index + 1).padStart(2, "0");
    assert.equal(accessibleLabel, `${index + 1} of 6: ${expected[index]}`, `slide ${number} has its matching semantic label`);
    assert.match(markup, new RegExp(`<small>${number} \/`), `slide ${number} keeps its number with the card`);
    assert.ok(markup.includes(`<h3>${expected[index]}</h3>`), `slide ${number} has the expected title`);
  }
  assert.match(html, /id="concept-deck"[^>]*aria-roledescription="carousel"/);
  assert.match(html, /id="deck-previous"/);
  assert.match(html, /id="deck-next"/);
  assert.doesNotMatch(html, /data-filter|All concepts|Concept imagery|Proposed event formats|A YMG Event Concept/i);
  assert.match(html, /<p class="caption"><a class="textlink" href="#enquire">Contact us to discuss availability and a tailored proposal\.<\/a><\/p>/);
  assert.doesNotMatch(html, /concept imagery|proposed event formats|a ymg event concept|prototype|mockup|demo (?:site|event)|sample concept|preview[- ]only/i);
  const formats = ["Rooftop evenings", "Live music &amp; DJs", "Private celebrations", "Supper Club", "Jazz &amp; Cocktails", "Corporate Social"];
  for (const format of formats) {
    assert.ok(html.includes(`data-concept="${format}"`), `${format} has a form preselection`);
    assert.ok(html.includes(`<option>${format}</option>`), `${format} is available in the form`);
  }
  assert.match(html, /\.concept-grid\{display:flex;gap:[^}]*overflow-x:auto/);
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  assert.match(interactions, /ArrowRight/);
  assert.match(interactions, /scrollIntoView\(\{ behavior: reduceMotion\(\) \? "auto" : "smooth"/);
});

test("hero uses licensed coastal photography without implying a YMG event", () => {
  assert.match(html, /<div class="hero-atmosphere"><picture>/);
  assert.match(html, /images\.unsplash\.com\/photo-1789931123652-6d22f2ef7cc7/);
  assert.match(html, /alt="Boats moored beside waterfront restaurants at dusk\."/);
  assert.match(html, /media="\(max-width: 540px\)"[^>]+480w/);
  assert.match(html, /fetchpriority="high"[^>]+referrerpolicy="no-referrer"/);
  assert.doesNotMatch(html, /Discover the atmosphere|We’re developing/);
  assert.match(html, /<a class="btn primary" href="#enquire">Talk about an event/);
  assert.match(html, /assets\/social-card\.png/);
  const provenance = readFileSync(new URL("../docs/ASSET-PROVENANCE.md", import.meta.url), "utf8");
  assert.match(provenance, /Arlind Photography/);
  assert.match(provenance, /Unsplash License/);
});

test("public positioning is venue-facing, factual, and consistent with metadata", () => {
  assert.match(html, /name="description" content="YMG Events plans distinctive evenings with Genova venues and hosts, bringing together music, hospitality and a memorable guest experience\."/);
  assert.match(html, /property="og:description" content="YMG Events works with Genova venues and hosts to shape distinctive evenings with music, hospitality and a memorable guest experience\."/);
  for (const detail of [
    "We work with Genova venues and hosts to shape evenings with character",
    "thoughtful hospitality, distinctive music",
    "coordinate entertainment",
    "practical delivery and commercial terms together",
    "a clear reason to choose your venue",
    "Discuss ticketing, hospitality costs, entertainment, promotion",
    "Dante David, based in Genova",
    "venue partnerships and private occasions",
  ]) {
    assert.ok(html.includes(detail), `public copy retains the owner-directed offer: ${detail}`);
  }
  assert.doesNotMatch(html, /we(?:['’]re| are) developing|exploring higher-end evenings|more mature (?:audience|crowd)|prototype|mockup|demo site/i);
  assert.doesNotMatch(html, /sold out|award[- ]winning|trusted by|our clients include|booked venues/i);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, "the landing page keeps one clear primary heading");
  assert.ok([...html.matchAll(/<h2\b/g)].length >= 4, "the page keeps a structured section heading hierarchy");
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
  assert.match(interactions, /if \(submitting\) return/);
  assert.ok(existsSync(new URL("../dist/assets/enquiry-client.js", import.meta.url)));
});

