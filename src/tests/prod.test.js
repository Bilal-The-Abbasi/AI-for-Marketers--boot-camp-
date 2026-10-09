// Production-like checks against site/: headers, every page loads under the CSP, no console errors, cross-level progress on one origin.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
(async () => {
  const server = await require('./serve').start(); const B = server.base;
  const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage();
  const bad = [];
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text() + (m.location().url || ''))) bad.push(m.text()); });
  page.on('pageerror', e => bad.push('pageerror ' + e.message));
  page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) bad.push('requestfailed ' + r.url()); });
  const reqs = []; page.on('request', r => reqs.push(r.url()));
  // headers
  let r = await page.goto(B); const h = r.headers();
  ok(r.status() === 200, '/ is 200'); ok(/default-src 'self'/.test(h['content-security-policy'] || ''), 'CSP present');
  ok(h['x-content-type-options'] === 'nosniff', 'nosniff'); ok(h['x-frame-options'] === 'DENY', 'frame deny');
  ok((await page.title()).length > 3, 'index has title');
  r = await page.goto(B + 'nope.html'); ok(r.status() === 404, '404 status');
  // each page loads, has 4 missions, nav links resolve
  for (let n = 1; n <= 5; n++) {
    r = await page.goto(B + 'level' + n + '.html'); ok(r.status() === 200, 'level' + n + ' 200');
    await page.waitForSelector('article.mission', { state: 'attached' });
    ok(await page.locator('article.mission').count() === 4, 'level' + n + ' has 4 missions');
    ok(await page.locator('.levelnav .lv').count() === 5, 'level' + n + ' nav has 5 chips');
    const links = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
    links.forEach(l => { if (!/^level[1-5]\.html$|^#/.test(l)) bad.push('unexpected link ' + l + ' on level' + n); });
  }
  // only same-origin + fonts requests
  reqs.forEach(u => { if (!u.startsWith(B) && !/fonts\.(googleapis|gstatic)\.com/.test(u)) bad.push('external request ' + u); });
  // cross-level progress: complete nothing, but write via storage and see the chip on another level
  await page.goto(B + 'level1.html'); await page.waitForSelector('article.mission', { state: 'attached' });
  await page.evaluate(() => { localStorage.setItem('aimbc-course-v3', JSON.stringify({ v: 3, last: 2, levels: { 1: { got: ['m1:a', 'm1:b'], cur: 1, step: 0, seen: [], ex: {}, t: Date.now() } } })); });
  await page.goto(B + 'level2.html'); await page.waitForSelector('article.mission', { state: 'attached' });
  const chip = await page.locator('.levelnav .lvp[data-n="1"]').first().textContent();
  ok(/\d/.test(chip || ''), 'level 2 shows level 1 progress chip: "' + chip + '"');
  // index and level1 share the same storage
  await page.goto(B); await page.waitForSelector('article.mission', { state: 'attached' });
  const stored = await page.evaluate(() => localStorage.getItem('aimbc-course-v3'));
  ok(!!stored, 'index.html reads the same store as level pages');
  ok(bad.length === 0, 'no errors/CSP/external: ' + JSON.stringify(bad.slice(0, 5)));
  // site in sync with the build
  for (let n = 1; n <= 5; n++) ok(fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'level' + n + '.html'), 'utf8') === fs.readFileSync(path.join(__dirname, '..', 'out', 'full', 'level' + n + '.html'), 'utf8'), 'site level' + n + ' matches build');
  ok(fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'index.html'), 'utf8') === fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'level1.html'), 'utf8'), 'index = level1');
  await browser.close(); server.srv.close();
  console.log('prod ' + pass + ' pass, ' + fail + ' fail'); process.exit(fail ? 1 : 0);
})();
