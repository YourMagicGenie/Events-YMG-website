// Reuse the deployed Science intake internally. Its private keys stay in Science.
const EVENTS_ORIGIN = 'https://events.ymgconsultingservices.com';
export const hasScienceIntake = env => typeof env.SCIENCE_INTAKE?.fetch === 'function';

export async function scienceConfiguration(request, env) {
  if (new URL(request.url).origin !== EVENTS_ORIGIN) return null;
  const response = await env.SCIENCE_INTAKE.fetch(new Request(`${EVENTS_ORIGIN}/api/assessment/config`, {
    headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000),
  }));
  const result = response.ok ? await response.json() : null;
  return result?.ready === true && typeof result.siteKey === 'string' && result.siteKey.length <= 200
    ? { ready: true, siteKey: result.siteKey, action: 'assessment' } : null;
}

export async function submitThroughScience(request, env, fields) {
  if (new URL(request.url).origin !== EVENTS_ORIGIN) throw new Error('Unsupported inquiry host');
  const body = new URLSearchParams({
    project: 'Live Events', name: fields.name, email: fields.email,
    company: fields.business, timeline: fields.timing,
    problem: fields.idea || 'Event inquiry — no additional message supplied.',
    'existing-data': [
      `Inquiry type: ${fields.intent}`, `Inquiry source: ${fields.source}`,
      `Event format: ${fields.format}`, `Guest count: ${fields.guests}`,
      `Indicative budget: ${fields.budget || '(not provided)'}`, `Language: ${fields.locale}`,
    ].join('\n'),
    deliverable: 'Discuss the event brief and next steps with the sender.',
    'cf-turnstile-response': fields.token,
  });
  // Host and Origin remain Events so Science verifies the token's exact frontend
  // hostname. The binding chooses the target Worker; the URL does not route publicly.
  const response = await env.SCIENCE_INTAKE.fetch(new Request(`${EVENTS_ORIGIN}/api/assessment`, {
    method: 'POST', headers: { origin: EVENTS_ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
    body, signal: AbortSignal.timeout(25000),
  }));
  const result = await response.json();
  return { accepted: response.status === 202 && result?.ok === true, status: response.status };
}
