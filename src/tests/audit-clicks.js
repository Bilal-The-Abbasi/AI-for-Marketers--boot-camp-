// Interaction audit: which step of each mission earns XP, and how many navigation clicks a learner needs.
const { boot } = require('./harness');
(async () => {
  const rows = [];
  for (let n = 1; n <= 5; n++) {
    const p = boot(n, {}); await p.tick();
    for (let m = 1; m <= 4; m++) {
      await p.goto(m, 0);
      const art = p.$('#mission' + m);
      const per = [];
      for (let k = 0; k < 4; k++) {
        p.$$('.stepbtn', art)[k].click(); await p.tick();
        const sec = p.$('#m' + m + 's' + k);
        const before = +p.$('#xp b').textContent;
        p.$$('input[type=text],input:not([type]),textarea', sec).forEach(el => { if (!el.value) p.type(el, 'sample'); });
        p.$$('select', sec).forEach(el => { if (el.options.length > 1) { el.selectedIndex = el.options.length - 1; p.fire(el, 'change'); } });
        p.$$('input[type=checkbox]', sec).forEach(el => { el.checked = true; p.fire(el, 'change'); });
        for (let pass = 0; pass < 8; pass++) {
          const btns = p.$$('button', sec).filter(b => !b.disabled && b.dataset.smoke !== 'skip' && !b.closest('.stepnav') && !b.closest('.mtabs'));
          if (!btns.length) break;
          for (const b of btns) { try { b.click(); } catch (e) {} await p.tick(5); }
        }
        per.push(+p.$('#xp b').textContent - before);
      }
      rows.push({ level: n, mission: m, xpByStep: per, stepsWithXp: per.filter(x => x > 0).length, navClicksMin: per.reduce((c, x, i) => c, 0) });
    }
  }
  console.log('level mission  XP earned in step [Try, Why, Check, Deeper]');
  rows.forEach(r => console.log('  L' + r.level + ' M' + r.mission + '   ' + JSON.stringify(r.xpByStep)));
  const anyWhy = rows.filter(r => r.xpByStep[1] > 0).length, anyDeep = rows.filter(r => r.xpByStep[3] > 0).length;
  const both = rows.filter(r => r.xpByStep[0] > 0 && r.xpByStep[2] > 0).length;
  console.log('\nmissions: ' + rows.length + '; XP in Try it AND Check: ' + both + '; XP in Why it works: ' + anyWhy + '; XP in Go deeper: ' + anyDeep);
  process.exit(0);
})();
