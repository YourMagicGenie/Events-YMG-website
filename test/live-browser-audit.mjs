import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const origin='https://events.ymgconsultingservices.com';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report=[];
try {
 for(const route of ['/', '/it/', '/privacy.html', '/it/privacy.html']) {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(); const requests=[];const errors=[];
  page.on('request',r=>requests.push(r.url()));
  page.on('console',m=>{if(/Content Security Policy|Refused to (?:load|execute|connect)/i.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{window.__eventsCsp=[];addEventListener('securitypolicyviolation',e=>window.__eventsCsp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
  const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response.status(),200);
  // Turnstile can keep background requests open; wait for meaningful page state.
  await page.waitForFunction(()=>document.fonts.status==='loaded' && (!document.querySelector('.hero-atmosphere img') || document.querySelector('.hero-atmosphere img').complete),{timeout:15000});
  await page.waitForTimeout(2000);
  const headers=await response.allHeaders();
  for(const h of ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy'])assert.ok(headers[h],route+' '+h);
  const state=await page.evaluate(()=>({csp:window.__eventsCsp,local:localStorage.length,session:sessionStorage.length,overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText,images:[...document.images].filter(i=>i.complete&&i.currentSrc).map(i=>({url:i.currentSrc,loaded:i.naturalWidth>0}))}));
  assert.equal(state.overflow,false,route+' horizontal overflow');
  assert.doesNotMatch(state.text,/enquir/i,route+' American inquiry spelling');
  assert.deepEqual(state.csp,[],route+' CSP violations');
  assert.deepEqual(errors,[],route+' CSP console errors');
  assert.equal(state.local,0);assert.equal(state.session,0);
  assert.ok(state.images.every(i=>i.loaded),route+' image failures');
  const external=[...new Set(requests.filter(u=>new URL(u).origin!==origin).map(u=>new URL(u).origin))];
  assert.ok(external.every(o=>o==='https://challenges.cloudflare.com'),route+' unexpected external origins: '+external);
  assert.ok(!requests.some(u=>/cloudflareinsights|\/cdn-cgi\/rum/.test(u)),route+' RUM injection');
  const cookies=await context.cookies();
  assert.ok(cookies.every(c=>['cf_clearance','__cf_bm','_cfuvid'].includes(c.name)),'Unexpected cookie');
  report.push({route,status:response.status(),headers:Object.fromEntries(Object.entries(headers).filter(([k])=>/content-security|strict-transport|x-frame|x-content|referrer|cache-control|content-type/.test(k))),externalOrigins:external,cookieNames:cookies.map(c=>c.name),storage:{local:state.local,session:state.session},cspViolations:state.csp,imageCount:state.images.length});
  await context.close();
 }
 await mkdir('test-results/performance',{recursive:true});
 await writeFile('test-results/performance/live-browser-audit.json',JSON.stringify({date:new Date().toISOString(),origin,report},null,2));
 console.log('Live browser audit passed: all four public routes; headers, requests, no RUM, storage, inquiry wording and images. No form submitted.');
}finally{await browser.close();}
