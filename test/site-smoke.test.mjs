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
  assert.match(html, /<a class="btn primary" href="#enquire">Tell us what you’re planning/);
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
    "Dante David, a Genova-based event organizer",
    "venue partnerships and private occasions",
  ]) {
    assert.ok(html.includes(detail), `public copy retains the owner-directed offer: ${detail}`);
  }
  assert.doesNotMatch(html, /we(?:['’]re| are) developing|exploring higher-end evenings|more mature (?:audience|crowd)|prototype|mockup|demo site/i);
  assert.doesNotMatch(html, /sold out|award[- ]winning|trusted by|our clients include|booked venues/i);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, "the landing page keeps one clear primary heading");
  assert.ok([...html.matchAll(/<h2\b/g)].length >= 4, "the page keeps a structured section heading hierarchy");
});

test("founder credibility uses first-party community experience and keeps the brands distinct", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  const sources = readFileSync(new URL("../docs/FOUNDER-CREDIBILITY.md", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../dist/assets/legibility.css", import.meta.url), "utf8");
  const profile = 'href="https://www.instagram.com/portoaperto_genova/" target="_blank" rel="noopener noreferrer"';

  assert.match(html, /Through Porto Aperto, a separate local community/);
  assert.match(html, /not a record of previous YMG bookings/);
  assert.ok(html.includes(profile), "English page links to the owner-controlled community account safely");
  assert.match(italian, /Con Porto Aperto, una community locale distinta da YMG Events/);
  assert.match(italian, /non costituiscono un portfolio di eventi già realizzati da YMG/);
  assert.ok(italian.includes(profile), "Italian page links to the same community account safely");
  assert.match(sources, /delivered Halloween/);
  assert.match(sources, /No portrait or event photo was added/);
  assert.match(sources, /remain in issue #12/);
  assert.match(styles, /\.about p\.founder-reference a[\s\S]*?min-height: 44px/);
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



test("English and Italian pages publish reciprocal language signals and translated journeys", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  const englishPrivacy = readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8");
  const italianPrivacy = readFileSync(new URL("../dist/it/privacy.html", import.meta.url), "utf8");
  const sitemap = readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  const messages = readFileSync(new URL("../dist/assets/i18n.js", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../dist/assets/navigation.js", import.meta.url), "utf8");

  assert.match(html, /<html lang="en">/);
  assert.match(italian, /<html lang="it">/);
  assert.match(html, /rel="canonical" href="https:\/\/events\.ymgconsultingservices\.com\/">/);
  assert.match(italian, /rel="canonical" href="https:\/\/events\.ymgconsultingservices\.com\/it\/">/);
  assert.match(html, /hreflang="it" href="https:\/\/events\.ymgconsultingservices\.com\/it\//);
  assert.match(italian, /hreflang="en" href="https:\/\/events\.ymgconsultingservices\.com\//);
  assert.match(englishPrivacy, /rel="canonical" href="https:\/\/events\.ymgconsultingservices\.com\/privacy\.html"/);
  assert.match(italianPrivacy, /rel="canonical" href="https:\/\/events\.ymgconsultingservices\.com\/it\/privacy\.html"/);
  assert.match(italianPrivacy, /hreflang="en" href="https:\/\/events\.ymgconsultingservices\.com\/privacy\.html"/);
  assert.match(italianPrivacy, /id="privacy-language-switch"[^>]*href="\/privacy\.html"/);

  for (const route of ["/it/", "/it/privacy.html"]) {
    assert.ok(sitemap.includes(`https://events.ymgconsultingservices.com${route}`), `${route} is in the sitemap`);
  }
  assert.match(italian, /L’eleganza ha un/);
  assert.match(italian, /aria-label="Apri il menu di navigazione"/);
  assert.match(italian, /aria-label="1 di 6: La serata in terrazza"/);
  assert.match(italian, /alt="Barche ormeggiate accanto ai ristoranti sul porto al tramonto\."/);
  assert.match(italian, /<label for="name">Nome e cognome \*<\/label>/);
  assert.match(italian, /placeholder="Come possiamo chiamarti\?"/);
  assert.match(italian, /<option value="Rooftop evenings">Serate in terrazza<\/option>/);
  assert.match(italian, /<button[^>]*data-concept="Rooftop evenings"/);
  assert.match(italian, /href="\/it\/privacy.html"[^>]*>Scopri come trattiamo i tuoi dati/);
  assert.match(italianPrivacy, /Informativa sulla privacy/);
  assert.match(italianPrivacy, /Visita del sito/);
  assert.match(italianPrivacy, /Invio di una richiesta/);
  assert.match(interactions, /language: messages\.turnstileLanguage/);
  assert.match(messages, /turnstileLanguage: "it"/);
  assert.match(messages, /formUnavailable: "L’invio online/);
  assert.match(navigation, /Chiudi il menu di navigazione/);

  const italianAssets = [...italian.matchAll(/(?:src|href)="(\.\.\/assets\/[^"]+)"/g)].map(match => match[1]);
  assert.ok(italianAssets.length > 0, "Italian page has local asset references");
  for (const asset of italianAssets) {
    assert.ok(existsSync(new URL(`../dist/it/${asset}`, import.meta.url)), `${asset} resolves from the Italian route`);
  }
});

test("venue, corporate and private enquiries have explicit localized routes and minimal fields", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  const englishPrivacy = readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8");
  const italianPrivacy = readFileSync(new URL("../dist/it/privacy.html", import.meta.url), "utf8");
  const handler = readFileSync(new URL("../src/form-handler.js", import.meta.url), "utf8");
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");

  for (const page of [html, italian]) {
    assert.match(page, /name="source" value="events_website_form"/);
    for (const intent of ["venue_partnership", "corporate_event", "private_celebration"]) {
      assert.ok(page.includes(`<option value="${intent}">`), `${intent} is a selectable enquiry path`);
    }
    assert.match(page, /id="intent" name="intent" required/);
    assert.match(page, /id="business" name="business"/);
    assert.match(page, /data-enquiry-intent="venue_partnership"/);
  }
  assert.match(html, /data-concept="Private celebrations" data-intent="private_celebration"/);
  assert.match(html, /data-concept="Corporate Social" data-intent="corporate_event"/);
  assert.match(italian, /data-concept="Private celebrations" data-intent="private_celebration"/);
  assert.match(italian, /data-concept="Corporate Social" data-intent="corporate_event"/);
  assert.match(interactions, /business\.required = selected === "venue_partnership" \|\| selected === "corporate_event"/);
  assert.match(interactions, /You do not need to have chosen a venue before getting in touch/);
  assert.match(interactions, /Non serve avere già scelto una location per inviare la richiesta/);
  assert.match(handler, /Enquiry type: \$\{ENQUIRY_TYPES\.get\(intent\)\}/);
  assert.match(handler, /Enquiry source: \$\{ENQUIRY_SOURCES\.get\(source\)\}/);
  assert.match(handler, /eventsNotificationSubject\(name, intent\)/);
  assert.match(englishPrivacy, /enquiry type \(venue partnership, corporate event or private celebration\)/);
  assert.match(italianPrivacy, /tipo di richiesta \(collaborazione con una location, evento aziendale o occasione privata\)/);
});

test("venue offer and commercial FAQ are clear, localized and carefully qualified", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");

  for (const page of [html, italian]) {
    assert.match(page, /<section class="offer-faq" id="venue-offer"/);
    assert.equal((page.match(/class="offer-item"/g) ?? []).length, 6, "the partnership offer covers six practical work areas");
    assert.equal((page.match(/class="faq-item"/g) ?? []).length, 7, "the FAQ addresses common venue questions");
    assert.match(page, /<details class="faq-item"><summary>/, "answers use native keyboard-accessible disclosure controls");
  }

  for (const phrase of ["Creative concept", "Entertainment coordination", "Ticket proposition", "Promotion plan", "Practical production"]) {
    assert.ok(html.includes(phrase), `English offer covers ${phrase}`);
  }
  for (const phrase of ["Concept e percorso degli ospiti", "Coordinamento dell’intrattenimento", "Proposta di biglietteria", "Piano di promozione", "Produzione operativa"]) {
    assert.ok(italian.includes(phrase), `Italian offer covers ${phrase}`);
  }

  assert.match(html, /There is no standard revenue split/);
  assert.match(html, /Ticket sales and attendance are not guaranteed/);
  assert.match(italian, /Non c’è una ripartizione standard dei ricavi/);
  assert.match(italian, /Non si garantiscono vendite o affluenza/);
});
