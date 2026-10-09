// Course-wide store: migration, merging, scoped resets, storage blocked, cross-level view.
const { boot, ok, report } = require('./harness');
(async () => {
  /* 1. first visit writes nothing harmful, then progress lands in the shared record */
  let a = boot(1, {}); await a.tick();
  ok('first visit shows Start here', a.$('#resumeText').textContent.includes('Start here'));
  a.$('#resumeBtn').click(); await a.tick();
  a.$$('#guess1 .chip')[0].click(); await a.tick();
  let c = a.course();
  ok('guess awards XP into aimbc-course-v3 level 1', c && c.levels['1'] && c.levels['1'].got['m1:guess'] === 10, JSON.stringify(c));
  ok('XP shown in header', a.$('#xp').textContent.includes('10 /'));
  ok('course bar shows whole-course total', a.$('#coursebar').textContent.includes('10 of 1000 XP'), a.$('#coursebar').textContent);

  /* 2. another level page, same storage, sees level 1 progress and writes its own */
  const s1 = a.snapshot();
  let b = boot(3, s1); await b.tick();
  ok('level 3 course bar sees level 1 XP', b.$('#coursebar').textContent.includes('10 of 1000 XP'), b.$('#coursebar').textContent);
  ok('level 3 chip for level 1 reads 0/4 (10 XP is not a finished mission)', b.$('.lvp[data-n="1"]').textContent.startsWith('0/4'));
  b.$('#resumeBtn').click(); await b.tick();
  const q = b.$$('#quiz1 .choice, #mission1 .choice');
  ok('level 3 renders', !!b.$('#mission1'));
  const c3 = b.course();
  ok('level 1 record untouched by visiting level 3', c3.levels['1'].got['m1:guess'] === 10);
  ok('last level recorded as 3', c3.last && c3.last.level === 3);

  /* 3. prefs are shared with no link token */
  a.$('#prefsBtn').click(); a.$('input[name="pf-theme"][value="light"]').click(); a.fire(a.$('input[name="pf-theme"][value="light"]'), 'change');
  const s2 = a.snapshot();
  let b2 = boot(4, s2); await b2.tick();
  ok('theme choice carries to level 4 without a hash', b2.d.documentElement.getAttribute('data-theme') === 'light');
  ok('level 4 has no hash', b2.w.location.hash === '');

  /* 4. migration from old per-level keys, old keys preserved */
  const old = { 'aimbc-level2-v2': JSON.stringify({ got: { 'm1:a': 30, 'm1:b': 20 }, cur: 1, step: { 1: 2 }, seen: { '0:0': 1, '1:2': 1 } }), 'aimbc-level1-v1': JSON.stringify({ got: { 'm1:guess': 10 }, cur: 0, step: {}, seen: {} }) };
  let m = boot(2, old); await m.tick();
  ok('migrated: level 2 shows resume with saved mission', m.$('#resumeText').textContent.includes('Welcome back') && m.$('#resumeText').textContent.includes('Mission 2'), m.$('#resumeText').textContent);
  ok('migrated: XP 50 on mission 1 counted as done', m.$('.lvp[data-n="2"]').textContent.startsWith('1/4'), m.$('.lvp[data-n="2"]').textContent);
  ok('migrated: level 1 v1 progress visible in course total', m.$('#coursebar').textContent.includes('60 of 1000 XP'), m.$('#coursebar').textContent);
  ok('old keys left in place as backup', !!m.w.localStorage.getItem('aimbc-level2-v2'));
  ok('migrated record written', m.course().levels['2'].got['m1:a'] === 30);

  /* 5. a stale tab or a default value cannot wipe saved XP */
  const rich = { 'aimbc-course-v3': JSON.stringify({ v: 3, last: { level: 1, t: 1 }, levels: { 1: { got: { 'm1:guess': 10, 'm1:explore': 10, 'm1:q0': 15, 'm1:q1': 15 }, cur: 0, step: {}, seen: { '0:0': 1 }, ex: {}, t: 1 } } }) };
  let r = boot(1, rich); await r.tick();
  ok('rich record loads 50 XP', r.$('#xp').textContent.includes('50 /'));
  // simulate another tab writing less
  r.w.localStorage.setItem('aimbc-course-v3', JSON.stringify({ v: 3, last: null, levels: { 1: { got: { 'm1:guess': 10 }, cur: 0, step: {}, seen: {}, ex: {}, t: 2 } } }));
  r.$$('.node')[1].click(); await r.tick(); // triggers save()
  ok('save merges: XP never drops below what was stored', r.course().levels['1'].got['m1:q1'] === 15, JSON.stringify(r.course().levels['1'].got));

  /* 6. corrupt record is backed up, not silently destroyed */
  let k = boot(1, { 'aimbc-course-v3': '{not json' }); await k.tick();
  ok('corrupt record is kept under a backup key', k.w.localStorage.getItem('aimbc-course-v3-corrupt') === '{not json');
  ok('corrupt record still lets the course start', k.$('#resumeText').textContent.includes('Start here'));

  /* 7. scoped resets */
  const multi = { 'aimbc-course-v3': JSON.stringify({ v: 3, last: { level: 2, t: 5 }, levels: {
    1: { got: { 'm1:guess': 10, 'm1:explore': 10, 'm2:build': 20 }, cur: 1, step: { 1: 1 }, seen: { '0:0': 1, '1:1': 1 }, ex: { 'm1.x': 1, 'm2.y': 2 }, t: 1 },
    2: { got: { 'm1:a': 50 }, cur: 0, step: {}, seen: {}, ex: {}, t: 1 } } }) };
  let z = boot(1, multi); await z.tick();
  z.$$('.node')[1].click(); await z.tick();
  ok('restart button names its scope', z.$('#restartM').textContent === 'Restart Mission 2', z.$('#restartM').textContent);
  z.$('#restartM').click();
  ok('first click only arms and names exactly what is erased', /20 XP/.test(z.$('#confirmNote').textContent) && /Mission 2 of Level 1/.test(z.$('#confirmNote').textContent), z.$('#confirmNote').textContent);
  ok('nothing erased before confirm', z.course().levels['1'].got['m2:build'] === 20);
  z.$('#restartM').click(); await z.tick();
  const zc = z.course();
  ok('restart mission clears only mission 2 XP + answers', !zc.levels['1'].got['m2:build'] && zc.levels['1'].got['m1:guess'] === 10 && !('m2.y' in zc.levels['1'].ex) && zc.levels['1'].ex['m1.x'] === 1, JSON.stringify(zc.levels['1']));
  ok('restart mission leaves level 2 alone', zc.levels['2'].got['m1:a'] === 50);
  let z2 = boot(1, z.snapshot()); await z2.tick();
  z2.$('#reset').click(); z2.$('#reset').click(); await z2.tick();
  const z2c = z2.course();
  ok('reset level empties level 1 only', Object.keys(z2c.levels['1'].got).length === 0 && z2c.levels['2'].got['m1:a'] === 50);
  let z3 = boot(1, Object.assign(z2.snapshot(), { 'aimbc-prefs-v1': JSON.stringify({ theme: 'dark', text: 'large' }) })); await z3.tick();
  z3.$('#resetAll').click(); ok('whole-course confirm names all five levels', /all five levels/.test(z3.$('#confirmNote').textContent) || /five levels/.test(z3.$('#resetAll').textContent + z3.$('#confirmNote').textContent));
  z3.$('#resetAll').click(); await z3.tick();
  ok('reset whole course empties every level', Object.keys(z3.course().levels['2'].got).length === 0);
  ok('reset keeps display preferences', /large/.test(z3.w.localStorage.getItem('aimbc-prefs-v1') || ''), z3.w.localStorage.getItem('aimbc-prefs-v1'));
  // Escape cancels
  let z4 = boot(1, multi); await z4.tick();
  z4.$('#reset').click(); z4.d.dispatchEvent(new z4.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await z4.tick();
  ok('Escape cancels an armed reset', /Cancelled/.test(z4.$('#confirmNote').textContent) && z4.course().levels['1'].got['m1:guess'] === 10);

  /* 8. storage blocked: course still works and says so */
  let bl = boot(1, {}, { blockStorage: true }); await bl.tick();
  ok('blocked storage: no script errors', bl.errors.length === 0, bl.errors.join(' | '));
  ok('blocked storage: user is told', /blocking saved data/.test(bl.$('#resumeText').textContent), bl.$('#resumeText').textContent);
  bl.$('#resumeBtn').click(); await bl.tick();
  bl.$$('#guess1 .chip')[0].click(); await bl.tick();
  ok('blocked storage: XP still works in memory', bl.$('#xp').textContent.includes('10 /'));

  /* 9. transfer code */
  const code = 'AIMBC1.' + Buffer.from(encodeURIComponent(JSON.stringify({ levels: { 3: { got: { 'm1:x': 20, 'm2:y': 50 }, cur: 2, step: { 2: 1 }, seen: { '2:1': 1 } } } })).replace(/%([0-9A-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))), 'binary').toString('base64');
  let t = boot(1, {}); await t.tick();
  t.$('#xferIn').value = code; t.$('#xferBtn').click(); await t.tick();
  ok('transfer code imports level 3 progress', t.course() && t.course().levels['3'] && t.course().levels['3'].got['m2:y'] === 50, t.$('#xferMsg').textContent);
  t.$('#xferIn').value = 'nonsense'; t.$('#xferBtn').click();
  ok('bad transfer code gives a plain message', /not a transfer code/.test(t.$('#xferMsg').textContent));

  ok('no script errors across runs', [a, b, b2, m, r, k, z, z2, z3, z4, t].every(x => x.errors.filter(e => !/Not implemented/.test(e)).length === 0), [a, b, b2, m, r, k, z, z2, z3, z4, t].flatMap(x => x.errors).join(' | '));
  report('store.test');
})();
