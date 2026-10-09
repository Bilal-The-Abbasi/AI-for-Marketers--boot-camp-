// Level 4 exercise persistence: reload mid-exercise and land on the same screen.
const { boot, ok, report } = require('./harness');
const L = 4;
const bad = (b) => b.errors.filter(e => !/Not implemented/.test(e));
const allErrors = [];
async function reload(b) { await b.flush(); const s = b.snapshot(); allErrors.push(...bad(b)); const n = boot(L, s); await n.tick(); return n; }
const ex = (b) => (b.course().levels[String(L)].ex) || {};
const xp = (b) => b.course().levels[String(L)].got;

(async () => {
  /* ---------- Mission 1: build a process, tag it, see the summary ---------- */
  let a = boot(L, {}); await a.tick();
  await a.goto(1);
  const pile = () => a.$$('#l4m1-pile .chip');
  pile()[1].click(); pile()[3].click(); pile()[0].click(); // three placed
  let b = await reload(a); await b.goto(1);
  const seqTxt = () => b.$$('#l4m1-seq li .stxt').map(x => x.textContent);
  ok('m1: three placed steps survive reload in order', seqTxt().length === 3 && seqTxt()[0].startsWith('Draft the email') && seqTxt()[1].startsWith('Write five') && seqTxt()[2].startsWith('Schedule'), seqTxt().join('|'));
  ok('m1: placed steps are disabled in the pile', b.$$('#l4m1-pile .chip').filter(x => x.disabled).length === 3);
  ok('m1: check stays disabled at 3 of 7', b.$('#l4m1-check').disabled === true);
  ok('m1: undo enabled', b.$('#l4m1-undo').disabled === false);
  // finish with the sensible order, then tag some
  b.$('#l4m1-fix').click(); await b.tick();
  ok('m1: sensible order message', /sensible order/.test(b.$('#l4m1-msg').textContent));
  let c = await reload(b); await c.goto(1);
  ok('m1: filled order + message survive', c.$$('#l4m1-seq li .stxt').length === 7 && /sensible order/.test(c.$('#l4m1-msg').textContent) && c.$('#l4m1-check').disabled === false);
  c.$('#l4m1-check').click(); await c.tick();
  const tagGroups = () => c.$$('#l4m1-seq li .chips');
  tagGroups().slice(0, 4).forEach((g, i) => g.querySelectorAll('.chip')[i % 3].click());
  await c.tick();
  let d = await reload(c); await d.goto(1);
  ok('m1: tagging stage restored (locked)', d.$('#l4m1-check').disabled === true && d.$('#l4m1-undo').disabled === true && d.$$('#l4m1-seq li.done').length === 7);
  ok('m1: tag counter 4 of 7', d.$('#l4m1-tagcount').textContent === '4 of 7 tagged', d.$('#l4m1-tagcount').textContent);
  const pressed = (bx) => bx.$$('#l4m1-seq li').map(li => Array.from(li.querySelectorAll('.chip')).findIndex(x => x.getAttribute('aria-pressed') === 'true'));
  ok('m1: pressed tags identical', JSON.stringify(pressed(d)) === JSON.stringify(pressed(c)) && pressed(d).slice(0, 4).every(x => x >= 0), JSON.stringify(pressed(d)));
  ok('m1: summary button still disabled', d.$('#l4m1-sumbtn').disabled === true && d.$('#l4m1-sum').hidden === true);
  ok('m1: ask line is step 2', /^Step 2 of 3/.test(d.$('#l4m1-ask').textContent));
  d.$$('#l4m1-seq li .chips').slice(4).forEach(g => g.querySelectorAll('.chip')[1].click());
  d.$('#l4m1-sumbtn').click(); await d.tick(30);
  const sumText = d.$('#l4m1-sum').textContent;
  let e = await reload(d); await e.goto(1);
  ok('m1: summary visible after reload with same text', e.$('#l4m1-sum').hidden === false && e.$('#l4m1-sum').textContent === sumText);
  ok('m1: bars painted without waiting', e.$$('#l4m1-sum .track i').every(i => /%$/.test(i.style.width)), e.$$('#l4m1-sum .track i').map(i => i.style.width).join(','));
  ok('m1: ask line is step 3', /^Step 3 of 3/.test(e.$('#l4m1-ask').textContent));
  ok('m1: 30 XP held, no toast on restore', xp(e)['m1:order'] === 10 && xp(e)['m1:sum'] === 10 && e.$$('.toast').filter(t => /XP|complete/.test(t.textContent)).length === 0, e.$$('.toast').map(t => t.textContent).join('|'));
  e.$('#l4m1-reset').click(); await e.tick();
  ok('m1: Start over still works after restore', e.$$('#l4m1-seq li.empty').length === 1 && e.$$('#l4m1-pile .chip').every(x => !x.disabled) && e.$('#l4m1-sum').hidden === true);

  /* ---------- Mission 2: agent run, 2 of 3 decisions ---------- */
  a = boot(L, {}); await a.tick(); await a.goto(2);
  a.$('#l4m2-start').click(); await a.tick();
  a.$$('#l4m2-log .scene')[0].querySelectorAll('.choice')[1].click(); await a.tick();
  a.$$('#l4m2-log .scene')[1].querySelectorAll('.choice')[2].click(); await a.tick();
  const logSig = (x) => x.$$('#l4m2-log .scene').map(s => s.querySelector('h3').textContent + '/' + Array.from(s.querySelectorAll('.choice')).map(c => c.className + c.disabled).join(',') + '/' + (s.querySelector('.reveal') ? s.querySelector('.reveal').hidden + s.querySelector('.reveal').textContent : s.textContent)).join('||');
  const before2 = logSig(a);
  b = await reload(a); await b.goto(2);
  ok('m2: three scenes shown (2 decided, 1 pending)', b.$$('#l4m2-log .scene').length === 3);
  ok('m2: identical log after reload', logSig(b) === before2);
  ok('m2: Run button stays disabled', b.$('#l4m2-start').disabled === true && b.$('#l4m2-replay').hidden === true);
  ok('m2: stage strip on Report (third scene)', b.$$('#l4m2-stages li.on').length === 1 && b.$$('#l4m2-stages li.on')[0].textContent === 'Report', b.$$('#l4m2-stages li.on').map(x => x.textContent).join());
  ok('m2: pending scene choices still clickable', b.$$('#l4m2-log .scene')[2].querySelectorAll('.choice')[1].disabled === false);
  b.$$('#l4m2-log .scene')[2].querySelectorAll('.choice')[1].click(); await b.tick();
  ok('m2: finishing after restore works and shows summary', b.$$('#l4m2-log .scene').length === 4 && b.$('#l4m2-replay').hidden === false && xp(b)['m2:done'] === 6);
  const fin = logSig(b);
  c = await reload(b); await c.goto(2);
  ok('m2: finished run restores with replay visible', logSig(c) === fin && c.$('#l4m2-replay').hidden === false && c.$('#l4m2-start').disabled === true);
  ok('m2: final stage shows all done', c.$$('#l4m2-stages li.done').length === 5, c.$$('#l4m2-stages li.done').length);
  ok('m2: no toast on restore', c.$$('.toast').filter(t => /XP|complete/.test(t.textContent)).length === 0);
  c.$('#l4m2-replay').click(); await c.tick();
  ok('m2: replay after restore resets', c.$$('#l4m2-log .scene').length === 0 && c.$('#l4m2-start').disabled === false);
  c.$('#l4m2-start').click(); await c.tick();
  ok('m2: can run again', c.$$('#l4m2-log .scene').length === 1);
  d = await reload(c); await d.goto(2);
  ok('m2: replay mid-run (0 decisions) restored', d.$$('#l4m2-log .scene').length === 1 && d.$('#l4m2-start').disabled === true);

  /* ---------- Mission 3: automation settings and test ---------- */
  a = boot(L, {}); await a.tick(); await a.goto(3);
  const g = (x, gi, oi) => x.$$('#l4m3-ctl .grp')[gi].querySelectorAll('.chip')[oi];
  g(a, 0, 2).click(); g(a, 1, 1).click(); g(a, 3, 1).click(); await a.tick();
  a.$('#l4m3-test').click(); await a.tick();
  const m3sig = (x) => [x.$$('#l4m3-ctl .chip').map(c => c.getAttribute('aria-pressed')).join(), x.$('#l4m3-chain').textContent, x.$$('#l4m3-meter i.on').length, x.$('#l4m3-mlabel').textContent, x.$('#l4m3-risks').textContent, x.$('#l4m3-msg').textContent, x.$('#l4m3-testout').textContent, x.$('#l4m3-testmsg').textContent].join('##');
  const s3 = m3sig(a);
  b = await reload(a); await b.goto(3);
  ok('m3: chain, meter, risks, test output all identical', m3sig(b) === s3);
  ok('m3: test list has 5 rows', b.$$('#l4m3-testout li').length === 5);
  ok('m3: 3 of 5 chips pressed correct', g(b, 0, 2).getAttribute('aria-pressed') === 'true' && g(b, 3, 1).getAttribute('aria-pressed') === 'true' && g(b, 0, 0).getAttribute('aria-pressed') === 'false');
  ok('m3: no toast on restore', b.$$('.toast').filter(t => /XP|complete/.test(t.textContent)).length === 0, b.$$('.toast').map(t => t.textContent).join('|'));
  g(b, 4, 1).click(); await b.tick();
  ok('m3: changing a setting after restore clears stale test', b.$$('#l4m3-testout li').length === 0 && /Settings changed/.test(b.$('#l4m3-testmsg').textContent));
  c = await reload(b); await c.goto(3);
  ok('m3: cleared-test state also restores', c.$$('#l4m3-testout li').length === 0 && /Settings changed/.test(c.$('#l4m3-testmsg').textContent));
  // low-risk state with XP already held: reload must not toast
  g(c, 1, 1).click(); g(c, 2, 1).click(); await c.tick();
  ok('m3: low risk reached awards 15', xp(c)['m3:low'] === 15);
  d = await reload(c); await d.goto(3);
  ok('m3: low-risk restore, no toast, meter low', d.$$('.toast').filter(t => /XP|complete/.test(t.textContent)).length === 0 && /^Risk [01] of 5/.test(d.$('#l4m3-mlabel').textContent), d.$('#l4m3-mlabel').textContent);

  /* ---------- Mission 4: trust test ---------- */
  a = boot(L, {}); await a.tick(); await a.goto(4);
  const q = (x, i, k) => x.$$('#l4m4-list .cand')[i].querySelectorAll('.chips')[0].querySelectorAll('.chip')[k];
  q(a, 0, 0).click(); q(a, 1, 0).click(); q(a, 2, 1).click(); await a.tick();
  const m4sig = (x) => [x.$$('#l4m4-list .chip').map(c => c.getAttribute('aria-pressed') + c.disabled).join(), x.$('#l4m4-count').textContent, x.$('#l4m4-lock').disabled, x.$('#l4m4-ask').textContent, x.$('#l4m4-msg').textContent, x.$('#l4m4-sum').hidden, x.$('#l4m4-part2').hidden, x.$$('#l4m4-list .res').length, x.$('#l4m4-pre').textContent, x.$('#l4m4-copy').disabled, x.$('#l4m4-copynote').textContent].join('##');
  b = await reload(a); await b.goto(4);
  ok('m4: round 1 partial scores restored', m4sig(b) === m4sig(a) && b.$('#l4m4-count').textContent === '3 of 5 scored' && b.$('#l4m4-lock').disabled === true);
  q(b, 3, 1).click(); q(b, 4, 0).click(); await b.tick();
  ok('m4: lock enabled at 5', b.$('#l4m4-lock').disabled === false);
  c = await reload(b); await c.goto(4);
  ok('m4: lock button enabled after reload with 5 scored', c.$('#l4m4-lock').disabled === false && c.$('#l4m4-count').textContent === '5 of 5 scored');
  c.$('#l4m4-lock').click(); await c.tick();
  const rub = (x, i) => x.$$('#l4m4-list .cand')[i].querySelectorAll('.chips')[1].querySelectorAll('.chip');
  rub(c, 0)[0].click(); rub(c, 0)[1].click(); rub(c, 1)[2].click(); rub(c, 3)[0].click(); await c.tick();
  d = await reload(c); await d.goto(4);
  ok('m4: round 2 (locked) restored', m4sig(d) === m4sig(c) && /^Round 2, the careful/.test(d.$('#l4m4-ask').textContent));
  ok('m4: quick chips disabled, careful chips live', q(d, 0, 0).disabled === true && rub(d, 0)[0].disabled === false && !!d.$$('#l4m4-actions .btn')[1]);
  ok('m4: careful ticks pressed as left', rub(d, 0)[0].getAttribute('aria-pressed') === 'true' && rub(d, 0)[1].getAttribute('aria-pressed') === 'true' && rub(d, 0)[2].getAttribute('aria-pressed') === 'false' && rub(d, 1)[2].getAttribute('aria-pressed') === 'true' && rub(d, 3)[0].getAttribute('aria-pressed') === 'true');
  d.$$('#l4m4-actions .btn')[1].click(); await d.tick();
  const pc = (x, i) => x.$$('#l4m4-part2 .polcard')[i].querySelectorAll('.chip');
  pc(d, 0)[0].click(); pc(d, 2)[2].click(); pc(d, 4)[1].click(); // touch 3 of 6
  const sel = d.$('#l4m4-rate'); sel.value = '1 in 10'; d.fire(sel, 'change');
  d.type(d.$('#l4m4-own'), 'No sending on weekends.'); await d.tick();
  const cardBefore = d.$('#l4m4-pre').textContent;
  e = await reload(d); await e.goto(4);
  ok('m4: compare results and summary restored', m4sig(e) === m4sig(d) && e.$('#l4m4-sum').hidden === false && e.$$('#l4m4-list .res').length === 5);
  ok('m4: policy cards present with pressed rules', e.$$('#l4m4-part2 .polcard').length === 6 && pc(e, 0)[0].getAttribute('aria-pressed') === 'true' && pc(e, 2)[2].getAttribute('aria-pressed') === 'true' && pc(e, 4)[1].getAttribute('aria-pressed') === 'true' && pc(e, 1)[1].getAttribute('aria-pressed') === 'true');
  ok('m4: policy feedback restored for touched cards only', e.$$('#l4m4-part2 .polcard .msg').map(m => m.textContent !== '').join() === 'true,false,true,false,true,false', e.$$('#l4m4-part2 .polcard .msg').map(m => m.textContent !== '').join());
  ok('m4: rules card text identical (rate + own rule)', e.$('#l4m4-pre').textContent === cardBefore && /1 in 10/.test(cardBefore) && /weekends/.test(cardBefore), e.$('#l4m4-pre').textContent);
  ok('m4: copy still disabled with 3 of 6', e.$('#l4m4-copy').disabled === true);
  ok('m4: no toast on restore', e.$$('.toast').filter(t => /XP|complete/.test(t.textContent)).length === 0, e.$$('.toast').map(t => t.textContent).join('|'));
  pc(e, 1)[1].click(); pc(e, 3)[0].click(); pc(e, 5)[0].click(); await e.tick();
  ok('m4: finishing policy after restore awards and enables copy', e.$('#l4m4-copy').disabled === false && xp(e)['m4:policy'] === 5);
  let f = await reload(e); await f.goto(4);
  ok('m4: full policy state restores with copy enabled', f.$('#l4m4-copy').disabled === false && f.$('#l4m4-pre').textContent === e.$('#l4m4-pre').textContent && f.$$('#l4m4-part2 .polcard .msg').every(m => m.textContent !== ''));

  /* ---------- (a) default over saved state does not lose it ---------- */
  // seed the other three missions on top of the finished mission 4 state
  let sd = boot(L, f.snapshot()); await sd.tick();
  await sd.goto(1); sd.$('#l4m1-fix').click(); await sd.tick();
  await sd.goto(2); sd.$('#l4m2-start').click(); sd.$$('#l4m2-log .scene')[0].querySelectorAll('.choice')[0].click(); await sd.tick();
  await sd.goto(3); sd.$$('#l4m3-ctl .grp')[3].querySelectorAll('.chip')[1].click(); sd.$('#l4m3-test').click(); await sd.tick();
  await sd.flush();
  const snap = sd.snapshot(); allErrors.push(...bad(sd));
  let h = boot(L, snap); await h.tick();
  await h.goto(2); await h.goto(1); await h.goto(4);
  await h.flush();
  const ex2 = ex(h);
  ok('(a) re-saving a restored page keeps every exercise id', ['m1.flow', 'm2.run', 'm3.chain', 'm4.trust'].every(k => k in ex2), Object.keys(ex2).join());
  ok('(a) state objects equal the earlier saved ones', JSON.stringify(ex2['m4.trust']) === JSON.stringify(ex(sd)['m4.trust']) && JSON.stringify(ex2['m3.chain']) === JSON.stringify(ex(sd)['m3.chain']));

  /* ---------- (b) corrupt saved values ---------- */
  const garbage = [null, 7, 'x', [], [1, 2], { placed: 'zz', locked: 'yes', tags: 5, summed: 1 }, { started: true, picks: ['a', 9, -1] }, { sel: { trigger: 'nope', filter: 9 }, tested: 'maybe', msg: { a: 1 } }, { quick: { 0: 'x', 1: 5 }, locked: true, careful: 'zz', compared: true, pol: { t1: 9 }, rate: 42 }];
  const ids = ['m1.flow', 'm2.run', 'm3.chain', 'm4.trust'];
  let thrown = 0, usable = 0, runs = 0;
  for (const id of ids) {
    for (const gv of garbage) {
      const st = JSON.parse(JSON.stringify(snap));
      const course = JSON.parse(st['aimbc-course-v3']); course.levels[String(L)].ex[id] = gv; st['aimbc-course-v3'] = JSON.stringify(course);
      const x = boot(L, st); await x.tick(); runs++;
      const errs = bad(x); if (errs.length) { thrown++; console.log('ERR', id, JSON.stringify(gv), errs[0]); }
      allErrors.push(...errs);
      // exercise still usable
      const mi = +id[1];
      await x.goto(mi);
      try {
        if (mi === 1) { x.$('#l4m1-reset').click(); x.$$('#l4m1-pile .chip')[0].click(); if (x.$$('#l4m1-seq li:not(.empty)').length === 1) usable++; }
        if (mi === 2) { x.$('#l4m2-replay').hidden ? 0 : x.$('#l4m2-replay').click(); const sb = x.$('#l4m2-start'); if (sb.disabled) { x.$('#l4m2-replay').click(); } sb.click(); if (x.$$('#l4m2-log .scene').length >= 1) usable++; }
        if (mi === 3) { x.$$('#l4m3-ctl .grp')[0].querySelectorAll('.chip')[1].click(); x.$('#l4m3-test').click(); if (x.$$('#l4m3-testout li').length === 5) usable++; }
        if (mi === 4) { const cs = x.$$('#l4m4-list .cand'); if (cs[0].querySelector('.chip') && x.$('#l4m4-count')) { x.$$('#l4m4-list .cand')[0].querySelector('.chip').disabled ? usable++ : (x.$$('#l4m4-list .cand')[0].querySelector('.chip').click(), usable++); } }
      } catch (er) { console.log('USE ERR', id, JSON.stringify(gv), er.message); }
      allErrors.push(...bad(x));
    }
  }
  ok('(b) corrupt values never throw (' + runs + ' boots)', thrown === 0);
  ok('(b) exercise usable after every corrupt value', usable === runs, usable + '/' + runs);

  /* ---------- (c) Restart Mission N clears only that mission ---------- */
  const exAll = JSON.parse(snap['aimbc-course-v3']).levels[String(L)].ex;
  ok('(c) setup: all four missions have saved state', ids.every(k => k in exAll));
  let r = boot(L, snap); await r.tick();
  await r.goto(3);
  r.$('#restartM').click(); r.$('#restartM').click(); await r.tick(50);
  const after = ex(r), gotAfter = xp(r);
  ok('(c) mission 3 exercise state gone', !Object.keys(after).some(k => k.indexOf('m3.') === 0), Object.keys(after).join());
  ok('(c) other missions keep exercise state', ['m1.flow', 'm2.run', 'm4.trust'].every(k => k in after));
  ok('(c) other missions keep XP', gotAfter['m4:policy'] === 5 && gotAfter['m2:d1'] === 8 && !gotAfter['m3:test']);
  let r2 = boot(L, r.snapshot()); await r2.tick(); await r2.goto(3);
  ok('(c) after restart, mission 3 is back to defaults', r2.$$('#l4m3-testout li').length === 0 && g(r2, 0, 0).getAttribute('aria-pressed') === 'true' && /Risk 5 of 5/.test(r2.$('#l4m3-mlabel').textContent), r2.$('#l4m3-mlabel').textContent);
  await r2.goto(4);
  ok('(c) mission 4 still restored after mission 3 restart', r2.$('#l4m4-copy').disabled === false);
  allErrors.push(...bad(r), ...bad(r2));

  ok('no unexpected script errors in any boot', allErrors.length === 0, allErrors.slice(0, 3).join(' | '));
  report('persist-level4.test');
})();
