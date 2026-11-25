import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkLiveHealth } from './live-health.mjs';

const origin = 'https://events.example.test/';
const answer = (body, status = 200) => async url => {
  assert.equal(new URL(url).pathname, '/api/events/health');
  return typeof body === 'string' ? new Response(body, { status }) : Response.json(body, { status });
};
const check = fetcher => checkLiveHealth({ origin, fetcher, log: () => {} });

test('live health passes only when intake, limiter and metrics are all ok', async () => {
  await check(answer({ ok: true, checks: { intake: 'ok', limiter: 'ok', metrics: 'ok' } }));
  await assert.rejects(check(answer({ ok: true, checks: { intake: 'ok', limiter: 'ok', metrics: 'disabled' } })), /failed: metrics=disabled/,
    'production alerting depends on metrics, so disabled telemetry fails the check');
});

test('live health names each failed dependency', async () => {
  await assert.rejects(check(answer({ ok: false, checks: { intake: 'upstream_timeout', limiter: 'missing', metrics: 'ok' } }, 503)),
    /HTTP 503; failed: intake=upstream_timeout, limiter=missing/);
  await assert.rejects(check(answer('<html>Worker error</html>', 500)), /HTTP 500, no dependency report/);
  await assert.rejects(check(answer({ ok: false }, 404)), /no dependency report/);
  await assert.rejects(checkLiveHealth({ origin: 'http://events.example.test/', fetcher: answer({}) }), /bare https host/);
});

test('the hourly health workflow is scheduled, read-only and not a second required check', () => {
  const workflow = readFileSync(new URL('../.github/workflows/production-health.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(workflow, /^  schedule:\n    - cron: "23 \* \* \* \*"/m);
  assert.match(workflow, /^  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /pull_request|push:/, 'only the checks workflow runs on pull requests');
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /^  test:/m, 'no job named test');
  assert.match(workflow, /node test\/live-health\.mjs --origin https:\/\/events\.ymgconsultingservices\.com\//);
  assert.doesNotMatch(workflow, /secrets\./, 'the health check needs no credentials');
});
