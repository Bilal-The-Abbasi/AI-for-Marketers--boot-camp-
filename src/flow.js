// usage: NODE_PATH=/opt/npm-tools/node_modules node flow.js
const { chromium } = require('playwright');
const path = require('path');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]); };
let BASE = '';
const url = n => BASE + 'level' + n + '.html';
(async () => {
  const server = await require('./tests/serve').start(); BASE = server.base;
  const browser = await chromium.launch();
  const mk = async (vp = { width: 1280, height: 900 }, scheme = 'dark', extra = {}) => {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, ...extra });
    const page = await ctx.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    page.on('pageerror', e => ok('no page error: ' + String(e).slice(0, 80), false));
    return [ctx, page];
  };
  const focusDesc = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.tagName + '#' + a.id + '.' + (a.className || '') + ' ' + (a.textContent || '').trim().slice(0, 40)) : 'none'; });

  /* 1. first visit, start card, focus after Start */
  let [ctx, page] = await mk();
  await page.goto(url(1));
  ok('first visit shows Start here', (await page.textContent('#resumeText')).includes('Start here'));
  ok('only mission 1 visible, only step 1 visible', await page.evaluate(() => !document.querySelector('#mission1').hidden && document.querySelector('#mission2').hidden && !document.querySelector('#m1s0').hidden && document.querySelector('#m1s1').hidden));
  await page.click('#resumeBtn');
  ok('Start moves focus to the Try it heading', (await focusDesc(page)).includes('h3') || (await focusDesc(page)).includes('H3'), await focusDesc(page));
  ok('resume card hidden after Start', await page.evaluate(() => document.querySelector('#resume').hidden));
  ok('html has lang', await page.evaluate(() => document.documentElement.lang === 'en'));
  ok('ctxbar text names mission and step', (await page.textContent('#ctxbar')).includes('Guess the Next Word') && (await page.textContent('#ctxbar')).includes('Try it'));

  /* 2. keyboard: skip link, prefs, step flow */
  await page.reload();
  await page.keyboard.press('Tab');
  ok('first Tab stop is the skip link', (await focusDesc(page)).includes('skiplink'), await focusDesc(page));
  await page.keyboard.press('Enter');
  ok('skip link moves focus to mission heading', (await focusDesc(page)).startsWith('H2'), await focusDesc(page));
  await page.focus('#prefsBtn');
  await page.keyboard.press('Enter');
  ok('Enter opens preferences', await page.evaluate(() => !document.querySelector('#prefs').hidden && document.querySelector('#prefsBtn').getAttribute('aria-expanded') === 'true'));
  ok('focus moves into the panel', await page.evaluate(() => document.querySelector('#prefs').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  ok('Escape closes preferences and returns focus', await page.evaluate(() => document.querySelector('#prefs').hidden && document.activeElement.id === 'prefsBtn'));
  // answer the mission 1 core flow by keyboard: guess a word, then next steps
  await page.focus('#guess1 .chip');
  await page.keyboard.press('Enter');
  ok('keyboard guess reveals the odds', await page.evaluate(() => !document.querySelector('#reveal1').hidden));
  await page.focus('#m1s0 .stepnav .btn');
  await page.keyboard.press('Enter');
  ok('keyboard Next step shows step 2 and focuses its heading', await page.evaluate(() => !document.querySelector('#m1s1').hidden && document.querySelector('#m1s0').hidden && document.activeElement.id === 'm1s1h'));
  await page.keyboard.press('Shift+Tab');
  const pressed = await page.evaluate(() => !!document.querySelector('.stepbtn[aria-current="step"]'));
  ok('current step tab is marked aria-current', pressed);

  /* 3. preferences */
  await page.click('#prefsBtn');
  await page.check('input[name="pf-theme"][value="light"]');
  ok('theme Light sets data-theme', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
  await page.check('input[name="pf-text"][value="large"]');
  ok('Larger text raises root font size to 20px', await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) === 20));
  await page.check('#pf-calm');
  ok('Calmer screen sets data-calm and hides the toast', await page.evaluate(() => document.documentElement.dataset.calm === 'on' && getComputedStyle(document.querySelector('#toast')).display === 'none'));
  await page.uncheck('#pf-steps');
  ok('turning off One step at a time shows all four steps', await page.evaluate(() => [...document.querySelectorAll('#mission1 .mstep')].every(s => !s.hidden)));
  ok('step nav hidden in all-steps view, mission pager shown', await page.evaluate(() => getComputedStyle(document.querySelector('#m1s0 .stepnav')).display === 'none' && getComputedStyle(document.querySelector('#mission1 .pager')).display !== 'none'));
  await page.check('#pf-steps');
  await page.uncheck('#pf-hints');
  await page.check('#pf-focus');
  ok('Focus mode hides the mission list, intro, and footer', await page.evaluate(() => ['#map', '.lede', '#resume', '#foot'].every(s => getComputedStyle(document.querySelector(s)).display === 'none')));
  ok('Focus mode closes the panel and keeps focus on the step heading', await page.evaluate(() => document.querySelector('#prefs').hidden && document.activeElement.tagName === 'H3'));
  ok('Exit focus button is visible in focus mode', await page.isVisible('#exitFocus'));
  await page.reload();
  ok('preferences persist across reload', await page.evaluate(() => { const r = document.documentElement.dataset; return r.theme === 'light' && r.text === 'large' && r.calm === 'on' && r.focus === 'on'; }));
  await page.click('#exitFocus');
  ok('Exit focus restores the mission list', await page.evaluate(() => getComputedStyle(document.querySelector('#map')).display !== 'none' && document.documentElement.dataset.focus === 'off'));
  // hints off => hint button
  await page.evaluate(() => document.querySelector('.node[data-m="1"]').click());
  const tabs = await page.$$('#mission1 .stepbtn'); await tabs[2].click();
  const wrong = await page.$('#quiz1 .q:nth-child(1) .choice:nth-child(1)'); await wrong.click();
  const msg1 = await page.textContent('#quiz1 .q:nth-child(1) .why');
  ok('Hints off: wrong answer does not show the hint, offers a button', msg1.startsWith('Not quite.') && !msg1.includes('Think about') && await page.isVisible('#quiz1 .q:nth-child(1) .hintbtn'), msg1);
  await page.click('#quiz1 .q:nth-child(1) .hintbtn');
  ok('Hint button reveals the hint', (await page.textContent('#quiz1 .q:nth-child(1) .why')).includes('Hint:'));
  await ctx.close();

  /* 4. resume + migration + restart/reset */
  [ctx, page] = await mk();
  await page.goto(url(1));
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('aimbc-level1-v1', JSON.stringify({ got: { 'm1:guess': 10, 'm1:explore': 10, 'm2:build': 20 }, cur: 1 })));
  await page.reload();
  ok('v1 progress migrates (40 XP)', (await page.textContent('#xp')).startsWith('40'), await page.textContent('#xp'));
  ok('returning visitor sees Welcome back with mission and step', (await page.textContent('#resumeText')).includes('Welcome back') && (await page.textContent('#resumeText')).includes('Brief the Machine'));
  const tabs2 = await page.$$('#mission2 .stepbtn'); await tabs2[2].click();
  await page.reload();
  const rt = await page.textContent('#resumeText');
  ok('resume names the step you left (Check)', rt.includes('step 3') && rt.includes('Check'), rt);
  await page.click('#resumeBtn');
  ok('Continue lands on the saved step', await page.evaluate(() => !document.querySelector('#m2s2').hidden && document.querySelector('#m2s2h') === document.activeElement));
  ok('node states: mission 1 in progress, mission 2 in progress', await page.evaluate(() => [...document.querySelectorAll('.node .ns')].slice(0, 2).every(e => e.textContent.startsWith('In progress'))));
  // restart this mission: arm, cancel, then confirm
  await page.click('#restartM');
  ok('first click arms the restart button', (await page.textContent('#restartM')).startsWith('Confirm'));
  await page.keyboard.press('Escape');
  ok('Escape cancels and nothing is erased', (await page.textContent('#restartM')) === 'Restart Mission 2' && (await page.textContent('#xp')).startsWith('40'));
  await page.click('#restartM'); await page.click('#restartM');
  await page.waitForLoadState('load'); await page.waitForTimeout(250);
  ok('Restart mission erased only mission 2 (20 XP left)', (await page.textContent('#xp')).startsWith('20'), await page.textContent('#xp'));
  await page.click('#reset'); await page.click('#reset');
  await page.waitForLoadState('load'); await page.waitForTimeout(250);
  ok('Reset this level clears the level', (await page.textContent('#xp')).startsWith('0 '), await page.textContent('#xp'));
  await ctx.close();

  /* 5. preferences are shared by every level with no link token */
  [ctx, page] = await mk();
  await page.goto(url(1));
  await page.click('#prefsBtn'); await page.check('input[name="pf-theme"][value="dark"]'); await page.check('input[name="pf-text"][value="large"]'); await page.check('#pf-calm'); await page.uncheck('#pf-steps');
  await page.goto(url(4));
  ok('direct navigation to level 4 keeps dark, large, calm, all steps (no hash)', await page.evaluate(() => { const r = document.documentElement.dataset; return location.hash === '' && r.theme === 'dark' && r.text === 'large' && r.calm === 'on' && r.steps === 'all'; }));
  ok('calm mode keeps the level navigation visible', await page.isVisible('.levelnav'));
  await ctx.close();

  /* 6. OS reduced-motion default */
  [ctx, page] = await mk({ width: 1280, height: 900 }, 'dark', { reducedMotion: 'reduce' });
  await page.goto(url(1));
  ok('OS reduced motion is the default', await page.evaluate(() => document.documentElement.dataset.motion === 'reduce' && document.querySelector('#pf-motion').checked));
  await ctx.close();

  /* 7. no horizontal overflow, all levels, widths, large text */
  for (const w of [320, 390, 768]) {
    for (const lg of [false, true]) {
      [ctx, page] = await mk({ width: w, height: 800 }, 'light');
      for (let n = 1; n <= 5; n++) {
        await page.addInitScript(v => { try { localStorage.setItem('aimbc-prefs-v1', JSON.stringify({ theme: 'system', text: v, steps: false })); } catch (e) {} }, lg ? 'large' : 'normal');
        await page.goto(url(n));
        let bad = [];
        for (let m = 1; m <= 4; m++) {
          await page.evaluate(m => document.querySelector('.node[data-m="' + m + '"]').click(), m);
          await page.waitForTimeout(30);
          const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
          if (o.sw > o.iw + 1) bad.push('M' + m + ' ' + o.sw + '>' + o.iw);
        }
        ok('no horizontal scroll L' + n + ' @' + w + (lg ? ' large text' : ''), bad.length === 0, bad.join(', '));
      }
      await ctx.close();
    }
  }
  await browser.close(); server.srv.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  results.forEach(r => console.log(r[0], r[1], r[2] ? '-> ' + r[2] : ''));
  console.log('\n' + (results.length - fails.length) + ' passed, ' + fails.length + ' failed');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
