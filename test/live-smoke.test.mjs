import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { runLiveSmoke, guides, releaseAssets } from './live-smoke.mjs';

const dist = new URL('../dist/', import.meta.url);
const secure = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'" };

// Serves dist/ like the Worker would; `overrides` swaps individual responses.
const fakeSite = (overrides = {}) => async (url, options = {}) => {
  const { pathname } = new URL(url);
  if (overrides[pathname]) return overrides[pathname](options);
  if (pathname === '/api/events/config') return Response.json({ ready: true, siteKey: 'test-key', action: 'events_inquiry' }, { headers: secure });
  if (pathname === '/api/events/health') return Response.json({ ok: true, checks: { intake: 'ok', limiter: 'ok', metrics: 'ok' } }, { headers: secure });
  const file = pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : /\/[^./]+$/.test(pathname) ? `${pathname.slice(1)}.html` : pathname.slice(1);
  const target = new URL(file, dist);
  const found = !pathname.startsWith('/api/') && existsSync(target) && statSync(target).isFile();
  const body = options.method === 'HEAD' ? null : readFileSync(found ? target : new URL(pathname.startsWith('/it/') ? 'it/404.html' : '404.html', dist));
  return new Response(body, { status: found ? 200 : 404, headers: { ...secure, 'content-type': file.endsWith('.pdf') ? 'application/pdf' : 'text/html' } });
};
const run = options => runLiveSmoke({ origin: 'https://events.example.test/', log: () => {}, ...options });

test('live smoke passes when the deployment serves this release', async () => {
  await run({ fetcher: fakeSite() });
});

test('live smoke compares each guide with the deployed dist bytes, not an archived master', async () => {
  assert.equal(guides.length, 2);
  for (const guide of guides) assert.ok(existsSync(new URL(guide.path.slice(1), dist)), guide.path);
  const source = readFileSync(new URL('./live-smoke.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /docs\/collateral/);
  const stale = () => new Response('old bytes', { headers: { ...secure, 'content-type': 'application/pdf' } });
  await assert.rejects(run({ fetcher: fakeSite({ '/downloads/ymg-events-collaborazioni-location-it.pdf': stale }) }), /live bytes differ/);
  await assert.rejects(run({ fetcher: fakeSite({ '/downloads/ymg-events-venue-partnerships-en.pdf': stale }) }), /live bytes differ/);
});

test('live smoke compares every page script, stylesheet and imported module with dist bytes (#141)', async () => {
  const assets = releaseAssets();
  for (const expected of ['/assets/site-interactions.js', '/assets/inquiry-client.js', '/assets/i18n.js', '/assets/metrics-client.js', '/assets/legibility.css', '/assets/footer.css']) {
    assert.ok(assets.includes(expected), `${expected} missing from ${assets.join(', ')}`);
  }
  for (const path of assets) assert.ok(existsSync(new URL(path.slice(1), dist)), path);
  const stale = () => new Response('/* old build */', { headers: secure });
  await assert.rejects(run({ fetcher: fakeSite({ '/assets/i18n.js': stale }) }), /\/assets\/i18n\.js: live bytes differ/);
  await assert.rejects(run({ fetcher: fakeSite({ '/assets/footer.css': stale }) }), /\/assets\/footer\.css: live bytes differ/);
  const missing = () => new Response('gone', { status: 404, headers: secure });
  await assert.rejects(run({ fetcher: fakeSite({ '/assets/legibility.css': missing }) }), /legibility\.css: HTTP 404/);
});

test('each homepage must link its own guide', async () => {
  const swapped = () => new Response(readFileSync(new URL('index.html', dist), 'utf8').replace('ymg-events-venue-partnerships-en.pdf', 'ymg-events-collaborazioni-location-it.pdf'), { headers: { ...secure, 'content-type': 'text/html' } });
  await assert.rejects(run({ fetcher: fakeSite({ '/': swapped }) }), /does not link its own guide/);
});

test('production requires HTTP 200 and ready: true; only an explicit preview flag accepts disabled intake', async () => {
  const disabled = () => Response.json({ ready: false }, { status: 503, headers: secure });
  await assert.rejects(run({ fetcher: fakeSite({ '/api/events/config': disabled }) }), /production intake must be ready/);
  await run({ fetcher: fakeSite({ '/api/events/config': disabled }), allowIntakeDisabled: true });
  const dishonest = () => Response.json({ ready: false }, { status: 200, headers: secure });
  await assert.rejects(run({ fetcher: fakeSite({ '/api/events/config': dishonest }) }), /ready is not true/);
});

test('missing security headers and soft 404s fail the smoke', async () => {
  const soft404 = () => new Response('ok', { status: 200, headers: secure });
  await assert.rejects(run({ fetcher: fakeSite({ '/not-a-real-events-page': soft404 }) }), /expected 404/);
  const bare = () => new Response('ok', { status: 200 });
  await assert.rejects(run({ fetcher: fakeSite({ '/privacy': bare }) }), /nosniff/);
});

test('the production deploy command runs the bounded live smoke after upload', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['deploy:auto'], 'wrangler deploy --config wrangler.production.json && node test/live-smoke.mjs --origin https://events.ymgconsultingservices.com/ --wait 240');
});

test('post-deploy smoke requires the health report the hourly check reads (#129)', async () => {
  const degraded = () => Response.json({ ok: false, checks: { intake: 'ok', limiter: 'ok', metrics: 'unavailable' } }, { status: 503, headers: secure });
  await assert.rejects(run({ fetcher: fakeSite({ '/api/events/health': degraded }) }), /failed: metrics=unavailable/);
  const disabled = () => Response.json({ ready: false }, { status: 503, headers: secure });
  await run({ fetcher: fakeSite({ '/api/events/config': disabled, '/api/events/health': degraded }), allowIntakeDisabled: true });
});
