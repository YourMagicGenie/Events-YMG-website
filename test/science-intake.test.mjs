import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEventsApi } from '../src/form-handler.js';
const origin = 'https://events.ymgconsultingservices.com';
const fields = { name: 'Jane Doe', email: 'jane@example.org', intent: 'venue_partnership', source: 'events_website_form', business: 'Test Venue', format: 'Jazz & Cocktails', guests: '30–60', timing: 'Next June', budget: '2000 EUR', idea: 'Outdoor team event', locale: 'it', 'cf-turnstile-response': 'test-token' };
const request = (values = fields, headers = {}) => new Request(origin + '/api/events/enquiry', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '198.51.100.24', ...headers }, body: new URLSearchParams(values) });
const envFor = fetch => ({ SCIENCE_INTAKE: { fetch }, EVENTS_SUBMISSION_LIMITER: { limit: async () => ({ success: true }) } });
test('shared Science configuration returns only public sitekey and the existing assessment action', async () => {
 const env = envFor(async request => { assert.equal(request.url, origin + '/api/assessment/config'); return Response.json({ ready: true, siteKey: 'public-site-key', secret: 'must-not-be-exposed' }); });
 const response = await handleEventsApi(new Request(origin + '/api/events/config'), env);
 assert.equal(response.status, 200);
 assert.deepEqual(await response.json(), { ready: true, siteKey: 'public-site-key', action: 'assessment' });
 const preview = await handleEventsApi(new Request('https://preview.example/api/events/config'), env);
 assert.equal(preview.status, 503);
});
test('shared route preserves every event field and delegates token verification exactly once', async () => {
 let calls = 0;
 const env = envFor(async req => {
  calls++; assert.equal(req.url, origin + '/api/assessment'); assert.equal(req.headers.get('origin'), origin);
  const body = new URLSearchParams(await req.text());
  for (const [key,value] of Object.entries({ project: 'Live Events', name: fields.name, email: fields.email, company: fields.business, timeline: fields.timing, problem: fields.idea, 'cf-turnstile-response': fields['cf-turnstile-response'] })) assert.equal(body.get(key),value);
  for (const value of ['Venue partnership', 'Events website', fields.format, fields.guests, fields.budget, 'Language: it']) assert.ok(body.get('existing-data').includes(value));
  return Response.json({ ok: true }, { status: 202 });
 });
 const response = await handleEventsApi(request(), env, () => { throw new Error('No duplicate siteverify or relay call allowed'); });
 assert.equal(response.status, 202); assert.equal(calls, 1);
});
test('shared route fails closed for source rejection and outage, and keeps rate/origin/field checks', async () => {
 for (const status of [403, 503]) {
  const response = await handleEventsApi(request(), envFor(async () => Response.json({ok:false, secret:'private'}, {status})));
  assert.equal(response.status,status); assert.ok(!(await response.text()).includes('private'));
 }
 const unavailable = await handleEventsApi(request(), envFor(async () => {throw new Error('private outage');}));assert.equal(unavailable.status,503);
 let forwarded = false; const env=envFor(async()=>{forwarded=true; return Response.json({ok:true},{status:202});});
 assert.equal((await handleEventsApi(request(fields,{origin:'https://attacker.example'}),env)).status,403);
 assert.equal((await handleEventsApi(request({...fields,email:'invalid'}),env)).status,400);
 env.EVENTS_SUBMISSION_LIMITER.limit=async()=>({success:false});
 assert.equal((await handleEventsApi(request(),env)).status,429);assert.equal(forwarded,false);
});
