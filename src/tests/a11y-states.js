// axe on special application states: prefs open, armed reset, resume card, restored mid-exercise, level complete, storage blocked.
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
(async () => {
  const server = await require('./serve').start();
  const browser = await chromium.launch();
  const out = []; let runs = 0;
  const full = n => ({ v: 3, last: { level: n, t: 1 }, levels: Object.fromEntries([1, 2, 3, 4, 5].map(l => [l, { got: Object.fromEntries([1, 2, 3, 4].map(m => ['m' + m + ':all', 50])), cur: 3, step: { 3: 2 }, seen: { '0:0': 1, '3:2': 1 }, ex: {}, t: 1 }])) });
  const mid = { v: 3, last: { level: 1, t: 1 }, levels: { 1: { got: { 'm1:guess': 10 }, cur: 0, step: { 0: 0 }, seen: { '0:0': 1 }, ex: { 'm1.f_x': 'a' }, t: 1 }, 3: { got: { 'm1:sort': 20 }, cur: 1, step: {}, seen: {}, ex: {}, t: 1 } } };
  const scenarios = [
    ['prefs-open', {}, async p => { await p.click('#prefsBtn'); }],
    ['prefs-open-with-transfer', {}, async p => { await p.click('#prefsBtn'); await p.evaluate(() => document.querySelector('.xfer').open = true); }],
    ['reset-armed', {}, async p => { await p.click('#resumeBtn'); await p.click('#reset'); }],
    ['resume-welcome-back', { store: mid }, async p => {}],
    ['restored-mid-exercise', { store: mid }, async p => { await p.click('#resumeBtn'); }],
    ['level-complete', { store: full(1), level: 1 }, async p => { await p.evaluate(() => document.querySelectorAll('.node')[3].click()); }],
    ['storage-blocked', { block: true }, async p => {}],
    ['focus-large-calm', { prefs: { focus: true, text: 'large', calm: true } }, async p => { await p.click('#resumeBtn').catch(() => {}); }],
  ];
  for (const scheme of ['dark', 'light']) {
    for (const [name, cfg, act] of scenarios) {
      for (const n of [1, 3, 5]) {
        for (const vp of [{ width: 1280, height: 900 }, { width: 320, height: 700 }]) {
          const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme });
          const page = await ctx.newPage();
          await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
          await page.addInitScript(([store, prefs, block]) => {
            if (block) { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); return; }
            try { if (store) localStorage.setItem('aimbc-course-v3', JSON.stringify(store)); localStorage.setItem('aimbc-prefs-v1', JSON.stringify(prefs || {})); } catch (e) {}
          }, [cfg.store || null, cfg.prefs || {}, !!cfg.block]);
          await page.goto(server.base + 'level' + n + '.html');
          await page.addScriptTag({ path: axePath });
          await act(page); await page.waitForTimeout(150);
          const res = await page.evaluate(async tags => { const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } }); return r.violations.map(v => v.id + ' x' + v.nodes.length + ' ' + v.nodes[0].target.join(' ') + ' :: ' + (v.nodes[0].failureSummary || '').split('\n').slice(1, 2).join('').slice(0, 160)); }, TAGS);
          runs++;
          res.forEach(r => out.push(`${name} L${n} ${vp.width}px ${scheme}: ${r}`));
          await ctx.close();
        }
      }
    }
  }
  await browser.close(); server.srv.close();
  console.log('special-state axe runs:', runs);
  if (!out.length) console.log('NO VIOLATIONS'); else [...new Set(out)].slice(0, 40).forEach(x => console.log(' - ' + x));
})().catch(e => { console.error(e); process.exit(1); });
