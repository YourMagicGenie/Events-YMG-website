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

test("lower-page story progresses from process to founder to enquiry in both locales", () => {
  const cases = [
    {
      page: html,
      stages: ["From idea to a clear plan", "Your local point of contact", "Start a conversation"],
      founder: "The formats shown here are ideas to develop with venue partners, not a record of previous YMG bookings.",
      enquiry: "Whether it’s a venue partnership, a company event or a private occasion",
      stale: /A thoughtful collaboration|A beautiful concept needs a practical plan|The right setting\./,
    },
    {
      page: italianHtml,
      stages: ["Dall’idea a un piano chiaro", "Il tuo referente a Genova", "Iniziamo una conversazione"],
      founder: "I format presentati qui sono idee da sviluppare con le location, non costituiscono un portfolio di eventi già realizzati da YMG.",
      enquiry: "Che si tratti di una collaborazione con una location, di un evento aziendale o di un’occasione privata",
      stale: /Una collaborazione concreta|Dietro a una bella idea serve un progetto pratico|La location giusta\./,
    },
  ];

  for (const { page, stages, founder, enquiry, stale } of cases) {
    const positions = stages.map(stage => page.indexOf(stage));
    assert.ok(positions.every(position => position >= 0));
    assert.ok(positions[0] < positions[1] && positions[1] < positions[2], "process, founder and enquiry appear in order");
    assert.match(page, /<div class="steps"><div class="step">[\s\S]*?<\/div><div class="step">[\s\S]*?<\/div><div class="step">/);
    assert.ok(page.includes(founder), "the factual founder and non-portfolio clarification remain");
    assert.ok(page.includes(enquiry), "the enquiry invitation names the intended audiences");
    assert.match(page, /id="partners"[\s\S]*?id="enquire"/);
    assert.match(page, /href="#partners"/);
    assert.match(page, /href="#enquire"/);
    assert.doesNotMatch(page, stale, "repeated generic introductions have been removed");
  }
});


test("bilingual footer gives visitors clear business contact, privacy and Atlas navigation", () => {
  const footerCases = [
    {
      page: html,
      privacy: 'href="/privacy.html"',
      privacyLabel: "Privacy notice",
      ariaLabel: 'aria-label="Related websites"',
      atlasLabel: "Your Magic Genie · Atlas home",
      tagline: "Venue partnerships",
    },
    {
      page: italianHtml,
      privacy: 'href="/it/privacy.html"',
      privacyLabel: "Informativa privacy",
      ariaLabel: 'aria-label="Siti collegati"',
      atlasLabel: "Your Magic Genie · sito principale Atlas",
      tagline: "Collaborazioni con location",
    },
  ];

  for (const { page, privacy, privacyLabel, ariaLabel, atlasLabel, tagline } of footerCases) {
    const footer = page.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer, "footer exists in both languages");
    assert.match(page, /href="\/assets\/footer\.css"/);
    assert.match(footer, /YMG Events/);
    assert.ok(footer.includes(tagline), "footer states the Events service and location");
    assert.match(footer, /href="mailto:hello@ymgconsultingservices\.com"/);
    assert.ok(footer.includes(privacy));
    assert.ok(footer.includes(privacyLabel));
    assert.ok(footer.includes(ariaLabel));
    assert.ok(footer.includes(atlasLabel));
    assert.match(footer, /href="https:\/\/ymgconsultingservices\.com\//);
    assert.match(footer, /href="#enquire"/);
    assert.doesNotMatch(footer, /(?:P\.?IVA|Partita IVA|VAT|REA|sede legale)/i,
      "unverified legal identifiers and addresses are withheld pending owner review");
  }
});

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
  const assets = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"?#]+)"/g)].map(match => match[1]);
  assert.ok(assets.length > 0, "expected at least one local asset reference");
  for (const asset of assets) assert.ok(existsSync(new URL(`../dist/${asset}`, import.meta.url)), `${asset} exists`);
  for (const path of ["privacy.html", "robots.txt", "sitemap.xml"]) {
    assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), `${path} exists`);
  }
  const privacy = readFileSync(new URL("../dist/privacy.html", import.meta.url), "utf8");
  assert.match(privacy, /class="skip-link" href="#main-content"/);
  assert.match(privacy, /form on the currently published website prepares an email in your email app/);
  assert.match(privacy, /does not automatically submit or store the form fields/);
  assert.match(privacy, /not deployed on the public website/);
  assert.match(privacy, /Google Fonts/);
  assert.match(privacy, /does not request it from Unsplash/);
  assert.match(privacy, /We do not use analytics or advertising pixels/);
  assert.match(privacy, /Article 6\(1\)\(b\) GDPR/);
  assert.match(privacy, /European Economic Area/);
  assert.match(privacy, /specific transfer mechanism and safeguards configured/);
  assert.match(privacy, /href="https:\/\/www\.garanteprivacy\.it\/diritti\/come-agire-per-tutelare-i-tuoi-dati-personali\/reclamo"/);
  assert.doesNotMatch(privacy, /Cloudflare Turnstile checks|Valid submissions are forwarded through Google Apps Script/);
  const dataFlow = readFileSync(new URL("../docs/PRIVACY-DATA-FLOW.md", import.meta.url), "utf8");
  assert.match(dataFlow, /current production flow/);
  assert.match(dataFlow, /no runtime bindings, variable names or secret names/);
  assert.match(dataFlow, /direct-send form is not deployed/);
  assert.match(dataFlow, /Confirm the data controller's full legal identity/);
  assert.match(dataFlow, /qualified privacy adviser/);
});

test("hero photos use responsive compressed sources and explicit priority", () => {
  for (const page of [html, italianHtml]) {
    const start = page.indexOf('<div class="hero-atmosphere">');
    const end = page.indexOf("</picture>", start);
    assert.notEqual(start, -1, "hero atmosphere exists");
    assert.notEqual(end, -1, "hero picture markup exists");
    const hero = page.slice(start, end + "</picture>".length);
    assert.match(hero, /<source media="\(max-width: 540px\)" sizes="100vw" srcset=/);
    assert.match(hero, /auto=format&amp;fit=crop/);
    assert.match(hero, /w=480&amp;h=854&amp;q=\d+ 480w/);
    assert.match(hero, /w=780&amp;h=1388&amp;q=\d+ 780w/);
    assert.match(hero, /w=960&amp;h=540&amp;q=\d+ 960w/);
    assert.match(hero, /w=1440&amp;h=810&amp;q=\d+ 1440w/);
    assert.match(hero, /width="1600" height="900"/);
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
  assert.match(italianPrivacy, /La pagina attualmente pubblicata richiede i font a Google Fonts/);
  assert.match(italianPrivacy, /modulo di invio diretto presente nel codice sorgente.*non è attivo sul sito pubblico/);
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
      lang: "en", heading: "We couldn’t find that page.", home: 'href="/"', concepts: 'href="/#concepts"', enquire: 'href="/#enquire"', privacy: 'href="/privacy.html"', otherLanguage: 'href="/it/"',
    },
    {
      path: "it/404.html", page: readFileSync(new URL("../dist/it/404.html", import.meta.url), "utf8"),
      lang: "it", heading: "Non troviamo questa pagina.", home: 'href="/it/"', concepts: 'href="/it/#concepts"', enquire: 'href="/it/#enquire"', privacy: 'href="/it/privacy.html"', otherLanguage: 'href="/"',
    },
  ];
  const sitemap = readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  for (const { path, page, lang, heading, home, concepts, enquire, privacy, otherLanguage } of variants) {
    assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), `${path} exists`);
    assert.match(page, new RegExp(`<html lang="${lang}">`));
    assert.match(page, /<meta name="robots" content="noindex,follow">/);
    assert.match(page, /<main id="main-content" tabindex="-1">/);
    assert.ok(page.includes(`<h1>${heading}</h1>`), `${path} gives a clear not-found message`);
    for (const href of [home, concepts, enquire, privacy, otherLanguage]) assert.ok(page.includes(href), `${path} provides ${href}`);
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
      image: "social-card.png",
      title: "YMG Events — Elegance, after hours.",
      description: "YMG Events works with Genova venues and hosts to shape distinctive evenings with music, hospitality and a memorable guest experience.",
      alt: "YMG Events — Elegance has an after-hours side. Genova, Italy.",
    },
    {
      name: "Italian",
      page: italianHtml,
      image: "social-card-it.png",
      title: "YMG Events — Eleganza, dopo il tramonto.",
      description: "YMG Events collabora con location e organizzatori di Genova per creare serate distintive, con musica, ospitalità e un’esperienza memorabile per gli ospiti.",
      alt: "YMG Events — L’eleganza ha un lato notturno. Genova, Italia.",
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
  assert.match(readme, /current generated bundle remains in the Sites-managed source/);
  assert.doesNotMatch(readme, /deploy\/cloudflare-worker\.mjs/);
  assert.match(deployment, /current GitHub source has\s+an inline form/);
  assert.match(deployment, /original live bundle is a generated standalone[\s\S]*in the Sites-managed source/);
  assert.match(deployment, /\*\*not\*\* copied as a second editable source of truth/);
  assert.match(deployment, /No GitHub Actions\s+deployment controller or automatic custom-domain release is configured/);
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


test("event card illustrations are local, format-specific, responsive and documented", () => {
  const assets = [
    { file: "rooftop-social.svg", en: "Stylized illustration of a candlelit rooftop table beside a coastal skyline at dusk.", it: "Illustrazione stilizzata di un tavolo illuminato da candele su una terrazza con vista sulla costa al tramonto." },
    { file: "strings-after-dark.svg", en: "Stylized illustration of a violin under warm stage lights with musical notes nearby.", it: "Illustrazione stilizzata di un violino sotto luci ambrate, con note musicali sullo sfondo." },
    { file: "private-occasion.svg", en: "Stylized illustration of a celebration table with flowers, cake and candles.", it: "Illustrazione stilizzata di un tavolo da festa con fiori, torta e candele." },
    { file: "supper-club.svg", en: "Stylized illustration of a plated meal on a dining table with candles and foliage.", it: "Illustrazione stilizzata di un piatto servito su una tavola apparecchiata, con candele e fogliame." },
    { file: "jazz-cocktails.svg", en: "Stylized illustration of a golden saxophone beside a cocktail on a dark stage.", it: "Illustrazione stilizzata di un sassofono dorato accanto a un cocktail su uno sfondo scuro." },
    { file: "corporate-social.svg", en: "Stylized illustration of a modern city-view lounge with a high table and glasses.", it: "Illustrazione stilizzata di un lounge moderno con vista sulla città, un tavolo alto e bicchieri." },
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



test("enquiry controls expose bilingual required guidance and accessible states", () => {
  const italian = readFileSync(new URL("../dist/it/index.html", import.meta.url), "utf8");
  const interactions = readFileSync(new URL("../dist/assets/site-interactions.js", import.meta.url), "utf8");
  const messages = readFileSync(new URL("../dist/assets/i18n.js", import.meta.url), "utf8");

  assert.match(html, /id="form-required-note" class="form-required-note">Fields marked \* are required\./);
  assert.match(italian, /id="form-required-note" class="form-required-note">I campi contrassegnati con \* sono obbligatori\./);
  for (const page of [html, italian]) {
    assert.match(page, /id="intent" name="intent" required aria-describedby="intent-help form-required-note"/);
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
  assert.match(italianPrivacy, /Quando visiti il sito/);
  assert.match(italianPrivacy, /Inviare una richiesta/);
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
  assert.match(handler, /eventsNotificationSubject\(name, intent, format\)/);
  assert.match(englishPrivacy, /prepared message may include your name, venue or business, chosen event direction, approximate guest count, timing, budget and any description/);
  assert.match(italianPrivacy, /Il messaggio preparato può includere nome, location o azienda, direzione dell’evento scelta, numero indicativo di ospiti, tempistiche, budget e la descrizione/);
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

test("format cards are visibly ideas, while scheduled-event content remains absent until verified", () => {
  const model = readFileSync(new URL("../docs/editorial/CONTENT-MODEL.md", import.meta.url), "utf8");
  const template = readFileSync(new URL("../docs/editorial/RECORD-TEMPLATE.md", import.meta.url), "utf8");
  const conceptIntros = [
    [html, "These are not scheduled events or ticket listings."],
    [italianHtml, "Non sono eventi già programmati né biglietti in vendita."],
  ];

  for (const [page, distinction] of conceptIntros) {
    const section = page.match(/<section class="concepts" id="concepts"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, "the localized format section exists");
    assert.ok(section.includes(distinction), "the format cards are identified as ideas, not scheduled listings");
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


test("venue outreach one-pager is small, factual and withheld from the live download path pending approval", () => {
  const pdf = readFileSync(new URL("../docs/collateral/venue-partnership-one-pager-it.pdf", import.meta.url));
  const source = readFileSync(new URL("../docs/collateral/venue-partnership-one-pager-it.md", import.meta.url), "utf8");
  const pdfText = pdf.toString("latin1");

  assert.ok(pdf.subarray(0, 5).equals(Buffer.from("%PDF-")), "one-pager is a PDF");
  assert.ok(pdf.length < 250_000, "PDF remains small for email and WhatsApp");
  assert.ok(pdfText.includes("mailto:hello@ymgconsultingservices.com"), "email contact is embedded as a clickable link");
  assert.ok(pdfText.includes("subject=Collaborazione%20con%20YMG%20Events"), "QR email subject is prefilled with the event collaboration");
  for (const claim of ["ospitalità", "responsabilità", "vendite e affluenza non sono garantite", "Non esiste una ripartizione standard"]) {
    assert.ok(source.includes(claim), `source copy preserves factual offer and commercial limits: ${claim}`);
  }
  for (const page of [html, italianHtml]) {
    assert.doesNotMatch(page, /venue-partnership-one-pager-it\.pdf/, "website download link waits for owner approval");
  }
});
