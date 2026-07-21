# Handoff — Sushi Empire game (2026-07-21, รอบ 14 — Claude review of Grok's รอบ 7-13)

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

- **HEAD:** `c2a97ca` (รอบ 14 — ดู git log)
- **Done รอบ 14 (Claude, ไม่ใช่ Grok):** รีวิว diff ทั้งหมดที่ Grok ทำ (รอบ 7-13, `b6ee5c2..bf90c22`, 15 commits) ทั้ง static review (agent) + live click-through พร้อมกัน แล้วแก้:
  1. **XSS 2 จุด** — ชื่อผู้เล่นถูกยัดลง `innerHTML` ตรงๆ ทั้งใน leaderboard (`progress.js`) และ spectate chat/HUD (`spectate.js`) ไม่ escape เลย แก้ด้วย `escapeHtml()` ใหม่ใน `core/dom.js`
  2. **Server เชื่อ client เปล่าๆ** — `submitScore` ไม่มี rate limit ไม่ sanitize ชื่อ เพิ่ม rate limit 3s/socket + cap ความยาวชื่อฝั่ง server (**ยังไม่มี** เพดานตรวจคะแนนสมเหตุสมผล — ตั้งใจไม่ใส่ เพราะสูตร prestige/multiplier ซับซ้อนเกินจะเดาโดยไม่เสี่ยงบล็อกคนเล่นจริง)
  3. **Modal ซ้อนกัน** — event `critic` ที่มี `guaranteedVip` เปิด VIP modal + critic challenge modal พร้อมกัน แก้ให้ critic challenge poll รอ modal อื่นปิดก่อน
  4. **`depthAttenuation`** dead property บน `PointsMaterial` (ไม่มีจริง เป็น no-op สแปม console) — ลบทิ้ง
  5. **Event pacing** ถี่เกินไป (28s min-gap) ผู้ใช้บ่นว่า "รกมากๆ" ขยายเป็น 55s + ลด base chance
  6. **Home screen banner declutter** — รวม Daily Special/Season/Market (เดิมซ้อน 3 บล็อกเต็มความกว้าง) เป็น swipeable carousel เดียว (`.info-carousel`, CSS scroll-snap) ลดความสูงหน้าแรกก่อนถึง kitchen scene ~110-120px
  - F1 debug cheat (รอบ 13) **ตั้งใจเก็บไว้** ผู้ใช้ยืนยันแล้วว่าไม่ใช่บั๊ก
- **Open infra:** Render auto-deploy **ยืนยันแล้วว่ายังพัง** — push `839d193` แล้วรอ 15+ นาที เช็คผ่าน curl บน live bundle ยังเป็นโค้ดเก่า ต้อง **Manual Deploy → Deploy latest commit** เองทุกครั้งหลัง push (ดู `POSTMORTEM-RENDER-AUTODEPLOY.md` — การ toggle Auto-Deploy off/on ที่ลองไปรอบก่อนไม่ได้ผลจริง ยังไม่ได้ลอง reconnect ผ่านปุ่ม "Connect")

## Next step (แนะนำ)
1. **Render Connect ใหม่ (ลองปุ่ม "Connect" ไม่ใช่ toggle Auto-Deploy)** + verify push→deploy จริงๆ ด้วยการ push แล้วรอดูว่า live bundle เปลี่ยนไหมโดยไม่ต้องกด Manual Deploy
2. เพิ่มเพดานตรวจสอบความสมเหตุสมผลของคะแนน leaderboard ฝั่ง server (ต้องเข้าใจสูตร prestige/multiplier stack ทั้งหมดก่อน ไม่ใช่เดา)
3. Banner declutter รอบต่อไปถ้าต้องการ: rival banner + festival row ยังเป็นบล็อกแยก ยังไม่ได้รวม
4. Hidden achievements
5. Telemetry / polish
6. Live smoke หลัง deploy

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
- **Save key:** `localStorage['SE5']`. Export wrapper magic: `SUSHI_EMPIRE_SAVE` with FNV-ish checksum. `SAVE_VERSION = 5` (deco slots + storyFlags + rivalWeekly).
- **Cook button stacking:** `#cookWrap` must live **outside** `.shell` (shell creates `z-index:1` stacking context). Cook z=180, bnav z=200, modals z=300.
- **Daily LB:** server keeps `leaderboard` (all-time) + `dailyLeaderboard` (UTC day); client emits `{ mode: 'daily'|'all' }` and payload `{ mode, day, rows }`. Local keys: `SE5_lb` and `SE5_lb_D_YYYY-MM-DD`.
- Playwright is a **devDependency** for local smoke tests only (not required on Render).
- **`escapeHtml(str)`** lives in `core/dom.js` next to `getEl` — use it for ANY user-supplied text (player name, chat msg) going into `innerHTML`. Two sites already use it: `progress.js` (leaderboard rows) and `spectate.js` (chat lines + viewer HUD). If you add a new place that renders `G.playerName` or socket-received `name`/`msg` fields, escape it there too — this codebase has no framework-level auto-escaping.
- **`sanitizeName(name, fallback)`** in `server.js` — trims + caps to 20 chars. Applied at every socket handler that accepts a name (`createRoom`, `joinRoom`, `submitScore`). Compare against the sanitized name (`cleanName`), not the raw destructured `name` param, when doing `leaderboard.find(...)`/`filter(...)` — using the raw one was the actual bug before this fix.
- **`.info-carousel`** (`style.css` + `initInfoCarousel()` in `ui/render.js`) wraps `#dailySpecialBanner`/`#seasonBanner`/`#marketBanner` as a CSS scroll-snap strip. Each banner's own render function (`daily.js`/`season.js`/`market.js`) is untouched — they still just toggle `style.display`. If you add a 4th info-only banner to the home screen, put its div inside `#infoCarousel` rather than stacking a new full-width block; `initInfoCarousel()` auto-builds one dot per child, no extra wiring needed. `rivalBanner` and `.fest-row` deliberately stayed outside the carousel since they're actionable (progress bar / spend-money button), not pure info.

## Dead ends
- Re-toggling Render's Auto-Deploy setting is CONFIRMED not to work (tested again รอบ 14: pushed, waited 15+ min, live bundle still stale) — go straight to reconnecting via the "Connect" button instead, don't waste a round re-trying the toggle.
- Do not assume the Render GitHub App lacks permissions — already "All repositories". Failure is stale webhook from repo delete+recreate.
- Do not put `#cookWrap` back inside `.shell` — stacking context will bury the cook button under menu grid again on mobile.
- Don't try to guess a leaderboard score plausibility formula without first reading every earn-multiplier source (upgrades, prestige, franchise, season, market, staff, decorations) — a wrong ceiling silently caps legitimate late-game players, which is worse than the cheat risk it's meant to stop.

## Where things live
- Local working code: `/private/tmp/sushi-empire-review/sushi-empire/` (git root one level up).
- GitHub: `https://github.com/tanapoljoe1-art/sushi-empire` (branch `main`).
- Live deployment: `https://sushi-empire.onrender.com`
- Local dev/test: `node server.js` from `sushi-empire/`; `npx vite build` then restart for production `dist/`.
