// Real-browser regression tests (Playwright + a local server so all levels share one origin).
// usage: NODE_PATH=/opt/npm-tools/node_modules node tests/browser.test.js
const { chromium } = require('playwright');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
let BASE = '';
const url = n => BASE + 'level' + n + '.html';
(async () => {
  const server = await require('./serve').start(); BASE = server.base;
  const browser = await chromium.launch();
  const mk = async (vp = { width: 1280, height: 900 }, extra = {}) => {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark', ...extra });
    const page = await ctx.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    page.on('pageerror', e => ok('no page error: ' + String(e).slice(0, 90), false));
    return [ctx, page];
  };
  const xp = p => p.evaluate(() => document.querySelector('#xp b').textContent);
  const active = p => p.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '#' + a.id + '.' + (a.className || '') + ' ' + (a.textContent || '').trim().slice(0, 40) : 'none'; });

  /* A. cross-level progress in one origin, reached by clicking the real level link */
  let [ctx, page] = await mk();
  await page.goto(url(1));
  await page.click('#resumeBtn');
  await page.click('#guess1 .chip');
  await page.waitForTimeout(250);
  ok('A1 XP appears in level 1', (await xp(page)) === '10');
  await page.click('#prefsBtn'); await page.check('input[name="pf-theme"][value="light"]'); await page.check('input[name="pf-text"][value="large"]'); await page.click('#prefsClose');
  await page.click('.levelnav a.lv[href="level3.html"]');
  await page.waitForLoadState('load');
  ok('A2 clicking the level chip opens level 3 in the same tab', page.url().endsWith('level3.html'));
  ok('A3 level 3 inherits light theme and larger text with no token', await page.evaluate(() => document.documentElement.dataset.theme === 'light' && document.documentElement.dataset.text === 'large' && location.hash === ''));
  ok('A4 level 3 shows whole-course XP from level 1', (await page.textContent('#coursebar')).includes('10 of 1000'), await page.textContent('#coursebar'));
  ok('A5 level 3 header XP is its own level (0)', (await xp(page)) === '0');
  await page.click('#resumeBtn'); await page.waitForTimeout(100);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('aimbc-course-v3')); s.levels['3'] = { got: { 'm1:sort': 20 }, cur: 0, step: {}, seen: {}, ex: {}, t: 1 }; s.last = { level: 3, t: Date.now() }; localStorage.setItem('aimbc-course-v3', JSON.stringify(s)); });
  await page.goto(url(1));
  ok('A6 coming back to level 1 resumes and still has 10 XP', (await xp(page)) === '10' && (await page.textContent('#resumeText')).includes('Welcome back'));
  ok('A7 resume card offers the other level you were last in', await page.evaluate(() => !document.querySelector('#resumeOther').hidden && /Level 3/.test(document.querySelector('#resumeOther').textContent)));
  await ctx.close();

  /* B. interruption recovery: typed text, custom exercise state, mission, step */
  [ctx, page] = await mk();
  await page.goto(url(4));
  await page.click('#resumeBtn');
  await page.evaluate(() => document.querySelector('.node[data-m="4"]').click());
  const tabs = await page.$$('#mission4 .stepbtn');
  await tabs[0].click();
  const quick = await page.$$('#l4m4-list .cand');
  // answer the quick look for the first two candidates (custom, non-form state)
  const firsts = await page.$$('#l4m4-list .chip');
  await firsts[0].click(); await firsts[2].click();
  await tabs[2].click();
  await page.fill('#l4m4-own', 'Anything with a price needs a human. Always.');
  await page.fill('#l4m4-who', 'Dana, every Friday');
  await page.waitForTimeout(400);
  await page.reload();
  ok('B1 reload lands on a welcome-back card naming mission 4 and Check', await page.evaluate(() => /Welcome back/.test(document.querySelector('#resumeText').textContent) && /Mission 4/.test(document.querySelector('#resumeText').textContent) && /Check/.test(document.querySelector('#resumeText').textContent)), await page.textContent('#resumeText'));
  ok('B2 the mission/step is already restored behind the card', await page.evaluate(() => !document.querySelector('#mission4').hidden && !document.querySelector('#m4s2').hidden));
  ok('B3 typed text came back', (await page.inputValue('#l4m4-own')) === 'Anything with a price needs a human. Always.' && (await page.inputValue('#l4m4-who')) === 'Dana, every Friday');
  ok('B4 resume card says answers are saved', (await page.textContent('#resumeText')).includes('answers are saved'), await page.textContent('#resumeText'));
  await tabs[0].click().catch(() => {});
  await page.evaluate(() => document.querySelector('#mission4 .stepbtn').click());
  const pressed = await page.$$eval('#l4m4-list .chip[aria-pressed="true"]', e => e.length);
  ok('B5 the two quick-look answers are still pressed', pressed === 2, String(pressed));
  // closing the tab (pagehide) must also save: type, then immediately navigate away
  await page.evaluate(() => document.querySelectorAll('#mission4 .stepbtn')[2].click());
  await page.fill('#l4m4-who', 'Last second edit');
  await page.goto(url(2));
  await page.goto(url(4));
  ok('B6 an edit made right before leaving survives', (await page.inputValue('#l4m4-who')) === 'Last second edit');
  await ctx.close();

  /* C. whole-mission view without losing context */
  [ctx, page] = await mk();
  await page.goto(url(1));
  await page.click('#resumeBtn');
  await page.click('#guess1 .chip');
  const visibleSteps = () => page.evaluate(() => [...document.querySelectorAll('#mission1 .mstep')].filter(s => !s.hidden).length);
  ok('C1 default is one step visible', (await visibleSteps()) === 1);
  ok('C2 a "Show the whole mission" control exists', await page.isVisible('#mission1 .viewall'));
  await page.click('#mission1 .viewall');
  ok('C3 whole mission shows all four steps', (await visibleSteps()) === 4);
  ok('C4 the earlier result is still on screen next to the explanation', await page.evaluate(() => !document.querySelector('#reveal1').hidden && !document.querySelector('#m1s1').hidden));
  ok('C5 toggle reports pressed state', (await page.getAttribute('#mission1 .viewall', 'aria-pressed')) === 'true');
  ok('C6 per-step Back/Next buttons are hidden while viewing everything', await page.evaluate(() => getComputedStyle(document.querySelector('#m1s0 .stepnav')).display === 'none'));
  await page.click('#mission1 .viewall');
  ok('C7 toggling back returns to one step', (await visibleSteps()) === 1);
  ok('C8 the guess survived the toggling', await page.evaluate(() => !document.querySelector('#reveal1').hidden));
  await page.click('#prefsBtn'); await page.check('#pf-focus');
  ok('C9 focus mode hides the toggle (focus stays minimal)', !(await page.isVisible('#mission1 .viewall')));
  await ctx.close();

  /* D. keyboard paths */
  [ctx, page] = await mk();
  await page.goto(url(1));
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  let n = 0, seen = [];
  for (let i = 0; i < 14 && n < 14; i++) { seen.push(await active(page)); await page.keyboard.press('Tab'); n++; }
  ok('D1 Tab reaches the level navigation links', seen.some(s => /lv/.test(s)), seen.join(' | '));
  ok('D2 Tab reaches the Start button', seen.some(s => /resumeBtn/.test(s)), seen.join(' | '));
  await page.focus('#resumeBtn'); await page.keyboard.press('Enter');
  ok('D3 Enter on Start moves focus to the first step heading', (await active(page)).startsWith('H3'), await active(page));
  // run a step change entirely by keyboard
  await page.focus('#m1s0 .stepnav .btn'); await page.keyboard.press('Space');
  ok('D4 Space on Next shows step 2 and focuses its heading', await page.evaluate(() => !document.querySelector('#m1s1').hidden && document.activeElement.id === 'm1s1h'));
  // Escape cancels a reset armed by keyboard
  await page.focus('#reset'); await page.keyboard.press('Enter');
  ok('D5 first Enter arms Reset level', (await page.textContent('#reset')).startsWith('Confirm'));
  await page.keyboard.press('Escape');
  ok('D6 Escape cancels, nothing erased, label back to normal', (await page.textContent('#reset')) === 'Reset Level 1' && (await page.textContent('#confirmNote')).includes('Cancelled'));
  await page.focus('#resetAll'); await page.keyboard.press('Enter');
  await page.focus('#restartM');
  await page.waitForTimeout(250);
  ok('D7 moving focus away disarms the whole-course reset', (await page.textContent('#resetAll')) === 'Reset the whole course');
  // focus ring visible
  await page.focus('#prefsBtn');
  const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2; });
  ok('D8 focused control has a visible outline', ring);
  await ctx.close();

  /* E. storage blocked in the browser: course still usable */
  [ctx, page] = await mk();
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto(url(1));
  ok('E1 blocked storage: tells the learner', (await page.textContent('#resumeText')).includes('blocking saved data'), await page.textContent('#resumeText'));
  await page.click('#resumeBtn'); await page.click('#guess1 .chip');
  ok('E2 blocked storage: XP still counts for this visit', (await xp(page)) === '10');
  await ctx.close();

  await browser.close(); server.srv.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  results.forEach(r => console.log(r[0], r[1], r[2] ? '-> ' + r[2] : ''));
  console.log('\nbrowser.test: ' + (results.length - fails.length) + '/' + results.length + ' passed');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
