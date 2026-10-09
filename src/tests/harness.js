// Shared jsdom harness for persistence tests.
// boot(level, store) loads out/levelN.html with a pre-seeded localStorage (object of key->string).
// snapshot(win) returns the localStorage contents so a test can "reload" by booting again with that object.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const results = [];
function ok(name, cond, extra) { results.push({ pass: !!cond, name, extra: cond ? '' : (extra || '') }); }
function boot(level, store, opts) {
  opts = opts || {};
  const src = fs.readFileSync(path.join(__dirname, '..', 'out', 'full', 'level' + level + '.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? e.detail.stack.split('\n').slice(0, 3).join(' | ') : e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(src, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://course.test/level' + level + '.html', virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.addEventListener('error', e => errors.push('window.error: ' + e.message));
      if (opts.blockStorage) {
        Object.defineProperty(w, 'localStorage', { get() { throw new Error('blocked'); } });
      } else {
        for (const k of Object.keys(store || {})) w.localStorage.setItem(k, store[k]);
      }
    }
  });
  const w = dom.window, d = w.document;
  const $ = (s, r) => (r || d).querySelector(s);
  const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
  const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
  const tick = (ms) => new Promise(r => setTimeout(r, ms || 30));
  const type = (el, v) => { el.value = v; fire(el, 'input'); fire(el, 'change'); };
  const goto = async (mission, step) => { // 1-based mission, 0-based step
    $$('.node')[mission - 1].click(); await tick();
    if (step) { $$('.stepbtn', $('#mission' + mission))[step].click(); await tick(); }
  };
  const snapshot = () => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
  const course = () => JSON.parse(w.localStorage.getItem('aimbc-course-v3') || 'null');
  // flush pending saves, as pagehide would
  const flush = async () => { w.dispatchEvent(new w.Event('pagehide')); await tick(10); };
  return { dom, w, d, $, $$, fire, tick, type, goto, snapshot, course, flush, errors };
}
function report(name) {
  const fails = results.filter(r => !r.pass);
  results.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.extra ? '  -> ' + r.extra : '')));
  console.log('\n' + name + ': ' + (results.length - fails.length) + '/' + results.length + ' passed');
  process.exit(fails.length ? 1 : 0);
}
module.exports = { boot, ok, report, results };
