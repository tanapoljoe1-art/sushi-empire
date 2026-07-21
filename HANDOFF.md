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
