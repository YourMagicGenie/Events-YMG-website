import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineRoot = path.resolve(process.env.PERFORMANCE_BASE_DIR ?? path.join(projectRoot, "baseline"));
const resultDirectory = path.resolve(process.env.PERFORMANCE_OUTPUT_DIR ?? path.join(projectRoot, "test-results/performance"));
const require = createRequire(import.meta.url);
const lighthousePath = require.resolve("lighthouse");
const lighthouseRequire = createRequire(lighthousePath);
const { default: puppeteer } = await import(pathToFileURL(lighthouseRequire.resolve("puppeteer-core")).href);
const { startFlow } = await import("lighthouse");

const profiles = [
  {
    name: "mobile",
    formFactor: "mobile",
    screenEmulation: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, disabled: false },
    throttling: { rttMs: 150, requestLatencyMs: 150, throughputKbps: 1_600, downloadThroughputKbps: 1_600, uploadThroughputKbps: 750, cpuSlowdownMultiplier: 4 },
  },
  {
    name: "desktop",
    formFactor: "desktop",
    screenEmulation: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, disabled: false },
    throttling: { rttMs: 40, requestLatencyMs: 0, throughputKbps: 10_240, downloadThroughputKbps: 10_240, uploadThroughputKbps: 1_024, cpuSlowdownMultiplier: 1 },
  },
];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function serve(directory) {
  const root = path.resolve(directory, "dist");
  await stat(root);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      let file = path.resolve(root, `.${pathname}`);
      if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
        response.writeHead(403).end();
        return;
      }
      if (pathname.endsWith("/")) file = path.join(file, "index.html");
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(file)] ?? "application/octet-stream",
        "content-length": body.length,
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

function metric(lhr, auditId) {
  const audit = lhr.audits?.[auditId];
  return typeof audit?.numericValue === "number" ? audit.numericValue : null;
}

function requests(lhr) {
  return lhr.audits?.["network-requests"]?.details?.items ?? [];
}

function summarize(lhr, inpMeasurement) {
  const network = requests(lhr);
  const transfer = (item) => Number(item.transferSize ?? 0);
  const fonts = network.filter((item) => /fonts\.googleapis\.com|fonts\.gstatic\.com|\/assets\/fonts\//.test(item.url ?? ""));
  const hero = network.filter((item) => /images\.unsplash\.com\/photo-1789931123652-6d22f2ef7cc7/.test(item.url ?? ""));
  return {
    performanceScore: lhr.categories?.performance?.score ?? null,
    lcpMs: metric(lhr, "largest-contentful-paint"),
    cls: metric(lhr, "cumulative-layout-shift"),
    tbtMs: metric(lhr, "total-blocking-time"),
    inpMs: inpMeasurement.ms,
    inpBelowThreshold: inpMeasurement.belowThreshold,
    inpEventEntries: inpMeasurement.eventEntries,
    transferBytes: network.reduce((sum, item) => sum + transfer(item), 0),
    fontBytes: fonts.reduce((sum, item) => sum + transfer(item), 0),
    fontRequests: fonts.length,
    fontResources: fonts.map((item) => ({ url: item.url, transferBytes: transfer(item), resourceBytes: item.resourceSize ?? null })),
    heroBytes: hero.reduce((sum, item) => sum + transfer(item), 0),
    heroRequests: hero.length,
    heroResources: hero.map((item) => ({ url: item.url, transferBytes: transfer(item), resourceBytes: item.resourceSize ?? null })),
  };
}

async function audit(url, profile, executablePath, label) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window.__eventsInteractionEntries = [];
      window.__eventsSupportsInteractionTiming = Boolean(
        window.PerformanceObserver?.supportedEntryTypes?.includes("event"),
      );
      if (window.__eventsSupportsInteractionTiming) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.interactionId) {
              window.__eventsInteractionEntries.push({ interactionId: entry.interactionId, duration: entry.duration });
            }
          }
        }).observe({ type: "event", buffered: true, durationThreshold: 16 });
      }
    });
    const flow = await startFlow(page, {
      name: `${label} ${profile.name}`,
      flags: {
        formFactor: profile.formFactor,
        screenEmulation: profile.screenEmulation,
        throttlingMethod: "devtools",
        throttling: profile.throttling,
        maxWaitForLoad: 45_000,
        logLevel: "error",
      },
    });
    await flow.navigate(url, { name: "Cold page load" });
    await page.waitForFunction(() => {
      const image = document.querySelector(".hero-atmosphere img");
      return image?.complete && image.naturalWidth > 0;
    }, { timeout: 20_000 });
    const button = await page.$('button[data-concept="Rooftop evenings"]');
    if (!button) throw new Error(`${label} ${profile.name}: event-format button was not found`);
    await button.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "auto" }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await page.evaluate(() => { window.__eventsInteractionEntries.length = 0; });
    await flow.startTimespan({ name: "Select an event format" });
    await button.click();
    await page.waitForFunction(() => document.querySelector(".format-context")?.hidden === false, { timeout: 5_000 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const observedInteraction = await page.evaluate(() => ({
      supported: window.__eventsSupportsInteractionTiming,
      entries: window.__eventsInteractionEntries,
    }));
    if (!observedInteraction.supported) throw new Error(`${label} ${profile.name}: browser does not support Event Timing`);
    const interactionDurations = new Map();
    for (const entry of observedInteraction.entries) {
      interactionDurations.set(entry.interactionId, Math.max(interactionDurations.get(entry.interactionId) ?? 0, entry.duration));
    }
    const inpValues = [...interactionDurations.values()];
    const inpMeasurement = {
      ms: inpValues.length ? Math.max(...inpValues) : null,
      belowThreshold: inpValues.length === 0,
      eventEntries: observedInteraction.entries.length,
    };
    await flow.endTimespan();
    const result = await flow.createFlowResult();
    const navigation = result.steps.find((step) => /Cold page load/.test(step.name))?.lhr;
    const interaction = result.steps.find((step) => /Select an event format/.test(step.name))?.lhr;
    if (!navigation || !interaction) throw new Error(`${label} ${profile.name}: Lighthouse flow missed a measured step`);
    const metrics = summarize(navigation, inpMeasurement);
    if (metrics.lcpMs === null || metrics.cls === null || (metrics.inpMs === null && !metrics.inpBelowThreshold)) {
      throw new Error(`${label} ${profile.name}: missing LCP, CLS, or interaction timing (${JSON.stringify({ lcpMs: metrics.lcpMs, cls: metrics.cls, inpMs: metrics.inpMs })})`);
    }
    return { metrics, navigationLhr: navigation, interactionLhr: interaction };
  } finally {
    await browser.close();
  }
}

function fmt(value, digits = 0) {
  if (value === null || value === undefined) return "n/a";
  return Number(value).toFixed(digits);
}

const [baseline, candidate] = await Promise.all([serve(baselineRoot), serve(projectRoot)]);
await mkdir(resultDirectory, { recursive: true });
const executablePath = process.env.CHROME_PATH || chromium.executablePath();
const outputs = {};

try {
  for (const profile of profiles) {
    for (const [label, server] of [["before", baseline], ["after", candidate]]) {
      process.stdout.write(`Measuring ${label} ${profile.name} profile…\n`);
      const result = await audit(server.url, profile, executablePath, label);
      outputs[`${label}-${profile.name}`] = result.metrics;
      await writeFile(path.join(resultDirectory, `${label}-${profile.name}.json`), JSON.stringify({ profile, metrics: result.metrics }, null, 2));
    }
  }
} finally {
  await Promise.all([baseline.server.close(), candidate.server.close()]);
}

const rows = [];
for (const profile of profiles) {
  for (const label of ["before", "after"]) {
    const m = outputs[`${label}-${profile.name}`];
    const inpDisplay = m.inpMs === null ? "≤16 ms" : `${fmt(m.inpMs)} ms`;
    rows.push(`| ${label} | ${profile.name} | ${m.performanceScore === null ? "n/a" : Math.round(m.performanceScore * 100)} | ${fmt(m.lcpMs / 1000, 2)} s | ${fmt(m.cls, 3)} | ${inpDisplay} | ${fmt(m.tbtMs)} ms | ${fmt(m.transferBytes / 1024)} KiB | ${fmt(m.heroBytes / 1024)} KiB (${m.heroRequests}) | ${fmt(m.fontBytes / 1024)} KiB (${m.fontRequests}) |`);
  }
}
const report = [
  "# Events performance comparison",
  "",
  "Lighthouse 13.3.0 user-flow audits ran against the base-branch and candidate static builds on the same hosted runner. Mobile used 390×844 CSS px, DPR 2, 150 ms RTT, 1.6 Mbps and 4× CPU slowdown; desktop used 1440×900 CSS px, DPR 1, 40 ms RTT and no CPU slowdown. INP is the measured event-format selection interaction from Chrome Event Timing, grouped by interaction ID; if no entry clears Chrome’s 16 ms observation threshold, the result is reported as ≤16 ms. These are lab samples, not field CrUX data.",
  "",
  "| Build | Profile | Performance | LCP | CLS | INP | TBT | Page transfer | Hero image | Fonts |",
  "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...rows,
  "",
  "Hero and font transfer totals come from the Lighthouse network records; all byte counts are the sum of `transferSize` for matching resources.",
  "",
].join("\n");
const reportPath = path.join(resultDirectory, "summary.md");
await writeFile(reportPath, report);
process.stdout.write(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
