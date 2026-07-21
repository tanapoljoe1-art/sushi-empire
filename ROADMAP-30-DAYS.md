# Sushi Empire — Roadmap 30 วัน

เป้าหมาย: จาก “idle ที่มีระบบตื้น” → “อาณาจักรซูชิที่ตัดสินใจได้ มี fantasy และกลับมาเล่น”

**ไอเดียครบทุกข้อ + ติ๊กสถานะ:** ดู `BACKLOG-IDEAS.md` (อย่าพึ่งแชทอย่างเดียว)

สถานะ ณ วันที่เริ่มเฟสนี้ (2026-07-21): **P0 Honesty + Order Engine + Perfect Cook ลงโค้ดแล้ว** (ดูสรุปท้ายไฟล์)

---

## สัปดาห์ที่ 1 — Foundation ที่ผู้เล่นไว้ใจได้

| วัน | งาน | ผลลัพธ์ที่วัดได้ |
|-----|-----|------------------|
| 1–2 | ✅ P0 Honesty Pass (wire bonus ตาย, prestige keep fusion/deco) | ซื้อ upgrade/skill แล้วตัวเลขเปลี่ยนจริง |
| 2–3 | ✅ Order Engine + Perfect Cook | ลูกค้ามีออเดอร์, วงเขียว Perfect |
| 3 | ✅ Live click-through มือถือ + desktop (+ แก้ cook stacking) | ไม่มี regression ปุ่ม cook/serve/modal |
| 4 | ✅ Progressive unlock แท็บ | ผู้เล่นใหม่ไม่จมระบบ |
| 5 | ✅ HUD: ฿/min + earn breakdown | เข้าใจว่าทำไมเงินขึ้น |
| 6–7 | ✅ Event forecast + cooldown ต่อชนิด | event ไม่ spam, เตรียมตัวได้ |
| — | ✅ Customer types (tourist/foodie/influencer) | คิวมี identity |

**Definition of Done สัปดาห์ 1:** ผู้เล่นใหม่ 15 นาทีแรก “รู้ว่าต้องทำอะไร” และ bonus ทุกอย่างที่ UI บอกทำงานจริง

---

## สัปดาห์ที่ 2 — Core Fun ลึกขึ้น

| วัน | งาน | ผลลัพธ์ |
|-----|-----|--------|
| 8–9 | ✅ Customer types พื้นฐาน (tourist / foodie / influencer) | คิวมี identity — ยังไม่มี critic/spy |
| 10 | ✅ Daily Special เมนู | reason กลับมาเล่นรายวัน |
| 11–12 | ✅ Contextual minigame ตอน VIP/Critic | minigame ไม่อยู่แท็บเปล่า |
| 13 | ✅ Quest รางวัลหลาก (เงิน+ing+rating) | quest มีค่า mid-game |
| 14 | Balance pass ตัวเลข Lv.1–15 | ไม่ตัน / ไม่ระเบิดเร็วเกิน |

**DoD สัปดาห์ 2:** session 30 นาทีมี “ช่วงตึง” อย่างน้อย 3 ครั้ง (order mismatch, event, minigame)

---

## สัปดาห์ที่ 3 — Empire Identity

| วัน | งาน | ผลลัพธ์ |
|-----|-----|--------|
| 15–16 | ✅ Branch specialization พื้นฐาน | สลับสาขามีเหตุผล — ยังไม่มี manager assign |
| 17 | ✅ Assign staff ประจำสาขา (manager) | staff ไม่ใช่แค่ % รวม |
| 18–19 | ✅ Prestige shop (ใช้ดาวซื้อถาวร) | meta ไม่แบน |
| 20 | Story branching เบา ๆ + rival weekly | เนื้อเรื่องมีผล |
| 21 | Deco multi-slot (ผนัง/เคาน์เตอร์) + visual ครัว | collection มีความหมาย |

**DoD สัปดาห์ 3:** prestige รอบ 2 รู้สึกต่างจากรอบ 1 ชัดเจน

---

## สัปดาห์ที่ 4 — Fantasy + Social เบา

| วัน | งาน | ผลลัพธ์ |
|-----|-----|--------|
| 22–24 | ✅ Kitchen 2D theme ตามสาขา (3D ยังรอ) | ว้าวโดยยังไม่ Three.js |
| 25 | ✅ BGM 3 ชั้น + SFX ครัวพื้นฐาน | อารมณ์ร้าน |
| 26–27 | ✅ Three.js kitchen พื้นฐาน (polish ต่อได้) | ตาม handoff เดิม |
| 28 | ✅ Leaderboard + Spectate Socket.IO | multiplayer ไม่โป๊ะ |
| 29 | ✅ Export/import save + saveVersion + daily seed LB | ไม่เสียเซฟ · อันดับรายวัน |
| 30 | Polish + bug bash + เขียน post-mortem สั้น | ship-ready checkpoint |

**DoD สัปดาห์ 4:** คลิป 15 วินาทีโปรโมทได้ + อันดับ/แชร์มีอย่างน้อย 1 ช่องทางจริง

---

## ลำดับห้ามสลับ (กันงานพัง)

1. อย่าเพิ่ม content กองใหญ่ ถ้ายังมี flag ตาย  
2. อย่าเริ่ม 3D ถ้า core loop ยังแบน — ตอนนี้ order+perfect พอเริ่ม kitchen ได้  
3. อย่าทำ coop realtime ก่อน spectate/async leaderboard  

---

## สิ่งที่ลงโค้ดแล้วในรอบนี้ (สัปดาห์ 1 ต้น)

### P0 Honesty
- `goldenBonus` คูณรายได้ serve + idle  
- `xpMult` (mastery) คูณ rating ต่อเสิร์ฟ; fx เช็คเลเวลแล้ว  
- `idleMult` (franchise) + `decoIdleBonus` ใช้ใน idle/branch  
- Staff: rice discount, speed burst ทุก 5 เสิร์ฟ, premium +30%, VIP tip +50%, secret menu `omakase_ex`  
- Fusion tags (`Income+`, `Rating+`, `Streak+`, `Rush+`, `Idle+`, `ทุก bonus`) มีผลจริง  
- Prestige เก็บ `fusion` + `deco`

### Order Engine
- ลูกค้ามี `wantedMenuId` / emoji บนหัวคิว  
- เสิร์ฟตรง +25% เงิน + rating; ผิดเมนู −35% เงิน  

### Perfect Cook
- วงเขียว ~78–92% ของวงทำ  
- แตะปุ่ม cook อีกครั้งในโซน → Perfect (+35% เงิน, +rating, toast)  
- AutoChef ได้แค่ Good  

### ไฟล์หลักที่แตะ
- `public/src/systems/game.js`, `events.js`, `staff.js`, `fusion.js`  
- `public/src/core/state.js`, `data.js`  
- `public/src/ui/render.js`, `main.js`  
- `public/index.html`, `public/style.css`  

---

## เช็คลิสต์ก่อนปิดแต่ละสัปดาห์

- [ ] `npx vite build` ผ่าน  
- [ ] เล่นมือจริง 10 นาที (ไม่ใช่แค่ build)  
- [ ] เซฟเก่า load ได้  
- [ ] ไม่มี modal ซ้อน / ปุ่ม cook ถูกบัง  
