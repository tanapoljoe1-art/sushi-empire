# Handoff — Sushi Empire (2026-07-21, รอบ 20.1 bugfix audit)

## State
- **version:** `1.6.1` (bugfix after deep audit)
- Previous feature: 1.6.0 situational caps / fusion cookbook

### Bugs fixed in audit
1. **load idle used uncapped upgrades** — `applyUpgradeFxWithCaps()` now runs inside `load()` before AFK idle pay
2. **initQuests crash** on missing/null `activeDailyIds` / `daily:null` (corrupted save)
3. **hasUnclaimedQuests / renderQuests** null-safe
4. **showPrestModal** showed wrong flat +10%×lv text (now soft-cap curve)
5. **Spectate XSS** — host name in snapshot panel now `escapeHtml`
6. **Server chat/reaction** strip `<>` and cap emoji length
7. **updateUI** null-safe getEl (no throw if HUD node missing)

### Audit suite (Playwright) — 18/18 pass
load, version, soft-caps q/speed/idle/golden, staff 0.85, deco 0.50, corrupt quests, ach 35/secret 14, mobile overflow, settings stats, prestige ETA, fusion hints+clue, earn preview, no fatal errors

### Open
- Render Manual Deploy after push


---

# Handoff — Sushi Empire (2026-07-21, รอบ 20)

## Paths
- Working: `/Users/noblemonobluefin/projects/sushi-empire-review/` · `sushi-empire/`
- GitHub: `tanapoljoe1-art/sushi-empire` · `main`
- Live: `sushi-empire.onrender.com` · Root Directory = `sushi-empire`

## State
- **version:** `1.6.0`

### Done รอบ 20
1. **Situational mult soft-caps** (`BAL.sit`) — omakase/premium/viral/VIP/perfect/order/event + **product cap ×3.5**
2. Fusion tag mults ลดลงเล็กน้อย (earn/rush/streak)
3. **Failed fusion** — เสีย 1 ชิ้น/ชนิด + ใบ้ progressive; partial refund ส่วนที่เหลือ
4. **Cookbook hints** `#fusionHints` — เปิดทีละช่องตามจำนวนที่ค้นพบ
5. **Menu roles** UI (เร็ว / บาลานซ์ / พรีเมียม / Fusion / ลับ)
6. Haptic ตอน streak milestone

### Smoke
- Lv8 fusion: ใบ้ 0/13 · fail rice+gold → 💡 ใกล้แล้ว  
- menu roles บน main  
- build ผ่าน

### Open
- Render **Manual Deploy** หลัง push (auto-deploy ยังพัง)

## Next
1. Deploy มือ + เช็ค v1.6.0  
2. Active skill ปุ่ม / roster limit / content  
3. Bug bash ต่อ  

## Dev
```bash
cd /Users/noblemonobluefin/projects/sushi-empire-review/sushi-empire
node server.js && npx vite build
```
