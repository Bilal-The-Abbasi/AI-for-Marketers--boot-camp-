// usage: node smoke.js N   (after python3 build.py N)
// Loads out/levelN.html in jsdom, clicks every control in every mission, reports runtime errors and XP reached.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const n = process.argv[2];
if (!n) { console.error('usage: node smoke.js N'); process.exit(2); }
const file = path.join(__dirname, 'out', 'full', 'level' + n + '.html');
const src = fs.readFileSync(file, 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? e.detail.stack.split('\n').slice(0, 3).join(' | ') : e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(src, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
  beforeParse(w) { w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.addEventListener('error', e => errors.push('window.error: ' + e.message)); }
});
const w = dom.window, d = w.document;
const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
function fire(el, type) { el.dispatchEvent(new w.Event(type, { bubbles: true })); }
function tick() { return new Promise(r => setTimeout(r, 20)); }

(async () => {
  await tick();
  const nodes = $$('.node');
  if (nodes.length !== 4) errors.push('expected 4 map nodes, found ' + nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].click(); await tick();
    const art = d.querySelector('#mission' + (i + 1));
    if (!art || art.hidden) { errors.push('mission ' + (i + 1) + ' not shown after click'); continue; }
    // fill text inputs / selects / ranges / checkboxes
    $$('input[type=text],input:not([type]),textarea', art).forEach(el => { if (!el.value) el.value = 'sample'; fire(el, 'input'); fire(el, 'change'); });
    $$('select', art).forEach(el => { if (el.options.length > 1) el.selectedIndex = el.options.length - 1; fire(el, 'change'); fire(el, 'input'); });
    $$('input[type=range]', art).forEach(el => { fire(el, 'input'); fire(el, 'change'); });
    $$('input[type=checkbox]', art).forEach(el => { el.checked = true; fire(el, 'change'); });
    // click every enabled button repeatedly (handles re-rendering UIs); never the page-level reset
    for (let pass = 0; pass < 8; pass++) {
      const btns = $$('button', art).filter(b => !b.disabled && b.id !== 'reset' && b.dataset.smoke !== 'skip' && !b.closest('.pager') && !b.closest('.stepnav') && !b.closest('.mtabs'));
      if (!btns.length) break;
      for (const b of btns) { try { b.click(); } catch (e) { errors.push('click threw: ' + e.message); } await tick(); }
    }
    if (art.querySelectorAll('h2').length !== 1) errors.push('mission ' + (i + 1) + ': expected exactly one h2');
  }
  const xp = d.querySelector('#xp').textContent;
  const per = $$('.node .ns').map(e => e.textContent).join(' | ');
  console.log('XP after clicking everything:', xp, '(per mission:', per + ')');
  const hidden = $$('#levelcard').map(e => e.hidden);
  console.log('level card hidden:', hidden.join(','));
  const warns = [];
  $$('.node .ns').forEach((e, i) => { if (e.textContent !== 'Done') warns.push('mission ' + (i + 1) + ' reached only ' + e.textContent + ' (every mission must be able to reach exactly 50; mark buttons that undo progress with data-smoke="skip")'); });
  warns.forEach(x => console.log('WARN: ' + x));
  if (errors.length) { console.log('ERRORS (' + errors.length + '):'); [...new Set(errors)].forEach(e => console.log(' - ' + e)); process.exit(1); }
  console.log('SMOKE OK');
  process.exit(0);
})();
