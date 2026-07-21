# Handoff — Sushi Empire game (2026-07-21, รอบ 16 — polish / telemetry / LB trust)

## เอกสารแผน / ไอเดีย

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| **`BACKLOG-IDEAS.md`** | ไอเดีย + สถานะ source of truth |
| **`ROADMAP-30-DAYS.md`** | sprint 30 วัน |
| **`HANDOFF.md`** (ไฟล์นี้) | path, deploy, next step |

> Working copy ถาวร: `/Users/noblemonobluefin/projects/sushi-empire-review/`  
> อย่าใช้ `~/sushi-empire` · อย่าเก็บใต้ `/private/tmp`

## State

- **version:** `1.2.0`
- **HEAD:** ดู `git log -1` หลัง push รอบนี้
- **Done รอบ 16:**
  1. **Telemetry เบา (local only)** — `systems/telemetry.js` · key `SE5_tel` · serve/perfect/miss/level/prestige/event · time-to-Lv5/15/P1 · แสดงใน debug panel
  2. **Toast polish** — dedupe 1.2s + queue สูงสุด 2 ข้อความ (ลด spam)
  3. **Haptic** เบาตอน Perfect (`navigator.vibrate`)
  4. **Title showcase** — โชว์ถึง 4 achievements ชั้นสูงสุดบน title + จำนวน 🏆 ใน save preview
  5. **Ach tiers** — Bronze / Silver / Gold ตาม `reward` (≥600 silver, ≥2000 gold)
  6. **Quest ใหม่** — daily Perfect 5, max streak 10; weekly Perfect 25 · track `perfects` / `maxStreakToday` / `perfectsWeek`
  7. **Server LB score trust** — คำนวณคะแนนฝั่ง server จาก `served/level/prestige/money` (สูตรเดียวกับ client) · clamp stats · ถ้า client ยัดคะแนนเกิน expected+50 จะถูกตัดลง
  8. **Home action strip** — ห่อ rival + festival ใน `#homeActionStrip`
  9. **Customer type tooltips** บนคิว (ภาษาไทย)
- **Done รอบ 15:** Hidden achievements 14 + counters
- **Done รอบ 14:** XSS, event pacing, carousel, mobile header wrap
- **Open infra:** Render auto-deploy ยังพัง → **Manual Deploy** ทุกครั้งหลัง push

## Next step
1. Manual deploy บน Render + live smoke จริง
2. (optional) Telemetry dashboard ใน settings สำหรับผู้เล่น (ไม่ใช่แค่ debug)
3. Showcase บน title คลิกไปแท็บ ach
4. Soft-cap economy / balance pass mid-late
5. อย่าเดา earn-ceiling เพิ่มนอกสูตร `calcScore` ที่ sync แล้ว

## Key facts
- GitHub: `https://github.com/tanapoljoe1-art/sushi-empire` · `main`
- Live: `https://sushi-empire.onrender.com` · Root Directory = `sushi-empire`
- Local: `cd sushi-empire && node server.js` → :3000
- Save: `SE5` · Telemetry: `SE5_tel` · Debug: `SE5_debug`
- `calcScore` client (`progress.js`) ต้อง match `calcScoreServer` (`server.js`)
- F1 = +100k ตั้งใจเก็บ

## Smoke รอบนี้ (Playwright 360/390)
- ach list 35 · secret 14 · tiers 35
- header overflow false @360px
- homeActionStrip + festivalBtn present
- pageerror ว่าง
- vite build ผ่าน
