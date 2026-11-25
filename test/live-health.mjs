// Independent, read-only production health check (#129). It runs from GitHub
// Actions, outside Cloudflare, so it still fails when the Analytics Engine
// alert cannot fire (metrics unbound, Worker misconfigured or intake down).
// It never submits the form and does not test mailbox delivery.
//
//   node test/live-health.mjs --origin https://events.ymgconsultingservices.com/ [--wait 120]
//
// Production must answer HTTP 200 with ok:true and metrics:"ok". On failure the
// message names the dependency that failed: intake, limiter or metrics.
import { fileURLToPath } from 'node:url';

export async function checkLiveHealth({ origin, fetcher = fetch, log = console.log }) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.pathname !== '/') throw new Error('origin must be a bare https host');
  const response = await fetcher(new URL('/api/events/health', base), {
    headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  let body = null;
  try { body = await response.json(); } catch { /* reported below */ }
  const checks = body?.checks;
  if (!checks || typeof checks !== 'object') throw new Error(`/api/events/health: HTTP ${response.status}, no dependency report`);
  const failed = Object.entries({ intake: 'ok', limiter: 'ok', metrics: 'ok' })
    .filter(([name, expected]) => checks[name] !== expected)
    .map(([name]) => `${name}=${checks[name] ?? 'missing'}`);
  if (response.status !== 200 || body.ok !== true || failed.length) {
    throw new Error(`/api/events/health: HTTP ${response.status}; failed: ${failed.join(', ') || 'ok is not true'}`);
  }
  log('Events health: intake, submission limiter and metrics are ready (mailbox delivery is not tested here).');
}

async function main(argv) {
  const value = flag => { const i = argv.indexOf(flag); return i === -1 ? undefined : argv[i + 1]; };
  const origin = value('--origin') ?? 'https://events.ymgconsultingservices.com/';
  const deadline = Date.now() + Number(value('--wait') ?? 0) * 1000;
  for (let attempt = 1; ; attempt++) {
    try {
      await checkLiveHealth({ origin });
      return;
    } catch (error) {
      if (Date.now() + 15000 > deadline) throw error;
      console.log(`Attempt ${attempt} failed (${error.message}); retrying in 15 s.`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
