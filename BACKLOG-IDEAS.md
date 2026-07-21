# Sushi Empire — Backlog ไอเดียทั้งหมด (ต้องทำต่อ)

**ไฟล์นี้คือ source of truth สำหรับงานที่ยังไม่ทำ**  
อัปเดตสถานะในตารางเมื่อทำเสร็จ — อย่าพึ่งความจำจากแชท

| เอกสารที่เกี่ยวข้อง | หน้าที่ |
|---------------------|--------|
| `BACKLOG-IDEAS.md` (ไฟล์นี้) | ไอเดียครบทุก engine + สถานะ |
| `ROADMAP-30-DAYS.md` | จัดลำดับ 30 วัน / sprint |
| `HANDOFF.md` | สถานะ repo, deploy, path, next step เทคนิค |

**Repo path:** git root = `/private/tmp/sushi-empire-review/` · โค้ดเกม = `sushi-empire/`  
**อย่าใช้** `~/sushi-empire` (สำเนาเก่า)  
**Remote:** `https://github.com/tanapoljoe1-art/sushi-empire` · branch `main`  
**Live:** `https://sushi-empire.onrender.com`  
**หมายเหตุ:** `/private/tmp` อาจถูกลบหลัง reboot — push เอกสารนี้ขึ้น GitHub ด้วย

**ลำดับห้ามสลับ**
1. อย่าเพิ่ม content กองใหญ่ ถ้ายังมี flag/bonus ตาย  
2. อย่าเริ่ม 3D ถ้า core loop ยังแบน (order+perfect ลงแล้ว → เริ่ม kitchen 2D/3D ได้)  
3. อย่าทำ coop realtime ก่อน spectate / async leaderboard  

**กฎก่อน ship ทุกรอบ**
- `npx vite build` ผ่าน  
- เล่นมือจริง 10+ นาที (ไม่ใช่แค่ unit test)  
- เซฟเก่า load ได้  
- ไม่มี modal ซ้อน / ปุ่ม cook ถูกบัง  

---

## สถานะรวม (อัปเดต 2026-07-21 — รอบ 2)

| สถานะ | ความหมาย |
|--------|----------|
| ✅ DONE | ลงโค้ดแล้วใน working tree (อาจยังไม่ commit/push) |
| 🔜 NEXT | ควรทำเป็นคิวถัดไป |
| 📋 TODO | อยู่ในแผน ยังไม่เริ่ม |
| 🧊 LATER | ดี แต่ไม่เร่ง / ต้นทุนสูง |
| 🚫 DON'T | ห้ามทำตอนนี้ (เหตุผลด้านล่าง) |

---

# ✅ ทำแล้ว (รอบ 2026-07-21)

## P0 Honesty Pass
- [x] `goldenBonus` คูณรายได้ serve + idle  
- [x] `xpMult` (mastery) คูณ rating; fx เช็ค `up.mastery>=1`  
- [x] `idleMult` (franchise) ใช้จริง; fx เช็คเลเวล  
- [x] `decoIdleBonus` คูณ idle (autoChef + สาขา)  
- [x] `staffRiceDiscount` — ข้าว −1/จาน (`effectiveIng`)  
- [x] `staffSpeedBurst` — ทุก 5 เสิร์ฟ → cook ถัดไป x2  
- [x] `staffPremiumBonus` — เมนูพรีเมียม +30%  
- [x] `staffVipBonus` — ทิป VIP +50%  
- [x] `staffSecretMenu` — เมนู `omakase_ex`  
- [x] Fusion tags มี effect จริง (Income/Rating/Streak/Rush/Idle/ทุก bonus)  
- [x] Prestige เก็บ `fusion` + `deco` และ re-register fusion ลง MENUS  
- [x] `calcServeEarn()` รวมศูนย์สูตรรายได้ (serve + preview)

## Order + Perfect Cook
- [x] ลูกค้ามี `wantedMenuId` / emoji บนหัวคิว  
- [x] Perfect window ~78–92% บนวง cook + ปุ่มเขียว  
- [x] AutoChef ได้แค่ Good ไม่ Perfect  
- [x] Roadmap 30 วัน: `ROADMAP-30-DAYS.md`

## รอบ 2 — UX / Events / Customers
- [x] Progressive unlock แท็บ (`unlocks.js`) — Lv gates + lock badge + toast ตอนปลด  
- [x] HUD ฿/min (`bpmTxt`) + earn breakdown ใต้ preview  
- [x] Event forecast chip + cooldown ต่อชนิด + pity + marketing chance  
- [x] Customer types: regular / tourist / foodie / influencer  

### ไฟล์หลัก
`unlocks.js` (ใหม่), `game.js`, `events.js`, `nav.js`, `render.js`, `main.js`, `state.js`, `index.html`, `style.css`

## รอบ 3 — Daily / Context MG / Quest / Branch
- [x] Daily Special เมนู (x1.75, แบนเนอร์, ไฮไลต์เมนู, quest)  
- [x] Contextual minigame VIP (ทิป x2/x0.5) + Critic (rating)  
- [x] Quest รางวัล: เงิน + วัตถุดิบ + rating  
- [x] Branch specialization พื้นฐาน (spec บน BRANCHES)  

### ยังค้าง (infra + ต่อ)
- [ ] Live click-through มือถือเต็ม  
- [ ] **Render auto-deploy** — Connect ใหม่  
- [ ] **Post-mortem** webhook  
- [ ] Prestige shop, kitchen 2D/3D, BGM, socket multiplayer, …  

---

# 🔜 คิวถัดไป (แนะนำทำตามลำดับ)

1. Live click-through มือถือ + desktop  
2. Prestige shop  
3. Kitchen 2D upgrade → Three.js  
4. BGM / SFX ชุดจริง  
5. Socket leaderboard / spectate  
6. …ตาม Roadmap 30 วัน + BACKLOG 

---

# 📋 Backlog แยกตาม Engine

## 1) Core Loop Engine — `systems/game.js`, `core/state.js`

| ไอเดีย | สถานะ | รายละเอียดสั้น |
|--------|--------|----------------|
| Economy integrity / wire โบนัสตาย | ✅ | ดูส่วนทำแล้ว |
| Order Engine | ✅ | wantedMenu + match mult |
| Perfect cook window | ✅ | แตะในโซนเขียว |
| `calcServeEarn` รวมศูนย์ | ✅ | |
| Earn breakdown UI | ✅ | ใต้ earn preview |
| ฿/min บน HUD | ✅ | chip 📈 |
| Resource tension / spoil | 📋 | วัตถุดิบหมดอายุ หรือราคาตลาดขึ้นลง |
| Daily fish market | 📋 | ราคา ing หมุนรายชั่วโมง/วัน |
| Soft cap upgrades + diminishing | 📋 | แทน hard max เร็ว |
| Upgrade trees 3 สาย | 📋 | Volume / Quality / Empire — respec แพง |
| Debug panel (dev) | 📋 | ให้เงิน, skip time, force event |

---

## 2) Customer / Queue Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Order ต่อลูกค้า | ✅ | |
| ประเภท: Regular | ✅ | อดทนกลาง |
| ประเภท: Tourist | ✅ | อดทนต่ำ, earn ×1.2, เมนูถูก |
| ประเภท: Foodie | ✅ | อดทนสูง, ชอบ premium/fusion |
| ประเภท: VIP | บางส่วน | tip modal; ยังไม่เต็ม cook-order flow |
| ประเภท: Critic (ตอน event) | 📋 | miss แล้วเจ็บมาก |
| ประเภท: Influencer | ✅ | เสิร์ฟสำเร็จ → คิว +1 ชั่วคราว 45s |
| ประเภท: Rival spy | 📋 | เสิร์ฟผิด → ลด marketing ชั่วคราว |
| Unlock ประเภทตามสาขา | 📋 | สนามบิน=tourist, โตเกียว=foodie |
| UI ไอคอนประเภท + tooltip | 📋 | |

---

## 3) Menu & Ingredient Engine — `data.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Secret menu omakase_ex | ✅ | |
| Menu roles (build identity) | 📋 | Fast cash / Premium / Rating farm / Event synergy |
| Daily Special ×1.5–2 | ✅ | x1.75 + banner + quest |
| Ingredient scarcity tiers | 📋 | Common / Rare / Auction |
| เปลี่ยน gold/diamond ให้อยู่ธีมซูชิ | 📋 | ทรัฟเฟิล, ไข่ปลาคุณภาพ, ยูซุ ฯลฯ |
| Seasonality | 🧊 | เมนูตามฤดู |

---

## 4) Upgrade Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Wire golden/mastery/franchise | ✅ | |
| Upgrade tree 3 สาย | 📋 | Volume / Prestige Kitchen / Empire |
| Milestone unlock จาก upgrade | 📋 | เช่น ครัว Lv3 เปิด fusion slot |
| Soft cap / diminishing returns | 📋 | |

---

## 5) Staff Engine — `systems/staff.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Wire skill flags หลัก | ✅ | rice, burst, premium, vip, secret |
| ตรวจ skill ที่เหลือว่าครบหรือยัง | 🔜 | criticProof, photo, viral, leader, event, trainer, omakase, streak guard — ส่วนใหญ่มีแล้ว; ไล่ playtest |
| Active skill ปุ่มกด + cooldown | 📋 | Speed Burst แบบกดเอง 15 วิ |
| Staff stories ผูก chapter | 📋 | จ้างแล้วปลด CH |
| Shift system เช้า/เย็น | 📋 | bonus ต่างกัน |
| Roster limit (4/6 ที่นั่ง) | 📋 | ต้องเลือก chemistry |
| Mood → animation ครัว | 📋 | หน้าบึ้ง / ช้าลง |
| Assign staff ประจำสาขา | 📋 | ดู Branch engine |

---

## 6) Decoration Engine — `systems/decoration.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| decoIdleBonus wire | ✅ | |
| Prestige keep deco | ✅ | |
| Multi-slot (ผนัง/พื้น/เคาน์เตอร์/แสง) | 📋 | ใส่หลายชิ้น |
| Set bonus ชุดซากุระ ฯลฯ | 📋 | theme + income |
| Visual เปลี่ยนจริงใน kitchen | 📋 | ไม่ใช่แค่การ์ดในแท็บ |
| แก้ crystal hardcode stack | 📋 | ให้เป็นระบบ set/stack ชัดเจน |

---

## 7) Event Engine — `systems/events.js`, `data.js` EVENTS

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Declarative effects | ✅ (เดิม) | |
| Forecast “อีก ~2 นาทีอาจ Rush” | ✅ | chip ⚡ + nextEventAt |
| Cooldown ต่อชนิด + pity timer | ✅ | EVENT_COOLDOWN_MS + pity 90s |
| Player-triggered event | 📋 | จ่ายเงินจัดเทศกาล |
| Negative events + เลือกตอบ 3 ทาง | 📋 | ไฟดับ / สุขาภิบาล / คู่แข่งลดราคา |
| Event log 10 รายการ | 📋 | รู้สึกมีโลก |
| Event chain / quest ผูก event | 📋 | |

---

## 8) Fusion Lab — `systems/fusion.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Wire tags → modifier | ✅ | |
| Prestige เก็บ discovered | ✅ | |
| Cookbook progression / hint ทยอย | 📋 | ไม่ spoiler ครบ |
| Failed fusion เสียของน้อย + clue | 📋 | |
| Fusion-only weekly event | 📋 | สัปดาห์เมนูลับ |

---

## 9) Branch / Empire Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| สาขา = mult + idle ตัวเลข | ที่มีอยู่ | ตื้น |
| Per-branch specialization | ✅ พื้นฐาน | spec บน BRANCHES — weights + seafood/premium/patience/rating |
| Manager assign ต่อสาขา | 📋 | |
| Crisis ต่อสาขา (สลับไปแก้ 30วิ) | 📋 | |
| Map UI โลก/เมือง | 📋 | แทน list การ์ดอย่างเดียว |
| Empire prestige ทางเลือก | 📋 | เงื่อนไขจำนวนสาขา |

---

## 10) Prestige / Meta Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Keep fusion + deco | ✅ | |
| Prestige shop / skill tree | 📋 | ใช้ดาว prestige ซื้อถาวร |
| Soft keep staff unlock (level รีเซ็ต) | 📋 | |
| Prestige challenges | 📋 | Lv20 โดยไม่ใช้ autoChef |
| NG+ skin / kitchen theme | 📋 | ตาม prestige level |
| ETA “อีกกี่เสิร์ฟถึง prestige คุ้ม” | 📋 | |
| ใช้ `PRESTIGE_BONUSES` ใน data จริง | 📋 | ตอนนี้ hardcode ใน doPrestige |

---

## 11) Quest Engine — `systems/progress.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Daily/Weekly pool | ที่มีอยู่ | |
| รางวัลหลาก (ing, blueprint, staff XP, prestige dust) | ✅ บางส่วน | เงิน + ing + rating (ยังไม่มี dust/blueprint) |
| Quest แนว skill | 📋 | Perfect 10 ครั้ง, VIP ถูกเมนู — มี daily special quest แล้ว |
| Battle pass เบา 30 วัน | 🧊 | free track |
| `maxStreakToday` สำหรับ quest streak | 📋 | ตอนนี้ใช้ G.streak ปัจจุบัน คลุมเครือ |

---

## 12) Achievement Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Ach + queue modal | ที่มีอยู่ (แก้ bug แล้ว) | |
| Hidden / secret ach | 📋 | |
| Tiered bronze/silver/gold | 📋 | |
| Playstyle ach | 📋 | no-miss, fusion-only |
| Showcase บน title screen | 📋 | |

---

## 13) Story Engine — `systems/story.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Chapters + typewriter | ที่มีอยู่ | |
| Choice มี consequence / flag | 📋 | rivalHate, criticFriend, unlock staff |
| Rival arc จริง (Tsunami Sushi) | 📋 | แข่งยอดขายรายสัปดาห์ |
| Chapter หลัง prestige / สาขาใหม่ | 📋 | |
| VN-lite + CG ง่าย | 🧊 | |
| ไดอารี่ร้าน (log) | 📋 | |

---

## 14) Mini-game Engine — `systems/minigames.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| 3 เกมในแท็บ | ที่มีอยู่ | rhythm / fish / memory |
| Contextual minigame ตอน VIP/Critic | ✅ | context-mg.js timing 3 hits |
| Scale difficulty ตาม level | 📋 | |
| Unlock rare ing จาก weekly MG | 📋 | |
| เกมที่ 4: จัดหน้าจาน drag | 📋 | ผูก Food Artist |

---

## 15) Kitchen Scene / Presentation — `ui/kitchen-scene.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| API แยก 4 ฟังก์ชัน (swap point) | ✅ โครงเดิม | showCooking / showPlateReady / resetPlate / spawnSteam |
| เฟส A: 2D sprites + ฉากตามสาขา | 📋 | idle/cook/serve; ชายหาด/โตเกียว |
| เฟส A: ควัน/แสงตามเมนู | 📋 | |
| เฟส B: Three.js ใน kitchen-scene เท่านั้น | 📋 | **ไม่แตะ HUD 2D**; คง signature เดิม |
| เฟส C: camera punch / slow-mo perfect | 🧊 | streak 10+, perfect serve |
| Deco/mood สะท้อนในฉาก | 📋 | |

**หลักการ:** แผง UI (เงิน, อัปเกรด, แท็บ, modal) อยู่ 2D ถาวร — แค่ครัว/เชฟ/จาน/ไอน้ำเป็น 3D ได้

---

## 16) Audio Engine — `systems/audio.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| WebAudio beeps | ที่มีอยู่ | |
| BGM 3 ชั้น idle / rush / night | 📋 | |
| SFX ครัว (มีด, ข้าว, จาน, กระดิ่ง) | 📋 | |
| Ducking ตอน modal/story | 📋 | |
| Haptic มือถือ (vibration) | 📋 | perfect / streak |

---

## 17) UI / UX / Onboarding — `nav.js`, `render.js`, `index.html`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Progressive unlock แท็บ | ✅ | unlocks.js — staff3 mg3 deco4 fusion5 br8 prest15 |
| Coach marks ครั้งแรกต่อระบบ | 📋 | |
| ลดแท็บล่าง / รวม meta ใต้ “อาณาจักร” | 📋 | |
| Accessibility: ปุ่มใหญ่, reduce motion | 📋 | มี anim setting แล้ว ขยายผล |
| Title screen โชว์ ach / prestige skin | 📋 | |

---

## 18) Save / Progression Integrity — `core/state.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| localStorage SE5 + merge | ที่มีอยู่ | |
| Export / import JSON + checksum | 📋 | |
| `saveVersion` + migrations ชัด | 📋 | |
| Cloud save (optional ภายหลัง) | 🧊 | |
| Anti-cheat เบาสำหรับ LB จริง | 📋 | server validate |

---

## 19) Multiplayer / Social — `server.js` vs client

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Socket.IO ห้อง + spectate + chat บน server | ที่มีบน server | |
| Client ยังไม่ connect socket | 🐛/📋 | LB ตอนนี้ localStorage + บอท |
| **A. Spectate-first** | 📋 แนะนำก่อน | Host เปิดห้อง → เพื่อนดู + เชียร์ emoji |
| **B. Async daily leaderboard** | 📋 | seed เดียวกัน 24 ชม., server เก็บคะแนน |
| **C. Coop light** | 🧊 | ส่ง buff/วัตถุดิบวันละครั้ง |
| PvP realtime เต็ม | 🚫 | ต้นทุนสูงเกิน idle |

---

## 20) Balance / Analytics (ยังไม่มี)

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Telemetry เบา | 📋 | time-to-Lv5, prestige rate, churn point |
| Economy spreadsheet ฿/s ต่อ stage | 📋 | |
| Balance pass Lv.1–15 | 🔜 | ตาม roadmap สัปดาห์ 2 |
| Debug panel | 📋 | ดู Core Loop |

---

## 21) Infra / Deploy / Process

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| ES modules + Vite | ✅ | |
| Render deploy มือ | ใช้ได้ | |
| Render **auto-deploy** หลัง recreate repo | 🔜 | Connect ใหม่ อย่า toggle ซ้ำ; permissions GitHub App ผ่านแล้ว |
| Post-mortem webhook | 📋 | หลัง fix |
| อย่า commit HANDOFF ถ้าไม่ต้องการ — แต่ **ควร push BACKLOG + ROADMAP** | 📋 | กันหายจาก /tmp |

---

# 🚫 สิ่งที่ห้ามทำตอนนี้

- เพิ่มเมนู/พนักงาน/deco กองใหญ่โดยไม่ playtest ของที่มี  
- Multiplayer coop realtime เต็มรูปแบบ  
- Gacha หนัก / pay-to-win  
- รีแฟกเตอร์ใหญ่รอบสองโดยไม่มี feature  
- 3D ทันทีโดยไม่ polish 2D kitchen อย่างน้อยนิด (optional แต่แนะนำเฟส A ก่อน B)  
- ใช้ path `~/sushi-empire`  

---

# Top 10 impact (อ้างอิงจากรีวิว — อัปเดตสถานะ)

| # | ไอเดีย | สถานะ |
|---|--------|--------|
| 1 | Wire ของตายทั้งหมด | ✅ หลัก ๆ แล้ว — ไล่ playtest ซ้ำ |
| 2 | ลูกค้าสั่งเมนู | ✅ |
| 3 | Perfect cook window | ✅ |
| 4 | Progressive unlock | ✅ |
| 5 | Branch มีกฎต่างกัน | ✅ พื้นฐาน |
| 6 | Prestige shop | 🔜 |
| 7 | Kitchen visual 2D→3D | 📋 |
| 8 | BGM + SFX ชุดจริง | 📋 |
| 9 | Contextual minigame | ✅ |
| 10 | Socket LB / spectate จริง | 📋 |

---

# เช็คลิสต์ “เปิดเซสชันใหม่ ทำต่อ”

1. อ่านไฟล์นี้ + `HANDOFF.md` (path, deploy)  
2. `cd /private/tmp/sushi-empire-review && git status` — ถ้าโฟลเดอร์หาย → `git clone` จาก GitHub  
3. เลือกงานจาก **🔜 คิวถัดไป** หรือ sprint ใน `ROADMAP-30-DAYS.md`  
4. ทำเสร็จ → ติ๊ก `[x]` ในไฟล์นี้ + ย้ายสถานะ  
5. Live click-through ก่อน push  
6. ถ้าแก้ auto-deploy ได้ → เขียน post-mortem สั้น  

---

# บันทึกดีไซน์สั้น (อ้างอิงตอน implement)

### Perfect cook (ทำแล้ว)
- โซน 0.78–0.92 · perfect earn ×1.35 · auto = good  

### Order (ทำแล้ว)
- ตรง ×1.25 · ผิด ×0.65 · 35% โอกาสสั่งเมนูที่กำลังทำอยู่  

### Customer types (ยังไม่ทำ) — ตารางเป้าหมาย

| ประเภท | พฤติกรรม | รางวัล |
|--------|----------|--------|
| Regular | อดทนกลาง | ปกติ |
| Tourist | อดทนต่ำ | tip สูงถ้าเร็ว |
| Foodie | อยาก fusion/premium | +rating มาก |
| VIP | รอได้, เมนูแพง | $$$$ |
| Critic | miss เจ็บ | +rating ถาวรถ้าผ่าน |
| Influencer | ถ่ายรูป | social boost ชั่วคราว |
| Rival spy | ผิดเมนู | โทษ marketing |

### Branch specialization (ยังไม่ทำ)

| สาขา | โทน |
|------|-----|
| ชายหาด | tourist + seafood bonus |
| สนามบิน | volume สูง, patience ต่ำ |
| โตเกียว | rating สำคัญ, critic บ่อย |
| ดูไบ | premium menu only |

### Multiplayer เลือกแกนเดียวก่อน
- **A Spectate** ถูกและใกล้ server ที่มี  
- **B Daily LB** ใช้ submitScore บน server  
- **C Coop light** ทีหลัง  

---

*อัปเดตล่าสุด: 2026-07-21 — สร้างไฟล์จากรีวิวเต็ม + งาน P0/Order/Perfect ที่ลงแล้ว*
