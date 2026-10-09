// Cross-level consistency probe: same element roles must compute to the same style on every level, in both themes.
const { chromium } = require('playwright');
(async () => {
  const server = await require('./serve').start(); const BASE = server.base;
  const browser = await chromium.launch();
  const probes = ['h1', '.kicker', '.lede', '.mission h2', '.mission .hook', '.objective b', '.mmeta', 'h3.label', '.stepbtn', '.stepnav .btn', '.btn', '.btn.ghost', '.chip', '.choice', 'fieldset.q legend', '.node', 'a.lv', '#top .bname', '#xp', '#prefsBtn', '.foot .btn'];
  const props = ['fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'borderRadius', 'minHeight', 'fontFamily'];
  const out = {};
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    for (let n = 1; n <= 5; n++) {
      await page.goto(BASE + 'level' + n + '.html');
      await page.click('#resumeBtn');
      await page.evaluate(() => document.querySelector('.stepbtn:nth-child(1)') && 0);
      // visit step 3 (Check) so quiz elements exist
      await page.evaluate(() => document.querySelectorAll('#mission1 .stepbtn')[2].click());
      const r = await page.evaluate(([probes, props]) => {
        const o = {};
        probes.forEach(sel => {
          const e = document.querySelector(sel); if (!e) { o[sel] = null; return; }
          const cs = getComputedStyle(e); const row = {}; props.forEach(p => row[p] = cs[p]);
          const b = e.getBoundingClientRect(); row.h = Math.round(b.height); o[sel] = row;
        });
        return o;
      }, [probes, props]);
      out[scheme + ':' + n] = r;
    }
    await ctx.close();
  }
  await browser.close(); server.srv.close();
  let diffs = 0, checked = 0;
  for (const scheme of ['dark', 'light']) {
    for (const sel of probes) {
      const ref = out[scheme + ':1'][sel];
      for (let n = 2; n <= 5; n++) {
        const cur = out[scheme + ':' + n][sel];
        if (!ref || !cur) { if (!!ref !== !!cur) { console.log('MISSING', scheme, sel, 'L1', !!ref, 'L' + n, !!cur); diffs++; } continue; }
        checked++;
        for (const p of [...props]) { if (ref[p] !== cur[p]) { console.log('DIFF', scheme, sel, p, 'L1=' + ref[p], 'L' + n + '=' + cur[p]); diffs++; } }
      }
    }
  }
  console.log('\nconsistency: ' + checked + ' element/level comparisons, ' + diffs + ' differences');
  process.exit(diffs ? 1 : 0);
})();
