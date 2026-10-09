// Level 5 exercise persistence: mid-exercise state survives a reload.
const { boot, ok, report } = require('./harness');
const L = 5;
async function reload(h) { await h.tick(150); await h.flush(); const s = h.snapshot(); const n = boot(L, s); await n.tick(60); return n; }
function exOf(h) { const c = h.course(); return (c && c.levels && c.levels[String(L)] && c.levels[String(L)].ex) || {}; }
const all = [];
const mk = async (store) => { const h = boot(L, store || {}); all.push(h); await h.tick(60); return h; };
const real = (h) => h.errors.filter(e => e.indexOf('Not implemented') < 0);

(async () => {
  /* ---------- Mission 1: placement ---------- */
  let a = await mk();
  await a.goto(1);
  const cards = () => a.$$('#l5m1-cards .ucard');
  const qb = (i, k) => a.$$('.qb', cards()[i])[k];
  qb(0, 0).click(); // right: quick
  qb(1, 0).click(); // wrong: big bet placed as quick
  qb(2, 2).click(); // wrong: big bet placed as nice
  await a.tick();
  const aTrk = a.$('#l5m1-trk').textContent;
  let b = await reload(a); all.push(b);
  await b.goto(1);
  const bc = () => b.$$('#l5m1-cards .ucard');
  ok('m1 tracker restored', b.$('#l5m1-trk').textContent === aTrk && aTrk === 'Placed 3 of 6', b.$('#l5m1-trk').textContent);
  ok('m1 placed cards show buttons disabled', [0, 1, 2].every(i => b.$$('.qb', bc()[i]).every(x => x.disabled)));
  ok('m1 right answer marked ok on card 0', b.$$('.qb', bc()[0])[0].classList.contains('ok'));
  ok('m1 wrong answer marked no and truth marked ok on card 1', b.$$('.qb', bc()[1])[0].classList.contains('no') && b.$$('.qb', bc()[1])[1].classList.contains('ok'));
  ok('m1 feedback text restored', /We put this in Big bet/.test(b.$$('.fb', bc()[1])[0].textContent) && /Same as our read/.test(b.$$('.fb', bc()[0])[0].textContent));
  ok('m1 next card visible, later cards still hidden', !bc()[3].hidden && bc()[4].hidden && bc()[5].hidden);
  ok('m1 map cells hold 3 items', b.$$('#l5m1-grid .qitem').length === 3);
  ok('m1 "Our read" note restored on wrong placement', b.$$('#l5m1-grid .qitem i').length === 2);
  ok('m1 unplaced card still usable', (() => { b.$$('.qb', bc()[3])[3].click(); return /Placed 4 of 6/.test(b.$('#l5m1-trk').textContent); })());
  ok('m1 no toast on restore', (await mk(b.snapshot())).$('#toast').textContent === '');

  // finish placement, picks, lock
  for (let i = 4; i < 6; i++) b.$$('.qb', bc()[i])[0].click();
  const chips = () => b.$$('#l5m1-picks .chip');
  chips()[0].click(); chips()[4].click();
  b.$('#l5m1-why').value = 'Because they are safe.'; b.fire(b.$('#l5m1-why'), 'input');
  await b.tick();
  let c = await reload(b); all.push(c);
  await c.goto(1);
  ok('m1 all-placed tracker restored', c.$('#l5m1-trk').textContent === 'All six placed. Now pick your top three.', c.$('#l5m1-trk').textContent);
  ok('m1 chips pressed state restored', c.$$('#l5m1-picks .chip').map(x => x.getAttribute('aria-pressed')).join() === 'true,false,false,false,true,false', c.$$('#l5m1-picks .chip').map(x => x.getAttribute('aria-pressed')).join());
  ok('m1 pick message restored', c.$('#l5m1-pickmsg').textContent === '2 of 3 chosen.', c.$('#l5m1-pickmsg').textContent);
  ok('m1 why text restored', c.$('#l5m1-why').value === 'Because they are safe.');
  c.$$('#l5m1-picks .chip')[1].click();
  ok('m1 pick count continues from restored 2', c.$('#l5m1-pickmsg').textContent === '3 of 3 chosen.');
  c.$$('#l5m1-picks .chip')[2].click();
  ok('m1 limit enforced after restore', /limit/.test(c.$('#l5m1-pickmsg').textContent));
  c.$('#l5m1-lock').click();
  const lockTxt = c.$('#l5m1-lockmsg').textContent;
  ok('m1 locked message shown', /^Locked in\./.test(lockTxt), lockTxt);
  let d = await reload(c); all.push(d);
  await d.goto(1);
  ok('m1 lock message restored', d.$('#l5m1-lockmsg').textContent === lockTxt);
  ok('m1 XP kept, no toast', d.$('#toast').textContent === '' && /30/.test(d.$('#xp').textContent), d.$('#xp').textContent);

  /* ---------- Mission 2: rules game ---------- */
  let e = await mk();
  await e.goto(2);
  const m2cards = (h) => h.$$('#l5m2-host .ucard');
  const choose = (h, i, k) => h.$$('.choice', m2cards(h)[i])[k].click();
  const nextOf = (h, i) => h.$('.reveal .btn', m2cards(h)[i]);
  // answers: 0 right(fine=0), 1 right(dont=2), 2 wrong
  choose(e, 0, 0); nextOf(e, 0).click();
  choose(e, 1, 2); nextOf(e, 1).click();
  choose(e, 2, 0); // wrong, not advanced yet
  await e.tick();
  const labels = (h) => [h.$('#l5m2-card').textContent, h.$('#l5m2-streak').textContent, h.$('#l5m2-best').textContent].join('|');
  const eLabels = labels(e);
  let f = await reload(e); all.push(f);
  await f.goto(2);
  ok('m2 counters restored', labels(f) === eLabels && eLabels === 'Card 3 of 10|Streak 0|Best streak 2', labels(f));
  ok('m2 answered cards show reveal and disabled buttons', [0, 1, 2].every(i => !f.$('.reveal', m2cards(f)[i]).hidden && f.$$('.choice', m2cards(f)[i]).every(x => x.disabled)));
  ok('m2 earlier next buttons spent, current next button live', nextOf(f, 0).disabled && nextOf(f, 1).disabled && !nextOf(f, 2).disabled);
  ok('m2 wrong answer styled', f.$$('.choice', m2cards(f)[2])[0].classList.contains('no') && f.$$('.choice', m2cards(f)[2])[1].classList.contains('ok'));
  ok('m2 reveal text restored', /Streak reset/.test(f.$('.reveal', m2cards(f)[2]).textContent) && /Streak: 2\./.test(f.$('.reveal', m2cards(f)[1]).textContent));
  ok('m2 later cards hidden', m2cards(f).slice(3).every(x => x.hidden) && !m2cards(f)[2].hidden);
  ok('m2 no toast on restore', f.$('#toast').textContent === '');
  nextOf(f, 2).click();
  ok('m2 can continue after restore', labels(f).startsWith('Card 4 of 10') && !m2cards(f)[3].hidden);
  choose(f, 3, 2); // right (testimonials dont)
  ok('m2 streak continues from restored best', /Streak 1/.test(f.$('#l5m2-streak').textContent) && /Best streak 2/.test(f.$('#l5m2-best').textContent), labels(f));
  // play to the end
  nextOf(f, 3).click();
  for (let i = 4; i < 10; i++) { choose(f, i, 0); const nb = nextOf(f, i); nb.click(); }
  await f.tick();
  const endTxt = f.$('#l5m2-end').textContent;
  ok('m2 finished message shown', /You matched our call on/.test(endTxt), endTxt);
  let g = await reload(f); all.push(g);
  await g.goto(2);
  ok('m2 finished state restored', g.$('#l5m2-end').textContent === endTxt && g.$('#l5m2-card').textContent === 'Card 10 of 10', g.$('#l5m2-card').textContent);
  ok('m2 play again button present and works', (() => { const p = g.$$('#l5m2-host .btn.ghost').pop(); p && p.click(); return g.$('#l5m2-end').textContent === '' && g.$('#l5m2-card').textContent === 'Card 1 of 10'; })());
  ok('m2 XP kept, no toast', g.$('#toast').textContent === '');

  /* ---------- Mission 3: metrics + doubts ---------- */
  let h3 = await mk();
  await h3.goto(3);
  const rows = (h) => h.$$('#l5m3-metrics .mrow');
  rows(h3)[0].querySelectorAll('.chip')[0].click(); // vanity, right
  rows(h3)[1].querySelectorAll('.chip')[0].click(); // vanity, wrong (real)
  const dchips = (h) => h.$$('#l5m3-doubts .chip');
  dchips(h3)[1].click(); dchips(h3)[3].click();
  h3.$('#l5m3-bad').click();
  await h3.tick();
  const fbs = rows(h3).map(r => r.querySelector('.fb').textContent);
  const dmsg = h3.$('#l5m3-doubtmsg').textContent;
  let i3 = await reload(h3); all.push(i3);
  await i3.goto(3);
  ok('m3 metric feedback restored', rows(i3).map(r => r.querySelector('.fb').textContent).join('|') === fbs.join('|') && /Not quite, this one is real/.test(fbs[1]));
  ok('m3 metric buttons disabled and pressed', rows(i3)[0].querySelectorAll('.chip')[0].getAttribute('aria-pressed') === 'true' && [...rows(i3)[0].querySelectorAll('.chip'), ...rows(i3)[1].querySelectorAll('.chip')].every(x => x.disabled) && rows(i3)[2].querySelectorAll('.chip')[0].disabled === false);
  ok('m3 correct pick has seen class, wrong does not', rows(i3)[0].querySelectorAll('.chip')[0].classList.contains('seen') && !rows(i3)[1].querySelectorAll('.chip')[0].classList.contains('seen'));
  ok('m3 doubts message restored', i3.$('#l5m3-doubtmsg').textContent === dmsg && /2 of 3/.test(dmsg), i3.$('#l5m3-doubtmsg').textContent);
  ok('m3 doubts pressed state restored', dchips(i3).map(x => x.getAttribute('aria-pressed')).join() === 'false,false,false,true,false');
  ok('m3 seen doubts keep seen class', dchips(i3)[1].classList.contains('seen') && dchips(i3)[3].classList.contains('seen') && !dchips(i3)[0].classList.contains('seen'));
  dchips(i3)[0].click();
  ok('m3 doubts count continues to 3', i3.$('#l5m3-doubtmsg').textContent.indexOf('looked at') < 0);
  ok('m3 calculator bad-month inputs restored with matching output', i3.$('#l5m3-hours').value === '3' && i3.$('#l5m3-tool').value === '60' && /^-\$/.test(i3.$('#l5m3-net').textContent) && /Negative/.test(i3.$('#l5m3-verdict').textContent), i3.$('#l5m3-net').textContent);
  ok('m3 no toast on restore', (await (async () => { const x = await reload(h3); all.push(x); return x.$('#toast').textContent; })()) === '');
  // finish all metrics, reload, ensure no re-award error
  for (let r = 2; r < 6; r++) rows(i3)[r].querySelectorAll('.chip')[1].click();
  let j3 = await reload(i3); all.push(j3); await j3.goto(3);
  ok('m3 all metrics answered restored', rows(j3).every(r => r.querySelectorAll('.chip')[0].disabled));

  /* ---------- Mission 4: builder ---------- */
  let k = await mk();
  await k.goto(4);
  k.$('#l5m4-campaign').value = '2'; k.fire(k.$('#l5m4-campaign'), 'change');
  k.type(k.$('#l5m4-goal'), 'Send the report by the 3rd');
  k.$('#l5m4-metric').value = ''; k.fire(k.$('#l5m4-metric'), 'input');
  k.$('#l5m4-review').click();
  const rmsg = k.$('#l5m4-reviewmsg').textContent;
  ok('m4 review reports empty field', /Still empty: success metric/.test(rmsg), rmsg);
  await k.tick();
  let l = await reload(k); all.push(l); await l.goto(4);
  ok('m4 campaign select restored', l.$('#l5m4-campaign').value === '2');
  ok('m4 edited goal survives template reload', l.$('#l5m4-goal').value === 'Send the report by the 3rd');
  ok('m4 plan preview matches', /Campaign: Monthly performance report/.test(l.$('#l5m4-plan').textContent) && /Goal: Send the report by the 3rd/.test(l.$('#l5m4-plan').textContent) && /\[add a metric\]/.test(l.$('#l5m4-plan').textContent));
  ok('m4 review message restored', l.$('#l5m4-reviewmsg').textContent === rmsg);
  l.type(l.$('#l5m4-metric'), 'Hours per report by month end 4');
  l.$('#l5m4-review').click();
  ok('m4 plan accepted after restore', /^Plan accepted/.test(l.$('#l5m4-reviewmsg').textContent), l.$('#l5m4-reviewmsg').textContent);
  l.$$('#l5m4-list input').slice(0, 3).forEach(x => { x.checked = true; l.fire(x, 'change'); });
  await l.tick();
  ok('m4 copy still locked at 3 of 4 boxes', l.$('#l5m4-copy').disabled);
  let m = await reload(l); all.push(m); await m.goto(4);
  ok('m4 boxes restored 3 of 4', m.$$('#l5m4-list input').map(x => x.checked).join() === 'true,true,true,false');
  ok('m4 copy still locked after reload', m.$('#l5m4-copy').disabled && /Locked/.test(m.$('#l5m4-copynote').textContent));
  const last = m.$$('#l5m4-list input')[3]; last.checked = true; m.fire(last, 'change');
  ok('m4 copy unlocks when last box ticked', !m.$('#l5m4-copy').disabled);
  let n = await reload(m); all.push(n); await n.goto(4);
  ok('m4 unlocked state restored with no toast', !n.$('#l5m4-copy').disabled && /Ready/.test(n.$('#l5m4-copynote').textContent) && n.$('#toast').textContent === '');

  /* ---------- (a) restoring over a fresh default does not lose state ---------- */
  let w0 = await mk();
  await w0.goto(1); w0.$$('.qb', w0.$$('#l5m1-cards .ucard')[0])[1].click(); w0.$$('#l5m1-picks .chip')[2].click();
  await w0.goto(2); w0.$$('.choice', w0.$$('#l5m2-host .ucard')[0])[0].click();
  await w0.goto(3); w0.$$('#l5m3-metrics .mrow')[0].querySelectorAll('.chip')[0].click(); w0.$$('#l5m3-doubts .chip')[2].click();
  await w0.goto(4); w0.$('#l5m4-review').click();
  await w0.tick(200); await w0.flush();
  const snap = w0.snapshot();
  let o = boot(L, snap); all.push(o); await o.tick(100);
  await o.goto(1); await o.goto(2); await o.goto(3); await o.goto(4);
  await o.tick(300); await o.flush();
  const before = exOf(w0), after = exOf(o);
  ok('(a) saved exercise state unchanged after an untouched visit', JSON.stringify(Object.keys(before).sort()) === JSON.stringify(Object.keys(after).sort()) && Object.keys(before).every(x => JSON.stringify(before[x]) === JSON.stringify(after[x])), Object.keys(before).filter(x => JSON.stringify(before[x]) !== JSON.stringify(after[x])).join());
  ok('(a) every persisted id present', ['m1.map', 'm1.picks', 'm2.run', 'm3.metrics', 'm3.doubts', 'm4.review'].every(x => x in after), Object.keys(after).join());
  ok('(a) no toast from an untouched visit', o.$('#toast').textContent === '');

  /* ---------- (b) corrupt saved values ---------- */
  const bad = JSON.parse(snap['aimbc-course-v3']);
  const ex = bad.levels[String(L)].ex;
  ex['m1.map'] = 'garbage'; ex['m1.picks'] = { c: 'x', p: 5, l: {} }; ex['m2.run'] = { a: [99, 'z', null], cur: 'q', fin: 1 };
  ex['m3.metrics'] = { not: 'array' }; ex['m3.doubts'] = { seen: [99, -1, 'a'], sel: 'x' }; ex['m4.review'] = 42;
  const cs = Object.assign({}, snap, { 'aimbc-course-v3': JSON.stringify(bad) });
  let p = boot(L, cs); all.push(p); await p.tick(100);
  ok('(b) corrupt values: no script errors', real(p).length === 0, real(p).join(' | '));
  await p.goto(1);
  p.$$('.qb', p.$$('#l5m1-cards .ucard')[0])[0].click();
  ok('(b) m1 usable after corrupt value', /Placed 1 of 6/.test(p.$('#l5m1-trk').textContent), p.$('#l5m1-trk').textContent);
  p.$$('#l5m1-picks .chip')[0].click();
  ok('(b) m1 picks usable', p.$('#l5m1-pickmsg').textContent === '1 of 3 chosen.');
  await p.goto(2);
  p.$$('.choice', p.$$('#l5m2-host .ucard')[0])[0].click();
  ok('(b) m2 usable after corrupt value', p.$('#l5m2-card').textContent === 'Card 1 of 10' && !p.$('.reveal', p.$$('#l5m2-host .ucard')[0]).hidden);
  await p.goto(3);
  p.$$('#l5m3-metrics .mrow')[0].querySelectorAll('.chip')[1].click();
  p.$$('#l5m3-doubts .chip')[0].click();
  ok('(b) m3 usable after corrupt value', /1 of 3/.test(p.$('#l5m3-doubtmsg').textContent));
  await p.goto(4);
  p.$('#l5m4-review').click();
  ok('(b) m4 usable after corrupt value', p.$('#l5m4-reviewmsg').textContent.length > 0);
  await p.tick(300); await p.flush();

  /* ---------- (c) Restart Mission N clears only that mission ---------- */
  let q = boot(L, snap); all.push(q); await q.tick(100);
  await q.goto(2);
  const exBefore = exOf(q);
  ok('(c) setup: m1..m4 exercise ids saved', ['m1.map', 'm2.run', 'm3.metrics', 'm4.review'].every(x => x in exBefore), Object.keys(exBefore).join());
  q.$('#restartM').click(); q.$('#restartM').click(); await q.tick(100);
  const exAfter = exOf(q);
  ok('(c) restart mission 2 clears m2 exercise state', !Object.keys(exAfter).some(x => x.indexOf('m2.') === 0), Object.keys(exAfter).join());
  ok('(c) other missions untouched', Object.keys(exBefore).filter(x => x.indexOf('m2.') !== 0).every(x => JSON.stringify(exAfter[x]) === JSON.stringify(exBefore[x])));
  let r = boot(L, q.snapshot()); all.push(r); await r.tick(100); await r.goto(2);
  ok('(c) reloaded m2 is a fresh game', r.$('#l5m2-card').textContent === 'Card 1 of 10' && r.$('#l5m2-end').textContent === '');
  await r.goto(1);
  ok('(c) m1 still restored after restarting m2', r.$('#l5m1-trk').textContent === 'Placed 1 of 6', r.$('#l5m1-trk').textContent);

  ok('no script errors across all runs', all.every(x => real(x).length === 0), all.flatMap(real).join(' | '));
  report('persist-level5.test');
})();
