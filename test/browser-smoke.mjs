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
  await next.click();
  await mobile.waitForFunction(() => document.querySelector("#concept-deck").scrollLeft > 0
    && document.querySelector("#deck-previous").getAttribute("aria-disabled") === "false");
  assert.equal(await mobile.getByRole("button", { name: "Previous event formats" }).getAttribute("aria-disabled"), "false", "carousel state updates after scrolling");
  await mobile.getByRole("button", { name: /Explore a rooftop evening/ }).click();
  assert.equal(await mobile.locator("#format").inputValue(), "Rooftop evenings", "concept action selects its enquiry format");
  await mobile.close();

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
