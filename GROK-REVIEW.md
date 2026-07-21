# Scrutinize — for Grok to fix (2026-07-21)

Two review passes against current `HEAD` (`baf7f46`). Not a to-do list of style nits —
everything below either crashes, silently drops progress, or is a testing gap that would
hide a regression. Findings are anchored to the CURRENT file state, already re-checked
against fixes from the round-20.1 audit — don't re-fix anything already fixed.

## Pass 2 — Grok feature-dump (b6ee5c2..bf90c22, 15 commits) vs current HEAD

### 1. [BLOCKER-class, low-probability] `normalizeLoadedState()` has a real crash path via `deco.slots`, and it silently defeats every later guard in the function when it fires

- **Finding:** `public/src/core/state.js:259` — `if (!G.deco.slots) G.deco.slots = {...}` only checks truthiness, not type. If a save's `deco.slots` is ever a truthy non-object (e.g. a corrupted/tampered string), the next line's `DECO_SLOTS.forEach(s => { if (!(s in G.deco.slots)) ... })` (`state.js:260`, duplicated at `decoration.js:12-14`) throws `TypeError: Cannot use 'in' operator to search for 'wall' in <value>` — confirmed with a live Node repro (`'wall' in 'corrupted'` throws).
- **Why it matters:** `load()` (`state.js:340-369`) wraps the whole thing in try/catch, so this doesn't white-screen the game — but the crash happens *midway through* `normalizeLoadedState`, and `G` was already reassigned to the migrated-but-unfinished object at `state.js:249` before the throw. Every guard written *after* line 260 never runs: money/level/served clamping (`state.js:311-313`), quest/achievement-counter normalization, `prestShop`/`branchManagers`/`eventCooldowns` defaults, branch-array merge, and the `applyUpgradeFxWithCaps()` + idle-earnings step in `load()` itself. One fragile line silently disables ~15 unrelated safety checks this project has specifically added after past corrupt-save incidents.
- **Evidence:** `migrateSave()` (`state.js:206`) has the *correct* guard for the same field — `if (!data.deco.slots || typeof data.deco.slots !== 'object')` — but only runs inside its `if (v < 3)` block, so it's skipped for any save already at the current schema version. The two later copies of this guard (`state.js:259`, `decoration.js:12`) both dropped the `typeof` check. It's a copy-paste asymmetry between three near-identical blocks, not a one-off typo.
- **Suggested change:** add the same `typeof G.deco.slots !== 'object'` check to `state.js:259` and `decoration.js:12`. Better: since this "truthy-but-wrong-type" guard pattern is duplicated three times for one field, consider a single `ensureDecoSlots(obj)` helper shared by `migrateSave`, `normalizeLoadedState`, and `decoration.js`'s `ensureDeco()` so future schema changes only need fixing in one place.

### 2. Checked and ruled out — no new findings, don't re-investigate
- **XSS/unescaped-`innerHTML` sweep** across every system file introduced in the feature dump (`decoration.js`, `market.js`, `coach.js`, `prestige-shop.js`, `battlepass.js`, `season.js`, `daily.js`, `events.js`, `debug.js`, `story.js`): all interpolate only static/developer-authored data (menu items, ingredient names, event templates) — no player-supplied string reaches any of them unescaped. `spectate.js`/`progress.js`/`rival.js` were already covered by the round-20.1 audit and remain correctly escaped.
- **Load-time cap enforcement:** `applyUpgradeFxWithCaps()`, `applyAllStaffBonuses()`, `applyDecoBonus()`, and `recomputePrestigeMult()` are all called fresh at boot (`main.js:60,77-79`, right after `load()`) and each *recomputes* its bonus from the underlying source of truth (`G.up`, `G.staff`, `G.deco`, `G.prestigeLevel`) with its own clamp — none of them trust a raw saved multiplier value. A tampered/stale `G.staffIncomeBonus` etc. in a save file gets overwritten on every boot, not read. This generalizes the round-20.1 "idle used uncapped upgrades" fix correctly across all four bonus systems — no sibling bug found.
- **Server/multiplayer surface** (leaderboard, chat, reactions, room codes): traced in the prior pass this session, still solid, not re-reviewed here.

**Verdict for this pass: fix-then-ship.** One real fix (finding #1), narrow and mechanical — add a `typeof` check in two places, or better, deduplicate into one helper.

---

## Pass 1 — commit `baf7f46` (deep-test suite + fusion/title hardening)

Both hardening changes in this commit are correct: `state.js`'s `G.fusion`/`discovered`/`newDisc`
null-guards, and `main.js` exposing `initTitleScreen` on `window` (used by `nav.js:150,280,290`).

The new `scripts/deep-test.mjs` suite genuinely passes 58/58 live (verified by running it,
not trusting the commit message) — but three issues in the suite itself, before treating it
as real regression coverage:

1. **Four assertions can never fail** (`deep-test.mjs:155,179,365-366,452`) — hardcoded `ok(name, true, ...)`. `O1` (line 452) is supposed to guard the exact AFK-idle-load-order bug fixed in the round-20.1 audit but asserts nothing about the actual post-idle state. Fix: assert real values, e.g. `g.qSize <= 6 && g.speedMult <= 3.05` on state read after the idle-triggering reload.
2. **Score/prestige formulas are hand-copied, not imported** (`deep-test.mjs:16-25,40-44` vs. real `server.js:50-56` and `game.js:1207-1211`) — they match today, but a future edit to the real formula won't be caught since the test checks its own duplicate copy. Fix: export `prestigeIncomeMultAt` from `game.js` and import the real `calcScoreServer` instead of re-deriving both in the test file.
3. **No server lifecycle in `npm run test:deep`** — assumes port 3000 is already up; a cold run fails on connection/timeout indistinguishable from a real regression. Fix: minimal pretest that boots the server, polls `/health`, runs the suite, tears down.

Not a bug (checked): the `✗` in the `J1 earn preview` assertion output is the intentional
order-mismatch indicator (`render.js:289`), not a rendering glitch.

**Verdict for this pass: fix-then-ship** — the two shipped hardening changes are fine as-is;
the suite needs the tautological asserts fixed before it should be trusted as a safety net.
