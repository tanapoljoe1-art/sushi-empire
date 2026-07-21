# Handoff — Sushi Empire (2026-07-21, รอบ 19)

## Paths
- Working: `/Users/noblemonobluefin/projects/sushi-empire-review/` · `sushi-empire/`
- GitHub: `tanapoljoe1-art/sushi-empire` · `main`
- Live: `sushi-empire.onrender.com` · Root Directory = `sushi-empire`
- อย่าใช้ `~/sushi-empire`

## State
- **version:** `1.5.0`
- **HEAD:** ดู `git log -1`

### Done รอบ 19
1. **Staff soft-caps** — income ≤+85%, speed ≤+70%, patience ≤+90% หลัง chemistry/skills
2. **Deco soft-caps** — income ≤+50%, patience ≤+80%, rating ≤+40%
3. **Prestige mult soft-curve** — +10%×5 แล้ว +6%/+3% cap ×2.6; speed bonus cap 45%; `recomputePrestigeMult()` ตอน load
4. **Quest UX** — การ์ด `.ready` · ปุ่ม **รับทั้งหมดที่พร้อม** · claim กัน claim ก่อนครบเป้า
5. Earn breakdown แสดง `≈` ใกล้ soft-cap · stats โชว์ทีม/ตกแต่ง %

### Smoke
- full roster → staff income **85%** (cap)
- claim-all quests: ready→0, no errors
- vite build ผ่าน

### Open
- Render auto-deploy ยังพัง → **Manual Deploy** หลัง push

## Next
1. Manual deploy + เช็ค v1.5.0
2. Soft-cap situational mults (omakase/premium/event) ถ้ายังรู้สึกระเบิด
3. UX เล็ก / content

## Dev
```bash
cd /Users/noblemonobluefin/projects/sushi-empire-review/sushi-empire
node server.js && npx vite build
```
