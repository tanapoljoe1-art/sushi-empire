# Handoff — Sushi Empire (2026-07-21, รอบ 18)

## Paths
- Working: `/Users/noblemonobluefin/projects/sushi-empire-review/` · code in `sushi-empire/`
- GitHub: `tanapoljoe1-art/sushi-empire` · `main`
- Live: `sushi-empire.onrender.com` · Root Directory = `sushi-empire`
- **อย่าใช้** `~/sushi-empire`

## State
- **version:** `1.4.0`
- **HEAD:** ดู `git log -1`

### Done รอบ 18
1. **Empire soft-caps**
   - kitchen diminishing rates · express +6% (was 8%)
   - franchise idle **x1.75** (was x2) · outpost **+12%/lv** (was 15%)
   - storage/patience slightly softer
   - hard caps: `qSize≤6`, `speedMult≤3`, storage/pat ≤3 via `reapplyUpgradeFx()`
2. **UX**
   - Settings: 🏆 ความสำเร็จ · ↻ รีเฟรช · ล้างสถิติ
   - `openSettings` บน `window`
   - floating text (spawnFE) max 6 concurrent
3. Load path เรียก `reapplyUpgradeFx()` หลัง load

### Open
- Render auto-deploy ยังพัง → **Manual Deploy** ทุกครั้งหลัง push

## Next
1. Manual deploy + เช็ค v1.4.0 บน title
2. Staff income stack soft-cap ถ้ายังระเบิด
3. UX เล็ก / bug bash ต่อ

## Dev
```bash
cd /Users/noblemonobluefin/projects/sushi-empire-review/sushi-empire
node server.js
npx vite build
```
