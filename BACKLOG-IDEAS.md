# Sushi Empire — Backlog ไอเดียทั้งหมด (ต้องทำต่อ)

**ไฟล์นี้คือ source of truth สำหรับงานที่ยังไม่ทำ**  
อัปเดตสถานะในตารางเมื่อทำเสร็จ — อย่าพึ่งความจำจากแชท

| เอกสารที่เกี่ยวข้อง | หน้าที่ |
|---------------------|--------|
| `BACKLOG-IDEAS.md` (ไฟล์นี้) | ไอเดียครบทุก engine + สถานะ |
| `ROADMAP-30-DAYS.md` | จัดลำดับ 30 วัน / sprint |
| `HANDOFF.md` | สถานะ repo, deploy, path, next step เทคนิค |

**Repo path:** git root = `/Users/noblemonobluefin/projects/sushi-empire-review/` · โค้ดเกม = `sushi-empire/`  
**อย่าใช้** `~/sushi-empire` (สำเนาเก่า)  
**Remote:** `https://github.com/tanapoljoe1-art/sushi-empire` · branch `main`  
**Live:** `https://sushi-empire.onrender.com`  
**หมายเหตุ:** อย่าเก็บ working copy ใต้ `/private/tmp` — หายหลัง reboot

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

## รอบ 4 — Prestige shop / Audio / Net / Kitchen 2D
- [x] Prestige shop (★ ซื้อโบนัสถาวร)  
- [x] BGM เบา 3 โหมด + SFX ครัว / Perfect  
- [x] Socket.IO leaderboard (ออนไลน์ + fallback เครื่อง)  
- [x] Kitchen 2D theme ตามสาขา + mood staff  

## รอบ 5 — Three.js / Manager / Spectate
- [x] Three.js kitchen layer (lazy load, keep 2D API)  
- [x] Manager assign ต่อสาขา (idle boost)  
- [x] Spectate host/join + chat/reactions  

## รอบ 6 — Save integrity / Daily LB / Cook fix (2026-07-21)
- [x] Export / import JSON + checksum (`SUSHI_EMPIRE_SAVE`)  
- [x] `saveVersion` + migrate v1→v2 (persist ทันที)  
- [x] Daily seed leaderboard (UTC day · local + socket)  
- [x] Cook button z-index / stacking (นอก shell, z=180)  
- [x] Live click-through mobile + desktop (Playwright)  
- [x] Toast `pointer-events:none` ไม่บังปุ่ม  

## รอบ 7 — Balance / Story flags / Rival / Deco slots (2026-07-21)
- [x] Balance pass Lv.1–15 (BAL curve + early costs + golden soft)  
- [x] Story choice flags (criticFriend, rivalPride/Hate, staffAffinity)  
- [x] Rival weekly vs Tsunami (banner + claim)  
- [x] Deco multi-slot 4 ช่อง + set ซากุระ/เซน  
- [x] Kitchen visual strip จาก deco  
- [x] saveVersion → 3  

## รอบ 8 — Fish market / Spoil / Coach / Post-mortem (2026-07-21)
- [x] Daily fish market (ราคา seed รายวัน + แบนเนอร์ + ถูก/แพงบนชิป)  
- [x] Resource tension: spoil วัตถุดิบสดเมื่อสต็อกสูง  
- [x] Coach marks ครั้งแรก (cook / วัตถุดิบ / upgrade / perfect / rival)  
- [x] Post-mortem Render auto-deploy → `POSTMORTEM-RENDER-AUTODEPLOY.md`  
- [x] saveVersion → 4  

## รอบ 9 — Upgrade trees / Battle pass / 3D punch (2026-07-21)
- [x] Upgrade trees 3 สาย (volume / quality / empire) + require gates  
- [x] โหนดใหม่: express, taste, outpost  
- [x] Respec (คืน 40% · ค่าธรรมเนียม 15%)  
- [x] Free Season Pass 30 ขั้น (XP จาก serve)  
- [x] 3D Perfect camera punch  
- [x] saveVersion → 5  

## รอบ 10 — Debug / Critic·Spy / A11y (2026-07-21)
- [x] Debug panel (Ctrl+Shift+D / ?debug=1 / ตั้งค่า)  
- [x] Customer: Critic 📰 + Rival Spy 🕵️  
- [x] Accessibility: reduce-motion + ปุ่มใหญ่ + persist settings  
- [x] Spy ผิดเมนู → คิว −1 ชั่วคราว 60s  

## รอบ 11 — Crisis choices / Map / Season (2026-07-21)
- [x] Negative events 3 ทาง: ไฟดับ / สุขาภิบาล / Tsunami ลดราคา  
- [x] Map UI สาขา (brMap + nodes)  
- [x] Seasonality เบา (โบนัสเมนู + ราคา ing ตามฤดู)  
- [x] Debug force crisis events  

## รอบ 13 — Soft staff prestige + title skins (2026-07-21)
- [x] Soft keep staff on prestige (hired + skills, Lv รีเซ็ต)  
- [x] Title prestige skins (fresh→void)  
- [x] Title save preview แสดงทีม  

## รอบ 12 — Event log / Festival / Premium BP (2026-07-21)
- [x] Event log 10 รายการ (แท็บ Quest)  
- [x] Player-triggered festival (จ่ายเงิน · CD 3 นาที)  
- [x] Premium battle pass track (ซื้อรายซีซัน + รางวัลคู่)  
- [x] saveVersion → 6  

## รอบ 14 — Review Grok + banner + mobile overflow (2026-07-21)
- [x] XSS escape (LB + spectate)  
- [x] Server LB rate limit + name sanitize  
- [x] Modal stacking critic/VIP  
- [x] Event pacing 55s  
- [x] Info carousel Daily/Season/Market  
- [x] Mobile header flex wrap overflow  

## รอบ 15 — Hidden achievements (2026-07-21)
- [x] 14 secret achievements (`hidden:true`)  
- [x] Counters: perfect / order match / festival / rival / secret menu / fusion serve  
- [x] UI spoiler + unlock modal “🔒 ปลดล็อคลับ!”  
- [x] version → 1.1.0  

## รอบ 16 — Telemetry / polish / LB trust (2026-07-21)
- [x] Telemetry local (`SE5_tel`) + debug summary  
- [x] Toast dedupe/queue · Perfect haptic  
- [x] Title ach showcase + tier Bronze/Silver/Gold  
- [x] Quest: perfect daily/weekly + maxStreakToday  
- [x] Server calcScore authoritative + clamp  
- [x] Home action strip · customer type tooltips  
- [x] version → 1.2.0  

## รอบ 17 — Stats / title→ach / soft-cap / prestige ETA (2026-07-21)
- [x] Settings: สถิติการเล่น (player-facing telemetry)  
- [x] Title ach chips → goTab('ach')  
- [x] Soft-cap incomeLvMult + upgradeCost late · golden 28%  
- [x] Prestige ETA (levels / rating / serves estimate)  
- [x] version → 1.3.0  

### ยังค้าง (infra + ต่อ)
- [ ] **Render auto-deploy** — Connect มือ / Manual deploy หลัง push  

---

# 🔜 คิวถัดไป (แนะนำทำตามลำดับ)

1. Manual deploy บน Render + live smoke  
2. Soft-cap โหนด empire อื่นถ้ายังระเบิด  
3. Bug bash / UX เล็ก  


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
| Resource tension / spoil | ✅ | วัตถุดิบหมดอายุ หรือราคาตลาดขึ้นลง |
| Daily fish market | ✅ | ราคา ing หมุนรายชั่วโมง/วัน |
| Soft cap upgrades + diminishing | ✅ | income flatten 30/50 · upgradeCost 5/7 · golden 28%/lv |
| Upgrade trees 3 สาย | ✅ | Volume / Quality / Empire — respec แพง |
| Debug panel (dev) | ✅ | ให้เงิน, skip time, force event |

---

## 2) Customer / Queue Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Order ต่อลูกค้า | ✅ | |
| ประเภท: Regular | ✅ | อดทนกลาง |
| ประเภท: Tourist | ✅ | อดทนต่ำ, earn ×1.2, เมนูถูก |
| ประเภท: Foodie | ✅ | อดทนสูง, ชอบ premium/fusion |
| ประเภท: VIP | บางส่วน | tip modal; ยังไม่เต็ม cook-order flow |
| ประเภท: Critic (ตอน event) | ✅ | miss แล้วเจ็บมาก |
| ประเภท: Influencer | ✅ | เสิร์ฟสำเร็จ → คิว +1 ชั่วคราว 45s |
| ประเภท: Rival spy | ✅ | เสิร์ฟผิด → ลด marketing ชั่วคราว |
| Unlock ประเภทตามสาขา | 📋 | สนามบิน=tourist, โตเกียว=foodie |
| UI ไอคอนประเภท + tooltip | ✅ เบา | title ภาษาไทยบน .q-type |

---

## 3) Menu & Ingredient Engine — `data.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Secret menu omakase_ex | ✅ | |
| Menu roles (build identity) | 📋 | Fast cash / Premium / Rating farm / Event synergy |
| Daily Special ×1.5–2 | ✅ | x1.75 + banner + quest |
| Ingredient scarcity tiers | 📋 | Common / Rare / Auction |
| เปลี่ยน gold/diamond ให้อยู่ธีมซูชิ | 📋 | ทรัฟเฟิล, ไข่ปลาคุณภาพ, ยูซุ ฯลฯ |
| Seasonality | ✅ เบา | เมนูตามฤดู |

---

## 4) Upgrade Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Wire golden/mastery/franchise | ✅ | |
| Upgrade tree 3 สาย | ✅ | Volume / Prestige Kitchen / Empire |
| Milestone unlock จาก upgrade | ✅ บางส่วน | เช่น ครัว Lv3 เปิด fusion slot |
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
| Multi-slot (ผนัง/พื้น/เคาน์เตอร์/แสง) | ✅ | 4 slots + equip/unequip |
| Set bonus ชุดซากุระ ฯลฯ | ✅ | sakura / zen at2/at3 |
| Visual เปลี่ยนจริงใน kitchen | ✅ พื้นฐาน | kitchenDecoStrip + tint |
| แก้ crystal hardcode stack | ✅ | additive fx + multi-slot |

---

## 7) Event Engine — `systems/events.js`, `data.js` EVENTS

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Declarative effects | ✅ (เดิม) | |
| Forecast “อีก ~2 นาทีอาจ Rush” | ✅ | chip ⚡ + nextEventAt |
| Cooldown ต่อชนิด + pity timer | ✅ | EVENT_COOLDOWN_MS + pity 90s |
| Player-triggered event | ✅ | จ่ายเงินจัดเทศกาล |
| Negative events + เลือกตอบ 3 ทาง | ✅ | ไฟดับ / สุขาภิบาล / คู่แข่งลดราคา |
| Event log 10 รายการ | ✅ | รู้สึกมีโลก |
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
| Manager assign ต่อสาขา | ✅ | select บนการ์ดสาขา · idle +20%+ |
| Crisis ต่อสาขา (สลับไปแก้ 30วิ) | 📋 | |
| Map UI โลก/เมือง | ✅ | แทน list การ์ดอย่างเดียว |
| Empire prestige ทางเลือก | 📋 | เงื่อนไขจำนวนสาขา |

---

## 10) Prestige / Meta Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Keep fusion + deco | ✅ | |
| Prestige shop / skill tree | ✅ | prestige-shop.js · ★ ต่อ prestige |
| Soft keep staff unlock (level รีเซ็ต) | ✅ | |
| Prestige challenges | 📋 | Lv20 โดยไม่ใช้ autoChef |
| NG+ skin / kitchen theme | ✅ บางส่วน | ตาม prestige level |
| ETA “อีกกี่เสิร์ฟถึง prestige คุ้ม” | ✅ คร่าว ๆ | แท็บ Prestige · rating + serves estimate |
| ใช้ `PRESTIGE_BONUSES` ใน data จริง | 📋 | ตอนนี้ hardcode ใน doPrestige |

---

## 11) Quest Engine — `systems/progress.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Daily/Weekly pool | ที่มีอยู่ | |
| รางวัลหลาก (ing, blueprint, staff XP, prestige dust) | ✅ บางส่วน | เงิน + ing + rating (ยังไม่มี dust/blueprint) |
| Quest แนว skill | 📋 | Perfect 10 ครั้ง, VIP ถูกเมนู — มี daily special quest แล้ว |
| Battle pass เบา 30 วัน | ✅ | free + premium track · season bucket |
| `maxStreakToday` สำหรับ quest streak | ✅ | quest field + daily reset |

---

## 12) Achievement Engine

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Ach + queue modal | ที่มีอยู่ (แก้ bug แล้ว) | |
| Hidden / secret ach | ✅ | 14 รายการ · spoiler UI · counters persist prestige |
| Tiered bronze/silver/gold | ✅ | ตาม reward threshold |
| Playstyle ach | ✅ บางส่วน | order-match chain, fusion-only, perfect |
| Showcase บน title screen | ✅ | 4 ชิป · คลิกไปแท็บ ach |

---

## 13) Story Engine — `systems/story.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Chapters + typewriter | ที่มีอยู่ | |
| Choice มี consequence / flag | ✅ | storyFlags + toast + economy hooks |
| Rival arc จริง (Tsunami Sushi) | ✅ | rival.js weekly banner + claim |
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
| เฟส A: 2D sprites + ฉากตามสาขา | ✅ พื้นฐาน | gradient + chef emoji ต่อสาขา |
| เฟส A: ควัน/แสงตามเมนู | 📋 | |
| เฟส B: Three.js ใน kitchen-scene เท่านั้น | ✅ พื้นฐาน | lazy import three · เคาน์เตอร์/เชฟ/จาน/ไอน้ำ · tint เมนู |
| เฟส C: camera punch / slow-mo perfect | ✅ พื้นฐาน | streak 10+, perfect serve |
| Deco/mood สะท้อนในฉาก | 📋 | |

**หลักการ:** แผง UI (เงิน, อัปเกรด, แท็บ, modal) อยู่ 2D ถาวร — แค่ครัว/เชฟ/จาน/ไอน้ำเป็น 3D ได้

---

## 16) Audio Engine — `systems/audio.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| WebAudio beeps | ที่มีอยู่ | |
| BGM 3 ชั้น idle / rush / night | ✅ | generative pad + pluck |
| SFX ครัว (มีด, ข้าว, จาน, กระดิ่ง) | ✅ พื้นฐาน | cook/serve/perfect layered |
| Ducking ตอน modal/story | 📋 | |
| Haptic มือถือ (vibration) | 📋 | perfect / streak |

---

## 17) UI / UX / Onboarding — `nav.js`, `render.js`, `index.html`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Progressive unlock แท็บ | ✅ | unlocks.js — staff3 mg3 deco4 fusion5 br8 prest15 |
| Coach marks ครั้งแรกต่อระบบ | ✅ | |
| ลดแท็บล่าง / รวม meta ใต้ “อาณาจักร” | 📋 | |
| Accessibility: ปุ่มใหญ่, reduce motion | ✅ | bigTap + reduce-motion class + OS prefers |
| Title screen โชว์ ach / prestige skin | ✅ prestige skin | |

---

## 18) Save / Progression Integrity — `core/state.js`

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| localStorage SE5 + merge | ที่มีอยู่ | |
| Export / import JSON + checksum | ✅ | ตั้งค่า · ดาวน์โหลด / คัดลอก / วาง / ไฟล์ |
| `saveVersion` + migrations ชัด | ✅ | SAVE_VERSION=2 · migrate ตอน load |
| Cloud save (optional ภายหลัง) | 🧊 | |
| Anti-cheat เบาสำหรับ LB จริง | ✅ เบา | server calcScore + clamp + rate limit |

---

## 19) Multiplayer / Social — `server.js` vs client

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Socket.IO ห้อง + spectate + chat บน server | ที่มีบน server | |
| Client ยังไม่ connect socket | ✅ LB | net.js + submitScoreOnline |
| **A. Spectate-first** | ✅ | host/join · snapshot · chat · reaction |
| **B. Async daily leaderboard** | ✅ | daily seed UTC + โหมด วันนี้/รวม · server แยก board |
| **C. Coop light** | 🧊 | ส่ง buff/วัตถุดิบวันละครั้ง |
| PvP realtime เต็ม | 🚫 | ต้นทุนสูงเกิน idle |

---

## 20) Balance / Analytics (ยังไม่มี)

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| Telemetry เบา | ✅ | SE5_tel · debug + Settings ผู้เล่น |
| Economy spreadsheet ฿/s ต่อ stage | 📋 | |
| Balance pass Lv.1–15 | ✅ | incomeLvMult + costs + miss loss |
| Debug panel | ✅ | ดู Core Loop |

---

## 21) Infra / Deploy / Process

| ไอเดีย | สถานะ | รายละเอียด |
|--------|--------|------------|
| ES modules + Vite | ✅ | |
| Render deploy มือ | ใช้ได้ | |
| Render **auto-deploy** หลัง recreate repo | 🔜 | Connect ใหม่ อย่า toggle ซ้ำ; permissions GitHub App ผ่านแล้ว |
| Post-mortem webhook | ✅ doc | `POSTMORTEM-RENDER-AUTODEPLOY.md` — ยังต้อง Connect มือ |
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
| 6 | Prestige shop | ✅ |
| 7 | Kitchen visual 2D→3D | ✅ พื้นฐานทั้งคู่ |
| 8 | BGM + SFX ชุดจริง | ✅ พื้นฐาน |
| 9 | Contextual minigame | ✅ |
| 10 | Socket LB / spectate จริง | ✅ ทั้งคู่พื้นฐาน |

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
