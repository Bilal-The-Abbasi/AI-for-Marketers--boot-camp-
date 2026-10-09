// Level 1 exercise persistence: drive to a mid state, reload from the saved snapshot, compare the screen.
const { boot, ok, report } = require('./harness');
const noNav = x => x.errors.filter(e => !/Not implemented/.test(e));
const txt = e => e.textContent.replace(/\s+/g, ' ').trim();
(async () => {
  /* ---- Mission 1: guess, then two of three voices ---- */
  let a = boot(1, {}); await a.tick();
  await a.goto(1);
  ok('m1 fresh: reveal hidden', a.$('#reveal1').hidden === true);
  a.$$('#guess1 .chip')[2].click(); await a.tick();      // "the trail"
  a.$$('#ctx1 .chip')[2].click(); await a.tick();        // trail club
  await a.tick(200); await a.flush();
  const m1 = { verdict: txt(a.$('#verdict1')), note: txt(a.$('#ctxnote1')), trk: txt(a.$('#trk1')), name: txt(a.$('#ctxName1')), blank: txt(a.$('#blank1')) };
  const w1 = a.$$('#bars1 .row').map(r => txt(r.querySelector('.pc')));
  let b = boot(1, a.snapshot()); await b.tick();
  await b.goto(1);
  ok('m1 reload: reveal visible', b.$('#reveal1').hidden === false);
  ok('m1 reload: all guess chips disabled', b.$$('#guess1 .chip').every(x => x.disabled));
  ok('m1 reload: guessed chip pressed', b.$$('#guess1 .chip').map(x => x.getAttribute('aria-pressed')).join() === a.$$('#guess1 .chip').map(x => x.getAttribute('aria-pressed')).join() && b.$$('#guess1 .chip')[2].getAttribute('aria-pressed') === 'true');
  ok('m1 reload: verdict/blank match', txt(b.$('#verdict1')) === m1.verdict && txt(b.$('#blank1')) === m1.blank, txt(b.$('#verdict1')));
  ok('m1 reload: context pressed is trail club', b.$$('#ctx1 .chip').map(x => x.getAttribute('aria-pressed')).join() === 'false,false,true');
  ok('m1 reload: note, name, tracker match', txt(b.$('#ctxnote1')) === m1.note && txt(b.$('#ctxName1')) === m1.name && txt(b.$('#trk1')) === m1.trk && m1.trk === 'Voices tried: 2 of 3', m1.trk + ' / ' + txt(b.$('#trk1')));
  ok('m1 reload: bars painted immediately for the voice', b.$$('#bars1 .row').map(r => txt(r.querySelector('.pc'))).join() === w1.join() && w1[3] === '52%', w1.join());
  ok('m1 reload: bar widths set', b.$$('#bars1 .row i')[3].style.width === '52%');
  ok('m1 reload: seen classes', b.$$('#ctx1 .chip').map(x => x.classList.contains('seen')).join() === 'true,false,true');
  ok('m1 reload: mine row marked', b.$$('#bars1 .row')[3].classList.contains('mine'));
  ok('m1 reload: no toast', !b.$('#toast').classList.contains('show'));
  ok('m1 reload: XP unchanged (10)', b.course().levels['1'].got['m1:guess'] === 10 && !b.course().levels['1'].got['m1:explore']);
  b.$$('#ctx1 .chip')[1].click(); await b.tick();        // third voice completes explore
  ok('m1 reload: continuing awards explore', b.course().levels['1'].got['m1:explore'] === 10 && txt(b.$('#trk1')) === 'All three voices tried.');
  // guess only, baseline context never touched
  let a0 = boot(1, {}); await a0.tick(); await a0.goto(1);
  a0.$$('#guess1 .chip')[0].click(); await a0.tick(200); await a0.flush();
  let b0 = boot(1, a0.snapshot()); await b0.tick(); await b0.goto(1);
  ok('m1 guess-only reload: baseline note stays empty, 1 of 3', txt(b0.$('#ctxnote1')) === '' && txt(b0.$('#trk1')) === 'Voices tried: 1 of 3' && b0.$$('#ctx1 .chip')[0].getAttribute('aria-pressed') === 'true');
  // (a) fresh default does not lose state: boot with snapshot, then exercise untouched keeps value
  await b0.flush();
  ok('m1 (a) restored state survives idle flush', b0.course().levels['1'].ex['m1.state'] && b0.course().levels['1'].ex['m1.state'].g === 1, JSON.stringify(b0.course().levels['1'].ex));

  /* ---- Mission 2: builder at 3 of 4 ---- */
  let c = boot(1, {}); await c.tick(); await c.goto(2);
  for (let i = 0; i < 3; i++) { c.$('#add2').click(); await c.tick(); }
  await c.tick(200); await c.flush();
  const m2 = { prompt: txt(c.$('#prompt2')), out: txt(c.$('#out2')), lab: txt(c.$('#mlabel2')), note: txt(c.$('#note2')), cnt: txt(c.$('#count2')), btn: txt(c.$('#add2')) };
  let d = boot(1, c.snapshot()); await d.tick(); await d.goto(2);
  ok('m2 reload: count 3 of 4', txt(d.$('#count2')) === '3 of 4 ingredients' && m2.cnt === txt(d.$('#count2')));
  ok('m2 reload: prompt, outputs, label, note match', txt(d.$('#prompt2')) === m2.prompt && txt(d.$('#out2')) === m2.out && txt(d.$('#mlabel2')) === m2.lab && txt(d.$('#note2')) === m2.note);
  ok('m2 reload: meter 4 lit', d.$$('#meter2 i').filter(i => i.classList.contains('on')).length === 4);
  ok('m2 reload: add button enabled and names Voice', !d.$('#add2').disabled && txt(d.$('#add2')) === m2.btn && /Voice/.test(m2.btn), m2.btn);
  ok('m2 reload: no m2:build XP yet', !d.course().levels['1'].got['m2:build']);
  d.$('#add2').click(); await d.tick();
  ok('m2 reload: fourth add finishes and awards 20', d.course().levels['1'].got['m2:build'] === 20 && d.$('#add2').disabled && txt(d.$('#add2')) === 'All four added');
  await d.tick(200); await d.flush();
  let d2 = boot(1, d.snapshot()); await d2.tick(); await d2.goto(2);
  ok('m2 complete reload: disabled, no toast, 4 of 4', d2.$('#add2').disabled && txt(d2.$('#count2')) === '4 of 4 ingredients' && !d2.$('#toast').classList.contains('show'));
  d2.$('#reset2').click(); await d2.tick(200); await d2.flush();
  let d3 = boot(1, d2.snapshot()); await d3.tick(); await d3.goto(2);
  ok('m2 start over persists as 0 of 4', txt(d3.$('#count2')) === '0 of 4 ingredients' && !d3.$('#add2').disabled);

  /* ---- Mission 3: round 2, one wrong try ---- */
  let e = boot(1, {}); await e.tick(); await e.goto(3);
  e.$$('#rounds3 .choice')[e.$$('#rounds3 .choice').length - 1].click(); await e.tick();   // wrong in round 1
  e.$$('#rounds3 .choice')[1].click(); await e.tick();                                    // solve round 1
  e.$('#rounds3 .btn').click(); await e.tick();                                            // next round
  e.$$('#rounds3 .choice')[0].click(); await e.tick();                                    // wrong in round 2
  await e.tick(200); await e.flush();
  const m3 = { line: txt(e.$('#rounds3 .roundline')), brief: txt(e.$('#rounds3 .brief')), msg: txt(e.$('#rounds3 .msg')) };
  let f = boot(1, e.snapshot()); await f.tick(); await f.goto(3);
  ok('m3 reload: Round 2 of 3 with same brief', txt(f.$('#rounds3 .roundline')) === 'Round 2 of 3' && txt(f.$('#rounds3 .brief')) === m3.brief);
  ok('m3 reload: wrong choice disabled with no style', f.$$('#rounds3 .choice')[0].disabled && f.$$('#rounds3 .choice')[0].classList.contains('no') && !f.$$('#rounds3 .choice')[1].disabled);
  ok('m3 reload: message restored, reveal hidden', txt(f.$('#rounds3 .msg')) === m3.msg && m3.msg !== '' && f.$('#rounds3 .reveal').hidden === true);
  ok('m3 reload: only round 1 XP held', f.course().levels['1'].got['m3:r0'] === 10 && !f.course().levels['1'].got['m3:r1']);
  f.$$('#rounds3 .choice')[3].click(); await f.tick();                                    // second wrong -> hint
  ok('m3 reload: second wrong shows hint', /^Hint:/.test(txt(f.$('#rounds3 .msg'))));
  await f.tick(200); await f.flush();
  let g = boot(1, f.snapshot()); await g.tick(); await g.goto(3);
  ok('m3 two-wrong reload keeps hint', /^Hint:/.test(txt(g.$('#rounds3 .msg'))) && g.$$('#rounds3 .choice').filter(x => x.disabled).length === 2);
  g.$$('#rounds3 .choice')[2].click(); await g.tick();                                    // solve round 2
  ok('m3 solve after reload awards r1', g.course().levels['1'].got['m3:r1'] === 10);
  await g.tick(200); await g.flush();
  let h = boot(1, g.snapshot()); await h.tick(); await h.goto(3);
  ok('m3 solved reload: reveal visible with tag, all disabled, Next button present', h.$('#rounds3 .reveal').hidden === false && /Overconfident|Invented/.test(txt(h.$('#rounds3 .tagchip'))) && h.$$('#rounds3 .choice').every(x => x.disabled) && !!h.$('#rounds3 .reveal .btn'));
  ok('m3 solved reload: no toast', !h.$('#toast').classList.contains('show'));
  h.$('#rounds3 .reveal .btn').click(); await h.tick();
  ok('m3 solved reload: Next goes to round 3 fresh', txt(h.$('#rounds3 .roundline')) === 'Round 3 of 3' && h.$$('#rounds3 .choice').every(x => !x.disabled));
  await h.tick(200); await h.flush();
  let h2 = boot(1, h.snapshot()); await h2.tick(); await h2.goto(3);
  h2.$$('#rounds3 .choice')[1].click(); await h2.tick();
  ok('m3 final round solved shows closing note', /all three rounds/.test(txt(h2.$('#rounds3 .reveal'))));
  await h2.tick(200); await h2.flush();
  let h3 = boot(1, h2.snapshot()); await h3.tick(); await h3.goto(3);
  ok('m3 final solved reload shows closing note, no Next', /all three rounds/.test(txt(h3.$('#rounds3 .reveal'))) && !h3.$('#rounds3 .reveal .btn'));

  /* ---- Mission 4: copy note, checklist, fields ---- */
  let i4 = boot(1, {}); await i4.tick(); await i4.goto(4);
  i4.type(i4.$('#f-offer'), 'half-price pottery night');
  i4.$$('#checklist4 input')[0].checked = true; i4.fire(i4.$$('#checklist4 input')[0], 'change');
  i4.$$('#checklist4 input')[1].checked = true; i4.fire(i4.$$('#checklist4 input')[1], 'change');
  i4.$('#copy4').click(); await i4.tick(100);
  const cn = txt(i4.$('#copynote4')); await i4.tick(200); await i4.flush();
  let j = boot(1, i4.snapshot()); await j.tick(); await j.goto(4);
  ok('m4 reload: copy note restored', cn !== '' && txt(j.$('#copynote4')) === cn, cn + ' / ' + txt(j.$('#copynote4')));
  ok('m4 reload: offer field and preview restored', j.$('#f-offer').value === 'half-price pottery night' && /half-price pottery night/.test(j.$('#p4').textContent));
  ok('m4 reload: two ticks restored, no completion message', j.$$('#checklist4 input').map(x => x.checked).join() === 'true,true,false,false' && txt(j.$('#ckmsg')) === '');
  ok('m4 reload: no toast', !j.$('#toast').classList.contains('show'));
  j.$$('#checklist4 input').slice(2).forEach(x => { x.checked = true; j.fire(x, 'change'); });
  ok('m4 finishing checklist awards 30', j.course().levels['1'].got['m4:check'] === 30);
  await j.tick(200); await j.flush();
  let j2 = boot(1, j.snapshot()); await j2.tick(); await j2.goto(4);
  ok('m4 complete reload: all ticked, message shown, no toast', j2.$$('#checklist4 input').every(x => x.checked) && /Mission complete/.test(txt(j2.$('#ckmsg'))) && !j2.$('#toast').classList.contains('show'));

  /* ---- (b) corrupt saved values never throw and leave exercises usable ---- */
  const base = JSON.parse(JSON.stringify(a.course()));
  const k = base.levels['1'];
  k.ex['m1.state'] = 'garbage'; k.ex['m2.step'] = { x: 1 }; k.ex['m3.round'] = { i: 99, w: 'no', s: 'yes' }; k.ex['m4.copied'] = [1, 2];
  let bad = boot(1, { 'aimbc-course-v3': JSON.stringify(base) }); await bad.tick();
  ok('corrupt: no script errors', noNav(bad).length === 0, noNav(bad).join(' | '));
  await bad.goto(1); ok('corrupt m1: still a fresh exercise', bad.$('#reveal1').hidden === true);
  bad.$$('#guess1 .chip')[1].click(); await bad.tick();
  ok('corrupt m1: usable', bad.$('#reveal1').hidden === false);
  await bad.goto(2); bad.$('#add2').click(); await bad.tick();
  ok('corrupt m2: usable', txt(bad.$('#count2')) === '1 of 4 ingredients');
  await bad.goto(3); ok('corrupt m3: round 1, usable', txt(bad.$('#rounds3 .roundline')) === 'Round 1 of 3');
  bad.$$('#rounds3 .choice')[1].click(); await bad.tick();
  ok('corrupt m3: solves', bad.$('#rounds3 .reveal').hidden === false);
  await bad.goto(4); ok('corrupt m4: note empty', txt(bad.$('#copynote4')) === '');
  // out of range numbers and wrong types in other shapes
  const k2 = JSON.parse(JSON.stringify(a.course())); const x2 = k2.levels['1'].ex;
  x2['m1.state'] = { g: 1.5, c: 9, s: 'x' }; x2['m2.step'] = 17; x2['m3.round'] = { i: 1, w: [0, 0, 7, -1, 'a'], s: false };
  let bad2 = boot(1, { 'aimbc-course-v3': JSON.stringify(k2) }); await bad2.tick(); await bad2.goto(3);
  ok('odd values: no errors, m3 sanitised to one disabled choice', noNav(bad2).length === 0 && bad2.$$('#rounds3 .choice').filter(x => x.disabled).length === 1 && txt(bad2.$('#rounds3 .roundline')) === 'Round 2 of 3', noNav(bad2).join(' | '));
  await bad2.goto(2); ok('odd m2.step ignored', txt(bad2.$('#count2')) === '0 of 4 ingredients');

  /* ---- (c) Restart Mission N clears only that mission's exercise state ---- */
  let s = boot(1, {}); await s.tick();
  await s.goto(1); s.$$('#guess1 .chip')[0].click(); await s.tick();
  await s.goto(2); s.$('#add2').click(); await s.tick();
  await s.goto(3); s.$$('#rounds3 .choice')[0].click(); await s.tick();
  await s.tick(200); await s.flush();
  const before = Object.keys(s.course().levels['1'].ex);
  ok('ex has m1.state, m2.step, m3.round before restart', ['m1.state', 'm2.step', 'm3.round'].every(x => before.indexOf(x) >= 0), before.join());
  await s.goto(2);
  s.$('#restartM').click(); s.$('#restartM').click(); await s.tick(100);
  const ex = s.course().levels['1'].ex;
  ok('restart M2 removes m2.* only', !Object.keys(ex).some(x => x.indexOf('m2.') === 0) && 'm1.state' in ex && 'm3.round' in ex, Object.keys(ex).join());
  let r = boot(1, s.snapshot()); await r.tick(); await r.goto(2);
  ok('after restart reload: M2 at 0 of 4', txt(r.$('#count2')) === '0 of 4 ingredients');
  await r.goto(1); ok('after restart reload: M1 guess still shown', r.$('#reveal1').hidden === false);
  await r.goto(3); ok('after restart reload: M3 wrong try still shown', r.$$('#rounds3 .choice')[0].disabled);

  const all = [a, b, b0, c, d, d2, d3, e, f, g, h, h2, h3, i4, j, j2, a0, r];
  ok('no script errors in normal runs', all.every(x => noNav(x).length === 0), all.flatMap(noNav).join(' | '));
  report('persist-level1.test');
})();
