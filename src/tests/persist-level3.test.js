// Level 3 exercise persistence: drive to a mid state, reload from the stored snapshot, compare what the learner sees.
const { boot, ok, report } = require('./harness');
const real = (b) => b.errors.filter(e => !/Not implemented/.test(e));
const txt = (b, sel) => b.$(sel).textContent;
const pressed = (b, sel) => b.$$(sel).map(x => x.getAttribute('aria-pressed'));
const dis = (b, sel) => b.$$(sel).map(x => x.disabled);
const eq = (a, c) => JSON.stringify(a) === JSON.stringify(c);
async function reload(b, extra) {
  await b.flush();
  const snap = b.snapshot();
  const n = boot(3, snap); await n.tick();
  return n;
}
function exOf(b) { const c = b.course(); return c && c.levels['3'] ? c.levels['3'].ex : {}; }

(async () => {
  const all = [];
  /* M1 sort */
  let a = boot(3, {}); all.push(a); await a.tick(); await a.goto(1);
  const claims = () => a.$$('#l3m1-claims .claim');
  claims()[0].querySelectorAll('.chip')[0].click();  // right
  claims()[1].querySelectorAll('.chip')[0].click();  // wrong (answer is Cut)
  claims()[2].querySelectorAll('.chip')[1].click();  // right
  await a.tick();
  const before = { track: txt(a, '#l3m1-track'), res: claims().map(c => c.querySelector('.res').textContent), cls: claims().map(c => c.className), dis: claims().map(c => c.querySelector('.chip').disabled), pr: claims().map(c => Array.from(c.querySelectorAll('.chip')).map(x => x.getAttribute('aria-pressed'))) };
  let xp1 = a.course().levels['3'].got;
  let b = await reload(a); all.push(b);
  const cl2 = () => b.$$('#l3m1-claims .claim');
  ok('m1 sort: track text restored', txt(b, '#l3m1-track') === before.track && before.track === 'Sorted 3 of 6.', txt(b, '#l3m1-track'));
  ok('m1 sort: result lines restored', eq(cl2().map(c => c.querySelector('.res').textContent), before.res) && before.res[1].indexOf('Closer to') === 0);
  ok('m1 sort: right/miss classes restored', eq(cl2().map(c => c.className), before.cls));
  ok('m1 sort: chips disabled and pressed same', eq(cl2().map(c => c.querySelector('.chip').disabled), before.dis) && eq(cl2().map(c => Array.from(c.querySelectorAll('.chip')).map(x => x.getAttribute('aria-pressed'))), before.pr));
  ok('m1 sort: unsorted claims still usable', !cl2()[3].querySelector('.chip').disabled);
  cl2()[3].querySelectorAll('.chip')[0].click(); cl2()[4].querySelectorAll('.chip')[2].click(); cl2()[5].querySelectorAll('.chip')[1].click(); await b.tick();
  ok('m1 sort: finishing after reload counts all six (6 of 6 matched) and awards once', txt(b, '#l3m1-track') === 'All six sorted. 5 of 6 matched. Wrong calls teach more than right ones.' && b.course().levels['3'].got['m1:sort'] === 20, txt(b, '#l3m1-track'));

  /* M1 moves */
  a = boot(3, {}); all.push(a); await a.tick();
  const mv = () => a.$$('#l3m1-moves .chip');
  mv()[0].click(); mv()[2].click(); mv()[0].click(); await a.tick();  // 0 on then off, 2 on (last)
  const mb = { pr: pressed(a, '#l3m1-moves .chip'), seen: a.$$('#l3m1-moves .chip').map(x => x.classList.contains('seen')), out: txt(a, '#l3m1-out'), msg: txt(a, '#l3m1-msg'), lines: a.$$('#l3m1-prompt .ln').length, nw: a.$$('#l3m1-prompt .ln.new').length };
  b = await reload(a); all.push(b);
  ok('m1 moves: aria-pressed restored', eq(pressed(b, '#l3m1-moves .chip'), mb.pr) && eq(mb.pr, ['false', 'false', 'true']), JSON.stringify(pressed(b, '#l3m1-moves .chip')));
  ok('m1 moves: seen markers restored', eq(b.$$('#l3m1-moves .chip').map(x => x.classList.contains('seen')), mb.seen) && mb.seen[0] === true);
  ok('m1 moves: prompt, output, message restored', txt(b, '#l3m1-out') === mb.out && txt(b, '#l3m1-msg') === mb.msg && b.$$('#l3m1-prompt .ln').length === mb.lines && b.$$('#l3m1-prompt .ln.new').length === mb.nw);
  b.$$('#l3m1-moves .chip')[1].click(); await b.tick();
  b.$$('#l3m1-moves .chip')[0].click(); await b.tick();
  ok('m1 moves: seen across reload counts toward the award', b.course().levels['3'].got['m1:moves'] === 10);

  /* M2 pipeline */
  a = boot(3, {}); all.push(a); await a.tick();
  const st2 = () => a.$$('#l3m2-steps .step');
  [0, 1, 2, 2].forEach((w, i) => st2()[i].querySelectorAll('.chip')[w].click()); await a.tick();
  const m2b = { pr: st2().map(s => Array.from(s.querySelectorAll('.chip')).map(x => x.getAttribute('aria-pressed'))), count: txt(a, '#l3m2-count'), scoreDis: a.$('#l3m2-score').disabled };
  b = await reload(a); all.push(b);
  const st2b = () => b.$$('#l3m2-steps .step');
  ok('m2 pipeline: picks restored', eq(st2b().map(s => Array.from(s.querySelectorAll('.chip')).map(x => x.getAttribute('aria-pressed'))), m2b.pr));
  ok('m2 pipeline: counter and score button', txt(b, '#l3m2-count') === '4 of 6 assigned' && b.$('#l3m2-score').disabled === true);
  [1, 0].forEach((w, i) => st2b()[4 + i].querySelectorAll('.chip')[w].click()); await b.tick();
  ok('m2 pipeline: finishing assignments enables scoring', b.$('#l3m2-score').disabled === false && txt(b, '#l3m2-count') === '6 of 6 assigned');
  b.$('#l3m2-score').click(); await b.tick();
  const scoredTxt = txt(b, '#l3m2-total'); const resTxt = b.$$('#l3m2-steps .res').map(x => x.textContent);
  ok('m2 pipeline: scored', /of 12/.test(scoredTxt) && b.$('#l3m2-redo').hidden === false);
  let c = await reload(b); all.push(c);
  ok('m2 pipeline: scored screen restored (total, per-step text, classes)', txt(c, '#l3m2-total') === scoredTxt && eq(c.$$('#l3m2-steps .res').map(x => x.textContent), resTxt) && c.$$('#l3m2-steps .step').every(s => /^step s[012]$/.test(s.className)), c.$$('#l3m2-steps .step').map(s => s.className).join(','));
  ok('m2 pipeline: scored chips disabled, redo visible, score button disabled', c.$$('#l3m2-steps .chip').every(x => x.disabled) && c.$('#l3m2-redo').hidden === false && c.$('#l3m2-score').disabled === true);
  c.$('#l3m2-redo').click(); await c.tick();
  ok('m2 pipeline: Change my answers still works after reload', c.$$('#l3m2-steps .chip').every(x => !x.disabled) && txt(c, '#l3m2-total') === '' && c.$('#l3m2-redo').hidden === true);
  let c2 = await reload(c); all.push(c2);
  ok('m2 pipeline: unscored state after redo is what reloads', txt(c2, '#l3m2-total') === '' && c2.$('#l3m2-redo').hidden === true && c2.$('#l3m2-score').disabled === false);

  /* M3 sandbox */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m3-sizes .chip')[2].click(); a.$('#l3m3-run').click(); a.$$('#l3m3-sizes .chip')[1].click(); a.$('#l3m3-run').click(); a.$$('#l3m3-sizes .chip')[3].click();
  await a.tick();
  const s3 = { runs: txt(a, '#l3m3-runs'), v: txt(a, '#l3m3-verdict'), log: txt(a, '#l3m3-log'), w: a.$$('#l3m3-bars i').map(i => i.style.width), pc: a.$$('#l3m3-bars .pc').map(x => x.textContent), pr: pressed(a, '#l3m3-sizes .chip') };
  b = await reload(a); all.push(b);
  ok('m3 sandbox: run count, verdict, log restored', txt(b, '#l3m3-runs') === s3.runs && txt(b, '#l3m3-verdict') === s3.v && txt(b, '#l3m3-log') === s3.log && s3.runs === 'Runs so far: 2', txt(b, '#l3m3-verdict') + ' vs ' + s3.v);
  ok('m3 sandbox: bars painted the same', eq(b.$$('#l3m3-bars i').map(i => i.style.width), s3.w) && eq(b.$$('#l3m3-bars .pc').map(x => x.textContent), s3.pc));
  ok('m3 sandbox: selected size restored (10,000)', eq(pressed(b, '#l3m3-sizes .chip'), s3.pr) && s3.pr[3] === 'true');
  b.$('#l3m3-run').click(); await b.tick();
  ok('m3 sandbox: third run continues the count and awards', txt(b, '#l3m3-runs') === 'Runs so far: 3' && b.course().levels['3'].got['m3:run'] === 10 && /Winners so far: .*,.*,/.test(txt(b, '#l3m3-log')), txt(b, '#l3m3-log'));
  // determinism: a fresh page doing the same three runs sees the same third result
  let d = boot(3, {}); all.push(d); await d.tick();
  d.$$('#l3m3-sizes .chip')[2].click(); d.$('#l3m3-run').click(); d.$$('#l3m3-sizes .chip')[1].click(); d.$('#l3m3-run').click(); d.$$('#l3m3-sizes .chip')[3].click(); d.$('#l3m3-run').click(); await d.tick();
  ok('m3 sandbox: run after reload matches an uninterrupted session', txt(d, '#l3m3-verdict') === txt(b, '#l3m3-verdict') && txt(d, '#l3m3-log') === txt(b, '#l3m3-log'));

  /* M3 design */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m3-d1 .choice')[0].click(); a.$$('#l3m3-d1 .choice')[1].click(); await a.tick();
  const s3d = { d1: dis(a, '#l3m3-d1 .choice'), cls: a.$$('#l3m3-d1 .choice').map(x => x.className), msg: txt(a, '#l3m3-dmsg') };
  b = await reload(a); all.push(b);
  ok('m3 design: group 1 solved state restored', eq(dis(b, '#l3m3-d1 .choice'), s3d.d1) && eq(b.$$('#l3m3-d1 .choice').map(x => x.className), s3d.cls) && s3d.d1.every(Boolean));
  ok('m3 design: message restored', txt(b, '#l3m3-dmsg') === s3d.msg && s3d.msg === 'Good call. One more choice to make.');
  ok('m3 design: group 2 untouched and usable', dis(b, '#l3m3-d2 .choice').every(x => !x));
  b.$$('#l3m3-d2 .choice')[0].click(); await b.tick();
  ok('m3 design: wrong pick after reload shows hint', /Early leads/.test(txt(b, '#l3m3-dmsg')));
  let b3 = await reload(b); all.push(b3);
  ok('m3 design: wrong pick state (disabled, no class, hint text) survives a second reload', b3.$$('#l3m3-d2 .choice')[0].disabled && b3.$$('#l3m3-d2 .choice')[0].classList.contains('no') && /Early leads/.test(txt(b3, '#l3m3-dmsg')) && !b3.$$('#l3m3-d2 .choice')[2].disabled);
  b3.$$('#l3m3-d2 .choice')[2].click(); await b3.tick();
  ok('m3 design: finishing after reload awards', /A fair test/.test(txt(b3, '#l3m3-dmsg')) && b3.course().levels['3'].got['m3:design'] === 10);
  let b4 = await reload(b3); all.push(b4);
  ok('m3 design: finished message restored', /A fair test/.test(txt(b4, '#l3m3-dmsg')) && dis(b4, '#l3m3-d2 .choice').every(Boolean));

  /* M3 cases */
  a = boot(3, {}); all.push(a); await a.tick();
  const cs = () => a.$$('#l3m3-cases .case');
  cs()[0].querySelectorAll('.choice')[0].click();  // wrong (answer Wait=1)
  cs()[0].querySelectorAll('.choice')[1].click();  // right
  cs()[1].querySelectorAll('.choice')[1].click();  // wrong
  cs()[1].querySelectorAll('.choice')[2].click();  // wrong, last
  await a.tick();
  const s3c = () => ({ msg: a.$$('#l3m3-cases .msg').map(x => x.textContent), cls: cs().map(c => Array.from(c.querySelectorAll('.choice')).map(x => x.className + (x.disabled ? '!' : ''))) });
  const bc = s3c();
  b = await reload(a); all.push(b);
  const cb = () => b.$$('#l3m3-cases .case');
  ok('m3 cases: solved case restored', /^Right\. /.test(b.$$('#l3m3-cases .msg')[0].textContent) && eq(Array.from(cb()[0].querySelectorAll('.choice')).map(x => x.className + (x.disabled ? '!' : '')), bc.cls[0]));
  ok('m3 cases: partly wrong case restored with last hint', b.$$('#l3m3-cases .msg')[1].textContent === bc.msg[1] && eq(Array.from(cb()[1].querySelectorAll('.choice')).map(x => x.className + (x.disabled ? '!' : '')), bc.cls[1]) && bc.msg[1].length > 0);
  ok('m3 cases: untouched case still empty and usable', b.$$('#l3m3-cases .msg')[2].textContent === '' && !cb()[2].querySelector('.choice').disabled);
  cb()[1].querySelectorAll('.choice')[0].click(); cb()[2].querySelectorAll('.choice')[2].click(); await b.tick();
  ok('m3 cases: finishing after reload awards decide', b.course().levels['3'].got['m3:decide'] === 10, JSON.stringify(b.course().levels['3'].got));

  /* M4 ask */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m4-ask .choice')[0].click(); await a.tick();
  const m4a = { msg: txt(a, '#l3m4-askmsg') };
  b = await reload(a); all.push(b);
  ok('m4 ask: wrong pick and hint restored', b.$$('#l3m4-ask .choice')[0].disabled && b.$$('#l3m4-ask .choice')[0].classList.contains('no') && txt(b, '#l3m4-askmsg') === m4a.msg && m4a.msg.length > 0 && !b.$$('#l3m4-ask .choice')[2].disabled);
  b.$$('#l3m4-ask .choice')[2].click(); await b.tick();
  c = await reload(b); all.push(c);
  ok('m4 ask: solved state restored', /^Best question\. /.test(txt(c, '#l3m4-askmsg')) && c.$$('#l3m4-ask .choice').every(x => x.disabled) && c.$$('#l3m4-ask .choice')[2].classList.contains('ok') && c.$$('#l3m4-ask .choice')[1].classList.contains('dim'));

  /* M4 flags */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m4-claims .flag')[1].click(); a.$$('#l3m4-claims .flag')[4].click(); await a.tick();
  b = await reload(a); all.push(b);
  ok('m4 flags: flagged claims and counter restored', eq(pressed(b, '#l3m4-claims .flag'), ['false', 'true', 'false', 'false', 'true', 'false']) && txt(b, '#l3m4-count') === '2 flagged', txt(b, '#l3m4-count'));
  b.$$('#l3m4-claims .flag')[3].click(); b.$('#l3m4-check').click(); await b.tick();
  const m4f = { ver: txt(b, '#l3m4-verdict'), res: b.$$('#l3m4-claims .res').map(x => x.textContent), cls: b.$$('#l3m4-claims .flag').map(x => x.className) };
  c = await reload(b); all.push(c);
  ok('m4 flags: graded screen restored (verdict, per-claim text, right/miss)', txt(c, '#l3m4-verdict') === m4f.ver && /of 6 right/.test(m4f.ver) && eq(c.$$('#l3m4-claims .res').map(x => x.textContent), m4f.res) && eq(c.$$('#l3m4-claims .flag').map(x => x.className), m4f.cls));
  ok('m4 flags: buttons disabled, check disabled, flags kept', c.$$('#l3m4-claims .flag').every(x => x.disabled) && c.$('#l3m4-check').disabled && eq(pressed(c, '#l3m4-claims .flag'), pressed(b, '#l3m4-claims .flag')));
  ok('m4 flags: no toast when restoring a graded exercise', c.$('#toast').textContent === '' && !c.$('#toast').classList.contains('show'), c.$('#toast').textContent);

  /* M4 copy note + prompt builder (fields are auto-saved by the engine, the note is ours) */
  a = boot(3, {}); all.push(a); await a.tick();
  a.type(a.$('#l3m4-data'), 'Week | Orders\n1 | 5'); a.$$('#l3m4-rules input')[1].checked = false; a.fire(a.$$('#l3m4-rules input')[1], 'change');
  a.$('#l3m4-copy').click(); await a.tick(60);
  const note = txt(a, '#l3m4-copynote');
  b = await reload(a); all.push(b);
  ok('m4 copy: note restored', note.length > 0 && txt(b, '#l3m4-copynote') === note, txt(b, '#l3m4-copynote'));
  ok('m4 prompt builder: data and rule choice restored by the engine', b.$('#l3m4-data').value === 'Week | Orders\n1 | 5' && b.$$('#l3m4-rules input')[1].checked === false && txt(b, '#l3m4-prompt').indexOf('1 | 5') > 0 && txt(b, '#l3m4-prompt').indexOf('Separate what the data shows') < 0);

  /* (a) restoring over a fresh default does not lose state: state loaded, then a quick click elsewhere, then reload */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m1-moves .chip')[1].click(); await a.tick();
  b = await reload(a); all.push(b);
  b.$$('#l3m2-steps .step')[0].querySelectorAll('.chip')[0].click(); await b.tick();   // touches another exercise only
  c = await reload(b); all.push(c);
  ok('(a) untouched exercise state survives a session that never touched it', pressed(c, '#l3m1-moves .chip')[1] === 'true' && exOf(c)['m1.moves'] && exOf(c)['m1.moves'].on[1] === true);
  ok('(a) the other exercise saved too', pressed(c, '#l3m2-steps .step:first-child .chip')[0] === 'true');
  ok('(a) boot with no change does not write junk over saved ex', Object.keys(exOf(c)).filter(k => /^m[1-4]\.(sort|moves|pipeline|sandbox|design|cases|ask|flags|copied)$/.test(k)).length >= 2);

  /* (b) corrupt saved values */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m1-moves .chip')[0].click(); a.$$('#l3m2-steps .step')[0].querySelectorAll('.chip')[1].click(); a.$('#l3m3-run').click(); a.$$('#l3m4-ask .choice')[0].click();
  await a.flush();
  const good = a.snapshot(), rec = JSON.parse(good['aimbc-course-v3']);
  const junk = [null, 'garbage', 42, [], {}, { on: 'x', seen: 7, last: 'q' }, { pick: 'zz', scored: true }, { size: -5, runs: 'many', wins: 9, lastSize: 3 }, { g1: 'x', g2: 5, msg: {} }, [{ ok: 'yes', wrong: 'no', last: {} }], { flagged: 4, checked: true }, 999];
  const ids = ['m1.sort', 'm1.moves', 'm2.pipeline', 'm3.sandbox', 'm3.design', 'm3.cases', 'm4.ask', 'm4.flags', 'm4.copied'];
  let allUsable = true, noThrow = true, bootN = 0;
  for (const id of ids) for (const j of junk) {
    const r2 = JSON.parse(JSON.stringify(rec)); r2.levels['3'].ex[id] = j;
    const x = boot(3, { 'aimbc-course-v3': JSON.stringify(r2) }); all.push(x); await x.tick(5); bootN++;
    if (real(x).length) { noThrow = false; ok('(b) ' + id + ' = ' + JSON.stringify(j) + ' no errors', false, real(x).join(' | ')); }
    if (id === 'm1.moves' && bootN % 3 === 0) { x.$$('#l3m1-moves .chip')[2].click(); if (x.$$('#l3m1-moves .chip')[2].getAttribute('aria-pressed') !== 'true') allUsable = false; }
  }
  ok('(b) ' + bootN + ' corrupt-value boots threw nothing', noThrow);
  // usable after corrupt: drive each exercise on a page whose own id is corrupt
  const bad = JSON.parse(JSON.stringify(rec)); ids.forEach(id => { bad.levels['3'].ex[id] = 'garbage'; });
  let u = boot(3, { 'aimbc-course-v3': JSON.stringify(bad) }); all.push(u); await u.tick();
  u.$$('#l3m1-claims .claim')[0].querySelectorAll('.chip')[0].click();
  u.$$('#l3m1-moves .chip')[1].click();
  u.$$('#l3m2-steps .step')[0].querySelectorAll('.chip')[0].click();
  u.$('#l3m3-run').click();
  u.$$('#l3m3-d1 .choice')[1].click();
  u.$$('#l3m3-cases .case')[0].querySelectorAll('.choice')[1].click();
  u.$$('#l3m4-ask .choice')[2].click();
  u.$$('#l3m4-claims .flag')[0].click();
  await u.tick();
  ok('(b) all exercises usable when every saved value is garbage', txt(u, '#l3m1-track') === 'Sorted 1 of 6.' && pressed(u, '#l3m1-moves .chip')[1] === 'true' && txt(u, '#l3m2-count') === '1 of 6 assigned' && txt(u, '#l3m3-runs') === 'Runs so far: 1' && u.$$('#l3m3-d1 .choice')[1].classList.contains('ok') && /^Right\./.test(u.$$('#l3m3-cases .msg')[0].textContent) && /^Best question/.test(txt(u, '#l3m4-askmsg')) && txt(u, '#l3m4-count') === '1 flagged');
  await u.flush();
  ok('(b) garbage is overwritten by good state on the next save', Array.isArray(exOf(u)['m1.sort']) && exOf(u)['m1.sort'][0] === 0 && typeof exOf(u)['m3.sandbox'] === 'object', JSON.stringify(exOf(u)['m1.sort']));

  /* (c) Restart Mission N clears that mission's saved exercise state only */
  a = boot(3, {}); all.push(a); await a.tick();
  a.$$('#l3m1-moves .chip')[0].click(); a.$$('#l3m2-steps .step')[0].querySelectorAll('.chip')[0].click(); a.$$('#l3m3-sizes .chip')[1].click(); a.$('#l3m3-run').click();
  a.type(a.$('#l3m4-data'), 'zz');
  await a.flush();
  let ex = exOf(a);
  ok('(c) setup: saved state exists for missions 1, 2, 3, 4', ex['m1.moves'] && ex['m2.pipeline'] && ex['m3.sandbox'] && ex['m4.f_l3m4-data'] === 'zz', Object.keys(ex).join(','));
  await a.goto(2);
  a.$('#restartM').click(); a.$('#restartM').click(); await a.tick(60);
  ex = a.course().levels['3'].ex;
  ok('(c) restart mission 2 removes m2.* keys only', !Object.keys(ex).some(k => k.indexOf('m2.') === 0) && ex['m1.moves'] && ex['m3.sandbox'] && ex['m4.f_l3m4-data'] === 'zz', Object.keys(ex).join(','));
  let r = boot(3, a.snapshot()); all.push(r); await r.tick();
  ok('(c) after the restart, mission 2 is fresh and mission 1 and 3 are intact', txt(r, '#l3m2-count') === '0 of 6 assigned' && pressed(r, '#l3m1-moves .chip')[0] === 'true' && txt(r, '#l3m3-runs') === 'Runs so far: 1');
  await r.goto(3);
  r.$('#restartM').click(); r.$('#restartM').click(); await r.tick(60);
  ex = r.course().levels['3'].ex;
  ok('(c) restart mission 3 removes m3.* keys only', !Object.keys(ex).some(k => k.indexOf('m3.') === 0) && ex['m1.moves'] && ex['m4.f_l3m4-data'] === 'zz', Object.keys(ex).join(','));

  /* no toast for held XP on restore */
  const fin = boot(3, {}); all.push(fin); await fin.tick();
  fin.$$('#l3m4-ask .choice')[2].click(); await fin.tick();
  const rl = await reload(fin); all.push(rl);
  ok('no toast fires on restore of an already-awarded exercise', rl.$('#toast').textContent === '' && !rl.$('#toast').classList.contains('show'), rl.$('#toast').textContent);
  // a fully restored level with every exercise saved
  const full = boot(3, {}); all.push(full); await full.tick();
  full.$$('#l3m1-claims .claim').forEach((cl, i) => cl.querySelectorAll('.chip')[[0, 2, 1, 0, 2, 1][i]].click());
  full.$$('#l3m2-steps .step').forEach((st, i) => st.querySelectorAll('.chip')[[1, 1, 1, 0, 0, 0][i]].click()); full.$('#l3m2-score').click();
  full.$$('#l3m4-claims .flag')[1].click(); full.$('#l3m4-check').click(); await full.tick();
  const rf = await reload(full); all.push(rf);
  ok('no toast fires when several awarded exercises restore together', rf.$('#toast').textContent === '' && !rf.$('#toast').classList.contains('show') && rf.$('#xp').textContent === full.$('#xp').textContent, rf.$('#toast').textContent);

  ok('no script errors across all boots (jsdom navigation notices ignored)', all.every(x => real(x).length === 0), all.flatMap(real).slice(0, 3).join(' | '));
  report('persist-level3.test');
})();
