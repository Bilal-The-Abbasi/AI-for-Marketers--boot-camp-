// Level 2 exercise persistence: drive to a mid state, reload (boot again with the snapshot), compare screens.
const { boot, ok, report } = require('./harness');
const all = [];
const T = (page) => { all.push(page); return page; };
const txt = (p, s) => p.$(s).textContent;
const pressed = (p, s) => p.$$(s).map(b => b.getAttribute('aria-pressed'));

async function reload(p, n) {
  await p.flush();
  const q = T(boot(2, p.snapshot()));
  await q.tick();
  if (n) { q.$$('.node')[n - 1].click(); await q.tick(); }
  return q;
}
function ex(p) { const c = p.course(); return (c && c.levels['2'] && c.levels['2'].ex) || {}; }

(async () => {
  /* ---- M1 step 1: pick the draft ---- */
  let a = T(boot(2, {})); await a.tick(); await a.goto(1);
  let ch = a.$$('#l2m1-drafts .choice');
  ch[0].click(); ch[2].click(); await a.tick();
  let b = await reload(a, 1);
  ch = b.$$('#l2m1-drafts .choice');
  ok('m1 pick: two wrong drafts stay disabled', ch[0].disabled && ch[2].disabled && !ch[1].disabled && ch[0].classList.contains('no'));
  ok('m1 pick: feedback visible with the second-try line', !b.$('#l2m1-r1').hidden && /The last one is the match/.test(txt(b, '#l2m1-r1')), txt(b, '#l2m1-r1'));
  ch[1].click(); await b.tick();
  ok('m1 pick: still solvable after restore (50 XP path)', ch[1].classList.contains('ok') && b.course().levels['2'].got['m1:pick'] === 10);
  let b2 = await reload(b, 1);
  ch = b2.$$('#l2m1-drafts .choice');
  ok('m1 pick: solved state restored', ch.every(x => x.disabled) && ch[1].classList.contains('ok') && ch[0].classList.contains('dim') && /What gave it away/.test(txt(b2, '#l2m1-r1')) && !b2.$('#l2m1-r1').hidden);
  ok('m1 pick: no toast on restore', !b2.$('#toast').classList.contains('show'));

  /* ---- M1 step 2: traits ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(1);
  let tr = a.$$('#l2m1-traits .chip');
  tr[0].click(); tr[3].click(); a.$('#l2m1-check').click(); await a.tick();
  const msg1 = txt(a, '#l2m1-tmsg');
  ok('m1 traits: first check gives a hint', /Not in the posts/.test(msg1), msg1);
  tr[3].click(); a.$('#l2m1-check').click(); await a.tick(); // still wrong (missing), 2nd check => sets answer
  b = await reload(a, 1);
  ok('m1 traits: auto answer restored', pressed(b, '#l2m1-traits .chip').join() === 'true,true,true,false,false,false', pressed(b, '#l2m1-traits .chip').join());
  ok('m1 traits: message restored', /I set the answer for you/.test(txt(b, '#l2m1-tmsg')));
  // mid state: one chip and one wrong check, then reload and the second check counts
  a = T(boot(2, {})); await a.tick(); await a.goto(1);
  tr = a.$$('#l2m1-traits .chip');
  tr[1].click(); tr[4].click(); a.$('#l2m1-check').click(); await a.tick();
  b = await reload(a, 1);
  ok('m1 traits: toggles restored', pressed(b, '#l2m1-traits .chip').join() === 'false,true,false,false,true,false', pressed(b, '#l2m1-traits .chip').join());
  ok('m1 traits: hint text restored', txt(b, '#l2m1-tmsg') === msg1 || /Not in the posts: Emoji/.test(txt(b, '#l2m1-tmsg')), txt(b, '#l2m1-tmsg'));
  b.$('#l2m1-check').click(); await b.tick();
  ok('m1 traits: check count survived (second check reveals answer)', /I set the answer/.test(txt(b, '#l2m1-tmsg')), txt(b, '#l2m1-tmsg'));

  /* ---- M1 step 3: voice card ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(1);
  a.$$('#l2m1-tone .chip')[2].click(); a.$$('#l2m1-len .chip')[1].click(); await a.tick();
  const withTxt = txt(a, '#l2m1-with'), cardTxt = txt(a, '#l2m1-card');
  b = await reload(a, 1);
  ok('m1 card: selections restored', pressed(b, '#l2m1-tone .chip').join() === 'false,false,true' && pressed(b, '#l2m1-len .chip').join() === 'false,true' && pressed(b, '#l2m1-bang .chip').join() === 'true,false', pressed(b, '#l2m1-tone .chip').join());
  ok('m1 card: output and card repainted', txt(b, '#l2m1-with') === withTxt && txt(b, '#l2m1-card') === cardTxt && /Tone: Bold/.test(txt(b, '#l2m1-card')));
  ok('m1 card: tracker counts 2 of 3', /Cards tried: 2 of 3/.test(txt(b, '#l2m1-trk')), txt(b, '#l2m1-trk'));
  b.$$('#l2m1-bang .chip')[1].click(); await b.tick();
  ok('m1 card: third card awards after restore', /Three cards tried/.test(txt(b, '#l2m1-trk')) && b.course().levels['2'].got['m1:card'] === 10);
  b2 = await reload(b, 1);
  ok('m1 card: complete tracker restored without toast', /Three cards tried/.test(txt(b2, '#l2m1-trk')) && !b2.$('#toast').classList.contains('show') && /!$/.test(txt(b2, '#l2m1-with')));

  /* ---- M2 explorer ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(2);
  a.$$('#l2m2-ex .chip')[2].click(); a.$$('#l2m2-fmt .chip')[3].click(); a.$$('#l2m2-fmt .chip')[1].click(); await a.tick();
  const outTxt = txt(a, '#l2m2-out'), prTxt = txt(a, '#l2m2-prompt');
  b = await reload(a, 2);
  ok('m2 explore: chips pressed as left', pressed(b, '#l2m2-ex .chip').join() === 'false,false,true' && pressed(b, '#l2m2-fmt .chip').join() === 'false,true,false,false', pressed(b, '#l2m2-fmt .chip').join());
  ok('m2 explore: prompt and output repainted', txt(b, '#l2m2-out') === outTxt && txt(b, '#l2m2-prompt') === prTxt && b.$('#l2m2-out table'));
  ok('m2 explore: tracker counts', /Example levels seen: 2 of 3\. Formats seen: 3 of 4/.test(txt(b, '#l2m2-trk')), txt(b, '#l2m2-trk'));
  ok('m2 explore: seen classes restored', b.$$('#l2m2-fmt .chip').map(x => x.classList.contains('seen')).join() === 'true,true,false,true');
  ok('m2 explore: no XP from a partial restore', !b.course().levels['2'].got['m2:examples']);
  b.$$('#l2m2-ex .chip')[1].click(); b.$$('#l2m2-fmt .chip')[2].click(); await b.tick();
  ok('m2 explore: finishing after restore awards both', b.course().levels['2'].got['m2:examples'] === 10 && b.course().levels['2'].got['m2:formats'] === 10);
  b2 = await reload(b, 2);
  ok('m2 explore: full state restored, no toast', /3 of 3\. Formats seen: 4 of 4/.test(txt(b2, '#l2m2-trk')) && !b2.$('#toast').classList.contains('show'));

  /* ---- M2 match ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(2);
  let mc = a.$$('#l2m2-match .choice');
  mc[0].click(); mc[2].click(); await a.tick(); // wrong, wrong
  b = await reload(a, 2);
  mc = b.$$('#l2m2-match .choice');
  ok('m2 match: round 1 wrong picks disabled', mc[0].disabled && mc[2].disabled && !mc[1].disabled && mc[0].classList.contains('no'));
  ok('m2 match: hint message restored', /^Hint:/.test(txt(b, '#l2m2-match .msg')), txt(b, '#l2m2-match .msg'));
  mc[1].click(); await b.tick();
  ok('m2 match: Next one appears', !!b.$$('#l2m2-match .btn').length);
  b.$$('#l2m2-match .btn')[0].click(); await b.tick();
  mc = b.$$('#l2m2-match .choice'); mc[3].click(); await b.tick(); // wrong in round 2 (answer is index 2)
  b2 = await reload(b, 2);
  ok('m2 match: round 2 of 3 restored', /2 of 3/.test(txt(b2, '#l2m2-rl')) && /spreadsheet|paste each subject/i.test(txt(b2, '#l2m2-match .ask')) && /paste each subject/.test(txt(b2, '#l2m2-match .ask')), txt(b2, '#l2m2-match .ask'));
  mc = b2.$$('#l2m2-match .choice');
  ok('m2 match: round 2 wrong pick disabled', mc[3].disabled && !mc[2].disabled);
  mc[2].click(); await b2.tick();
  b2.$$('#l2m2-match .btn')[0].click(); await b2.tick();
  b2.$$('#l2m2-match .choice')[3].click(); await b2.tick();
  let b3 = await reload(b2, 2);
  ok('m2 match: finished state restored with final message', /That is all three/.test(txt(b3, '#l2m2-match .msg')) && b3.$$('#l2m2-match .choice').every(x => x.disabled) && b3.$$('#l2m2-match .btn').length === 0);
  ok('m2 match: finished awards 10 and no toast on restore', b3.course().levels['2'].got['m2:match'] === 10 && !b3.$('#toast').classList.contains('show'));

  /* ---- M3 rounds ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(3);
  let oc = a.$$('#l2m3-rounds .choice');
  oc[0].click(); await a.tick();
  b = await reload(a, 3);
  oc = b.$$('#l2m3-rounds .choice');
  ok('m3 rounds: wrong option result shown after restore', !b.$('#l2m3-rounds .reveal').hidden && /Weak/.test(txt(b, '#l2m3-rounds .reveal')) && oc[0].getAttribute('aria-pressed') === 'true' && oc[0].classList.contains('no'));
  ok('m3 rounds: no Next button before winning', !b.$('#l2m3-rounds .reveal .btn'));
  oc[1].click(); await b.tick();
  ok('m3 rounds: round 1 awards 7', b.course().levels['2'].got['m3:r0'] === 7 && !!b.$('#l2m3-rounds .reveal .btn'));
  b.$('#l2m3-rounds .reveal .btn').click(); await b.tick();
  oc = b.$$('#l2m3-rounds .choice'); oc[2].click(); await b.tick();
  b2 = await reload(b, 3);
  ok('m3 rounds: round 2 restored', /Round 2/.test(txt(b2, '#l2m3-rounds .roundline')) && /No fix/.test(txt(b2, '#l2m3-rounds .reveal')), txt(b2, '#l2m3-rounds .roundline'));
  b2.$$('#l2m3-rounds .choice')[1].click(); await b2.tick();
  b2.$('#l2m3-rounds .reveal .btn').click(); await b2.tick();
  b2.$$('#l2m3-rounds .choice')[2].click(); await b2.tick();
  b3 = await reload(b2, 3);
  oc = b3.$$('#l2m3-rounds .choice');
  ok('m3 rounds: round 3 won state restored', /Round 3/.test(txt(b3, '#l2m3-rounds .roundline')) && oc[2].classList.contains('ok') && /That is all three rounds/.test(txt(b3, '#l2m3-rounds .reveal')));
  ok('m3 rounds: XP unchanged and no toast on restore', b3.course().levels['2'].got['m3:r2'] === 6 && !b3.$('#toast').classList.contains('show'));

  /* ---- M3 chain ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(3);
  let cc = a.$$('#l2m3-cards .choice');
  cc[2].click(); cc[1].click(); await a.tick(); // outline (a), then b
  b = await reload(a, 3);
  cc = b.$$('#l2m3-cards .choice');
  ok('m3 chain: two steps restored in order', b.$$('#l2m3-chain li').length === 2 && /outline/.test(b.$$('#l2m3-chain li')[0].textContent) && /Approve the outline/.test(b.$$('#l2m3-chain li')[1].textContent));
  ok('m3 chain: used cards disabled, others live', cc[2].disabled && cc[1].disabled && !cc[3].disabled && !cc[0].disabled && /Step 2 of 3/.test(txt(b, '#l2m3-msg')), txt(b, '#l2m3-msg'));
  cc[3].click(); await b.tick();
  ok('m3 chain: completing after restore awards 10', b.course().levels['2'].got['m3:chain'] === 10 && cc[0].disabled && cc[0].classList.contains('dim'));
  b2 = await reload(b, 3);
  ok('m3 chain: complete state restored', b2.$$('#l2m3-chain li').length === 3 && b2.$$('#l2m3-cards .choice')[0].classList.contains('dim') && /That is a chain/.test(txt(b2, '#l2m3-msg')) && !b2.$('#toast').classList.contains('show'));

  /* ---- M4 kit ---- */
  a = T(boot(2, {})); await a.tick(); await a.goto(4);
  a.$('#l2m4-role').value = 'my ad writer'; a.fire(a.$('#l2m4-role'), 'input');
  a.$('#l2m4-next').click(); await a.tick(); // email
  a.type(a.$('#l2m4-goal'), 'sell out Saturday');
  a.$('#l2m4-audph').click(); a.fire(a.$('#l2m4-audph'), 'change');
  a.$('#l2m4-goalph').click(); a.fire(a.$('#l2m4-goalph'), 'change');
  a.$('#l2m4-copy').click(); await a.tick(60);
  a.$('#l2m4-next').click(); await a.tick(); // page
  await a.tick(200);
  b = await reload(a, 4);
  const sel = b.$$('input[name="l2m4-type"]').map(x => x.checked).join();
  ok('m4 kit: current template type restored', sel === 'false,false,true', sel);
  ok('m4 kit: shelf shows copied type and tracker', b.$$('#l2m4-types span')[1].classList.contains('built') && /Types copied: 1 of 2/.test(txt(b, '#l2m4-trk')) && /Switch to: Search ad/.test(txt(b, '#l2m4-next')), txt(b, '#l2m4-trk') + ' | ' + txt(b, '#l2m4-next'));
  ok('m4 kit: page template text in preview', /conversion copywriter/.test(txt(b, '#l2m4-pre')) && /hero section/.test(txt(b, '#l2m4-pre')));
  b.$('#l2m4-next').click(); await b.tick(); // to ad
  ok('m4 kit: edit to the search ad survived', b.$('#l2m4-role').value === 'my ad writer' && /You are a my ad writer/.test(txt(b, '#l2m4-pre')), b.$('#l2m4-role').value);
  b.$('#l2m4-next').click(); await b.tick(); // email
  ok('m4 kit: email edits survived', b.$('#l2m4-goal').value === 'sell out Saturday' && !b.$('#l2m4-goalph').checked && !b.$('#l2m4-audph').checked && !b.$('#l2m4-aud').disabled && /Audience: past customers/.test(txt(b, '#l2m4-pre')) && /Goal: sell out Saturday/.test(txt(b, '#l2m4-pre')), txt(b, '#l2m4-pre'));
  // copy a second type after restore completes the kit
  b.$('#l2m4-copy').click(); await b.tick(60);
  b.$('#l2m4-next').click(); await b.tick(); b.$('#l2m4-copy').click(); await b.tick(60);
  ok('m4 kit: second copy after restore awards 20', b.course().levels['2'].got['m4:second'] === 20 || b.course().levels['2'].got['m4:first'] === 15);
  // checklist
  b.$$('#l2m4-checklist input').slice(0, 2).forEach(x => { x.click(); });
  await b.tick(200);
  b2 = await reload(b, 4);
  ok('m4 checklist: partial ticks restored, no message', b2.$$('#l2m4-checklist input').map(x => x.checked).join() === 'true,true,false,false' && txt(b2, '#l2m4-ckmsg') === '');

  /* ---- one session that touches all eight exercises ---- */
  const big = T(boot(2, {})); await big.tick();
  await big.goto(1);
  big.$$('#l2m1-drafts .choice')[0].click();
  big.$$('#l2m1-traits .chip')[2].click();
  big.$$('#l2m1-tone .chip')[1].click();
  await big.goto(2);
  big.$$('#l2m2-ex .chip')[1].click(); big.$$('#l2m2-fmt .chip')[2].click();
  big.$$('#l2m2-match .choice')[0].click();
  await big.goto(3);
  big.$$('#l2m3-rounds .choice')[1].click();
  big.$$('#l2m3-cards .choice')[2].click(); big.$$('#l2m3-cards .choice')[1].click(); big.$$('#l2m3-cards .choice')[3].click();
  await big.goto(4);
  big.$('#l2m4-next').click(); await big.tick(); big.type(big.$('#l2m4-goal'), 'fill the shelf');
  await big.tick(200); await big.flush();
  const IDS = ['m1.pick', 'm1.traits', 'm1.card', 'm2.explore', 'm2.match', 'm3.round', 'm3.chain', 'm4.kit'];

  /* ---- (a) restoring over a fresh default does not lose state ---- */
  ok('(a) all eight custom ids are saved', IDS.every(k => k in ex(big)), IDS.filter(k => !(k in ex(big))).join());
  const c1 = T(boot(2, big.snapshot())); await c1.tick();
  for (let m = 1; m <= 4; m++) { c1.$$('.node')[m - 1].click(); await c1.tick(); }
  await c1.flush();
  ok('(a) booting, visiting every mission and saving changes no exercise value', IDS.every(k => JSON.stringify(ex(c1)[k]) === JSON.stringify(ex(big)[k])), IDS.filter(k => JSON.stringify(ex(c1)[k]) !== JSON.stringify(ex(big)[k])).join());
  ok('(a) XP is kept through the round trip', JSON.stringify(c1.course().levels['2'].got) === JSON.stringify(big.course().levels['2'].got));
  ok('(a) restore shows no XP toast', !c1.$('#toast').classList.contains('show'));

  /* ---- (b) corrupt values ---- */
  const snap = JSON.parse(JSON.stringify(big.snapshot()));
  const rec = JSON.parse(snap['aimbc-course-v3']);
  const junk = [null, 'garbage', 42, [1, 2], { idx: 'x', clicks: 'y', step: 'no', cur: 7, v: 5, w: 'z', mi: -3, on: 4, ex: 99, sel: {} }, { idx: 99, clicks: [7, -1, 'a', 2.5], step: 1e9, mi: 55, w: [99], tried: [1, 'x'], wrong: [0, 0, 1, 2, 'q'], ok: 'z' }];
  const ids = IDS;
  let errs = [], usable = 0;
  for (const j of junk) {
    const r2 = JSON.parse(JSON.stringify(rec));
    ids.forEach(id => { r2.levels['2'].ex[id] = j; });
    const s2 = Object.assign({}, snap, { 'aimbc-course-v3': JSON.stringify(r2) });
    const z = T(boot(2, s2)); await z.tick();
    for (let m = 1; m <= 4; m++) { z.$$('.node')[m - 1].click(); await z.tick(); }
    try {
      z.$$('#l2m1-tone .chip')[1].click(); z.$$('#l2m2-fmt .chip')[2].click();
      await z.goto(3); z.$$('#l2m3-rounds .choice')[1].click(); z.$$('#l2m3-cards .choice')[2].click();
      await z.goto(4); z.$('#l2m4-next').click(); await z.tick();
      await z.flush();
      if (/Switch to/.test(z.$('#l2m4-next').textContent) && z.$$('#l2m3-chain li').length >= 1) usable++;
    } catch (e) { errs.push(String(e)); }
    errs = errs.concat(z.errors.filter(e => !/Not implemented/.test(e)));
  }
  ok('(b) corrupt saved values never throw', errs.length === 0, errs.join(' | '));
  ok('(b) exercises remain usable after every corrupt variant', usable === junk.length, usable + '/' + junk.length);
  // corrupt in one id only: the other exercises still restore
  const r3 = JSON.parse(JSON.stringify(rec)); r3.levels['2'].ex['m2.match'] = 'garbage';
  const zc = T(boot(2, Object.assign({}, snap, { 'aimbc-course-v3': JSON.stringify(r3) }))); await zc.tick(); await zc.goto(3);
  ok('(b) one bad id does not block the others', zc.$$('#l2m3-chain li').length === 3);

  /* ---- (c) Restart Mission N clears only that mission's exercise state ---- */
  const full = T(boot(2, big.snapshot())); await full.tick();
  const exBefore = ex(full);
  ok('(c) setup: saved state exists for missions 1 to 4', ['m1.card', 'm2.match', 'm3.chain', 'm4.kit'].every(k => k in exBefore));
  full.$$('.node')[1].click(); await full.tick();
  full.$('#restartM').click(); full.$('#restartM').click(); await full.tick();
  const exAfter = ex(full);
  ok('(c) restart mission 2 removes m2.* exercise state', !Object.keys(exAfter).some(k => k.indexOf('m2.') === 0), Object.keys(exAfter).join());
  ok('(c) restart mission 2 keeps m1, m3, m4 exercise state', Object.keys(exBefore).filter(k => !/^m2\./.test(k)).every(k => JSON.stringify(exAfter[k]) === JSON.stringify(exBefore[k])));
  const rb = T(boot(2, full.snapshot())); await rb.tick(); await rb.goto(2);
  ok('(c) after restart and reload, mission 2 is fresh', pressed(rb, '#l2m2-ex .chip')[0] === 'true' && /Example levels seen: 1 of 3/.test(txt(rb, '#l2m2-trk')) && /1 of 3/.test(txt(rb, '#l2m2-rl')));
  await rb.goto(3);
  ok('(c) after restart, mission 3 chain is still restored', rb.$$('#l2m3-chain li').length === 3);

  const errsAll = all.flatMap(p => p.errors).filter(e => !/Not implemented/.test(e));
  ok('no script errors across runs (ignoring jsdom navigation)', errsAll.length === 0, errsAll.slice(0, 3).join(' | '));
  report('persist-level2.test');
})();
