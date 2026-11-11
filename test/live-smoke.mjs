import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const argument = process.argv.indexOf('--origin');
if (argument < 0 || !process.argv[argument + 1]) throw new Error('Pass --origin https://<approved-host> explicitly. This check reads that host.');
const origin = new URL(process.argv[argument + 1]);
assert.equal(origin.protocol, 'https:');
assert.equal(origin.pathname, '/');
const read = (path, options = {}) => fetch(new URL(path, origin), { signal: AbortSignal.timeout(25000), ...options });
const routes = [['/', 200], ['/it/', 200], ['/privacy.html', 200], ['/it/privacy.html', 200], ['/robots.txt', 200], ['/sitemap.xml', 200], ['/assets/dante-david-480.webp', 200], ['/assets/event-hero-480.webp', 200], ['/assets/fonts/dm-sans-latin.woff2', 200], ['/downloads/ymg-events-collaborazioni-location-it.pdf', 200], ['/not-a-real-events-page', 404], ['/api/not-a-real-endpoint', 404]];
for (let i = 0; i < routes.length; i += 4) {
  await Promise.all(routes.slice(i, i + 4).map(async ([path, status]) => {
    const response = await read(path);
    assert.equal(response.status, status, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    if (path === '/' || path === '/it/') {
      const html = await response.text();
      for (const expected of ['partnership-download', 'dante-david-960.webp', '03044510992']) assert.ok(html.includes(expected), `${path}: ${expected}`);
      assert.ok(response.headers.get('content-security-policy'), path);
      assert.ok(!html.includes('images.unsplash.com'), path);
    } else if (path.endsWith('.pdf')) {
      assert.match(response.headers.get('content-type'), /application\/pdf/);
      const hash = bytes => createHash('sha256').update(bytes).digest('hex');
      const approved = readFileSync(new URL('../docs/collateral/venue-partnership-one-pager-it.pdf', import.meta.url));
      assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(approved), 'live PDF matches approved master');
    }
    console.log(`${response.status} ${path}`);
  }));
}
const config = await read('/api/events/config');
const body = await config.json();
assert.ok((config.status === 503 && body.ready === false) || (config.status === 200 && body.ready === true), 'configuration responds honestly');
console.log(`Enquiry configured: ${body.ready}; this does not test mailbox delivery.`);
const head = await read('/', { method: 'HEAD' });
assert.equal(head.status, 200);
assert.equal((await head.text()).length, 0);
console.log('Live read-only smoke passed; no form submissions were made.');
