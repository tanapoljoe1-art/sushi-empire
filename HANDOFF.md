# Handoff — Sushi Empire game: post-refactor bug fixes + open deploy issue (2026-07-21)

## Goal
Sushi Empire is a browser-based incremental/idle game ("ทำซูชิ!" — cook sushi to earn money, buy upgrades, unlock achievements). The codebase was recently refactored from a flat script layout into ES modules + Vite, then live-tested and bug-fixed. The remaining open item is confirming a Render auto-deploy fix actually works, plus the game has a planned future upgrade (2D→3D kitchen scene) that hasn't been started.

## State

- **Done:**
  - ES-module + Vite architecture refactor — live and verified working on the deployed site.
  - 5 real gameplay bugs found via a live browser click-through and fixed, committed as `2275860` ("Fix upgrade-state gap, cook button hidden behind bottom nav, achievement icon/queue bugs"), pushed to `main`, and manually deployed on Render. Confirmed live via `curl` (saw `type="module"` script tag and the corrected CSS `bottom:62px` in the served HTML).
  - Prior to the refactor, two earlier PRs were merged: PR #1 (fixed a messy bot-generated PR's cook-animation-cancel bug and a load-time crash on emperor/zenith dishes), and a second PR (wired up a previously-unused random-event system + implemented 3 events and 2 decorations that had UI copy but no effect).

- **In progress:**
  - Render auto-deploy webhook reliability. After the GitHub repo was deleted and recreated from scratch (see Dead ends), pushing new commits stopped triggering Render's auto-deploy — every deploy since has required manually clicking "Manual Deploy" → "Deploy latest commit" in the Render dashboard. A fix was attempted (toggle Auto-Deploy off then back to "On Commit" in the service's Settings → Deploy tab, to force Render to re-subscribe to the GitHub webhook) but **this has not been tested against a real push yet** — no commit has been pushed since the toggle was flipped. "Finished" here means: push a small commit, watch the Render dashboard's Events/Deploys tab, and see a deploy fire automatically without a manual click.

- **Not started:**
  - Converting the chef/plate/steam kitchen scene from 2D DOM/CSS to a 3D Three.js scene. The codebase was deliberately prepared for this (see Key decisions & facts) but no 3D work has begun.

## Next step
Push a trivial, safe commit (e.g. a comment or a `package.json` patch-version bump) to `main` in `/private/tmp/sushi-empire-review/sushi-empire/`, then open the Render dashboard for the `sushi-empire` service and check whether a deploy starts automatically (Events/Deploys tab) without clicking "Manual Deploy". If it doesn't fire within a couple minutes of the push, use the service's **"Connect"** button to reconnect the GitHub integration from scratch, rather than re-toggling Auto-Deploy again (that was already tried once).

## Then
1. Once auto-deploy is confirmed working (or fixed via reconnect), no further action needed on that front — just note it's resolved.
2. When ready to start the 3D kitchen scene: read `public/src/ui/kitchen-scene.js` first — it's a 4-function interface (init/render/update/teardown-style) that isolates all chef/plate/steam DOM manipulation from the rest of the UI. Swap its internals for a Three.js WebGL scene while keeping its exported function signatures the same, so the rest of `ui/render.js` and the HTML/CSS panels (which stay 2D permanently) don't need to change.
3. Before making further gameplay changes, do a live browser click-through first (not just unit/smoke tests) — this is how all 5 recent bugs were actually found; static verification (Vite build, greps, jsdom smoke tests) missed all of them because they were DOM/CSS/z-index/timing issues that only show up interactively.

## Suggested skills
- debug-mantra — if any new bug reports come in, use this before touching code: reproduce it live, trace the actual fail path, don't guess.
- post-mortem — after fixing and verifying the Render auto-deploy issue, write a short post-mortem so this doesn't get re-investigated from scratch if it recurs on another repo.

## Key decisions & facts
- **Non-obvious repo path — read this first:** The git root is `/private/tmp/sushi-empire-review/` (contains `.git`, `.gitignore`, and a nested `sushi-empire/` subfolder with all the actual game code). The real working directory for all code is `/private/tmp/sushi-empire-review/sushi-empire/`. **Do not use `~/sushi-empire`** — that's a stale, non-git, pre-refactor copy left over on disk that is unrelated to this work and must not be edited or referenced.
- **This path is under `/private/tmp`, which is ephemeral OS temp storage** and may be cleared on reboot or by cleanup tools. The authoritative copy is the GitHub remote (`main` branch, commit `2275860` at time of writing) — if the local `/private/tmp` copy is ever missing, `git clone` fresh from GitHub rather than assuming the repo is gone.
- GitHub remote: `https://github.com/tanapoljoe1-art/sushi-empire.git`, branch `main`.
- Deployed on Render at `sushi-empire.onrender.com`; the Render service's "Root Directory" setting is `sushi-empire` (matching the nested repo layout above).
- `server.js` serves the Vite-built `dist/` folder if it exists, otherwise falls back to serving `public/` directly — so the game runs with zero build step for quick local testing (`node server.js`), and `npx vite build` is only needed to produce the optimized bundle actually deployed.
- Module layout under `public/src/`: `core/state.js` (game state + save/load), `core/effects.js` (generic event-effect engine — this is what made random events actually apply their effects instead of just showing UI), `core/dom.js`, `data.js` (static game data — dishes, upgrades, achievements, events), `systems/*.js` (one module per gameplay system, e.g. `events.js`, `progress.js`), `ui/render.js` (renders all UI panels/tabs), `ui/background.js` (unified what used to be two duplicate canvas particle systems), `ui/kitchen-scene.js` (the chef/plate/steam visual — the deliberate future-3D swap point, see "Then" above).
- User's stated long-term intent: keep all HTML/CSS UI panels (money display, upgrade lists, tabs, modals) as 2D permanently; only the kitchen/chef/plate/steam visual behind them should eventually become a 3D Three.js scene.
- The 5 bugs fixed in `2275860`, for reference when reviewing that commit:
  1. `defaultState().up` in `core/state.js` was missing the `golden`/`mastery`/`franchise` upgrade keys, causing those upgrades to show `Lv.undefined/3` and `NaN฿` and be unbuyable. Fixed in `defaultState()` plus a `load()`-time merge so existing save files (missing those keys) get repaired too.
  2. `.cookwrap` (the main "ทำซูชิ!" cook button, i.e. the entire core gameplay loop) and `.bnav` (bottom nav bar) both sat at `bottom:0` in CSS; `.bnav`'s higher `z-index` made the cook button completely unclickable in production. Fixed in `style.css` by raising `.cookwrap` above the nav bar.
  3. The achievement list rendering read `a.emoji`, but entries in the `ACHIEVEMENTS` data actually use the field `a.icon` — fixed in `systems/progress.js`.
  4. `triggerRandomEvent()` had no guard against an already-open modal, so a random event's popup could stack on top of an achievement/prestige modal (same z-index, later-in-DOM wins), making the modal underneath unclickable. Fixed with a `document.querySelector('.mbg.vis')` guard in `events.js`.
  5. `checkAch()` displayed the achievement-unlock modal synchronously inside a `forEach`, so multiple simultaneous unlocks overwrote each other's popup (money was still granted correctly, but only the last popup ever displayed). Fixed with a small `achQueue` in `game.js` so unlocks show one after another.
  - All 5 were verified live via a local `node server.js` session (using localStorage money/level cheats to reach high-tier content quickly) before pushing.

## Dead ends
- Re-toggling Render's Auto-Deploy setting a second time is not a new idea to try — it was already toggled off/on once as the current fix attempt; if it's still broken, go straight to reconnecting via the "Connect" button instead (see Next step).
- Do not assume the Render GitHub App lacks permissions — this was explicitly checked at `github.com/settings/installations` and confirmed to already have "All repositories" access. The failure is a stale webhook subscription from the repo delete+recreate, not a permissions issue.
- Mid-recreation of the GitHub repo, a stale local `main` ref was briefly force-pushed by mistake (leftover from before the delete), overwriting `origin/main` with old history for a moment. It was caught immediately (by checking `origin/main`'s log and noticing the wrong commit hash) and corrected with a second force-push of the correct fresh history. The repo now has a clean, single-commit history from the recreation point forward — no cleanup needed, just don't be alarmed if `git log` looks unusually short.

## Where things live
- Local working code: `/private/tmp/sushi-empire-review/sushi-empire/` (git root one level up, see Key decisions & facts).
- GitHub: `https://github.com/tanapoljoe1-art/sushi-empire` (branch `main`).
- Live deployment: `https://sushi-empire.onrender.com` (Render dashboard → service `sushi-empire` → Settings → Deploy, for the Auto-Deploy toggle and "Connect" button referenced above).
- Local dev/test: `node server.js` from `/private/tmp/sushi-empire-review/sushi-empire/` (serves `public/` with no build step); `npx vite build` then restart `server.js` to test the production `dist/` bundle.
