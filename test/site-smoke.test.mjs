import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const italianHtml = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");

test("partnership section uses the tighter desktop gutter in both locales", () => {
  for (const page of [html, italianHtml]) {
    assert.match(page, /\.partnerships\{[^}]*grid-template-columns:minmax\(0,\.95fr\) minmax\(0,1\.05fr\);gap:clamp\(32px,5vw,72px\)/);
    assert.match(page, /\.partnerships p\{color:#ccd3c8;max-width:420px/);
  }
});

test("lower-page story moves from partnerships to founder to inquiry without repeated sections", () => {
  const cases = [
    {
      page: html,
      stages: ["For rooftops, venues & hospitality partners", "Your local point of contact", "Start a conversation"],
      founder: "I’m Dante David, a Genova-based event organizer from the USA. Through Porto Aperto | Genova, a local international community for social and nightlife events",
      removed: /From idea to a clear plan|A clear venue partnership|Questions venue owners often ask|not a record of previous YMG bookings|Whether it’s a venue partnership|Prefer a direct conversation\?|Read how we handle your information/,
    },
    {
      page: italianHtml,
      stages: ["Per terrazze, locali e realtà dell’ospitalità", "Il tuo referente a Genova", "Iniziamo una conversazione"],
      founder: "Sono Dante David, organizzatore di eventi a Genova, originario degli Stati Uniti. Con Porto Aperto | Genova, una community locale internazionale",
      removed: /Dall’idea a un piano chiaro|Una collaborazione chiara|Domande pratiche per i gestori|non costituiscono un portfolio|Che si tratti di una collaborazione|Preferisci parlarne direttamente\?|Scopri come trattiamo i tuoi dati/,
    },
  ];

  for (const { page, stages, founder, removed } of cases) {
    const positions = stages.map(stage => page.indexOf(stage));
    assert.ok(positions.every(position => position >= 0));
    assert.ok(positions[0] < positions[1] && positions[1] < positions[2], "partnerships, founder and inquiry appear in order");
    assert.doesNotMatch(page, /<section class="process"|<section class="offer-faq"|class="faq-item"|class="offer-item"/, "process, offer grid and FAQ sections are removed");
    assert.ok(page.includes(founder), "the owner-approved founder introduction is published");
    assert.doesNotMatch(page, removed, "owner-removed repeated copy stays out");
    assert.equal((page.match(/<div class="partnership">/g) ?? []).length, 3, "the partnership list keeps three points");
    assert.match(page, /id="partners"[\s\S]*?<section class="about">[\s\S]*?id="inquire"/);
    assert.match(page, /href="#partners"/);
    assert.match(page, /href="#inquire"/);
  }
});

test("bilingual footer gives visitors clear business contact, privacy and Atlas navigation", () => {
  const footerCases = [
    { page: html, privacy: '<a href="/privacy.html">Privacy notice</a>', location: "YMG Events · Genova, Italy · P.IVA 03044510992", tagline: "Venue partnerships" },
    { page: italianHtml, privacy: '<a href="/it/privacy.html">Informativa privacy</a>', location: "YMG Events · Genova, Italia · P.IVA 03044510992", tagline: "Collaborazioni con location" },
  ];

  for (const { page, privacy, location, tagline } of footerCases) {
    const footer = page.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
    const note = page.match(/<div class="site-note">[\s\S]*?<\/div>/)?.[0];
    assert.ok(footer && note, "footer and bottom line exist in both languages");
    assert.match(page, /href="\/assets\/footer\.css"/);
    assert.match(footer, /<a class="logo" href="\/"><i>\.<\/i>ymg events<\/a>/);
    assert.ok(footer.includes(tagline), "footer states the Events service and location");
    assert.match(footer, /href="mailto:hello@ymgconsultingservices\.com"/);
    assert.match(footer, /href="#inquire"/);
    assert.doesNotMatch(footer, /Frederic David|Privacy notice|Informativa privacy|A Your Magic Genie project|Un progetto Your Magic Genie/);
    assert.ok(note.includes(location), "bottom line carries the VAT number");
    assert.ok(note.includes(privacy), "privacy notice stays reachable from every homepage");
    assert.ok(note.includes('<a href="https://ymgconsultingservices.com/">Your Magic Genie · Atlas ↗</a>'));
    assert.doesNotMatch(footer + note, /\bREA\b|sede legale|Via Val Trebbia/i, "no unverified registry claim or private street address");
  }
});

test("main page exposes mobile navigation and a direct inquiry control", () => {
  assert.match(html, /<nav class="primary-nav" id="primary-navigation" aria-label="Main navigation">/);
  assert.match(html, /class="menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="primary-navigation"/);
  assert.match(html, /class="btn header-cta" href="#inquire"/);
  for (const section of ["approach", "concepts", "partners", "inquire"]) {
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
  const assets = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"?#]+)"/g)].map(match => match[1]);
  assert.ok(assets.length > 0, "expected at least one local asset reference");
  for (const asset of assets) assert.ok(existsSync(new URL(`../dist/${asset}`, import.meta.url)), `${asset} exists`);
  for (const path of ["privacy.html", "robots.txt", "sitemap.xml"]) {
    assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), `${path} exists`);
  }
  const privacy = readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8");
  assert.match(privacy, /class="skip-link" href="#main-content"/);
  for (const subject of ["Frederic Dante David", "Your Magic Genie Group", "03044510992", "Cloudflare Turnstile", "Google Apps Script", "Google Workspace", "European Economic Area", "standard contractual clauses", "How long information is kept", "Your rights"]) assert.ok(privacy.includes(subject));
  assert.match(privacy, /When online sending is available/);
  assert.match(privacy, /Optional conversion measurement is disabled/);
  assert.doesNotMatch(privacy, /If online sending is unavailable|Scope and changes|Unsplash/);
  assert.doesNotMatch(privacy, /this repository|draft must|qualified adviser|being confirmed/);
  const dataFlow = readFileSync(new URL("../docs/PRIVACY-DATA-FLOW.md", import.meta.url), "utf8");
  assert.match(dataFlow, /Production now serves the checked repository source/);
  assert.match(dataFlow, /self-managed/);

});

test("hero photos use responsive compressed sources and explicit priority", () => {
  for (const page of [html, italianHtml]) {
    const start = page.indexOf('<div class="hero-atmosphere">');
    const end = page.indexOf("</picture>", start);
    assert.notEqual(start, -1, "hero atmosphere exists");
    assert.notEqual(end, -1, "hero picture markup exists");
    const hero = page.slice(start, end + "</picture>".length);
    assert.match(hero, /<source media="\(max-width: 540px\)" sizes="100vw" srcset=/);
    for (const width of [480, 780]) assert.ok(hero.includes(`/assets/event-hero-mobile-${width}.webp ${width}w`));
    for (const width of [480, 960, 1440]) assert.ok(hero.includes(`/assets/event-hero-${width}.webp ${width}w`));
    assert.match(hero, /width="1440" height="960"/);
    assert.doesNotMatch(hero, /https:\/\//);
    assert.match(hero, /loading="eager" fetchpriority="high" decoding="async"/);
  }
});

test("indexing metadata and sitemap cover only canonical public pages", () => {
  const routes = [
    ["/", html],
    ["/privacy.html", readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8")],
    ["/it/", italianHtml],
    ["/it/privacy.html", readFileSync(new URL("../dist/it/privacy.html", import.meta.url), "utf8")],
  ];
  const origin = "https://events.ymgconsultingservices.com";
  const sitemap = readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../dist/robots.txt", import.meta.url), "utf8");
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.match(robots, /^User-agent: \*\nAllow: \/\nSitemap: https:\/\/events\.ymgconsultingservices\.com\/sitemap\.xml\n$/);
  assert.deepEqual(listed, routes.map(([route]) => `${origin}${route}`), "the sitemap contains every canonical English/Italian public page once");
  for (const [route, page] of routes) {
    assert.doesNotMatch(page, /<meta name="robots" content="noindex/, `${route} does not block indexing`);
    if (route === "/" || route === "/it/") assert.match(page, /<meta name="robots" content="index,follow">/, `${route} explicitly allows indexing`);
    assert.match(page, new RegExp(`<link rel="canonical" href="${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${route} declares its canonical URL`);
    assert.match(page, /<title>[^<]+<\/title>/, `${route} has a title`);
    assert.match(page, /<meta name="description" content="[^"]+">/, `${route} has a description`);
    assert.match(page, /<meta property="og:title" content="[^"]+">/, `${route} has an Open Graph title`);
  }
  for (const notFound of [
    readFileSync(new URL("../dist/404.html", import.meta.url), "utf8"),
    readFileSync(new URL("../dist/it/404.html", import.meta.url), "utf8"),
  ]) {
    assert.match(notFound, /<meta name="robots" content="noindex,follow">/);
    assert.doesNotMatch(notFound, /rel="canonical"/);
  }
});

test("home page publishes factual Organization and WebSite JSON-LD", () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, "the English subdomain home page has one structured-data block");
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@graph"].length, 2);
  const [organization, website] = data["@graph"];
  const origin = "https://events.ymgconsultingservices.com/";

  assert.equal(organization["@type"], "Organization");
  assert.equal(organization["@id"], `${origin}#organization`);
  assert.equal(organization.name, "YMG Events");
  assert.equal(organization.url, origin);
  assert.deepEqual(organization.logo, {
    "@type": "ImageObject",
    url: `${origin}assets/apple-touch-icon.png`,
    width: 180,
    height: 180,
  });
  assert.deepEqual(organization.contactPoint, {
    "@type": "ContactPoint",
    contactType: "general inquiries",
    email: "hello@ymgconsultingservices.com",
  });
  assert.equal(website["@type"], "WebSite");
  assert.equal(website["@id"], `${origin}#website`);
  assert.equal(website.name, "YMG Events");
  assert.equal(website.url, origin);
  assert.deepEqual(website.publisher, { "@id": `${origin}#organization` });
  assert.deepEqual(Object.keys(organization).sort(), ["@id", "@type", "contactPoint", "logo", "name", "url"].sort());
  assert.deepEqual(Object.keys(website).sort(), ["@id", "@type", "name", "publisher", "url"].sort());
  assert.deepEqual(data["@graph"].map((node) => node["@type"]), ["Organization", "WebSite"]);
  assert.doesNotMatch(italianHtml, /application\/ld\+json/, "the site-level name preference is declared only at the subdomain home page");
  assert.match(html, /YMG Events/);
  assert.match(html, /href="mailto:hello@ymgconsultingservices\.com"/);

  const logo = readFileSync(new URL("../dist/assets/apple-touch-icon.png", import.meta.url));
  assert.ok(logo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  assert.deepEqual([logo.readUInt32BE(16), logo.readUInt32BE(20)], [180, 180]);
});

test("self-hosted fonts are licensed, preloaded, and disclosed accurately", () => {
  const fontAssets = [
    "dm-sans-latin.woff2",
    "dm-sans-latin-ext.woff2",
    "playfair-display-latin.woff2",
    "playfair-display-latin-ext.woff2",
    "playfair-display-italic-latin.woff2",
    "playfair-display-italic-latin-ext.woff2",
    "OFL-dmsans.txt",
    "OFL-playfairdisplay.txt",
  ];
  for (const asset of fontAssets) assert.ok(existsSync(new URL(`../dist/assets/fonts/${asset}`, import.meta.url)), `${asset} is present`);
  for (const page of [html, italianHtml]) {
    assert.doesNotMatch(page, /fonts\.googleapis\.com|fonts\.gstatic\.com|@import/);
    assert.equal([...page.matchAll(/@font-face\{/g)].length, 6, "English and Italian pages retain all weight, style, and language subsets");
    assert.equal([...page.matchAll(/@font-face\{font-family:'Playfair Display';[^}]*font-weight:400;/g)].length, 4, "Playfair Display only loads the regular weight used by the design");
    assert.equal([...page.matchAll(/@font-face\{font-family:'DM Sans';[^}]*font-weight:400 700;/g)].length, 2, "DM Sans retains its variable weight range");
    for (const asset of ["dm-sans-latin.woff2", "playfair-display-latin.woff2"]) {
      assert.ok(page.includes(`<link rel="preload" href="/assets/fonts/${asset}" as="font" type="font/woff2" crossorigin>`), `${asset} is preloaded for first-viewport text`);
    }
    assert.match(page, /font-display:swap/);
  }
  const italianPrivacy = readFileSync(new URL("../dist/it/privacy.html", import.meta.url), "utf8");
  assert.doesNotMatch(italianPrivacy, /Se l’invio online non è disponibile|Ambito e aggiornamenti|Unsplash/);
  assert.match(italianPrivacy, /Quando l’invio online è disponibile/);
  assert.match(italianPrivacy, /href="https:\/\/www\.garanteprivacy\.it\/diritti\/come-agire-per-tutelare-i-tuoi-dati-personali\/reclamo"/);
  const provenance = readFileSync(new URL("../docs/FONT-ASSET-PROVENANCE.md", import.meta.url), "utf8");
  assert.match(provenance, /SIL Open Font License 1\.1/);
  for (const unusedPhoto of ["hero.jpg", "dinner.jpg", "rooftop-night.jpg"]) {
    assert.ok(!existsSync(new URL(`../dist/assets/${unusedPhoto}`, import.meta.url)), `${unusedPhoto} is not shipped as an unreferenced asset`);
  }
});

test("English and Italian branded recovery pages are accessible and excluded from indexing", () => {
  const variants = [
    {
      path: "404.html", page: readFileSync(new URL("../dist/404.html", import.meta.url), "utf8"),
      lang: "en", heading: "We couldn’t find that page.", home: 'href="/"', concepts: 'href="/#concepts"', inquire: 'href="/#inquire"', privacy: 'href="/privacy.html"', otherLanguage: 'href="/it/"',
    },
    {
      path: "it/404.html", page: readFileSync(new URL("../dist/it/404.html", import.meta.url), "utf8"),
      lang: "it", heading: "Non troviamo questa pagina.", home: 'href="/it/"', concepts: 'href="/it/#concepts"', inquire: 'href="/it/#inquire"', privacy: 'href="/it/privacy.html"', otherLanguage: 'href="/"',
    },
  ];
  const sitemap = readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  for (const { path, page, lang, heading, home, concepts, inquire, privacy, otherLanguage } of variants) {
    assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), `${path} exists`);
    assert.match(page, new RegExp(`<html lang="${lang}">`));
    assert.match(page, /<meta name="robots" content="noindex,follow">/);
    assert.match(page, /<main id="main-content" tabindex="-1">/);
    assert.ok(page.includes(`<h1>${heading}</h1>`), `${path} gives a clear not-found message`);
    for (const href of [home, concepts, inquire, privacy, otherLanguage]) assert.ok(page.includes(href), `${path} provides ${href}`);
    assert.match(page, /class="skip-link" href="#main-content"/);
    assert.match(page, /min-height:48px/);
    assert.doesNotMatch(page, /https?:\/\//, `${path} has no remote assets or external dependency`);
    assert.ok(!sitemap.includes(`/${path}`), `${path} is not listed as a valid destination`);
  }
});

test("brand icons and bilingual social previews use documented local assets", () => {
  const variants = [
    {
      name: "English",
      page: html,
      image: "social-card-v3.png",
      title: "YMG Events — Events in Genova",
      description: "Events, activities and celebrations in Genova. Tell us what you have in mind.",
      alt: "YMG Events — Events in Genova.",
    },
    {
      name: "Italian",
      page: italianHtml,
      image: "social-card-it-v3.png",
      title: "YMG Events — Eventi a Genova",
      description: "Attività, feste ed eventi a Genova. Raccontaci cosa hai in mente.",
      alt: "YMG Events — Eventi a Genova.",
    },
  ];
  for (const variant of variants) {
    const { page, name, image, title, description, alt } = variant;
    for (const token of [
      '<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">',
      '<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">',
      `<meta property="og:image" content="https://events.ymgconsultingservices.com/assets/${image}">`,
      `<meta property="og:image:alt" content="${alt}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:type" content="image/png">',
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${description}">`,
      `<meta name="twitter:image" content="https://events.ymgconsultingservices.com/assets/${image}">`,
      `<meta name="twitter:image:alt" content="${alt}">`,
    ]) assert.ok(page.includes(token), `${name} metadata includes ${token}`);
    assert.match(page, /<meta property="og:url" content="https:\/\/events\.ymgconsultingservices\.com\//, `${name} canonical share URL is absolute`);
  }

  const pngDimensions = name => {
    const png = readFileSync(new URL(`../dist/assets/${name}`, import.meta.url));
    assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${name} is a PNG`);
    if (name.startsWith("social-card")) assert.ok(png.length < 50_000, `${name} stays compact for link previews`);
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  assert.deepEqual(pngDimensions("favicon-16.png"), [16, 16]);
  assert.deepEqual(pngDimensions("favicon-32.png"), [32, 32]);
  assert.deepEqual(pngDimensions("apple-touch-icon.png"), [180, 180]);
  for (const name of ["social-card.png", "social-card-it.png"]) assert.deepEqual(pngDimensions(name), [1200, 630], `${name} has the correct share-preview dimensions`);

  const provenance = readFileSync(new URL("../docs/BRAND-ASSET-PROVENANCE.md", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../tools/render-brand-assets.sh", import.meta.url), "utf8");
  assert.match(renderer, /social-card-it\.svg/);
  assert.match(renderer, /apple-touch-icon\.png/);
  for (const sourceName of ["favicon.svg", "social-card.svg", "social-card-it.svg"]) {
    const source = readFileSync(new URL(`../dist/assets/${sourceName}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:href|xlink:href)="https?:|url\(["']?https?:/i, `${sourceName} has no external asset dependencies`);
  }
  for (const name of ["favicon.svg", "favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "social-card.svg", "social-card.png", "social-card-it.svg", "social-card-it.png"]) {
    assert.ok(existsSync(new URL(`../dist/assets/${name}`, import.meta.url)), `${name} exists`);
    assert.ok(provenance.includes(name), `${name} has a provenance entry`);
  }
});

test("Worker config serves this repo's assets from a separate preview worker", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"));
  assert.equal(config.name, "ymg-events-preview");
  assert.notEqual(config.name, "ymg-events-website");
  assert.equal(config.main, "src/worker.js");
  assert.equal(config.workers_dev, true);
  assert.equal(config.vars.EVENTS_METRICS_ENABLED, "false", "analytics remains disabled until privacy review and production activation");
  assert.deepEqual(config.analytics_engine_datasets, [{
    binding: "EVENTS_ANALYTICS",
    dataset: "ymg_events_preview_metrics",
  }], "the Analytics Engine dataset is isolated to preview");
  assert.deepEqual(config.assets, {
    directory: "./dist",
    binding: "ASSETS",
    run_worker_first: true,
    not_found_handling: "404-page",
  });
  assert.equal("routes" in config, false, "preview config must not attach a route");
  assert.equal("custom_domains" in config, false, "preview config must not attach a custom domain");
  assert.deepEqual(config.ratelimits, [
    {
      name: "EVENTS_SUBMISSION_LIMITER",
      namespace_id: "2026111010",
      simple: { limit: 5, period: 60 },
    },
    {
      name: "EVENTS_METRICS_LIMITER",
      namespace_id: "2026111030",
      simple: { limit: 30, period: 60 },
    },
  ]);
});

test("source and deployment docs identify one editable source and the separate production bundle", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const deployment = readFileSync(new URL("../deploy/README.md", import.meta.url), "utf8");

  assert.match(readme, /`dist\/`: editable buildless website/);
  assert.match(readme, /original generated bundle remains in the Sites-managed source/);
  assert.doesNotMatch(readme, /deploy\/cloudflare-worker\.mjs/);
  assert.match(deployment, /current GitHub source has an inline form/);
  assert.match(deployment, /original live bundle is a generated standalone[\s\S]*in the Sites-managed source/);
  assert.match(deployment, /\*\*not\*\* copied as a second editable source of truth/);
  assert.match(deployment, /Cloudflare Workers Builds watches `main`/);
});

test("event formats form a six-card carousel without filters or mockup disclaimers", () => {
  assert.match(html, /<div class="eyebrow">SEVERAL WAYS THE NIGHT COULD UNFOLD<\/div>/);
  assert.doesNotMatch(html, /THREE WAYS THE NIGHT COULD UNFOLD/);
  const expected = [
    "The Rooftop Social",
    "Live at Night",
    "A Private Occasion",
    "The Supper Club",
    "The Tasting Table",
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
  assert.doesNotMatch(html, /Contact us to discuss availability|class="caption"/);
  assert.match(html, /<p class="deck-hint">Swipe or use the arrows to explore several formats\.<\/p>/);
  assert.match(html, /<p class="deck-status visually-hidden" id="deck-status" role="status"/, "the position counter is announced but not shown");
  assert.doesNotMatch(html, /concept imagery|proposed event formats|a ymg event concept|prototype|mockup|demo (?:site|event)|sample concept|preview[- ]only/i);
  const formats = ["Rooftop evenings", "Live music &amp; DJs", "Private celebrations", "Supper Club", "Wine pairing", "Corporate Social"];
  for (const format of formats) {
    assert.ok(html.includes(`data-concept="${format}"`), `${format} has a form preselection`);
    assert.ok(html.includes(`<option>${format}</option>`), `${format} is available in the form`);
  }
  assert.match(html, /\.concept-grid\{display:flex;gap:[^}]*overflow-x:auto/);
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  assert.match(interactions, /ArrowRight/);
  assert.match(interactions, /scrollIntoView\(\{ behavior: reduceMotion\(\) \? "auto" : "smooth"/);
});


test("event card illustrations are local, format-specific, responsive and documented", () => {
  const assets = [
    { file: "rooftop-social.svg", en: "Stylized illustration of a candlelit rooftop table beside a coastal skyline at dusk.", it: "Illustrazione stilizzata di un tavolo illuminato da candele su una terrazza con vista sulla costa al tramonto." },
    { file: "strings-after-dark.svg", en: "Stylized illustration of a violin under warm stage lights with musical notes nearby.", it: "Illustrazione stilizzata di un violino sotto luci ambrate, con note musicali sullo sfondo." },
    { file: "private-occasion.svg", en: "Stylized illustration of a celebration table with flowers, cake and candles.", it: "Illustrazione stilizzata di un tavolo da festa con fiori, torta e candele." },
    { file: "supper-club.svg", en: "Stylized illustration of a plated meal on a dining table with candles and foliage.", it: "Illustrazione stilizzata di un piatto servito su una tavola apparecchiata, con candele e fogliame." },
    { file: "wine-pairing.svg", en: "Stylized illustration of a wine bottle and two glasses beside a tasting board of small plates and grapes.", it: "Illustrazione stilizzata di una bottiglia e due calici di vino accanto a un tagliere con piccoli assaggi e uva." },
    { file: "corporate-social.svg", en: "Stylized illustration of a modern city-view lounge with a high table and glasses.", it: "Illustrazione stilizzata di un salotto contemporaneo con vista sulla città, un tavolo alto e bicchieri." },
  ];
  for (const [pageName, page, localizedAlt] of [["English", html, "en"], ["Italian", italianHtml, "it"]]) {
    const cards = [...page.matchAll(/<article class="concept" role="group"[\s\S]*?<div class="art">([\s\S]*?)<\/div>/g)];
    assert.equal(cards.length, assets.length, `${pageName} has six illustrated cards`);
    for (const [index, asset] of assets.entries()) {
      const [, art] = cards[index];
      const alt = asset[localizedAlt];
      assert.match(art, new RegExp(`<img class="card-art-image" src="/assets/event-art/${asset.file}" alt="${alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" width="1200" height="960" decoding="async" loading="lazy">`), `${pageName} card ${index + 1} uses its matching illustration and localized description`);
      assert.equal(art.replace(/<img[^>]+>/, "").trim(), "", `${pageName} card ${index + 1} artwork contains no baked-in or duplicated poster copy`);
      assert.doesNotMatch(art, /https?:\/\//, `${pageName} card ${index + 1} has no remote image request`);
    }
  }
  for (const [pageName, styles] of [["English", html], ["Italian", italianHtml]]) {
    assert.match(styles, /\.concept \.art\{height:auto;aspect-ratio:5\/4/, `${pageName} uses the shared 5:4 card image frame`);
    assert.match(styles, /\.concept \.art img\{display:block;width:100%;height:100%;object-fit:cover/, `${pageName} crops the images without distortion`);
    assert.doesNotMatch(styles, /\.art-title|\.art-kicker|\.art-foot|\.type-art|\.games-art/, `${pageName} has no leftover poster-style art rules`);
  }
  const provenance = readFileSync(new URL("../docs/CARD-ART-PROVENANCE.md", import.meta.url), "utf8");
  assert.match(provenance, /original, locally authored SVG illustrations/i);
  assert.match(provenance, /do not depict or claim a past YMG booking/i);
  for (const asset of assets) {
    const source = readFileSync(new URL(`../dist/assets/event-art/${asset.file}`, import.meta.url), "utf8");
    assert.match(source, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1200" height="960" viewBox="0 0 1200 960"/);
    assert.doesNotMatch(source, /<text\b/, `${asset.file} keeps wording in the HTML rather than the image`);
    assert.ok(Buffer.byteLength(source) < 12000, `${asset.file} remains compact for delivery`);
    assert.ok(provenance.includes(asset.file), `${asset.file} has a provenance entry`);
  }
});

test("hero restores the owner-selected event atmosphere with local illustrative imagery", () => {
  assert.match(html, /event-hero-1440.webp/);
  assert.match(html, /Illustrative event scene/);
  assert.doesNotMatch(html, /Discover the atmosphere|images\.unsplash\.com/);
  const provenance = readFileSync(new URL("../docs/ASSET-PROVENANCE.md", import.meta.url), "utf8");
  assert.match(provenance, /AI-generated illustrative marketing imagery/);
  assert.match(provenance, /not documentary evidence/);
});

test("public positioning is venue-facing, factual, and consistent with metadata", () => {
  assert.match(html, /name="description" content="Events, activities and celebrations in Genova\. Tell us what you have in mind\."/);
  assert.match(html, /property="og:description" content="Events, activities and celebrations in Genova\. Tell us what you have in mind\."/);
  for (const detail of [
    "We work with Genova venues and hosts to shape evenings with character",
    "thoughtful hospitality, distinctive music, and an experience planned around the space.",
    "YMG Events specializes in event management and execution",
    "We can shape the format to your vision.",
    "tailored to your target demographic",
    "Discuss ticketing, hospitality costs, entertainment, promotion and each partner’s responsibilities.",
    "Dante David, a Genova-based event organizer",
    "For venues, businesses, and private events.",
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

  assert.match(html, /Through Porto Aperto \| Genova, a local international community for social and nightlife events/);
  assert.match(html, /A lifetime of event coordination in the USA and Italy has created YMG Events\. We intend to serve you well\./);
  assert.match(italian, /Con Porto Aperto \| Genova, una community locale internazionale dedicata alla socialità e alla vita notturna/);
  for (const page of [html, italian]) {
    assert.doesNotMatch(page, /instagram\.com|founder-reference/, "the owner removed the social profile link");
    assert.match(page, /<div class="signature">Dante David <span[^>]*>Your Magic Genie<\/span><\/div>/);
  }
  assert.match(sources, /delivered Halloween/);
  assert.match(sources, /genuine portrait supplied and approved/);
  assert.match(sources, /included under issue #12/);
});

test("inquiry form collects reply email and submits inline through the Worker", () => {
  assert.match(html, /<input required id="email" name="email" type="email" autocomplete="email"/);
  assert.match(html, /id="submit-inquiry" type="submit" disabled><span class="submit-label">Send my inquiry email/);
  assert.match(html, /id="turnstile-widget"/);
  assert.match(html, /id="form-feedback"[^>]*aria-live="polite"/);
  assert.match(html, /href="mailto:hello@ymgconsultingservices\.com"/);
  assert.doesNotMatch(html, /Open email app|Prepare my inquiry email|Nothing is sent until you send/);
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  assert.match(interactions, /sendEventsInquiry\(new FormData\(form\), turnstileToken\)/);
  assert.match(interactions, /submit\.disabled = true/);
  assert.match(interactions, /events_inquiry/);
  assert.match(interactions, /if \(submitting\) return/);
  assert.ok(existsSync(new URL("../dist/assets/inquiry-client.js", import.meta.url)));
});



test("inquiry controls expose bilingual required guidance and accessible states", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  const messages = readFileSync(new URL("../dist/assets/i18n.js", import.meta.url), "utf8");

  assert.match(html, /id="form-required-note" class="form-required-note">Fields marked \* are required\./);
  assert.match(italian, /id="form-required-note" class="form-required-note">I campi contrassegnati con \* sono obbligatori\./);
  for (const page of [html, italian]) {
    assert.match(page, /id="intent" name="intent" required aria-describedby="form-required-note"/);
    assert.doesNotMatch(page, /id="intent-help"/);
    assert.match(page, /id="name" name="name" autocomplete="name" maxlength="120" placeholder="[^"]+" aria-describedby="form-required-note"/);
    assert.match(page, /id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="[^"]+" aria-describedby="form-required-note"/);
    assert.match(page, /id="business" name="business"[^>]*aria-describedby="business-help form-required-note"/);
    assert.match(page, /#brief input:not\(\[type=hidden\]\),#brief select,#brief textarea\{[^}]*min-height:48px[^}]*border:1px solid[^}]*background:#faf8f2/);
    assert.match(page, /#brief input:focus-visible,#brief select:focus-visible,#brief textarea:focus-visible\{outline:3px solid/);
    assert.match(page, /#brief \[aria-invalid="true"\]\{border-color:#743037/);
    assert.match(page, /#brief input:disabled,#brief select:disabled,#brief textarea:disabled\{/);
    assert.match(page, /\.form-feedback\[data-state="error"\]\{/);
    assert.match(page, /\.form-feedback\[data-state="success"\]\{/);
    assert.match(page, /\.form-feedback\{[^}]*min-height:96px/);
  }
  assert.match(interactions, /form\.addEventListener\("invalid"/);
  assert.match(interactions, /form\.addEventListener\("input", updateFieldValidity\)/);
  assert.match(interactions, /control\.setAttribute\("aria-invalid", "true"\)/);
  assert.match(interactions, /restoreFeedbackIfValid/);
  assert.match(messages, /invalidFields: "Please check the highlighted fields and correct any errors\."/);
  assert.match(messages, /invalidFields: "Controlla i campi evidenziati e correggi gli eventuali errori\."/);
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
  assert.match(html, /Great nights<br><em>rarely happen by accident\.<\/em>/);
  assert.match(italian, /Le serate migliori<br><em>non nascono quasi mai per caso\.<\/em>/);
  assert.match(italian, /aria-label="Apri il menu di navigazione"/);
  assert.match(italian, /aria-label="1 di 6: La serata in terrazza"/);
  assert.match(italian, /alt="Scena illustrativa di un evento con balli, violino e cena su una terrazza sul porto di Genova\."/);
  assert.match(italian, /<label for="name">Nome e cognome \*<\/label>/);
  assert.match(italian, /placeholder="Come possiamo chiamarti\?"/);
  assert.match(italian, /<option value="Rooftop evenings">Serate in terrazza<\/option>/);
  assert.match(italian, /<button[^>]*data-concept="Rooftop evenings"/);
  assert.match(italian, /<a href="\/it\/privacy\.html">Informativa privacy<\/a>/);
  assert.match(italianPrivacy, /Informativa privacy/);
  assert.match(italianPrivacy, /Navigazione e sicurezza/);
  assert.match(italianPrivacy, /Contatti e richieste di eventi/);
  assert.match(interactions, /language: messages\.turnstileLanguage/);
  assert.match(messages, /turnstileLanguage: "it"/);
  assert.match(messages, /formUnavailable: "L’invio online/);
  assert.match(navigation, /Chiudi il menu di navigazione/);

  const italianAssets = [...italian.matchAll(/(?:src|href)="(\.\.\/assets\/[^"#?]+|\/?assets\/[^"#?]+)"/g)].map(match => match[1]);
  assert.ok(italianAssets.length > 0, "Italian page has local asset references");
  for (const asset of italianAssets) {
    const path = asset.startsWith("../") ? `../dist/it/${asset}` : `../dist/${asset.replace(/^\//, "")}`;
    assert.ok(existsSync(new URL(path, import.meta.url)), `${asset} resolves from the Italian route`);
  }
});

test("venue, corporate and private inquiries have explicit localized routes and minimal fields", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  const englishPrivacy = readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8");
  const italianPrivacy = readFileSync(new URL("../dist/it/privacy.html", import.meta.url), "utf8");
  const handler = readFileSync(new URL("../src/form-handler.js", import.meta.url), "utf8");
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");

  for (const page of [html, italian]) {
    assert.match(page, /name="source" value="events_website_form"/);
    for (const intent of ["venue_partnership", "corporate_event", "private_celebration"]) {
      assert.ok(page.includes(`<option value="${intent}">`), `${intent} is a selectable inquiry path`);
    }
    assert.match(page, /id="intent" name="intent" required/);
    assert.match(page, /id="business" name="business"/);
    assert.match(page, /data-inquiry-intent="venue_partnership"/);
  }
  assert.match(html, /data-concept="Private celebrations" data-intent="private_celebration"/);
  assert.match(html, /data-concept="Corporate Social" data-intent="corporate_event"/);
  assert.match(italian, /data-concept="Private celebrations" data-intent="private_celebration"/);
  assert.match(italian, /data-concept="Corporate Social" data-intent="corporate_event"/);
  assert.match(interactions, /business\.required = selected === "venue_partnership" \|\| selected === "corporate_event"/);
  assert.match(interactions, /You do not need to have chosen a venue before getting in touch/);
  assert.match(interactions, /Non serve avere già scelto una location per inviare la richiesta/);
  assert.match(handler, /Inquiry type: \$\{INQUIRY_TYPES\.get\(intent\)\}/);
  assert.match(handler, /Inquiry source: \$\{INQUIRY_SOURCES\.get\(source\)\}/);
  assert.match(handler, /eventsNotificationSubject\(name, intent, format\)/);
  assert.match(englishPrivacy, /name, reply email, inquiry type, organization or venue/);
  assert.match(italianPrivacy, /nome, email di risposta, tipo di richiesta, azienda o location/);
});

test("event format context is bilingual, explicit, clearable and sent through the existing form field", () => {
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  const messages = readFileSync(new URL("../dist/assets/i18n.js", import.meta.url), "utf8");
  const handler = readFileSync(new URL("../src/form-handler.js", import.meta.url), "utf8");

  for (const page of [html, italianHtml]) {
    assert.match(page, /<select id="format" name="format">/);
    assert.match(page, /<div class="format-context" id="format-context" hidden>/);
    assert.match(page, /id="format-context-status" role="status" aria-live="polite" aria-atomic="true"/);
    assert.match(page, /<button type="button" id="clear-format">/);
    assert.match(page, /option value="">/);
    assert.match(page, /\.format-context button\{min-height:44px/);
  }
  assert.match(messages, /selectedFormatPrefix: "Selected event format:"/);
  assert.match(messages, /selectedFormatPrefix: "Formato selezionato:"/);
  assert.match(interactions, /selectedFromConcept = true/);
  assert.match(interactions, /format\.value = ""/);
  assert.match(interactions, /new FormData\(form\)/);
  assert.match(handler, /eventsNotificationSubject\(name, intent, format\)/);
  assert.match(handler, /subjectName\(format\)/);
});

test("partnership pitch is concise, localized and avoids unsupported commitments", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  assert.match(html, /<h2>Your venue\.<br><em class="single-line">Tailored to your night\.<\/em><\/h2>/);
  assert.match(italian, /<h2>La tua location\.<br><em class="single-line">Su misura per la tua serata\.<\/em><\/h2>/);
  assert.match(html, /Decide who you want to welcome and design an experience that will bring them through your doors\./);
  assert.match(html, /Every venue requires a unique touch to set it apart\./);
  assert.match(italian, /Ogni location ha bisogno di un tocco unico che la distingua\./);
  for (const page of [html, italian]) {
    assert.doesNotMatch(page, /A setting that earns its place|Una location protagonista|before committing|Prima di impegnarci/);
    assert.doesNotMatch(page, /guaranteed (?:sales|attendance)|vendite garantite/i);
  }
});

test("format cards present formats, while scheduled-event content remains absent until verified", () => {
  const model = readFileSync(new URL("../docs/editorial/CONTENT-MODEL.md", import.meta.url), "utf8");
  const template = readFileSync(new URL("../docs/editorial/RECORD-TEMPLATE.md", import.meta.url), "utf8");
  for (const page of [html, italianHtml]) {
    const section = page.match(/<section class="concepts" id="concepts"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, "the localized format section exists");
    assert.doesNotMatch(section, /<time\b|countdown|buy tickets|acquista i biglietti/i);
    assert.doesNotMatch(page, /id="upcoming-events"|class="[^"]*upcoming-events[^"]*"/i);
  }

  for (const phrase of ["seasonal_concept", "scheduled_event", "Dante David", "expires_on", "Europe/Rome", "issue #36", "Do not build a second calendar"]) {
    assert.ok(model.includes(phrase), `editorial model defines ${phrase}`);
  }
  assert.match(template, /type: seasonal_concept[\s\S]*type: scheduled_event/);
  assert.match(template, /deliberately has no event date, confirmed venue, price, availability, or ticket URL/);
  assert.match(template, /Do not store ticket availability here/);
});


test("venue outreach one-pagers are small, factual and linked in the visitor's language", () => {
  const variants = [
    { page: html, master: "venue-partnership-one-pager-en", served: "ymg-events-venue-partnerships-en.pdf", subject: "subject=Venue%20partnership%20with%20YMG%20Events", claims: ["hospitality", "responsibilities", "sales and attendance are not guaranteed", "There is no standard revenue split"], hreflang: "en" },
    { page: italianHtml, master: "venue-partnership-one-pager-it", served: "ymg-events-collaborazioni-location-it.pdf", subject: "subject=Collaborazione%20con%20YMG%20Events", claims: ["ospitalità", "responsabilità", "vendite e affluenza non sono garantite", "Non esiste una ripartizione standard"], hreflang: "it" },
  ];
  for (const { page, master, served, subject, claims, hreflang } of variants) {
    const pdf = readFileSync(new URL(`../docs/collateral/${master}.pdf`, import.meta.url));
    const source = readFileSync(new URL(`../docs/collateral/${master}.md`, import.meta.url), "utf8");
    const published = readFileSync(new URL(`../dist/downloads/${served}`, import.meta.url));
    assert.ok(published.equals(pdf), `${served} is identical to the approved master`);
    const pdfText = pdf.toString("latin1");
    assert.ok(pdf.subarray(0, 5).equals(Buffer.from("%PDF-")), "one-pager is a PDF");
    assert.ok(pdf.length < 250_000, "PDF remains small for email and WhatsApp");
    assert.ok(pdfText.includes("mailto:hello@ymgconsultingservices.com"), "email contact is embedded as a clickable link");
    assert.ok(pdfText.includes(subject), "QR email subject is prefilled with the event collaboration");
    for (const claim of claims) assert.ok(source.includes(claim), `source copy preserves factual offer and commercial limits: ${claim}`);
    assert.match(page, new RegExp(`<div class="partnership-actions"><a class="btn partnership-download" href="/downloads/${served.replace(/\./g, "\\.")}" download="[^"]+" type="application/pdf" hreflang="${hreflang}">`), "the brochure sits beside the partnership CTA in the page language");
  }
});

test("public English consistently uses American inquiry spelling", () => {
  for (const file of ["index.html", "it/index.html", "privacy.html", "it/privacy.html", "404.html", "it/404.html", "assets/i18n.js", "assets/site-interactions.js", "assets/inquiry-client.js"]) {
    assert.doesNotMatch(readFileSync(new URL(`../dist/${file}`, import.meta.url), "utf8"), /enquir/i, file);
  }
});
