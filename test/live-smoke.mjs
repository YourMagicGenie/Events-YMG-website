// Read-only release smoke for a deployed Events site (#131).
// It never submits the form and does not test mailbox delivery.
//
//   node test/live-smoke.mjs --origin https://events.ymgconsultingservices.com/ [--wait 180] [--allow-intake-disabled]
//
// --wait N retries the whole check for up to N seconds, so a run started right
// after `wrangler deploy` tolerates edge propagation but still fails if the
// finished deployment never serves this checkout's files.
// --allow-intake-disabled is only for previews that intentionally have no form
// secrets; production must answer HTTP 200 with `ready: true`.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkLiveHealth } from './live-health.mjs';

const siteRoot = new URL('../dist/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Each homepage must link its own guide; each guide must match the bytes this
// release deploys from dist/.
export const guides = [
  { page: '/', path: '/downloads/ymg-events-venue-partnerships-en.pdf' },
  { page: '/it/', path: '/downloads/ymg-events-collaborazioni-location-it.pdf' },
];

// Every same-origin script and stylesheet a page loads, plus the relative
// modules those scripts import, read from this release's dist/ (#141). A
// partial rollout or stale edge copy then fails the smoke, not just a stale PDF.
export function releaseAssets(pages = ['/', '/it/', '/privacy', '/it/privacy']) {
  const found = new Set();
  const visit = (path, text, pattern) => {
    for (const [, ref] of text.matchAll(pattern)) {
      if (/^(?:[a-z]+:)?\/\//i.test(ref) || ref.startsWith('data:')) continue;
      const resolved = new URL(ref, new URL(path, 'https://release.invalid/')).pathname;
      if (found.has(resolved)) continue;
      found.add(resolved);
      if (resolved.endsWith('.js')) visit(resolved, readFileSync(new URL(resolved.slice(1), siteRoot), 'utf8'), /^\s*import\s[^'"]*?from\s*["']([^"']+)["']/gm);
    }
  };
  for (const page of pages) {
    const file = page.endsWith('/') ? `${page.slice(1)}index.html` : `${page.slice(1)}.html`;
    visit(page, readFileSync(new URL(file, siteRoot), 'utf8'), /<(?:script\b[^>]*\bsrc|link\b[^>]*\brel="stylesheet"[^>]*\bhref)="([^"]+)"/g);
  }
  return [...found].sort();
}

const routes = [
  ['/', 200], ['/it/', 200], ['/privacy', 200], ['/it/privacy', 200],
  ['/robots.txt', 200], ['/sitemap.xml', 200],
  ['/assets/dante-david-480.webp', 200], ['/assets/event-hero-480.webp', 200], ['/assets/fonts/dm-sans-latin.woff2', 200],
  ...guides.map(guide => [guide.path, 200]),
  ['/not-a-real-events-page', 404], ['/it/not-a-real-events-page', 404], ['/api/not-a-real-endpoint', 404],
];

export async function runLiveSmoke({ origin, fetcher = fetch, allowIntakeDisabled = false, log = console.log }) {
  const base = new URL(origin);
  assert.equal(base.protocol, 'https:', 'origin must be https');
  assert.equal(base.pathname, '/', 'origin must be a bare host');
  const read = (path, options = {}) => fetcher(new URL(path, base), { signal: AbortSignal.timeout(25000), cache: 'no-store', ...options });

  for (let i = 0; i < routes.length; i += 4) {
    await Promise.all(routes.slice(i, i + 4).map(async ([path, status]) => {
      const response = await read(path);
      assert.equal(response.status, status, `${path}: HTTP ${response.status}, expected ${status}`);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${path}: nosniff header`);
      assert.equal(response.headers.get('x-frame-options'), 'DENY', `${path}: frame header`);
      if (path === '/' || path === '/it/') {
        const html = await response.text();
        for (const expected of ['partnership-download', 'dante-david-960.webp', '03044510992']) assert.ok(html.includes(expected), `${path}: missing ${expected}`);
        const ownGuide = guides.find(guide => guide.page === path).path;
        assert.ok(html.includes(`href="${ownGuide}"`), `${path}: does not link its own guide ${ownGuide}`);
        for (const other of guides.filter(guide => guide.page !== path)) assert.ok(!html.includes(`href="${other.path}"`), `${path}: links the other language's guide`);
        assert.ok(response.headers.get('content-security-policy'), `${path}: content security policy`);
        assert.ok(!html.includes('images.unsplash.com'), `${path}: hotlinked image`);
      } else if (path.endsWith('.pdf')) {
        assert.match(response.headers.get('content-type') ?? '', /application\/pdf/, `${path}: content type`);
        const expected = readFileSync(new URL(path.slice(1), siteRoot));
        assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(expected), `${path}: live bytes differ from this release's dist${path}`);
      } else {
        await response.arrayBuffer();
      }
      log(`${response.status} ${path}`);
    }));
  }

  const assets = releaseAssets();
  assert.ok(assets.length > 0, 'no scripts or stylesheets found in dist pages');
  for (let i = 0; i < assets.length; i += 4) {
    await Promise.all(assets.slice(i, i + 4).map(async path => {
      const response = await read(path);
      assert.equal(response.status, 200, `${path}: HTTP ${response.status}, expected 200`);
      // Text compares with LF line endings: a Windows checkout (autocrlf) builds
      // CRLF copies, while Workers Builds deploys LF. Any other change still fails.
      const lf = text => text.replace(/\r\n/g, '\n');
      const expected = lf(readFileSync(new URL(path.slice(1), siteRoot), 'utf8'));
      assert.equal(hash(lf(await response.text())), hash(expected), `${path}: live bytes differ from this release's dist${path}`);
    }));
  }
  log(`${assets.length} scripts and stylesheets match this release's dist bytes`);

  const config = await read('/api/events/config', { headers: { Accept: 'application/json' } });
  let body = null;
  try { body = await config.json(); } catch { /* reported below */ }
  if (allowIntakeDisabled && config.status === 503 && body?.ready === false) {
    log('Inquiry intake is disabled, as allowed for this preview.');
  } else {
    assert.equal(config.status, 200, `/api/events/config: HTTP ${config.status}; production intake must be ready`);
    assert.equal(body?.ready, true, '/api/events/config: ready is not true');
    assert.ok(body?.siteKey, '/api/events/config: no Turnstile site key');
    log('Inquiry intake ready: true (mailbox delivery is not tested here).');
    // The dependency report the hourly health workflow checks (#129).
    await checkLiveHealth({ origin: base.href, fetcher, log });
  }

  const head = await read('/', { method: 'HEAD' });
  assert.equal(head.status, 200, 'HEAD /');
  assert.equal((await head.text()).length, 0, 'HEAD / has no body');
}

async function main() {
  const option = name => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
  };
  const origin = option('--origin');
  if (!origin) throw new Error('Pass --origin https://<approved-host> explicitly. This check reads that host.');
  const waitSeconds = Number(option('--wait') ?? 0);
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0 || waitSeconds > 900) throw new Error('--wait must be 0–900 seconds.');
  const allowIntakeDisabled = process.argv.includes('--allow-intake-disabled');
  const deadline = Date.now() + waitSeconds * 1000;
  for (let attempt = 1; ; attempt += 1) {
    try {
      await runLiveSmoke({ origin, allowIntakeDisabled });
      console.log(`LIVE SMOKE PASSED for ${origin} (attempt ${attempt}); no form submissions were made.`);
      return;
    } catch (error) {
      const retry = Date.now() + 15000 <= deadline;
      console.error(`Attempt ${attempt} failed: ${error.message}${retry ? ' — retrying in 15 s' : ''}`);
      if (!retry) {
        console.error(`LIVE SMOKE FAILED for ${origin}. The deployment is live; check it and roll back if needed (deploy/README.md, "Release verification and rollback").`);
        process.exitCode = 1;
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
