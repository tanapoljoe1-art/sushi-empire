# Handoff — Sushi Empire game (2026-07-21)

## เอกสารแผน / ไอเดีย (อ่านก่อนทำงานต่อ)

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| **`BACKLOG-IDEAS.md`** | **ไอเดียทั้งหมด + สถานะ ✅/🔜/📋 — source of truth ว่างานอะไรค้าง** |
| **`ROADMAP-30-DAYS.md`** | จัด sprint 30 วัน |
| **`HANDOFF.md`** (ไฟล์นี้) | path, deploy, ข้อเท็จจริงเทคนิค |

> โฟลเดอร์นี้อยู่ใต้ `/private/tmp` — อาจหายหลัง reboot  
> **ควร commit + push** `BACKLOG-IDEAS.md` และ `ROADMAP-30-DAYS.md` ขึ้น GitHub

## Goal
Sushi Empire = idle/incremental ทำซูชิในเบราว์เซอร์ เป้าหมายระยะยาว: อาณาจักรที่มี decision + fantasy ครัว (2D UI ถาวร, kitchen อาจเป็น 3D) + social เบา

## State

- **Done (ก่อนหน้า):**
  - ES-module + Vite; 5 gameplay bugs ใน `2275860`; event system + decorations ถูก wire บางส่วน
  - Auto-deploy test push `d2f8197` (package 1.0.1) — **auto-deploy ยังไม่ยิง** (last-modified ค้างที่ deploy มือ)

- **Done (working tree รอบไอเดีย — ตรวจ `git status` ว่า commit แล้วหรือยัง):**
  - P0 Honesty: golden/xp/idle/decoIdle + staff skills หลัก + fusion tags + prestige keep fusion/deco
  - Order Engine + Perfect Cook window
  - เอกสาร backlog + roadmap 30 วัน

- **In progress / open infra:**
  - Render auto-deploy หลัง repo recreate → ใช้ปุ่ม **Connect** (อย่า toggle Auto-Deploy ซ้ำ)
  - Commit/push งาน gameplay + เอกสาร backlog

- **Not started (ดูรายการเต็มใน BACKLOG-IDEAS.md):**
  - Progressive unlock, customer types, branch specialization, prestige shop, 3D kitchen, BGM, socket multiplayer จริง, ฯลฯ

## Next step (แนะนำ)
1. อ่าน `BACKLOG-IDEAS.md` ส่วน **🔜 คิวถัดไป**
2. Commit งาน P0/Order/Perfect + เอกสาร แล้ว push (และ/หรือ reconnect Render)
3. Live click-through → progressive unlock แท็บ / HUD ฿/min ตาม roadmap

## Then (เทคนิคเดิม ยังใช้ได้)
1. Auto-deploy: Connect GitHub ใหม่บน Render ถ้ายังพัง
2. 3D kitchen: แตะแค่ `public/src/ui/kitchen-scene.js` คง signature เดิม
3. ก่อน ship ทุกครั้ง: live browser click-through

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
