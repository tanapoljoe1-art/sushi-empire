// ── Rival weekly challenge (Tsunami Sushi) ────────────────────────────────────
import { G, save, dayKeyUTC } from '../core/state.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, spawnFE } from '../ui/render.js';

export function weekKeyUTC(d = new Date()) {
  // ISO week-ish: year + floor day-of-year / 7
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const day = Math.floor((d - start) / 86400000);
  const week = Math.floor(day / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function ensureRivalWeekly() {
  if (!G.rivalWeekly || typeof G.rivalWeekly !== 'object') {
    G.rivalWeekly = { weekKey: '', playerEarn: 0, rivalTarget: 0, claimed: false };
  }
  const key = weekKeyUTC();
  if (G.rivalWeekly.weekKey !== key) {
    const base = 4000 + (G.level || 1) * 700 + (G.prestigeLevel || 0) * 2500;
    // Story flags tweak rival aggression
    let mult = 1;
    if (G.storyFlags?.rivalHate) mult = 1.15;
    if (G.storyFlags?.rivalPride) mult = 0.92;
    G.rivalWeekly = {
      weekKey: key,
      playerEarn: 0,
      rivalTarget: Math.round(base * mult),
      claimed: false,
    };
  }
  return G.rivalWeekly;
}

export function trackRivalEarn(amount) {
  if (!amount || amount <= 0) return;
  ensureRivalWeekly();
  G.rivalWeekly.playerEarn = (G.rivalWeekly.playerEarn || 0) + amount;
}

export function rivalProgress() {
  const r = ensureRivalWeekly();
  const pct = r.rivalTarget > 0 ? Math.min(1, r.playerEarn / r.rivalTarget) : 0;
  const winning = r.playerEarn >= r.rivalTarget;
  return { ...r, pct, winning };
}

export function claimRivalReward() {
  const r = ensureRivalWeekly();
  if (r.claimed) { toast('รับรางวัลสัปดาห์นี้แล้ว'); return; }
  if (r.playerEarn < r.rivalTarget) {
    toast('ยังตาม Tsunami ไม่ทัน!');
    return;
  }
  r.claimed = true;
  const reward = Math.round(800 + (G.level || 1) * 40 + (G.prestigeLevel || 0) * 200);
  G.money += reward;
  G.rating = Math.min(100, G.rating + 5);
  G.rivalWins = (G.rivalWins || 0) + 1;
  if (G.storyFlags?.rivalPride) {
    G.money += Math.round(reward * 0.25);
    toast(`🏆 ชนะ Tsunami! +${reward}฿ (+25% เกียรติ)`);
  } else {
    toast(`🏆 ชนะ Tsunami Sushi! +${reward}฿`);
  }
  spawnFE('🏆 +' + reward + '฿');
  try { import('./game.js').then(m => m.checkAch()).catch(() => {}); } catch (_) {}
  updateUI();
  renderRivalBanner();
  save();
}

export function renderRivalBanner() {
  const el = getEl('rivalBanner');
  if (!el) return;
  // Unlock after rival story or level 8
  const unlocked = (G.level || 1) >= 8 || G.storyFlags?.rivalHate || G.storyFlags?.rivalPride
    || (G.storyData?.seenChapters?.rival_appears);
  if (!unlocked) {
    el.style.display = 'none';
    return;
  }
  const r = rivalProgress();
  el.style.display = 'block';
  const bar = Math.round(r.pct * 100);
  const status = r.claimed
    ? '✅ รับรางวัลแล้ว'
    : r.winning
      ? '🔥 นำ! กดรับรางวัล'
      : `ตามอีก ${(r.rivalTarget - r.playerEarn).toLocaleString()}฿`;
  el.innerHTML = `
    <div class="rival-head">
      <span>⚔️ vs Tsunami Sushi</span>
      <span style="font-size:10px;color:var(--muted)">${r.weekKey}</span>
    </div>
    <div class="rival-bar"><div class="rival-fill" style="width:${bar}%"></div></div>
    <div class="rival-meta">
      <span>คุณ ${Math.floor(r.playerEarn).toLocaleString()}฿</span>
      <span>เป้า ${r.rivalTarget.toLocaleString()}฿</span>
    </div>
    <div class="rival-status">${status}</div>
    ${r.winning && !r.claimed
      ? `<button class="rival-claim" onclick="claimRivalReward()">รับรางวัล 🏆</button>`
      : ''}
  `;
}
