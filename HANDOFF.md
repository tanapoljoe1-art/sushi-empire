# Handoff — Sushi Empire (2026-07-21, รอบ 17)

## Paths
- **Working copy:** `/Users/noblemonobluefin/projects/sushi-empire-review/`
- โค้ดเกม: `sushi-empire/` · อย่าใช้ `~/sushi-empire`
- GitHub: `tanapoljoe1-art/sushi-empire` · `main`
- Live: `https://sushi-empire.onrender.com` · Root Directory = `sushi-empire`

## State
- **version:** `1.3.0`
- **HEAD:** ดู `git log -1` หลัง push

### Done รอบ 17
1. **Settings → สถิติการเล่น** (telemetry + live save) ใน `#playStatsBox`
2. **Title ach chips คลิกได้** → `openAchFromTitle()` ปิด title แล้ว `goTab('ach')`
3. **Soft-cap economy mid-late**
   - `BAL.incomeLvMult` แบนหลัง Lv30/50 (cap ~3.6)
   - `BAL.upgradeCost` แพงขึ้นหลัง stack 5/7
   - ครัวทองคำ golden +28%/lv (เดิม +35%)
4. **Prestige ETA** บนแท็บ Prestige (rating เหลือ + ประมาณเสิร์ฟถึง Lv.20)
5. Docs / version title `v1.3.0`

### รอบก่อน (ย่อ)
- 15: Hidden ach 14 · 16: telemetry, toast queue, LB server score, tiers, showcase

### Open infra
- Render **auto-deploy ยังพัง** → หลัง push ต้อง **Manual Deploy → Deploy latest commit**

## Next
1. Manual deploy + live smoke
2. Settings ลิงก์ “เปิดความสำเร็จ” / reset telemetry
3. Soft-cap เพิ่มบน franchise/outpost ถ้ายังระเบิด
4. Connect GitHub บน Render ใหม่ (อย่า toggle Auto-Deploy)

## Smoke รอบ 17
- vite build ผ่าน
- play stats ใน settings แสดง Lv/serve/session
- title chips 4 → คลิกแล้ว `pg-ach` on · 35 cards
- prestige ETA ที่ Lv16: “อีก 4 เลเวล · ~240 เสิร์ฟ”
- pageerror ว่าง

## Dev
```bash
cd /Users/noblemonobluefin/projects/sushi-empire-review/sushi-empire
node server.js   # :3000
npx vite build
```
