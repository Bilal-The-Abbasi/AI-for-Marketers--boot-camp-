#!/bin/sh
# Full regression run: build, jsdom smoke, persistence + store tests, real-browser flow and behavior tests, contrast.
# Accessibility sweeps (slow) run separately: node a11y.js N MODE, node tests/a11y-states.js
set -e
cd "$(dirname "$0")"
export NODE_PATH=/opt/npm-tools/node_modules
python3 build_site.py | tail -1
for n in 1 2 3 4 5; do node smoke.js $n | tail -1; done
for f in tests/store.test.js tests/persist-level1.test.js tests/persist-level2.test.js tests/persist-level3.test.js tests/persist-level4.test.js tests/persist-level5.test.js; do node $f | tail -1; done
node flow.js | tail -1
node tests/browser.test.js | tail -1
node tests/prod.test.js | tail -1
node tests/consistency.js | tail -1 || true
python3 contrast.py | tail -2
