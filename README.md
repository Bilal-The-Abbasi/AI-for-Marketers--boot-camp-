# AI Marketing Boot Camp

An interactive course, "AI for Marketers, beginner to advanced": 5 levels, 4 missions each, 200 XP per level. Plain HTML, CSS and JavaScript. No framework, no backend, no accounts, no API calls.

## Layout

- `site/` is the deployable static site (generated, committed). `index.html` is Level 1.
- `src/` is the source and build kit (Python 3 only, no packages needed to build).
- `vercel.json` sets the output folder to `site/` and adds security headers.

## Run locally

    python3 -m http.server 8000 --directory site

Open http://localhost:8000. Use a real server, not a `file://` URL, so all five levels share one origin and progress carries across levels.

## Edit and rebuild

Edit files under `src/` (`src/levels/levelN/` for content, `src/theme.css`, `src/engine.js`), then:

    python3 src/build_site.py

Commit the regenerated `site/` folder. See `src/AUTHORING.md` for the content and storage rules.

## Test (optional)

    cd src && npm install && NODE_PATH=node_modules sh run-all.sh

Needs Node, `playwright` with Chromium, `jsdom` and `axe-core`. The run builds the site, then runs the persistence, store, browser, production-header and contrast checks.

## Deploy

Import the repo in Vercel with Framework Preset "Other". `vercel.json` handles the rest: no install step, no build step, output folder `site`. Every push to `main` redeploys.

## How progress works

Progress and preferences live in the browser's `localStorage` on the course's own domain. Nothing is sent anywhere. It does not sync across devices. Each level's footer has a reset, and the course has a transfer code to move progress between browsers.

## Notes

- The only third-party request is the Google Fonts stylesheet. The page falls back to system fonts if it is blocked. The CSP in `vercel.json` allows only that host.
- Accessibility was tested with axe-core and keyboard checks. It has not been formally audited or tested with screen readers.
