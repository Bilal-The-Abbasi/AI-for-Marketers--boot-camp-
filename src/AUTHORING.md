# AI for Marketers: level authoring guide

You are writing ONE level of an interactive course ("AI for Marketers", 5 levels, 4 missions each, about 10 minutes per mission).
Level 1 is finished and is your reference for tone, structure, and code style. Read these first:

- `levels/level1/meta.json`, `mission1.html` to `mission4.html`, `level.js`
- `theme.css` (all available component classes and tokens)
- `engine.js` (the API your level script gets)

Work only inside `levels/levelN/` for your level N. Do NOT edit `theme.css`, `engine.js`, `shell.html`, `build.py`, `smoke.js`, `course.json`, or any other level. If you need a kit change, say so in your final report.
Do not publish anything. The lead assembles and publishes.

## Files you write (in `levels/levelN/`)

| file | what |
|---|---|
| `meta.json` | same keys as level 1: `level`, `pageTitle` (2 to 4 words, given to you), `name`, `lede`, `description` (one sentence), `missions` (exactly 4: `name`, `min`, `hook`), `recap` (exactly 4 short lines), `next` (one sentence teasing the next level; for level 5 a closing line) |
| `mission1.html` to `mission4.html` | the BODY of each mission only. The build adds the eyebrow, the h2, the hook line, the pager, and (mission 4) the level-complete card. |
| `level.js` | one IIFE `(function(C){ ... })(window.Course);` with all interactions for the 4 missions |
| `level.css` | optional. Extra CSS for your level only. Tokens only (see below). |

Build and test (run from the `course/` folder):

```
python3 build.py N      # writes out/levelN.html, fails loudly on structural problems
node smoke.js N         # loads it in jsdom, clicks every control in every mission, reports errors and XP
```

Both must pass cleanly. `smoke.js` prints a WARN if a mission cannot reach 50 XP. Fix that. If a button undoes progress (start over, reset), give it `data-smoke="skip"`.

## Mission body structure (exactly this order)

```html
<div class="label">Try it</div>
<div class="lab"> ...interactive part... </div>

<div class="label">Why it works</div>
<p>...</p>  (2 short paragraphs at most, plus an optional small list or grid)

<div class="label">Check</div>
<div id="quizN"></div>        <!-- filled by makeQuiz($('#quizN'),'mN',[...]) -->

<div class="label">Go deeper</div>
<details class="deeper"><summary>Short title</summary><div class="body"><p>...</p></div></details>
```

Mission 4 of every level ends the level; its Check section can be a checklist or quiz instead of `#quiz4`, as in level 1.
Mission body root element ids: use unique ids prefixed with the mission number or a short level prefix, for example `l2m1-...`. Never reuse ids from other missions.

## XP rules (strict)

- Every mission awards exactly 50 XP in total, no more, no less.
- All XP keys start with `mN:` where N is the mission number (for example `award('m2:build',20)`). The engine only accepts keys matching `^m[1-4]:`.
- `award(key, points)` pays once per key, ever. Quiz items use `mN:qI` keys automatically through `makeQuiz`.
- Typical split: Try it 20 to 30 XP (split across 1 to 3 awards), Check 20 to 30 XP.
- Mission 4's level-complete card appears when mission 4 reaches 50 XP, so mission 4's last award should be the capstone action.
- Everything must be completable by a normal player with no dead ends. Wrong answers never block progress and never cost XP.

## Engine API (`C`)

`C.$(sel, root)`, `C.$$(sel, root)`, `C.el(tag, className, text)`, `C.award(key, pts)`, `C.has(key)` (true if awarded already, use it to restore finished states on reload), `C.toast(msg)`, `C.makeQuiz(hostEl, 'mN', items)` where items are `{q, o:[...], c:correctIndex, xp, why, hint}`, `C.copy(text, selectableEl, cb)` (cb gets true if copied, false if only selected).

## Components already styled (use them, do not reinvent)

`.lab` (the interactive panel, grid with gap), `.ask` (instruction line), `.note` (small muted), `.msg` (feedback line, min-height reserved), `.chips` + `.chip` (toggle buttons, use `aria-pressed`, add `.seen` for a check mark), `.choice` (full-width answer button; states `.ok` `.no` `.dim`), `.btn` / `.btn.ghost`, `.actions` (button row), `.bars` > `.row` (`.w` label, `.track>i` fill, `.pc` value), `.split` (two columns on wide screens, stacks on phones), `.mini` (tiny mono label), `.prompt` (mono box, `.ln` lines, `.ln.new` highlight), `.out` (list of result cards, `.t` text, `.n` meta), `.meter` (5 segments, toggle `.on`), `.mlabel`, `.form` + `.fld` (+ `.wide`), `.checklist`, `.brief`, `.reveal`, `.tagchip`, `.roundline`, `.tells`, `details.deeper`, `.stem`, `.blank`, `.verdict`, `.tracker`.

Inside a mission, `var(--m)` (accent fill), `var(--m-tint)` (soft fill), `var(--m-on)` (text on the accent) are set per mission. Other tokens: `--bg --surface --ink --muted --line --ok --ok-tint --no --no-tint --key-tint --cyan --magenta --yellow` and fonts `--f-display --f-body --f-mono`.

CSS rules for `level.css`: tokens only, never a literal color; must read well in light and dark; no new fonts; mobile first (works at 400px, no horizontal page scroll; wide things scroll inside their own container); targets at least 44px tall; give flex or grid children that hold text `min-width:0`; respect `prefers-reduced-motion` (the global rule already disables transitions and animations).

## Hard rules

1. No em dashes or en dashes anywhere (build fails). Use commas, periods, colons, parentheses. Numeric ranges: write "12 to 18".
2. No network, no external libraries, no `alert/confirm/prompt`, no `window.print`, no downloads, no clipboard reads, no `localStorage` (engine owns storage), no emoji, no images. Charts or diagrams: inline SVG or CSS only, colors from tokens, readable in both themes.
3. Everything is visible and in a useful default state when the page loads. Interactive demos open with sample data (marked as an example). Nothing starts empty.
4. Buttons are `<button type="button">`. Inputs have `<label for>`. Feedback goes in an `aria-live="polite"` element. Keyboard operable.
5. Re-render safely: if a button re-renders part of the lab, event handlers must still work and nothing may throw.
6. Facts: no real statistics, no claims about real companies, products, laws, platforms, or model versions. Use fictional small businesses. All numbers in demos are examples and are labeled "example" where a reader could mistake them for real data. No legal, tax, or financial advice. Tool-agnostic: say "your AI tool", never name vendors or model versions. Avoid anything that goes stale (prices, feature names, limits).
7. Voice: plain, warm, specific, a little dry. Short sentences. No hype. Banned: "delve", "unlock", "leverage", "supercharge", "game-changer", "dive into", "in today's", "it's important to note", "let's explore", "seamless", "robust", "journey". No over-explaining: if a sentence does not help the learner do or understand the next thing, cut it.
8. Design for people who lose focus easily, without ever saying so: one clear goal per mission, an action within the first screen, immediate feedback on every tap, small steps, a different interaction mechanic in each of the four missions, visible progress, no wall of text (paragraphs of 1 to 3 sentences), the optional "Go deeper" holds the theory.
9. Try it comes BEFORE the explanation. The learner should do something, see a result, and only then read why.
10. Marketing-realistic: examples should feel like real small-business marketing work (email, ads, landing pages, social, SEO, analytics, reporting, lead follow-up), not abstract toy problems.
11. Continuity: learners finished the earlier levels. Light callbacks are good ("In Level 1 you saw..."), re-teaching is not. Level 1 taught: AI ranks likely next words and context moves the odds; the four prompt ingredients (audience, goal and offer, constraints, voice); the four tells of invented content (numbers, quotes and names, dates and "latest", always and never); and the habit of adding "use only the facts I gave you, ask me if you need a fact".

## Quality bar

Read your finished level as the learner on a phone. Each mission should take about 10 minutes, have a real moment of "oh, that's why", and end with a small win. Test your own logic: compute every number shown, count every character limit you claim, check every quiz has exactly one defensible correct answer, and make sure wrong-answer hints teach rather than scold. Keep the code readable and defensive; `node smoke.js N` must print SMOKE OK with no WARN lines.

## Final report (to the lead)

Under 12 lines: mission names, the interaction mechanic of each, XP split per mission, anything you want changed in the shared kit, and anything you were unsure about.

## Saving progress and exercise state (v3)

All five level pages are published as ONE artifact (level1.html to level5.html) so they share one browser origin and one store.

- Store: `aimbc-course-v3` = `{v:3,last,levels:{1..5:{got,cur,step,seen,ex,t}}}`. Older `aimbc-levelN-v2/-v1` keys are imported once and left as a backup. Preferences: `aimbc-prefs-v1`.
- Saves merge with what is already stored (XP never goes down, other levels are untouched). A corrupt record is copied to `aimbc-course-v3-corrupt`, never overwritten silently.
- Plain form fields inside missions (input, textarea, select, checkbox, radio) are saved and restored automatically. Do nothing for them.
- Anything else that lives in JS variables registers with `C.persist(id, {get, set})`. Ids look like `m2.step` (mission number first). `get` returns plain JSON, `set(value)` rebuilds the screen from it. `set` must be side effect free: no `award`, no toast, no focus. The engine suppresses `award()` while restoring.
- XP rules are unchanged: 50 per mission, keys `mN:*`, awards are idempotent.
- Scoped resets: Restart Mission N clears `mN:*` XP and `mN.*` exercise state; Reset Level clears one level; Reset the whole course clears all five. Preferences are never reset.
- Tests: `./run-all.sh` (build, smoke, store, stub, persist-level1..5, flow, browser, consistency, contrast). Slow accessibility sweeps: `node a11y.js N MODE` (default, focus, all, calm, large, whole) and `node tests/a11y-states.js`.
