// usage: NODE_PATH=/opt/npm-tools/node_modules node a11y.js LEVEL [mode]   mode: default | focus | all | calm | large | whole
const { chromium } = require('playwright');
const path = require('path');
const n = process.argv[2] || '1', mode = process.argv[3] || 'default';
const axePath = require.resolve('axe-core');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
(async () => {
  const server = await require('./tests/serve').start();
  const browser = await chromium.launch();
  const agg = new Map();
  let runs = 0;
  const all4 = [
    ['desktop-dark', { width: 1280, height: 900 }, 'dark'], ['desktop-light', { width: 1280, height: 900 }, 'light'],
    ['mobile-dark', { width: 390, height: 844 }, 'dark'], ['mobile-light', { width: 390, height: 844 }, 'light'],
  ];
  const configs = (mode === 'default') ? all4 : [all4[1], ['phone320-dark', { width: 320, height: 700 }, 'dark']];
  const seedPrefs = { calm: { calm: true }, large: { text: 'large' }, whole: {} }[mode] || {};
  for (const [name, vp, scheme] of configs) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(p => { try { localStorage.setItem('aimbc-prefs-v1', JSON.stringify(p)); } catch (e) {} }, seedPrefs);
    await page.goto(server.base + 'level' + n + '.html');
    await page.addScriptTag({ path: axePath });
    if (mode === 'focus') { await page.click('#prefsBtn'); await page.check('#pf-focus'); }
    if (mode === 'whole') { await page.evaluate(() => document.querySelectorAll('.viewall').forEach(b => b.click())); }
    if (mode === 'all') { await page.click('#prefsBtn'); await page.uncheck('#pf-steps'); await page.click('#prefsClose'); }
    const audit = async (label) => {
      const res = await page.evaluate(async (tags) => {
        const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
        return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(x => ({ t: x.target.join(' '), s: (x.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 220) })), count: v.nodes.length }));
      }, TAGS);
      runs++;
      for (const v of res) {
        const key = v.id;
        if (!agg.has(key)) agg.set(key, { v, where: new Set(), total: 0 });
        const a = agg.get(key); a.total += v.count; if (a.where.size < 6) a.where.add(name + ' ' + label + ' :: ' + v.nodes[0].t + ' :: ' + v.nodes[0].s);
      }
    };
    for (let m = 0; m < 4; m++) {
      if (mode === 'focus') { /* no map in focus mode: navigate by the Next mission buttons later */ }
      else { await page.click('.node[data-m="' + (m + 1) + '"]'); }
      for (let k = 0; k < 4; k++) {
        const tabs = await page.$$('#mission' + (m + 1) + ' .stepbtn');
        if (mode !== 'focus' || m === 0) { if (tabs[k]) await tabs[k].click(); }
        await page.waitForTimeout(60);
        await audit('M' + (m + 1) + ' step' + (k + 1) + ' initial');
        // interact: click enabled buttons in the visible section
        const sec = await page.$('#m' + (m + 1) + 's' + k);
        for (let pass = 0; pass < 2; pass++) {
          const btns = await sec.$$('button:not([disabled])');
          for (const b of btns) {
            const skip = await b.evaluate(e => e.dataset.smoke === 'skip' || !!e.closest('.stepnav') || !!e.closest('.mtabs') || e.id === 'reset' || e.id === 'restartM');
            if (skip) continue;
            await b.click({ timeout: 1500, force: true }).catch(() => {});
          }
        }
        await page.waitForTimeout(60);
        await audit('M' + (m + 1) + ' step' + (k + 1) + ' after-interaction');
      }
      if (mode === 'focus' && m < 3) { await page.evaluate(() => { const b = document.querySelector('.mission:not([hidden]) .mstep:last-of-type .stepnav .btn'); if (b) b.click(); }); }
    }
    if (errs.length) console.log('PAGE ERRORS', name, errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close(); server.srv.close();
  console.log('level', n, 'mode', mode, 'axe runs:', runs);
  if (!agg.size) console.log('NO VIOLATIONS');
  for (const [id, a] of agg) {
    console.log(`- ${id} [${a.v.impact}] ${a.v.help} (total nodes ${a.total})`);
    for (const w of a.where) console.log('    ' + w);
  }
})().catch(e => { console.error(e); process.exit(1); });
