// #135: measure hero text contrast against the photograph as it actually renders.
//
// For each hero text element we screenshot the hero twice: once with the text
// hidden (color: transparent) to get the real backdrop, once as white glyphs on
// black to get a glyph mask. We then read the backdrop pixels covered by, or
// within GLYPH_RING_PX of, that element's glyphs.
// Any text-shadow stays painted, because it is part of the backdrop the glyphs
// sit on. The text colour is the computed CSS colour. Light text on a dark photo is
// limited by the *brightest* background pixel, so we report contrast against
// the worst pixel and against the 99th-percentile pixel.

export const HERO_TEXT_TARGETS = [
  { name: "eyebrow", selector: ".hero .eyebrow" },
  { name: "headline", selector: ".hero h1", exclude: "em" },
  { name: "headline accent", selector: ".hero h1 em" },
  { name: "paragraph", selector: ".hero-copy > p" },
  { name: "audience line", selector: ".hero .geo" },
  { name: "photo note", selector: ".hero .photo-note" },
];

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// WCAG 2.2 large text: at least 24px, or at least 18.66px (14pt) bold.
export function requiredRatio(fontSizePx, fontWeight) {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
}

async function lineBoxes(page) {
  return page.evaluate((targets) => {
    const parse = (value) => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    return targets.map((target) => {
      const element = document.querySelector(target.selector);
      if (!element) return { ...target, missing: true };
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return { ...target, hidden: true };
      const rects = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        if (target.exclude && element.contains(node.parentElement.closest(target.exclude))) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width < 1 || rect.height < 1) continue;
          rects.push({ x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height });
        }
      }
      return {
        ...target,
        color: parse(style.color),
        fontSize: parseFloat(style.fontSize),
        fontWeight: Number(style.fontWeight) || 400,
        rects,
      };
    });
  }, HERO_TEXT_TARGETS);
}

export const GLYPH_RING_PX = 2;

// Decode both screenshots in a CSP-free blank page. The mask shot has white
// glyphs on black; a pixel counts as "adjacent background" when it lies within
// GLYPH_RING_PX of a glyph pixel, inside that target's line boxes. Only summary
// statistics come back: the full pixel array is too large for the protocol.
async function backgroundStats(decoder, backdropPng, maskPng, rectsByTarget, ring) {
  return decoder.evaluate(async ({ backdrop64, mask64, rectsByTarget, ring }) => {
    const read = async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    };
    const { data, width, height } = await read(backdrop64);
    const mask = (await read(mask64)).data;
    const glyph = new Uint8Array(width * height);
    for (let i = 0; i < glyph.length; i += 1) glyph[i] = mask[i * 4] > 40 ? 1 : 0;
    const nearGlyph = (x, y) => {
      for (let dy = -ring; dy <= ring; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -ring; dx <= ring; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < width && dx * dx + dy * dy <= ring * ring && glyph[yy * width + xx]) return true;
        }
      }
      return false;
    };
    const channel = (value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return rectsByTarget.map((rects) => {
      const seen = new Uint8Array(width * height);
      const values = [];
      let worst = { luminance: -1 };
      for (const rect of rects) {
        for (let y = Math.max(0, Math.floor(rect.y) - ring); y < Math.min(height, Math.ceil(rect.y + rect.height) + ring); y += 1) {
          for (let x = Math.max(0, Math.floor(rect.x) - ring); x < Math.min(width, Math.ceil(rect.x + rect.width) + ring); x += 1) {
            const index = y * width + x;
            if (seen[index] || !nearGlyph(x, y)) continue;
            seen[index] = 1;
            const o = index * 4;
            const luminance = 0.2126 * channel(data[o]) + 0.7152 * channel(data[o + 1]) + 0.0722 * channel(data[o + 2]);
            values.push(luminance);
            if (luminance > worst.luminance) worst = { luminance, rgb: [data[o], data[o + 1], data[o + 2]], x, y };
          }
        }
      }
      values.sort((a, b) => a - b);
      const at = (q) => values[Math.min(values.length - 1, Math.floor(values.length * q))];
      return { pixels: values.length, worst, p99: at(0.99), median: at(0.5) };
    });
  }, { backdrop64: backdropPng.toString("base64"), mask64: maskPng.toString("base64"), rectsByTarget, ring });
}

/**
 * Measure every hero text element on an already-loaded page.
 * `decoder` is any page without a restrictive CSP (e.g. about:blank).
 */
export async function measureHeroContrast(page, decoder) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const image = document.querySelector(".hero-atmosphere img");
    if (image && !image.complete) await new Promise((resolve) => image.addEventListener("load", resolve, { once: true }));
    if (image) await image.decode().catch(() => {});
    scrollTo(0, 0);
  });
  const targets = await lineBoxes(page);
  const hero = await page.locator(".hero").boundingBox();
  const clip = { x: 0, y: 0, width: Math.ceil(hero.x + hero.width), height: Math.ceil(hero.y + hero.height) };
  const capture = async (css) => {
    const style = await page.addStyleTag({ content: css });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const png = await page.screenshot({ fullPage: true, clip });
    await style.evaluate((node) => node.remove());
    return png;
  };
  // Backdrop: the photo, overlays and any text-shadow, with the glyphs themselves hidden.
  const backdrop = await capture(".hero *, .hero *::before, .hero *::after { color: transparent !important; caret-color: transparent !important; } .hero .photo-note { border-color: transparent !important; } .hero .btn, .hero svg { visibility: hidden !important; }");
  // Mask: white glyphs on black, nothing else.
  const mask = await capture(".hero, .hero *, .hero *::before, .hero *::after { background: #000 !important; color: #fff !important; text-shadow: none !important; border-color: #000 !important; filter: none !important; } .hero-atmosphere img, .hero .btn, .hero svg { visibility: hidden !important; }");
  const measurable = targets.filter((target) => !target.missing && !target.hidden && target.rects.length);
  const stats = await backgroundStats(decoder, backdrop, mask, measurable.map((target) => target.rects), GLYPH_RING_PX);
  const results = [];
  for (const target of targets) {
    const index = measurable.indexOf(target);
    if (index < 0) {
      results.push({ name: target.name, skipped: target.missing ? "missing" : "not displayed" });
      continue;
    }
    const { pixels, worst, p99, median } = stats[index];
    const textLuminance = relativeLuminance(target.color);
    const ratio = (background) => (Math.max(textLuminance, background) + 0.05) / (Math.min(textLuminance, background) + 0.05);
    results.push({
      name: target.name,
      color: target.color,
      fontSize: target.fontSize,
      fontWeight: target.fontWeight,
      required: requiredRatio(target.fontSize, target.fontWeight),
      worst: Number(ratio(worst.luminance).toFixed(2)),
      p99: Number(ratio(p99).toFixed(2)),
      median: Number(ratio(median).toFixed(2)),
      worstPixel: { rgb: worst.rgb, x: worst.x, y: worst.y },
      pixels,
    });
  }
  return results;
}
