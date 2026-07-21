# Handoff — Sushi Empire game (2026-07-21, รอบ 6)

## เอกสารแผน / ไอเดีย (อ่านก่อนทำงานต่อ)

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| **`BACKLOG-IDEAS.md`** | **ไอเดียทั้งหมด + สถานะ ✅/🔜/📋 — source of truth ว่างานอะไรค้าง** |
| **`ROADMAP-30-DAYS.md`** | จัด sprint 30 วัน |
| **`HANDOFF.md`** (ไฟล์นี้) | path, deploy, ข้อเท็จจริงเทคนิค |

> โฟลเดอร์นี้อยู่ใต้ `/private/tmp` — อาจหายหลัง reboot  
> **ควร commit + push** เอกสาร + โค้ดขึ้น GitHub ทุกครั้งที่จบรอบ

## Goal
Sushi Empire = idle/incremental ทำซูชิในเบราว์เซอร์ เป้าหมายระยะยาว: อาณาจักรที่มี decision + fantasy ครัว (2D UI ถาวร, kitchen อาจเป็น 3D) + social เบา

## State

- **Done (commits ก่อนรอบนี้):** P0 honesty, Order+Perfect, unlocks, events, customers, daily special, context MG, quests, branch spec, prestige shop, BGM, LB, kitchen 2D/3D, managers, spectate (`4462e56` ต้นรอบ)

- **Done (รอบ 6 — ตรวจ `git log`):**
  - Export/import save + checksum wrapper `SUSHI_EMPIRE_SAVE`
  - `saveVersion` + migrate v1→v2 (เขียนกลับ localStorage ทันที)
  - Daily seed leaderboard (UTC day · โหมด วันนี้/รวม · server แยก board)
  - Cook button stacking fix: ย้าย `#cookWrap` ออกนอก `.shell`, `z-index:180`, toast `pointer-events:none`
  - Playwright click-through mobile 390×844 + desktop 1280×800 (cook hit = cookBtn, export UI, LB, import load)
  - Menu-tint sushi blob ใน Three.js kitchen

- **In progress / open infra:**
  - Render auto-deploy หลัง repo recreate → ใช้ปุ่ม **Connect** (อย่า toggle Auto-Deploy ซ้ำ)
  - Post-mortem webhook หลัง fix

- **Not started (ดู BACKLOG 🔜):**
  - Balance pass Lv.1–15
  - Story branching + rival weekly
  - Deco multi-slot + visual
  - Battle pass, ฯลฯ

## Next step (แนะนำ)
1. Balance pass ตัวเลข mid-game (Lv.1–15) — เล่น/สเปรดชีต ฿/s
2. Story choice flags + rival weekly เบา
3. Render Connect + เขียน post-mortem webhook
4. Live deploy smoke หลัง push

## Then (เทคนิคเดิม ยังใช้ได้)
1. Auto-deploy: Connect GitHub ใหม่บน Render ถ้ายังพัง
2. 3D kitchen: แตะแค่ `public/src/ui/kitchen-scene.js` คง signature เดิม
3. ก่อน ship ทุกครั้ง: `npx vite build` + live browser click-through

## Suggested skills
- debug-mantra — if any new bug reports come in, use this before touching code: reproduce it live, trace the actual fail path, don't guess.
- post-mortem — after fixing and verifying the Render auto-deploy issue, write a short post-mortem so this doesn't get re-investigated from scratch if it recurs on another repo.

## Key decisions & facts
- **Non-obvious repo path — read this first:** The git root is `/private/tmp/sushi-empire-review/` (contains `.git`, `.gitignore`, and a nested `sushi-empire/` subfolder with all the actual game code). The real working directory for all code is `/private/tmp/sushi-empire-review/sushi-empire/`. **Do not use `~/sushi-empire`** — that's a stale, non-git, pre-refactor copy left over on disk that is unrelated to this work and must not be edited or referenced.
- **This path is under `/private/tmp`, which is ephemeral OS temp storage** and may be cleared on reboot or by cleanup tools. The authoritative copy is the GitHub remote (`main` branch) — if the local `/private/tmp` copy is ever missing, `git clone` fresh from GitHub rather than assuming the repo is gone.
- GitHub remote: `https://github.com/tanapoljoe1-art/sushi-empire.git`, branch `main`.
- Deployed on Render at `sushi-empire.onrender.com`; the Render service's "Root Directory" setting is `sushi-empire` (matching the nested repo layout above).
- `server.js` serves the Vite-built `dist/` folder if it exists, otherwise falls back to serving `public/` directly — so the game runs with zero build step for quick local testing (`node server.js`), and `npx vite build` is only needed to produce the optimized bundle actually deployed.
- Module layout under `public/src/`: `core/state.js` (game state + save/load + export/import), `core/effects.js`, `core/dom.js`, `data.js`, `systems/*.js`, `ui/render.js`, `ui/background.js`, `ui/kitchen-scene.js`.
- User's stated long-term intent: keep all HTML/CSS UI panels as 2D permanently; only the kitchen/chef/plate/steam visual behind them should eventually become a 3D Three.js scene.
- **Save key:** `localStorage['SE5']`. Export wrapper magic: `SUSHI_EMPIRE_SAVE` with FNV-ish checksum. `SAVE_VERSION = 2`.
- **Cook button stacking:** `#cookWrap` must live **outside** `.shell` (shell creates `z-index:1` stacking context). Cook z=180, bnav z=200, modals z=300.
- **Daily LB:** server keeps `leaderboard` (all-time) + `dailyLeaderboard` (UTC day); client emits `{ mode: 'daily'|'all' }` and payload `{ mode, day, rows }`. Local keys: `SE5_lb` and `SE5_lb_D_YYYY-MM-DD`.
- Playwright is a **devDependency** for local smoke tests only (not required on Render).

## Dead ends
- Re-toggling Render's Auto-Deploy setting a second time is not a new idea to try — go straight to reconnecting via the "Connect" button instead.
- Do not assume the Render GitHub App lacks permissions — already "All repositories". Failure is stale webhook from repo delete+recreate.
- Do not put `#cookWrap` back inside `.shell` — stacking context will bury the cook button under menu grid again on mobile.

## Where things live
- Local working code: `/private/tmp/sushi-empire-review/sushi-empire/` (git root one level up).
- GitHub: `https://github.com/tanapoljoe1-art/sushi-empire` (branch `main`).
- Live deployment: `https://sushi-empire.onrender.com`
- Local dev/test: `node server.js` from `sushi-empire/`; `npx vite build` then restart for production `dist/`.
