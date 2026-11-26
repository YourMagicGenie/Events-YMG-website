// #135: rendered hero contrast audit. Serves dist/, loads EN and IT at each
// viewport, measures every hero text element against the real photograph and
// overlay, and writes test-results/hero-contrast/report.json plus hero crops.
// Exits non-zero when any glyph-adjacent background pixel fails WCAG 2.2 AA.
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { measureHeroContrast } from "./hero-contrast.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(projectRoot, "dist");
const outputRoot = resolve(projectRoot, "test-results/hero-contrast");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

export const HERO_VIEWPORTS = [
  [320, 640], [360, 780], [390, 844], [430, 932], [540, 900], [541, 900], [768, 1024],
  [850, 900], [851, 900], [1024, 768], [1280, 800], [1366, 768], [1440, 900], [1920, 1080],
];
const LOCALES = [["en", "/"], ["it", "/it/"]];

export function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const relative = pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
      const file = resolve(siteRoot, relative);
      if (!file.startsWith(`${siteRoot}${sep}`) || !(await stat(file)).isFile()) throw new Error("not found");
      response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  return new Promise((resolveListen) => server.listen(0, "127.0.0.1", () => resolveListen(server)));
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const server = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const options = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch(options);
  const decoder = await browser.newPage();
  const report = [];
  const failures = [];
  try {
    for (const [locale, path] of LOCALES) {
      for (const [width, height] of HERO_VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
        const results = await measureHeroContrast(page, decoder);
        await page.locator(".hero").screenshot({ path: resolve(outputRoot, `${locale}-${width}x${height}.png`) });
        await context.close();
        for (const result of results) {
          report.push({ locale, width, height, ...result });
          if (result.skipped) continue;
          const flag = result.worst < result.required ? "FAIL" : "ok";
          if (flag === "FAIL") failures.push(`${locale} ${width}x${height} ${result.name}: worst ${result.worst}:1 < ${result.required}:1`);
          console.log(`${locale} ${String(width).padStart(4)}x${height} ${result.name.padEnd(16)} ${String(result.fontSize).padStart(5)}px need ${result.required}  worst ${result.worst.toFixed(2)}  p99 ${result.p99.toFixed(2)}  median ${result.median.toFixed(2)}  ${flag}`);
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  await writeFile(resolve(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    console.error(`\nHERO CONTRAST FAILED (${failures.length}):\n${failures.join("\n")}`);
    process.exit(1);
  }
  console.log(`\nHero contrast passed for ${LOCALES.length} locales x ${HERO_VIEWPORTS.length} viewports; report in ${outputRoot}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
