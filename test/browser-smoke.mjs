import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

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
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = resolve(siteRoot, relativePath);
    if (filePath !== siteRoot && !filePath.startsWith(`${siteRoot}${sep}`)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

await mkdir(screenshotRoot, { recursive: true });
await new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolveListen);
});

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const widths = [320, 360, 390, 430, 540, 541, 768, 850, 851, 1024, 1280, 1440, 1920];

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("https://fonts.googleapis.com/**", route => route.abort());
    await context.route("https://fonts.gstatic.com/**", route => route.abort());
    const page = await context.newPage();
    const pageResponse = await page.goto(baseUrl, { waitUntil: "load" });
    assert.equal(pageResponse.status(), 200, `${width}px homepage responds successfully`);

    const metrics = await page.evaluate(() => {
      const logo = document.querySelector(".logo");
      const subtitle = logo.querySelector("small");
      const wordmarkRange = document.createRange();
      const finalWordmarkNode = subtitle.previousSibling;
      wordmarkRange.setStart(logo.firstChild, 0);
      wordmarkRange.setEnd(finalWordmarkNode, finalWordmarkNode.textContent.length);
      const wordmark = wordmarkRange.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        logoRight: logo.getBoundingClientRect().right,
        actionsLeft: document.querySelector(".header-actions").getBoundingClientRect().left,
        subtitleTop: subtitle.getBoundingClientRect().top,
        wordmarkBottom: wordmark.bottom,
      };
    });
    assert.ok(metrics.documentWidth <= metrics.viewportWidth, `${width}px has no horizontal document overflow: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.logoRight <= metrics.actionsLeft + 0.5, `${width}px logo and enquiry controls do not collide: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.subtitleTop >= metrics.wordmarkBottom - 1, `${width}px brand subtitle remains legible below the wordmark: ${JSON.stringify(metrics)}`);

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
        return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
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
          const artKicker = art.querySelector(".art-kicker");
          const artTitle = art.querySelector(".art-title");
          const artFoot = art.querySelector(".art-foot");
          return {
            number: index + 1,
            accessibleLabel: card.getAttribute("aria-label"),
            title: card.querySelector("h3").textContent,
            badge: card.querySelector(":scope > small").textContent,
            art: bounds(art),
            kicker: bounds(artKicker),
            artTitle: bounds(artTitle),
            foot: bounds(artFoot),
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
    for (const slide of carousel.slides) {
      const number = String(slide.number).padStart(2, "0");
      assert.equal(slide.title, expectedTitles[slide.number - 1], `${width}px keeps slide ${number}'s title with its position`);
      assert.equal(slide.accessibleLabel, `${slide.number} of 6: ${slide.title}`, `${width}px gives slide ${number} a semantic name`);
      assert.ok(slide.badge.startsWith(`${number} /`), `${width}px keeps slide ${number}'s number with its category`);
      assert.ok(slide.badgeBounds.bottom <= slide.titleBounds.top + 1, `${width}px slide ${number}'s number does not overlap its title`);
      assert.ok(slide.kicker.bottom <= slide.artTitle.top + 1 && slide.artTitle.bottom <= slide.foot.top + 1,
        `${width}px slide ${number}'s artwork labels do not overlap: ${JSON.stringify(slide)}`);
      assert.ok(slide.kicker.top >= slide.art.top && slide.foot.bottom <= slide.art.bottom,
        `${width}px slide ${number}'s artwork labels stay inside the image panel`);
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
      feedback.dataset.state = "error";
      const errorColor = getComputedStyle(feedback).color;
      feedback.dataset.state = "success";
      const successColor = getComputedStyle(feedback).color;
      delete feedback.dataset.state;
      const readings = [
        ["main copy", body.color, body.backgroundColor],
        ["muted copy on paper", style(".intro p:not(.lead)").color, body.backgroundColor],
        ["muted copy on warm ivory", style(".about p").color, style(".about").backgroundColor],
        ["muted copy on enquiry surface", style(".enquiry .description").color, enquiry.backgroundColor],
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
        ["enquiry error message", errorColor, enquiry.backgroundColor],
        ["enquiry success message", successColor, enquiry.backgroundColor],
        ["footer supporting text", style("footer p").color, style("footer").backgroundColor],
      ].map(([name, foreground, background]) => ({ name, ratio: contrast(foreground, background) }));
      const selectors = [
        ".menu-toggle", ".header-cta", "header .logo", ".primary-nav > a:not(.btn)",
        ".deck-arrow", ".concept button", ".partnerships .btn",
        "#brief input:not([type=hidden]):not(#bot-field)", "#brief select", "#brief textarea",
        "#submit-enquiry", "footer a", ".site-note a", ".enquiry .small a",
      ];
      const targets = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
        const rect = element.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
        return visible ? { selector, width: rect.width, height: rect.height } : null;
      }).filter(Boolean));
      return { readings, targets };
    });
    for (const reading of audit.readings) {
      assert.ok(reading.ratio >= 4.5, `${reading.name} contrast is ${reading.ratio}:1 at ${width}px; expected at least 4.5:1`);
    }
    for (const target of audit.targets) {
      assert.ok(target.width >= 44 && target.height >= 44, `${target.selector} is a ${target.width.toFixed(1)}x${target.height.toFixed(1)}px target at ${width}px; expected at least 44x44px`);
    }

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
  const expectedFormats = ["Rooftop evenings", "Live music & DJs", "Private celebrations", "Supper Club", "Jazz & Cocktails", "Corporate Social"];
  const conceptCards = mobile.locator("#concept-deck .concept");
  assert.equal(await conceptCards.count(), expectedFormats.length, "each event format has an individual card");
  for (const [index, format] of expectedFormats.entries()) {
    const action = conceptCards.nth(index).locator("button[data-concept]");
    await action.scrollIntoViewIfNeeded();
    await action.click();
    assert.equal(await mobile.locator("#format").inputValue(), format, `slide ${index + 1} preselects ${format}`);
  }
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
  await privacy.close();

  console.log(`Responsive browser matrix passed at ${widths.join(", ")} CSS-pixel widths; screenshots saved to ${screenshotRoot}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
