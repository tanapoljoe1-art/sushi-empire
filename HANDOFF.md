# Handoff — Sushi Empire game (2026-07-21, รอบ 15 — Hidden achievements)

## เอกสารแผน / ไอเดีย (อ่านก่อนทำงานต่อ)

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| **`BACKLOG-IDEAS.md`** | **ไอเดียทั้งหมด + สถานะ ✅/🔜/📋 — source of truth ว่างานอะไรค้าง** |
| **`ROADMAP-30-DAYS.md`** | จัด sprint 30 วัน |
| **`HANDOFF.md`** (ไฟล์นี้) | path, deploy, ข้อเท็จจริงเทคนิค |

> **Repo อาจเคยอยู่ใต้ `/private/tmp` ซึ่งหายหลัง reboot**  
> **Working copy ปัจจุบัน (ถาวร):** `/Users/noblemonobluefin/projects/sushi-empire-review/`  
> **ควร commit + push** เอกสาร + โค้ดขึ้น GitHub ทุกครั้งที่จบรอบ

## Goal
Sushi Empire = idle/incremental ทำซูชิในเบราว์เซอร์ เป้าหมายระยะยาว: อาณาจักรที่มี decision + fantasy ครัว (2D UI ถาวร, kitchen อาจเป็น 3D) + social เบา

## State

- **HEAD:** ดู `git log -1` (รอบ 15 หลัง push)
- **version:** `1.1.0`
- **Done รอบ 15 (Grok, ต่อจากรอบ 14):**
  1. **Hidden achievements (14 รายการ)** — flag `hidden:true` ใน `ACHIEVEMENTS` (`data.js`)
  2. **ตัวนับใหม่** (persist + ผ่าน prestige): `perfectCount`, `orderMatchCount`, `orderMatchStreak`, `maxOrderMatchStreak`, `festivalHosted`, `rivalWins`, `secretServed`, `fusionServed`
  3. **UI รายการลับ** — ล็อคแล้วโชว์ `???` / ❓ / “เงื่อนไขลับ”; หัวหน้าแท็บโชว์ `ปลดแล้ว X/Y · ลับ A/B`; modal เปลี่ยนหัวข้อเป็น “🔒 ปลดล็อคลับ!”
  4. **Wire เช็ค** — serve / Perfect / festival / rival claim / hire staff / equip deco / premium BP / story flag
- **Done รอบ 14 (Claude):** XSS escape, LB rate limit + name sanitize, modal stacking critic/VIP, event pacing 55s, info-carousel Daily/Season/Market, mobile header wrap overflow (`6d5a6e8`)
- **Open infra:** Render auto-deploy **ยังพัง** — หลัง push ต้อง **Manual Deploy → Deploy latest commit** บน dashboard (ดู `POSTMORTEM-RENDER-AUTODEPLOY.md`)

## Next step (แนะนำ)
1. **Manual deploy** บน Render แล้ว live smoke (มือถือ 360px + desktop)
2. Telemetry เบา / polish (toast clutter, a11y)
3. Banner declutter รอบต่อไป (rival + festival) ถ้ายังรก
4. Leaderboard score plausibility ฝั่ง server (อ่าน multiplier stack ก่อน ห้ามเดา)
5. Tiered bronze/silver/gold achievements หรือ showcase บน title

## Then (เทคนิคเดิม ยังใช้ได้)
1. Auto-deploy: ลองปุ่ม **Connect** GitHub บน Render (อย่า toggle Auto-Deploy ซ้ำ — ยืนยันแล้วว่าไม่ได้ผล)
2. 3D kitchen: แตะแค่ `public/src/ui/kitchen-scene.js` คง signature เดิม
3. ก่อน ship ทุกครั้ง: `npx vite build` + live browser click-through

## Key decisions & facts
- **Repo path (ถาวร):** git root = `/Users/noblemonobluefin/projects/sushi-empire-review/` · โค้ดเกม = `sushi-empire/`  
  อย่าใช้ `~/sushi-empire` (สำเนาเก่า pre-refactor)
- GitHub: `https://github.com/tanapoljoe1-art/sushi-empire.git` · branch `main`
- Live: `https://sushi-empire.onrender.com` · Root Directory บน Render = `sushi-empire`
- `server.js` เสิร์ฟ `dist/` ถ้ามี ไม่งั้น `public/` ตรง ๆ
- **Save key:** `localStorage['SE5']` · `SAVE_VERSION = 6` (ตัวนับ ach ใหม่ normalize ตอน load โดยไม่ bump version)
- **`escapeHtml`** ใน `core/dom.js` — ใช้กับชื่อ/แชท ทุกที่ที่ `innerHTML`
- **`.info-carousel`** ห่อ Daily/Season/Market; rival + festival ยังอยู่นอก carousel (actionable)
- **F1 cheat** (+100,000฿) ตั้งใจเก็บ — อย่าเอาออก
- **Hidden ach pattern:** ใส่ `hidden:true` บน entry ใน `ACHIEVEMENTS`; `chk(G)` ใช้ตัวนับหรือ state ที่มีอยู่; `renderAch` จัดการ spoiler เอง

### Hidden list (รอบ 15)
| id | เงื่อนไขสั้น |
|----|-------------|
| h_perf1 / h_perf25 | Perfect 1 / 25 |
| h_match50 | สั่งตรง 50 |
| h_chain20 | สั่งตรงติด 20 (max streak) |
| h_fest3 | จัดเทศกาลเอง 3 |
| h_staff6 | จ้างครบ 6 ตำแหน่ง |
| h_deco4 | deco ครบ 4 ช่อง |
| h_secret | เสิร์ฟ omakase_ex |
| h_rival1 | claim rival weekly |
| h_critic | storyFlags.criticFriend |
| h_sk50 | streak ≥ 50 |
| h_bp_prem | battlePass.premium |
| h_prest3 | prestigeLevel ≥ 3 |
| h_fusOnly | เสิร์ฟ fusion 15 |

## Dead ends
- Toggle Render Auto-Deploy off/on ไม่แก้ webhook เก่า
- อย่าใส่ `#cookWrap` กลับใน `.shell`
- อย่าเดาเพดานคะแนน LB โดยไม่อ่าน earn stack

## Where things live
- Local: `/Users/noblemonobluefin/projects/sushi-empire-review/sushi-empire/`
- GitHub: `https://github.com/tanapoljoe1-art/sushi-empire`
- Live: `https://sushi-empire.onrender.com`
- Dev: `cd sushi-empire && node server.js` → http://127.0.0.1:3000/
