import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { withEventsSecurityHeaders } from "../src/security-headers.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(projectRoot, "dist");
const screenshotRoot = resolve(projectRoot, "test-results/responsive");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    let filePath = resolve(siteRoot, relativePath);
    if (filePath !== siteRoot && !filePath.startsWith(`${siteRoot}${sep}`)) {
      response.writeHead(404).end("Not found");
      return;
    }
    let status = 200;
    let fileStat;
    try {
      fileStat = await stat(filePath);
      if (!fileStat.isFile()) throw new Error("Not a file");
    } catch {
      const notFoundPage = pathname === "/it" || pathname.startsWith("/it/") ? "it/404.html" : "404.html";
      filePath = resolve(siteRoot, notFoundPage);
      fileStat = await stat(filePath);
      status = 404;
    }
    if (!fileStat.isFile()) throw new Error("Not a file");
    const content = await readFile(filePath);
    const secured = withEventsSecurityHeaders(
      new Request(`http://127.0.0.1${request.url}`),
      new Response(content, {
        status,
        headers: {
          "content-type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
          "cache-control": "no-store",
        },
      }),
    );
    response.writeHead(secured.status, Object.fromEntries(secured.headers));
    response.end(content);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

await rm(screenshotRoot, { recursive: true, force: true });
await mkdir(screenshotRoot, { recursive: true });
await new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolveListen);
});

let browser;
try {
  const browserOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    browserOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  browser = await chromium.launch(browserOptions);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const fullMatrix = process.argv.includes("--full-matrix");
  const widths = fullMatrix
    ? [320, 360, 390, 430, 540, 541, 768, 850, 851, 1024, 1280, 1440, 1920]
    : [320, 768, 1440];
  const assetChecks = [
    ["/assets/favicon.svg", "image/svg+xml"],
    ["/assets/favicon-16.png", "image/png"],
    ["/assets/favicon-32.png", "image/png"],
    ["/assets/apple-touch-icon.png", "image/png"],
    ["/assets/social-card.png", "image/png"],
    ["/assets/social-card-it.png", "image/png"],
    ["/assets/fonts/dm-sans-latin.woff2", "font/woff2"],
    ["/assets/fonts/dm-sans-latin-ext.woff2", "font/woff2"],
    ["/assets/fonts/playfair-display-latin.woff2", "font/woff2"],
    ["/assets/fonts/playfair-display-latin-ext.woff2", "font/woff2"],
    ["/assets/fonts/playfair-display-italic-latin.woff2", "font/woff2"],
    ["/assets/fonts/playfair-display-italic-latin-ext.woff2", "font/woff2"],
  ];
  for (const [path, contentType] of assetChecks) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} is served by the local Events site`);
    assert.ok(response.headers.get("content-type").startsWith(contentType), `${path} has the correct content type`);
  }

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("https://fonts.googleapis.com/**", route => route.abort());
    await context.route("https://fonts.gstatic.com/**", route => route.abort());
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__eventsCspViolations = [];
      document.addEventListener("securitypolicyviolation", event => {
        window.__eventsCspViolations.push({ directive: event.violatedDirective, blockedURI: event.blockedURI });
      });
    });
    const externalFontRequests = [];
    page.on("request", request => {
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(request.url())) externalFontRequests.push(request.url());
    });
    const pageResponse = await page.goto(baseUrl, { waitUntil: "load" });
    assert.equal(pageResponse.status(), 200, `${width}px homepage responds successfully`);
    const inPageLinks = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href^="#"]')].map(link => link.getAttribute("href"));
      return {
        allResolve: links.every(href => href === "#" || document.querySelector(href)),
        partners: Boolean(document.querySelector("#partners")),
        enquire: Boolean(document.querySelector("#enquire")),
      };
    });
    assert.ok(inPageLinks.allResolve, `${width}px in-page links resolve to their destinations`);
    assert.ok(inPageLinks.partners && inPageLinks.enquire, `${width}px retains the partnership and enquiry anchors`);
    const responseHeaders = await pageResponse.allHeaders();
    assert.ok(responseHeaders["content-security-policy"], `${width}px HTML response has a CSP`);
    assert.equal(responseHeaders["x-frame-options"], "DENY", `${width}px response cannot be framed`);
    assert.equal(responseHeaders["x-content-type-options"], "nosniff", `${width}px response disables MIME sniffing`);

    if (width === 320) {
      const loadedFonts = await page.evaluate(async () => {
        const [sans, serif, italic] = await Promise.all([
          document.fonts.load('600 16px "DM Sans"', "città Genova hospitality"),
          document.fonts.load('400 24px "Playfair Display"', "Elegance after hours"),
          document.fonts.load('italic 400 20px "Playfair Display"', "dopo il tramonto"),
        ]);
        return [...sans, ...serif, ...italic].map(face => ({ family: face.family, status: face.status }));
      });
      assert.ok(loadedFonts.some(face => face.family === "DM Sans" && face.status === "loaded"), "self-hosted variable sans font loads on the page");
      assert.ok(loadedFonts.some(face => face.family === "Playfair Display" && face.status === "loaded"), "self-hosted regular and italic display fonts load on the page");
    }
    assert.equal(externalFontRequests.length, 0, `${width}px page loads no Google Fonts stylesheet or font file`);

    const metrics = await page.evaluate(() => {
      const logo = document.querySelector(".logo");
      const subtitle = logo.querySelector("small");
      const wordmarkRange = document.createRange();
      const finalWordmarkNode = subtitle.previousSibling;
      wordmarkRange.setStart(logo.firstChild, 0);
      wordmarkRange.setEnd(finalWordmarkNode, finalWordmarkNode.textContent.length);
      const wordmark = wordmarkRange.getBoundingClientRect();
      const faqSummary = document.querySelector(".faq-item summary");
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        logoRight: logo.getBoundingClientRect().right,
        actionsLeft: document.querySelector(".header-actions").getBoundingClientRect().left,
        subtitleTop: subtitle.getBoundingClientRect().top,
        wordmarkBottom: wordmark.bottom,
        offerCards: document.querySelectorAll(".offer-item").length,
        faqQuestions: document.querySelectorAll(".faq-item").length,
        faqSummaryHeight: faqSummary.getBoundingClientRect().height,
      };
    });
    assert.ok(metrics.documentWidth <= metrics.viewportWidth, `${width}px has no horizontal document overflow: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.logoRight <= metrics.actionsLeft + 0.5, `${width}px logo and enquiry controls do not collide: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.subtitleTop >= metrics.wordmarkBottom - 1, `${width}px brand subtitle remains legible below the wordmark: ${JSON.stringify(metrics)}`);
    assert.equal(metrics.offerCards, 6, `${width}px shows the full venue offer`);
    assert.equal(metrics.faqQuestions, 7, `${width}px shows all venue FAQs`);
    assert.ok(metrics.faqSummaryHeight >= 44, `${width}px FAQ controls remain easy to tap: ${JSON.stringify(metrics)}`);

    if (width === 1280 || width === 1440) {
      const desktopGutters = await page.evaluate(() => {
        const columns = selector => {
          const section = document.querySelector(selector);
          const [first, second] = [...section.children].slice(0, 2).map(element => element.getBoundingClientRect());
          return { gap: second.left - first.right, firstWidth: first.width, secondWidth: second.width, topDifference: Math.abs(first.top - second.top) };
        };
        return {
          partnership: columns(".partnerships"),
          adjacent: [columns(".intro").gap, columns(".about").gap],
        };
      });
      assert.ok(desktopGutters.partnership.gap >= 0 && desktopGutters.partnership.gap <= width * 0.07,
        `${width}px partnership columns have a compact, positive center gutter: ${JSON.stringify(desktopGutters)}`);
      assert.ok(desktopGutters.partnership.firstWidth >= width * 0.3,
        `${width}px partnership copy has enough width: ${JSON.stringify(desktopGutters)}`);
      assert.ok(desktopGutters.partnership.secondWidth >= width * 0.35,
        `${width}px partnership details have enough width: ${JSON.stringify(desktopGutters)}`);
      assert.ok(desktopGutters.partnership.topDifference <= 1,
        `${width}px partnership columns align at the top: ${JSON.stringify(desktopGutters)}`);
      assert.ok(desktopGutters.adjacent.every(gap => gap >= 0 && gap <= width * 0.12),
        `${width}px neighboring sections keep intentional, bounded gutters: ${JSON.stringify(desktopGutters)}`);
    }

    const typeScale = await page.evaluate(() => {
      const size = selector => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
      return [
        ["body copy", size("body"), 15],
        ["supporting copy", size(".intro p:not(.lead)"), 14],
        ["concept description", size(".concept p"), 14],
        ["concept number", size(".concept small"), 11],
        ["form label", size("label"), 13],
        ["eyebrow", size(".eyebrow"), 11],
        ["brand subtitle", size(".logo small"), 10],
        ["footer copy", size("footer p"), 12],
      ];
    });
    for (const [name, actual, minimum] of typeScale) {
      assert.ok(actual >= minimum, `${name} is ${actual}px at ${width}px; expected at least ${minimum}px`);
    }

    const heroVisual = await page.evaluate(() => {
      const image = document.querySelector(".hero-atmosphere img");
      const hero = document.querySelector(".hero");
      const imageRect = image.getBoundingClientRect();
      const heroRect = hero.getBoundingClientRect();
      const overlay = getComputedStyle(document.querySelector(".hero-atmosphere"), "::after").backgroundImage;
      return {
        alt: image.alt,
        src: image.getAttribute("src"),
        srcset: image.srcset,
        mobileSource: document.querySelector(".hero-atmosphere source").srcset,
        mobileMedia: document.querySelector(".hero-atmosphere source").media,
        sizes: image.sizes,
        objectFit: getComputedStyle(image).objectFit,
        coversHero: Math.abs(imageRect.width - heroRect.width) < 1 && Math.abs(imageRect.height - heroRect.height) < 1,
        overlayAlpha: [...overlay.matchAll(/rgba\([^)]*,\s*([\d.]+)\s*\)/g)].map(match => Number(match[1])),
        primaryHref: document.querySelector(".hero-actions .btn.primary").getAttribute("href"),
        secondaryPresent: [...document.querySelectorAll(".hero-actions a")].some(link => /discover the atmosphere/i.test(link.textContent)),
      };
    });
    assert.equal(heroVisual.alt, "Boats moored beside waterfront restaurants at dusk.", "hero image has meaningful scenic alt text");
    assert.match(heroVisual.src, /^https:\/\/images\.unsplash\.com\/photo-1789931123652-6d22f2ef7cc7/, "hero uses the reviewed Unsplash photograph");
    assert.match(heroVisual.srcset, /960w.*1440w.*1920w/, "hero offers responsive desktop image sizes");
    assert.match(heroVisual.mobileSource, /480w.*780w.*1080w/, "hero offers a separate mobile crop");
    assert.equal(heroVisual.mobileMedia, "(max-width: 540px)", "mobile image source has a defined breakpoint");
    assert.equal(heroVisual.sizes, "100vw", "hero image size matches the full-width composition");
    assert.equal(heroVisual.objectFit, "cover", "hero image crops without distortion");
    assert.ok(heroVisual.coversHero, "hero image covers its background region");
    assert.ok(heroVisual.overlayAlpha.length >= 2 && heroVisual.overlayAlpha.every(alpha => alpha >= 0.8), "dark overlay preserves text contrast over the photo");
    assert.equal(heroVisual.primaryHref, "#enquire", "primary hero CTA keeps its destination");
    assert.equal(heroVisual.secondaryPresent, false, "secondary atmosphere CTA is absent");

    const carousel = await page.evaluate(() => {
      const deck = document.querySelector("#concept-deck");
      const bounds = element => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
      };
      return {
        display: getComputedStyle(deck).display,
        overflowX: getComputedStyle(deck).overflowX,
        scrollLeft: deck.scrollLeft,
        clientWidth: deck.clientWidth,
        scrollWidth: deck.scrollWidth,
        previousDisabled: document.querySelector("#deck-previous").getAttribute("aria-disabled"),
        nextDisabled: document.querySelector("#deck-next").getAttribute("aria-disabled"),
        slides: [...deck.querySelectorAll(".concept")].map((card, index) => {
          const art = card.querySelector(".art");
          const image = art.querySelector("img");
          return {
            number: index + 1,
            accessibleLabel: card.getAttribute("aria-label"),
            title: card.querySelector("h3").textContent,
            badge: card.querySelector(":scope > small").textContent,
            art: bounds(art),
            image: { alt: image?.alt, src: image?.getAttribute("src"), box: bounds(image), objectFit: image ? getComputedStyle(image).objectFit : null },
            artworkText: art.textContent.trim(),
            badgeBounds: bounds(card.querySelector(":scope > small")),
            titleBounds: bounds(card.querySelector("h3")),
          };
        }),
      };
    });
    assert.equal(carousel.display, "flex", `${width}px keeps the formats in one horizontal deck`);
    assert.equal(carousel.overflowX, "auto", `${width}px allows horizontal carousel scrolling`);
    assert.ok(carousel.scrollWidth > carousel.clientWidth, `${width}px keeps more formats available by scrolling`);
    assert.equal(carousel.slides.length, 6, `${width}px exposes all six slides in the carousel`);
    assert.equal(carousel.previousDisabled, "true", `${width}px identifies the starting position: ${JSON.stringify({ scrollLeft: carousel.scrollLeft, clientWidth: carousel.clientWidth, scrollWidth: carousel.scrollWidth, previousDisabled: carousel.previousDisabled })}`);
    assert.equal(carousel.nextDisabled, "false", `${width}px identifies that more slides are available`);
    const expectedTitles = ["The Rooftop Social", "Strings After Dark", "The Private Occasion", "The Supper Club", "Jazz & Cocktails", "The Corporate Social"];
    const expectedArtAlts = [
      "Stylized illustration of a candlelit rooftop table beside a coastal skyline at dusk.",
      "Stylized illustration of a violin under warm stage lights with musical notes nearby.",
      "Stylized illustration of a celebration table with flowers, cake and candles.",
      "Stylized illustration of a plated meal on a dining table with candles and foliage.",
      "Stylized illustration of a golden saxophone beside a cocktail on a dark stage.",
      "Stylized illustration of a modern city-view lounge with a high table and glasses.",
    ];
    for (const slide of carousel.slides) {
      const number = String(slide.number).padStart(2, "0");
      assert.equal(slide.title, expectedTitles[slide.number - 1], `${width}px keeps slide ${number}'s title with its position`);
      assert.equal(slide.accessibleLabel, `${slide.number} of 6: ${slide.title}`, `${width}px gives slide ${number} a semantic name`);
      assert.ok(slide.badge.startsWith(`${number} /`), `${width}px keeps slide ${number}'s number with its category`);
      assert.ok(slide.badgeBounds.bottom <= slide.titleBounds.top + 1, `${width}px slide ${number}'s number does not overlap its title`);
      assert.equal(slide.image.alt, expectedArtAlts[slide.number - 1], `${width}px slide ${number} exposes its format-specific illustration description`);
      assert.equal(slide.image.src, `/assets/event-art/${["rooftop-social.svg", "strings-after-dark.svg", "private-occasion.svg", "supper-club.svg", "jazz-cocktails.svg", "corporate-social.svg"][slide.number - 1]}`, `${width}px slide ${number} uses a local art asset`);
      assert.equal(slide.image.objectFit, "cover", `${width}px slide ${number} crops consistently without distortion`);
      assert.ok(Math.abs(slide.art.width / slide.art.height - 1.25) < 0.01, `${width}px slide ${number} keeps the shared 5:4 art frame`);
      assert.equal(slide.artworkText, "", `${width}px slide ${number} avoids duplicated text in the illustration`);
    }
    assert.ok(await page.locator(".deck-hint").isVisible(), `${width}px tells visitors they can swipe or use the arrows`);

    const audit = await page.evaluate(() => {
      const rgb = color => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = color => rgb(color).map(value => value / 255).map(value =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const contrast = (foreground, background) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return Number(((values[0] + 0.05) / (values[1] + 0.05)).toFixed(2));
      };
      const style = selector => getComputedStyle(document.querySelector(selector));
      const body = style("body");
      const hero = style(".hero");
      const partnerships = style(".partnerships");
      const enquiry = style(".enquiry");
      const feedback = document.querySelector("#form-feedback");
      const originalFeedback = { text: feedback.textContent, state: feedback.dataset.state || "" };
      feedback.dataset.state = "error";
      const errorColor = getComputedStyle(feedback).color;
      const errorBackground = getComputedStyle(feedback).backgroundColor;
      feedback.dataset.state = "success";
      const successColor = getComputedStyle(feedback).color;
      const successBackground = getComputedStyle(feedback).backgroundColor;
      const statusHeights = [];
      for (const [state, text] of [
        ["", "Connecting to the secure enquiry service…"],
        ["error", "Online enquiries are temporarily unavailable. Please email us directly using the address shown here."],
        ["success", "Your enquiry has been accepted for processing. We’ll follow up at the email address you provided."],
      ]) {
        if (state) feedback.dataset.state = state;
        else delete feedback.dataset.state;
        feedback.textContent = text;
        statusHeights.push(Math.round(feedback.getBoundingClientRect().height));
      }
      if (originalFeedback.state) feedback.dataset.state = originalFeedback.state;
      else delete feedback.dataset.state;
      feedback.textContent = originalFeedback.text;
      const invalidField = document.querySelector("#name");
      invalidField.setAttribute("aria-invalid", "true");
      const invalidFieldStyle = getComputedStyle(invalidField);
      const errorField = {
        borderColor: invalidFieldStyle.borderTopColor,
        backgroundColor: invalidFieldStyle.backgroundColor,
      };
      invalidField.removeAttribute("aria-invalid");
      const fields = [...document.querySelectorAll("#intent,#name,#email,#business,#format,#guests,#idea")].map(field => {
        const style = getComputedStyle(field);
        const bounds = field.getBoundingClientRect();
        const label = document.querySelector(`label[for="${field.id}"]`);
        const labelBounds = label?.getBoundingClientRect();
        return {
          id: field.id,
          minHeight: bounds.height,
          borderStyle: style.borderTopStyle,
          borderWidth: parseFloat(style.borderTopWidth),
          backgroundColor: style.backgroundColor,
          disabled: field.disabled,
          opacity: style.opacity,
          labelOverlaps: Boolean(labelBounds && labelBounds.bottom > bounds.top + 1),
        };
      });
      const readings = [
        ["main copy", body.color, body.backgroundColor],
        ["muted copy on paper", style(".intro p:not(.lead)").color, body.backgroundColor],
        ["muted copy on warm ivory", style(".about p").color, style(".about").backgroundColor],
        ["muted copy on enquiry surface", style(".enquiry .description").color, enquiry.backgroundColor],
        ["conditional enquiry guidance", style(".field-help").color, enquiry.backgroundColor],
        ["red section accent", style(".intro h2 em").color, body.backgroundColor],
        ["red section accent on warm ivory", style(".about h2 em").color, style(".about").backgroundColor],
        ["hero supporting copy", style(".hero p").color, hero.backgroundColor],
        ["hero eyebrow", style(".hero .eyebrow").color, hero.backgroundColor],
        ["hero heading accent", style(".hero h1 em").color, hero.backgroundColor],
        ["partnership supporting copy", style(".partnerships p").color, partnerships.backgroundColor],
        ["partnership heading accent", style(".partnerships h2 em").color, partnerships.backgroundColor],
        ["header navigation", style("header nav a").color, style("header").backgroundColor],
        ["header enquiry link", style(".header-cta").color, style("header").backgroundColor],
        ["enquiry field labels", style("label").color, enquiry.backgroundColor],
        ["primary enquiry button", style(".hero .btn.primary").color, style(".hero .btn.primary").backgroundColor],
        ["band accent", style(".band span").color, style(".band").backgroundColor],
        ["enabled carousel arrow", style('.deck-arrow:not([aria-disabled="true"])').color, style('.deck-arrow:not([aria-disabled="true"])').backgroundColor],
        ["preview notice", style(".site-note").color, style(".site-note").backgroundColor],
        ["enquiry error message", errorColor, errorBackground],
        ["enquiry success message", successColor, successBackground],
        ["footer supporting text", style("footer p").color, style("footer").backgroundColor],
      ].map(([name, foreground, background]) => ({ name, ratio: contrast(foreground, background) }));
      const selectors = [
        ".menu-toggle", ".header-cta", "header .logo", ".primary-nav > a:not(.btn)",
        ".deck-arrow", ".concept button", ".partnerships .btn",
        "#brief input:not([type=hidden]):not(#bot-field)", "#brief select", "#brief textarea",
        "#submit-enquiry", ".caption a", "footer a", ".site-note a", ".enquiry .small a",
      ];
      const targets = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
        const rect = element.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
        return visible ? { selector, width: rect.width, height: rect.height } : null;
      }).filter(Boolean));
      return { readings, targets, fields, statusHeights, errorField };
    });
    for (const reading of audit.readings) {
      assert.ok(reading.ratio >= 4.5, `${reading.name} contrast is ${reading.ratio}:1 at ${width}px; expected at least 4.5:1`);
    }
    for (const target of audit.targets) {
      assert.ok(target.width >= 44 && target.height >= 44, `${target.selector} is a ${target.width.toFixed(1)}x${target.height.toFixed(1)}px target at ${width}px; expected at least 44x44px`);
    }
    for (const field of audit.fields) {
      assert.ok(field.minHeight >= 44, `${field.id} control is ${field.minHeight.toFixed(1)}px high at ${width}px`);
      assert.equal(field.borderStyle, "solid", `${field.id} has a visible solid boundary at ${width}px`);
      assert.ok(field.borderWidth >= 1, `${field.id} boundary is at least 1px at ${width}px`);
      assert.notEqual(field.backgroundColor, "rgba(0, 0, 0, 0)", `${field.id} has its own field surface at ${width}px`);
      assert.equal(field.labelOverlaps, false, `${field.id} label remains above its control at ${width}px`);
    }
    const disabledBusinessField = audit.fields.find(field => field.id === "business");
    assert.equal(disabledBusinessField.disabled, true, `${width}px shows the conditional business field as disabled before a path is selected`);
    assert.equal(disabledBusinessField.opacity, "1", `${width}px disabled field remains fully legible`);
    assert.notEqual(disabledBusinessField.backgroundColor, audit.fields.find(field => field.id === "name").backgroundColor, `${width}px disabled and editable fields have distinct surfaces`);
    assert.equal(new Set(audit.statusHeights).size, 1, `neutral, error and success feedback reserve the same height at ${width}px: ${JSON.stringify(audit.statusHeights)}`);
    assert.equal(audit.errorField.borderColor, "rgb(116, 48, 55)", `${width}px error fields use the accessible red border`);
    assert.notEqual(audit.errorField.backgroundColor, "#faf8f2", `${width}px error fields receive a distinct surface`);

    const toggle = page.getByRole("button", { name: "Open navigation menu" });
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    if (width <= 850) {
      assert.ok(await toggle.isVisible(), `${width}px exposes the menu control`);
      const toggleBox = await toggle.boundingBox();
      assert.ok(toggleBox.width >= 44 && toggleBox.height >= 44, `${width}px menu control meets the 44px touch target: ${JSON.stringify(toggleBox)}`);
      assert.ok(await page.getByRole("link", { name: "Let’s make a plan" }).isVisible(), `${width}px keeps the enquiry CTA visible`);
      assert.equal(await nav.isVisible(), false, `${width}px starts with the navigation disclosure closed`);
    } else {
      assert.ok(await nav.isVisible(), `${width}px keeps the desktop navigation visible`);
      assert.equal(await toggle.isVisible(), false, `${width}px hides the mobile menu control`);
      for (const name of ["Our approach", "Event concepts", "For your business"]) {
        assert.ok(await page.getByRole("link", { name }).isVisible(), `${width}px shows ${name}`);
      }
    }

    await page.screenshot({ path: resolve(screenshotRoot, `${width}px.png`), fullPage: true });
    const cspViolations = await page.evaluate(() => window.__eventsCspViolations);
    assert.deepEqual(cspViolations, [], `${width}px page loads its scripts, fonts, styles and imagery without CSP violations`);
    await context.close();
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.route("https://fonts.googleapis.com/**", route => route.abort());
  await mobile.route("https://fonts.gstatic.com/**", route => route.abort());
  await mobile.goto(baseUrl, { waitUntil: "load" });
  const menu = mobile.locator(".menu-toggle");
  await menu.focus();
  await mobile.keyboard.press("Enter");
  assert.equal(await menu.getAttribute("aria-expanded"), "true", "keyboard opens the mobile navigation");
  for (const [name, hash] of [["Our approach", "#approach"], ["Event concepts", "#concepts"], ["For your business", "#partners"]]) {
    assert.ok(await mobile.getByRole("link", { name }).isVisible(), `${name} is reachable from the menu`);
    assert.ok(await mobile.locator(hash).count(), `${hash} destination exists`);
  }
  await mobile.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"), "false", "Escape closes the mobile navigation");
  assert.equal(await mobile.evaluate(() => document.activeElement.matches(".menu-toggle")), true, "Escape returns focus to the menu control");
  await menu.click();
  await mobile.getByRole("link", { name: "Event concepts" }).click();
  await mobile.waitForFunction(() => location.hash === "#concepts");
  assert.equal(await menu.getAttribute("aria-expanded"), "false", "choosing a section closes the menu");
  assert.equal(await mobile.evaluate(() => document.activeElement.id), "concepts", "section navigation moves focus to its destination");

  const next = mobile.getByRole("button", { name: "Next event formats" });
  assert.equal(await mobile.getByRole("button", { name: "Previous event formats" }).getAttribute("aria-disabled"), "true", "carousel identifies its starting position");
  await next.click();
  await mobile.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft > 0
    && document.querySelector("#deck-previous").getAttribute("aria-disabled") === "false"
    && document.querySelector("#deck-status").textContent === "Format 2 of 6");
  assert.equal(await mobile.getByRole("button", { name: "Previous event formats" }).getAttribute("aria-disabled"), "false", "carousel state updates after scrolling");
  const expectedFormats = [
    { format: "Rooftop evenings", intent: "venue_partnership", required: true },
    { format: "Live music & DJs", intent: "venue_partnership", required: true },
    { format: "Private celebrations", intent: "private_celebration", required: false },
    { format: "Supper Club", intent: "venue_partnership", required: true },
    { format: "Jazz & Cocktails", intent: "venue_partnership", required: true },
    { format: "Corporate Social", intent: "corporate_event", required: true },
  ];
  const conceptCards = mobile.locator("#concept-deck .concept");
  assert.equal(await conceptCards.count(), expectedFormats.length, "each event format has an individual card");
  assert.equal(await mobile.locator("#business").isDisabled(), true, "the context field waits until an enquiry path is selected");
  for (const [index, route] of expectedFormats.entries()) {
    const card = conceptCards.nth(index);
    const action = card.locator("button[data-concept]");
    await action.scrollIntoViewIfNeeded();
    const artImage = card.locator("img.card-art-image");
    await artImage.evaluate(image => image.decode());
    assert.ok(await artImage.evaluate(image => image.naturalWidth === 1200 && image.naturalHeight === 960), `slide ${index + 1} loads its full-resolution local illustration`);
    await action.click();
    assert.equal(await mobile.locator("#format").inputValue(), route.format, `slide ${index + 1} preselects ${route.format}`);
    assert.equal(await mobile.locator("#intent").inputValue(), route.intent, `slide ${index + 1} chooses the matching enquiry path`);
    assert.equal(await mobile.locator("#format-context").isVisible(), true, `slide ${index + 1} shows its selected event format beside the form`);
    assert.equal(await mobile.locator("#format-context-status").textContent(), `Selected event format: ${route.format}`, `slide ${index + 1} names the chosen format for assistive technology`);
    assert.equal(await mobile.locator("#brief").evaluate(form => new FormData(form).get("format")), route.format, `slide ${index + 1} puts its selected format in the direct-send form payload`);
    assert.ok((await mobile.locator("#clear-format").boundingBox()).height >= 44, "the clear-format action has a comfortable touch target");
    assert.equal(await mobile.locator("#clear-format").textContent(), "Clear format selection", "the clear action has a clear English label");
    assert.equal(await mobile.locator("#business").evaluate(input => input.required), route.required, `${route.intent} asks for an organization name only when required`);
    if (route.intent === "private_celebration") {
      assert.match(await mobile.locator("#business-label").textContent(), /Preferred venue or location \(optional\)/, "private hosts see an optional location field, not an ownership claim");
      assert.match(await mobile.locator("#business-help").textContent(), /do not need to have chosen a venue/);
      await mobile.screenshot({ path: resolve(screenshotRoot, "private-enquiry-390px.png"), fullPage: true });
    }
    if (route.intent === "corporate_event") {
      assert.equal(await mobile.locator("#business-label").textContent(), "Company or team *", "corporate hosts see a company/team field");
      await mobile.screenshot({ path: resolve(screenshotRoot, "corporate-enquiry-390px.png"), fullPage: true });
    }
    if (index === 0) {
      await mobile.keyboard.press("Tab");
      assert.equal(await mobile.evaluate(() => document.activeElement.id), "clear-format", "keyboard users can reach the selected-format clear action");
      await mobile.keyboard.press("Enter");
      assert.equal(await mobile.evaluate(() => document.activeElement.id), "format", "clearing a format returns focus to the editable format control");
    } else {
      await mobile.locator("#clear-format").click();
    }
    assert.equal(await mobile.locator("#format").inputValue(), "", `slide ${index + 1} can be cleared for a generic enquiry`);
    assert.equal(await mobile.locator("#format-context").isVisible(), false, `slide ${index + 1} no longer claims a selected concept after clearing`);
    assert.equal(await mobile.locator("#intent").inputValue(), route.intent, `clearing slide ${index + 1} preserves the enquiry path`);
    assert.equal(await mobile.locator("#brief").evaluate(form => new FormData(form).get("format")), "", `clearing slide ${index + 1} sends an empty format for path-aware generic fallback`);
  }
  await mobile.locator("#format").selectOption("Jazz & Cocktails");
  assert.equal(await mobile.locator("#format-context").isVisible(), true, "a manually changed event format remains explicit");
  assert.match(await mobile.locator("#format-context-status").textContent(), /Jazz & Cocktails/);
  await mobile.locator("#clear-format").click();
  assert.equal(await mobile.locator("#format").inputValue(), "", "a manually selected event format can also be cleared");
  await mobile.getByRole("link", { name: "Explore a partnership" }).click();
  assert.equal(await mobile.locator("#intent").inputValue(), "venue_partnership", "the venue partnership CTA preselects the venue pathway");
  assert.equal(await mobile.locator("#business").evaluate(input => input.required), true, "venue operators are asked for their venue name");
  const contactInvitation = mobile.getByRole("link", { name: "Contact us to discuss availability and a tailored proposal." });
  assert.equal(await contactInvitation.getAttribute("href"), "#enquire", "the concept invitation leads directly to the enquiry form");
  await contactInvitation.scrollIntoViewIfNeeded();
  await contactInvitation.click();
  assert.equal(new URL(mobile.url()).hash, "#enquire", "the contact invitation navigates to the enquiry form");
  const portoApertoReference = mobile.getByRole("link", { name: "See Porto Aperto | Genova on Instagram (opens in a new tab)" });
  await portoApertoReference.scrollIntoViewIfNeeded();
  assert.equal(await portoApertoReference.getAttribute("target"), "_blank", "the community reference opens separately from the Events site");
  assert.equal(await portoApertoReference.getAttribute("rel"), "noopener noreferrer", "the external community link is isolated safely");
  assert.ok((await portoApertoReference.boundingBox()).height >= 44, "the founder's community reference has a comfortable mobile target");
  await mobile.locator("#venue-offer").scrollIntoViewIfNeeded();
  assert.equal(await mobile.locator(".offer-item").count(), 6, "the venue offer is available on mobile");
  const firstFaq = mobile.locator(".faq-item").first();
  const firstFaqSummary = firstFaq.locator("summary");
  await firstFaqSummary.focus();
  await mobile.keyboard.press("Space");
  assert.equal(await firstFaq.evaluate(details => details.open), true, "venue FAQ disclosures open from the keyboard");
  await mobile.screenshot({ path: resolve(screenshotRoot, "venue-offer-faq-open-390px.png"), fullPage: true });
  await mobile.keyboard.press("Space");
  assert.equal(await firstFaq.evaluate(details => details.open), false, "venue FAQ disclosures close from the keyboard");
  await menu.click();
  const englishLanguageSwitch = mobile.getByRole("link", { name: "Read this site in Italian" });
  assert.ok(await englishLanguageSwitch.isVisible(), "the Italian language switch is available in the mobile navigation");
  await englishLanguageSwitch.click();
  assert.equal(new URL(mobile.url()).pathname, "/it/", "the mobile language switch opens the Italian home page");
  const italianFontStatuses = await mobile.evaluate(async () => {
    const [sans, serif] = await Promise.all([
      document.fonts.load('400 16px "DM Sans"', "città, ospitalità, Genova"),
      document.fonts.load('400 48px "Playfair Display"', "L’eleganza è in città"),
    ]);
    return [...sans, ...serif].map(face => face.status);
  });
  assert.ok(italianFontStatuses.length >= 2 && italianFontStatuses.every(status => status === "loaded"), "the Italian page loads local fonts for accented text");
  assert.equal(await mobile.locator("html").getAttribute("lang"), "it", "the Italian route declares its language");
  assert.equal(await mobile.getByRole("heading", { level: 1 }).textContent(), "L’eleganza ha unlato notturno.");
  const expectedItalianArtAlts = [
    "Illustrazione stilizzata di un tavolo illuminato da candele su una terrazza con vista sulla costa al tramonto.",
    "Illustrazione stilizzata di un violino sotto luci ambrate, con note musicali sullo sfondo.",
    "Illustrazione stilizzata di un tavolo da festa con fiori, torta e candele.",
    "Illustrazione stilizzata di un piatto servito su una tavola apparecchiata, con candele e fogliame.",
    "Illustrazione stilizzata di un sassofono dorato accanto a un cocktail su uno sfondo scuro.",
    "Illustrazione stilizzata di un lounge moderno con vista sulla città, un tavolo alto e bicchieri.",
  ];
  assert.deepEqual(await mobile.locator("#concept-deck .card-art-image").evaluateAll(images => images.map(image => image.alt)), expectedItalianArtAlts, "Italian cards expose localized, format-specific illustration descriptions");
  await mobile.waitForFunction(() => document.querySelector("#form-feedback").textContent.includes("L’invio online non è momentaneamente disponibile"));
  assert.equal(await mobile.locator(".menu-toggle").getAttribute("aria-label"), "Apri il menu di navigazione");
  await mobile.locator("#intent").selectOption("venue_partnership");
  assert.equal(await mobile.locator("#business").evaluate(input => input.required), true, "venue path makes the business field required");
  const italianFieldGeometry = await mobile.evaluate(() => {
    const label = document.querySelector('label[for="business"]');
    const field = document.querySelector("#business");
    const labelBounds = label.getBoundingClientRect();
    const fieldBounds = field.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      labelBottom: labelBounds.bottom,
      fieldTop: fieldBounds.top,
      labelWidth: labelBounds.width,
    };
  });
  assert.ok(italianFieldGeometry.documentWidth <= italianFieldGeometry.viewportWidth, `Italian long field labels keep the mobile form within the viewport: ${JSON.stringify(italianFieldGeometry)}`);
  assert.ok(italianFieldGeometry.labelBottom <= italianFieldGeometry.fieldTop + 1, `Italian long field label stays above its control: ${JSON.stringify(italianFieldGeometry)}`);
  assert.equal(await mobile.locator("#brief").evaluate(form => form.checkValidity()), false, "native constraint validation rejects an incomplete enquiry without submitting it");
  assert.deepEqual(await mobile.locator("#brief [aria-invalid='true']").evaluateAll(fields => fields.map(field => field.id)), ["name", "email", "business"], "all invalid required controls receive visible error state");
  assert.equal(await mobile.locator("#form-feedback").textContent(), "Controlla i campi evidenziati e correggi gli eventuali errori.", "Italian validation feedback is announced in the live status");
  assert.ok((await mobile.locator("#name").getAttribute("aria-describedby")).includes("form-required-note"), "the name field explains the required marker to assistive technology");
  assert.equal(await mobile.locator("#business").evaluate(field => getComputedStyle(field).borderTopColor), "rgb(116, 48, 55)", "invalid venue field shows the red error border");
  await mobile.getByLabel("Nome e cognome *").fill("Dante");
  await mobile.getByLabel("Indirizzo email *").fill("dante@example.com");
  assert.equal(await mobile.locator("#name").getAttribute("aria-invalid"), null, "valid name input clears its error state");
  assert.equal(await mobile.locator("#email").getAttribute("aria-invalid"), null, "valid email input clears its error state");
  assert.equal(await mobile.locator("#business").getAttribute("aria-invalid"), "true", "the remaining missing venue keeps its error state");
  await mobile.locator("#intent").selectOption("private_celebration");
  assert.equal(await mobile.locator("#business").evaluate(input => input.required), false, "private path makes the business field optional");
  assert.equal(await mobile.locator("#business").getAttribute("aria-invalid"), null, "making the business field optional clears its stale error state");
  assert.ok((await mobile.locator("#form-feedback").textContent()).includes("L’invio online non è momentaneamente disponibile"), "resolving field errors restores the service status that preceded validation");
  assert.equal(await mobile.locator("#submit-enquiry").isDisabled(), true, "validation checks do not send or enable the enquiry");

  const ItalianRooftopButton = mobile.getByRole("button", { name: "Esplora una serata in terrazza" });
  await ItalianRooftopButton.scrollIntoViewIfNeeded();
  await ItalianRooftopButton.click();
  assert.equal(await mobile.locator("#format").inputValue(), "Rooftop evenings", "Italian card text keeps the accepted backend value");
  assert.equal(await mobile.locator("#intent").inputValue(), "venue_partnership", "the Italian card chooses the venue partnership pathway");
  assert.equal(await mobile.locator("#format-context").isVisible(), true, "the Italian route shows its selected event format");
  assert.equal(await mobile.locator("#format-context-status").textContent(), "Formato selezionato: Serate in terrazza", "the Italian context summary is localized while preserving the canonical backend value");
  assert.equal(await mobile.locator("#clear-format").textContent(), "Rimuovi il formato selezionato", "the Italian clear action is localized");
  await mobile.locator("#clear-format").click();
  assert.equal(await mobile.locator("#format").inputValue(), "", "Italian users can remove a selected format");
  assert.equal(await mobile.locator("#intent").inputValue(), "venue_partnership", "clearing an Italian format preserves the venue enquiry path");
  assert.equal(await mobile.locator("#business-label").textContent(), "Location o attività ricettiva *", "Italian venue field explains its purpose");
  const ItalianPortoApertoReference = mobile.getByRole("link", { name: "Scopri Porto Aperto | Genova su Instagram (si apre in una nuova scheda)" });
  await ItalianPortoApertoReference.scrollIntoViewIfNeeded();
  assert.equal(await ItalianPortoApertoReference.getAttribute("target"), "_blank", "the Italian community reference opens separately from the Events site");
  assert.ok((await ItalianPortoApertoReference.boundingBox()).height >= 44, "the Italian external link has a comfortable mobile target");
  assert.equal(await mobile.locator(".offer-item").count(), 6, "the Italian page provides the same six partnership work areas");
  assert.equal(await mobile.locator(".faq-item").count(), 7, "the Italian page answers all seven venue questions");
  const italianFaq = mobile.locator(".faq-item").first();
  assert.equal(await italianFaq.locator("summary").textContent(), "Come funziona il primo confronto?");
  await italianFaq.locator("summary").focus();
  await mobile.keyboard.press("Space");
  assert.equal(await italianFaq.evaluate(details => details.open), true, "Italian FAQ disclosures open from the keyboard");
  await mobile.keyboard.press("Space");
  const ItalianMobileMetrics = await mobile.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(ItalianMobileMetrics.documentWidth <= ItalianMobileMetrics.width, `390px Italian page has no horizontal overflow: ${JSON.stringify(ItalianMobileMetrics)}`);
  await mobile.screenshot({ path: resolve(screenshotRoot, "italian-390px.png"), fullPage: true });
  await mobile.setViewportSize({ width: 851, height: 900 });
  const ItalianTabletDesktopMetrics = await mobile.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    logoRight: document.querySelector(".logo").getBoundingClientRect().right,
    navLeft: document.querySelector(".primary-nav").getBoundingClientRect().left,
    navRight: document.querySelector(".primary-nav").getBoundingClientRect().right,
    actionsLeft: document.querySelector(".header-actions").getBoundingClientRect().left,
  }));
  assert.ok(ItalianTabletDesktopMetrics.documentWidth <= 851, `851px Italian page has no horizontal overflow: ${JSON.stringify(ItalianTabletDesktopMetrics)}`);
  assert.ok(ItalianTabletDesktopMetrics.logoRight <= ItalianTabletDesktopMetrics.navLeft + 0.5, `851px Italian wordmark and navigation do not collide: ${JSON.stringify(ItalianTabletDesktopMetrics)}`);
  assert.ok(ItalianTabletDesktopMetrics.navRight <= ItalianTabletDesktopMetrics.actionsLeft + 0.5, `851px Italian navigation and enquiry controls do not collide: ${JSON.stringify(ItalianTabletDesktopMetrics)}`);
  assert.ok(await mobile.locator("#language-switch").isVisible(), "the English language switch is visible at the desktop breakpoint");
  await mobile.screenshot({ path: resolve(screenshotRoot, "italian-851px.png"), fullPage: true });
  await mobile.setViewportSize({ width: 1440, height: 900 });
  const ItalianDesktopMetrics = await mobile.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(ItalianDesktopMetrics.documentWidth <= ItalianDesktopMetrics.width, `1440px Italian page has no horizontal overflow: ${JSON.stringify(ItalianDesktopMetrics)}`);
  assert.ok(await mobile.locator("#language-switch").isVisible(), "the English language switch is visible on desktop");
  await mobile.screenshot({ path: resolve(screenshotRoot, "italian-1440px.png"), fullPage: true });
  await mobile.setViewportSize({ width: 390, height: 844 });
  const ItalianPrivacyLink = mobile.locator('footer .footer-links a[href="/it/privacy.html"]');
  await ItalianPrivacyLink.scrollIntoViewIfNeeded();
  await ItalianPrivacyLink.click();
  assert.equal(new URL(mobile.url()).pathname, "/it/privacy.html", "Italian privacy link preserves the selected language");
  assert.equal(await mobile.locator("html").getAttribute("lang"), "it");
  await mobile.locator("#privacy-language-switch").click();
  assert.equal(new URL(mobile.url()).pathname, "/privacy.html", "privacy language switch opens the English counterpart");
  assert.equal(await mobile.locator("html").getAttribute("lang"), "en");
  await mobile.locator("#privacy-language-switch").click();
  assert.equal(new URL(mobile.url()).pathname, "/it/privacy.html", "privacy language switch returns to its Italian counterpart");
  await mobile.close();

  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touch = await touchContext.newPage();
  await touch.route("https://fonts.googleapis.com/**", route => route.abort());
  await touch.route("https://fonts.gstatic.com/**", route => route.abort());
  await touch.goto(baseUrl, { waitUntil: "load" });
  await touch.locator("#concept-deck .art").first().scrollIntoViewIfNeeded();
  const artBounds = await touch.locator("#concept-deck .art").first().boundingBox();
  const touchSession = await touchContext.newCDPSession(touch);
  const touchY = Math.round(artBounds.y + artBounds.height / 2);
  const startX = Math.round(artBounds.x + artBounds.width * 0.85);
  await touch.evaluate(() => {
    window.carouselTouchEvents = [];
    for (const type of ["touchstart", "touchmove", "touchend"]) {
      document.querySelector("#concept-deck").addEventListener(type, () => window.carouselTouchEvents.push(type), { passive: true });
    }
  });
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: touchY, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
  });
  for (let step = 1; step <= 6; step++) {
    await touchSession.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX - step * 25, y: touchY, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await touch.waitForTimeout(25);
  }
  await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await touch.waitForTimeout(250);
  const touchState = await touch.evaluate(() => {
    const deck = document.querySelector("#concept-deck");
    return {
      scrollLeft: deck.scrollLeft,
      scrollWidth: deck.scrollWidth,
      clientWidth: deck.clientWidth,
      maxTouchPoints: navigator.maxTouchPoints,
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      touchAction: getComputedStyle(deck).touchAction,
      touchEvents: window.carouselTouchEvents,
    };
  });
  assert.ok(touchState.scrollLeft > 5, `mobile touch swipe advances the horizontal deck: ${JSON.stringify(touchState)}`);
  await touch.close();
  await touchContext.close();

  const carouselKeyboard = await browser.newPage({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" });
  await carouselKeyboard.route("https://fonts.googleapis.com/**", route => route.abort());
  await carouselKeyboard.route("https://fonts.gstatic.com/**", route => route.abort());
  await carouselKeyboard.goto(baseUrl, { waitUntil: "load" });
  const deck = carouselKeyboard.locator("#concept-deck");
  await deck.focus();
  await carouselKeyboard.keyboard.press("ArrowRight");
  await carouselKeyboard.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft > 1);
  assert.equal(await carouselKeyboard.evaluate(() => document.activeElement.id), "concept-deck", "ArrowRight scrolls the focused carousel without losing focus");
  await carouselKeyboard.keyboard.press("ArrowLeft");
  await carouselKeyboard.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft <= 4);

  const nextControl = carouselKeyboard.getByRole("button", { name: "Next event formats" });
  const previousControl = carouselKeyboard.getByRole("button", { name: "Previous event formats" });
  await nextControl.focus();
  await carouselKeyboard.keyboard.press("Enter");
  await carouselKeyboard.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft > 1);
  await carouselKeyboard.waitForFunction(() => document.querySelector("#deck-previous").getAttribute("aria-disabled") === "false");
  assert.equal(await previousControl.getAttribute("aria-disabled"), "false", "keyboard activation updates the previous control");
  for (let index = 0; index < 8 && await nextControl.getAttribute("aria-disabled") !== "true"; index++) {
    await nextControl.click();
    await carouselKeyboard.waitForTimeout(180);
  }
  assert.equal(await nextControl.getAttribute("aria-disabled"), "true", "carousel announces when no later slide remains");
  assert.equal(await previousControl.getAttribute("aria-disabled"), "false", "carousel keeps the previous control available at the end");
  await previousControl.focus();
  await carouselKeyboard.keyboard.press("Enter");
  await carouselKeyboard.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft < document.querySelector("#concept-deck").scrollWidth - document.querySelector("#concept-deck").clientWidth - 2);

  const firstAction = carouselKeyboard.locator("#concept-deck .concept").first().locator("button[data-concept]");
  await firstAction.focus();
  await carouselKeyboard.keyboard.press("ArrowRight");
  await carouselKeyboard.waitForFunction(() => document.activeElement.dataset.concept === "Live music & DJs");
  await carouselKeyboard.keyboard.press("ArrowLeft");
  await carouselKeyboard.waitForFunction(() => document.activeElement.dataset.concept === "Rooftop evenings");
  await carouselKeyboard.close();

  const keyboard = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await keyboard.route("https://fonts.googleapis.com/**", route => route.abort());
  await keyboard.route("https://fonts.gstatic.com/**", route => route.abort());
  await keyboard.goto(baseUrl, { waitUntil: "load" });
  await keyboard.keyboard.press("Tab");
  assert.equal(await keyboard.evaluate(() => document.activeElement.matches(".skip-link")), true, "skip link is the first keyboard stop");
  const skipState = await keyboard.evaluate(() => {
    const link = document.querySelector(".skip-link");
    const style = getComputedStyle(link);
    const bounds = link.getBoundingClientRect();
    return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), top: bounds.top, bottom: bounds.bottom };
  });
  assert.ok(skipState.top >= 0 && skipState.bottom <= 844, `skip link is visible when focused: ${JSON.stringify(skipState)}`);
  assert.ok(skipState.outlineStyle !== "none" && skipState.outlineWidth >= 3, `skip link has visible keyboard focus: ${JSON.stringify(skipState)}`);
  await keyboard.keyboard.press("Enter");
  await keyboard.waitForFunction(() => location.hash === "#main-content" && document.activeElement.id === "main-content");
  assert.ok(await keyboard.getByRole("main").count(), "the skip target is the page's main landmark");
  await keyboard.close();

  const desktopKeyboard = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await desktopKeyboard.route("https://fonts.googleapis.com/**", route => route.abort());
  await desktopKeyboard.route("https://fonts.gstatic.com/**", route => route.abort());
  await desktopKeyboard.goto(baseUrl, { waitUntil: "load" });
  const expectedFocusOrder = [
    ".skip-link",
    ".logo",
    "#primary-navigation a[href='#approach']",
    "#primary-navigation a[href='#concepts']",
    "#primary-navigation a[href='#partners']",
    "#language-switch",
    ".header-cta",
  ];
  for (const selector of expectedFocusOrder) {
    await desktopKeyboard.keyboard.press("Tab");
    assert.equal(await desktopKeyboard.evaluate(selector => document.activeElement.matches(selector), selector), true, `Tab reaches ${selector} in document order`);
    const outline = await desktopKeyboard.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    assert.ok(outline.style !== "none" && outline.width >= 3, `${selector} shows keyboard focus: ${JSON.stringify(outline)}`);
  }
  let emailReached = false;
  for (let index = 0; index < 80 && !emailReached; index++) {
    await desktopKeyboard.keyboard.press("Tab");
    emailReached = await desktopKeyboard.evaluate(() => document.activeElement.id === "email");
  }
  assert.ok(emailReached, "keyboard navigation reaches the enquiry email field without a trap");
  const emailFocus = await desktopKeyboard.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  assert.ok(emailFocus.style !== "none" && emailFocus.width >= 3, `form focus remains visible: ${JSON.stringify(emailFocus)}`);
  assert.ok(await desktopKeyboard.getByLabel("Your name *").count(), "the name field has an accessible label");
  assert.ok(await desktopKeyboard.getByLabel("Email address *").count(), "the email field has an accessible label");
  assert.ok(await desktopKeyboard.getByLabel("What are you enquiring about? *").count(), "the enquiry type control has an accessible label");
  assert.equal(await desktopKeyboard.locator("#form-feedback").getAttribute("aria-live"), "polite", "form feedback is announced politely");
  await desktopKeyboard.close();

  const reducedMotion = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await reducedMotion.route("https://fonts.googleapis.com/**", route => route.abort());
  await reducedMotion.route("https://fonts.gstatic.com/**", route => route.abort());
  await reducedMotion.addInitScript(() => {
    window.__scrollCalls = [];
    const record = (method, options) => {
      const behavior = typeof options === "string" ? options : options?.behavior ?? "auto";
      window.__scrollCalls.push({ method, behavior });
    };
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(options) {
      record("scrollIntoView", options);
      return scrollIntoView.call(this, options);
    };
    const scrollBy = Element.prototype.scrollBy;
    Element.prototype.scrollBy = function(options, y) {
      record("scrollBy", options);
      return scrollBy.call(this, options, y);
    };
  });
  await reducedMotion.goto(baseUrl, { waitUntil: "load" });
  const motionStyles = await reducedMotion.evaluate(() => ({
    preference: matchMedia("(prefers-reduced-motion: reduce)").matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transitionSeconds: Number.parseFloat(getComputedStyle(document.querySelector(".header-cta")).transitionDuration),
  }));
  assert.equal(motionStyles.preference, true, "browser reduced-motion preference reaches the page");
  assert.equal(motionStyles.scrollBehavior, "auto", "CSS anchor scrolling stops being smooth for reduced-motion users");
  assert.ok(motionStyles.transitionSeconds <= 0.0001, `nonessential transitions are reduced: ${JSON.stringify(motionStyles)}`);
  await reducedMotion.getByRole("button", { name: "Next event formats" }).click();
  await reducedMotion.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft > 0);
  await reducedMotion.getByRole("button", { name: /Explore a rooftop evening/ }).click();
  assert.equal(await reducedMotion.locator("#format").inputValue(), "Rooftop evenings", "reduced-motion preference keeps concept navigation usable");
  const scrollCalls = await reducedMotion.evaluate(() => window.__scrollCalls);
  assert.ok(scrollCalls.some(call => call.method === "scrollBy" && call.behavior === "auto"), `carousel avoids smooth scrolling: ${JSON.stringify(scrollCalls)}`);
  assert.ok(scrollCalls.some(call => call.method === "scrollIntoView" && call.behavior === "auto"), `concept actions avoid smooth scrolling: ${JSON.stringify(scrollCalls)}`);
  assert.ok(scrollCalls.every(call => call.behavior !== "smooth"), `no recorded interaction overrides the reduced-motion preference: ${JSON.stringify(scrollCalls)}`);
  await reducedMotion.close();

  const privacy = await browser.newPage();
  await privacy.route("https://fonts.googleapis.com/**", route => route.abort());
  await privacy.route("https://fonts.gstatic.com/**", route => route.abort());
  for (const path of ["/", "/privacy.html", "/robots.txt", "/sitemap.xml", "/assets/favicon.svg", "/it/", "/it/privacy.html"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} continues to resolve after adding the custom not-found route`);
  }
  const privacyResponse = await privacy.goto(`${baseUrl}/privacy.html`, { waitUntil: "load" });
  assert.equal(privacyResponse.status(), 200, "privacy page is available");
  const privacyReadability = await privacy.evaluate(() => {
    const rgb = color => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = color => rgb(color).map(value => value / 255).map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground, background) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return Number(((values[0] + 0.05) / (values[1] + 0.05)).toFixed(2));
    };
    const main = document.querySelector("main");
    const body = getComputedStyle(document.body);
    return {
      fontSize: Number.parseFloat(body.fontSize),
      lineHeight: Number.parseFloat(body.lineHeight) / Number.parseFloat(body.fontSize),
      bodyContrast: contrast(body.color, body.backgroundColor),
      smallContrast: contrast(getComputedStyle(document.querySelector("small")).color, body.backgroundColor),
      links: [...main.querySelectorAll("a[href]")].map(link => {
        const rect = link.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    };
  });
  assert.ok(privacyReadability.fontSize >= 16, `privacy text is ${privacyReadability.fontSize}px or larger`);
  assert.ok(privacyReadability.lineHeight >= 1.7, `privacy text line spacing remains generous: ${privacyReadability.lineHeight}`);
  assert.ok(privacyReadability.bodyContrast >= 4.5, `privacy body contrast is ${privacyReadability.bodyContrast}:1`);
  assert.ok(privacyReadability.smallContrast >= 4.5, `privacy small-text contrast is ${privacyReadability.smallContrast}:1`);
  for (const link of privacyReadability.links) {
    assert.ok(link.width >= 24 && link.height >= 24, `privacy text link is a ${link.width.toFixed(1)}x${link.height.toFixed(1)}px target; expected at least 24x24px`);
  }
  const missingResponse = await privacy.goto(`${baseUrl}/does-not-exist`, { waitUntil: "load" });
  assert.equal(missingResponse.status(), 404, "unknown static paths keep a real 404 status");
  assert.equal(await privacy.locator("html").getAttribute("lang"), "en", "an unknown English path receives the English recovery page");
  assert.equal(await privacy.getByRole("heading", { level: 1 }).textContent(), "We couldn’t find that page.");
  assert.equal(await privacy.getByRole("link", { name: "Back to YMG Events home" }).getAttribute("href"), "/");
  assert.equal(await privacy.getByRole("link", { name: "Explore event formats" }).getAttribute("href"), "/#concepts");
  assert.equal(await privacy.getByRole("link", { name: "Contact YMG Events" }).getAttribute("href"), "/#enquire");
  await privacy.setViewportSize({ width: 390, height: 844 });
  const english404Layout = await privacy.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    targets: [...document.querySelectorAll(".button, .secondary-links a")].map(link => link.getBoundingClientRect().height),
  }));
  assert.ok(english404Layout.documentWidth <= english404Layout.viewportWidth, `English 390px 404 has no horizontal overflow: ${JSON.stringify(english404Layout)}`);
  assert.ok(english404Layout.targets.every(height => height >= 44), `404 recovery links have comfortable targets: ${JSON.stringify(english404Layout.targets)}`);
  await privacy.screenshot({ path: resolve(screenshotRoot, "404-390px.png"), fullPage: true });

  for (const path of ["/missing-page/", "/a/deep/missing-page", "/it/missing-page", "/it/a/deep/missing-page/"]) {
    const response = await privacy.goto(`${baseUrl}${path}`, { waitUntil: "load" });
    assert.equal(response.status(), 404, `${path} remains a genuine 404, including slash variants`);
    const isItalian = path.startsWith("/it/");
    assert.equal(await privacy.locator("html").getAttribute("lang"), isItalian ? "it" : "en", `${path} receives the nearest language-specific recovery page`);
    assert.equal(await privacy.getByRole("heading", { level: 1 }).textContent(), isItalian ? "Non troviamo questa pagina." : "We couldn’t find that page.");
  }
  await privacy.screenshot({ path: resolve(screenshotRoot, "italian-404-390px.png"), fullPage: true });
  await privacy.goto(`${baseUrl}/another-missing-page`, { waitUntil: "load" });
  await privacy.keyboard.press("Tab");
  assert.equal(await privacy.evaluate(() => document.activeElement.classList.contains("skip-link")), true, "the 404 page has a visible keyboard skip link");
  await privacy.keyboard.press("Enter");
  assert.equal(await privacy.evaluate(() => document.activeElement.id), "main-content", "the skip link moves keyboard focus to the recovery message");
  await privacy.close();

  const runType = fullMatrix ? "Full responsive matrix" : "Focused responsive smoke";
  console.log(`${runType} passed at ${widths.join(", ")} CSS-pixel widths; screenshots saved to ${screenshotRoot}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
