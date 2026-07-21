// ── Free battle pass (30-tier seasonal track) ─────────────────────────────────
import { G, save, dayKeyUTC } from '../core/state.js';
import { BATTLE_PASS, INGREDIENTS } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, spawnFE } from '../ui/render.js';

function seasonKey() {
  // ~30-day buckets from epoch days
  const day = Math.floor(Date.now() / 86400000);
  const season = Math.floor(day / 30);
  return `S${season}`;
}

export function ensureBattlePass() {
  if (!G.battlePass || typeof G.battlePass !== 'object') {
    G.battlePass = { season: '', xp: 0, claimed: {}, lastDay: '' };
  }
  const sk = seasonKey();
  if (G.battlePass.season !== sk) {
    G.battlePass = { season: sk, xp: 0, claimed: {}, lastDay: '' };
  }
  return G.battlePass;
}

export function bpXpForServe(quality) {
  let xp = 1;
  if (quality === 'perfect') xp += 1;
  if (G.streak >= 5) xp += 1;
  return xp;
}

export function addBattlePassXp(amount) {
  if (!amount) return;
  ensureBattlePass();
  G.battlePass.xp = (G.battlePass.xp || 0) + amount;
}

export function bpProgress() {
  ensureBattlePass();
  const xp = G.battlePass.xp || 0;
  let tier = 0;
  let nextNeed = BATTLE_PASS[0]?.xp || 10;
  for (const t of BATTLE_PASS) {
    if (xp >= t.xp) tier = t.tier;
    else {
      nextNeed = t.xp;
      break;
    }
  }
  const prevXp = tier > 0 ? (BATTLE_PASS.find(t => t.tier === tier)?.xp || 0) : 0;
  const next = BATTLE_PASS.find(t => t.tier === tier + 1);
  const pct = next
    ? Math.min(100, Math.round(((xp - prevXp) / Math.max(1, next.xp - prevXp)) * 100))
    : 100;
  const claimable = BATTLE_PASS.filter(
    t => xp >= t.xp && !G.battlePass.claimed[t.tier]
  ).length;
  return { xp, tier, nextNeed: next?.xp || prevXp, pct, claimable, season: G.battlePass.season };
}

function applyReward(reward) {
  if (reward.money) {
    G.money += reward.money;
    spawnFE('+' + reward.money + '฿ BP');
  }
  if (reward.rating) G.rating = Math.min(100, G.rating + reward.rating);
  if (reward.ing) {
    Object.entries(reward.ing).forEach(([id, n]) => {
      G.ing[id] = (G.ing[id] || 0) + n;
    });
  }
}

export function claimBattlePassTier(tier) {
  ensureBattlePass();
  const t = BATTLE_PASS.find(x => x.tier === tier);
  if (!t) return;
  if ((G.battlePass.xp || 0) < t.xp) { toast('ยัง XP ไม่พอ'); return; }
  if (G.battlePass.claimed[tier]) { toast('รับแล้ว'); return; }
  G.battlePass.claimed[tier] = true;
  applyReward(t.reward);
  toast(`🎖️ BP ${tier}: ${t.label}`);
  updateUI();
  renderBattlePass();
  save();
}

export function claimAllBattlePass() {
  ensureBattlePass();
  let n = 0;
  BATTLE_PASS.forEach(t => {
    if ((G.battlePass.xp || 0) >= t.xp && !G.battlePass.claimed[t.tier]) {
      G.battlePass.claimed[t.tier] = true;
      applyReward(t.reward);
      n++;
    }
  });
  if (!n) { toast('ไม่มีรางวัลให้รับ'); return; }
  toast(`🎖️ รับ ${n} ขั้น!`);
  updateUI();
  renderBattlePass();
  save();
}

export function renderBattlePass() {
  const host = getEl('bpPanel');
  if (!host) return;
  const p = bpProgress();
  const rows = BATTLE_PASS.map(t => {
    const unlocked = p.xp >= t.xp;
    const claimed = !!G.battlePass.claimed[t.tier];
    let bits = [];
    if (t.reward.money) bits.push(`+${t.reward.money}฿`);
    if (t.reward.rating) bits.push(`+${t.reward.rating}⭐`);
    if (t.reward.ing) {
      Object.entries(t.reward.ing).forEach(([id, n]) => {
        bits.push(`${INGREDIENTS[id]?.emoji || id}×${n}`);
      });
    }
    const cls = claimed ? 'done' : unlocked ? 'ready' : 'lock';
    const btn = claimed
      ? '<span class="bp-tag">✓</span>'
      : unlocked
        ? `<button class="bp-claim" onclick="claimBattlePassTier(${t.tier})">รับ</button>`
        : `<span class="bp-tag">${t.xp}xp</span>`;
    return `<div class="bp-row ${cls}">
      <div class="bp-tier">${t.tier}</div>
      <div class="bp-inf">
        <div class="bp-name">${t.label}</div>
        <div class="bp-rew">${bits.join(' · ')}</div>
      </div>
      ${btn}
    </div>`;
  }).join('');

  host.innerHTML = `
    <div class="bp-head">
      <div>
        <div class="bp-title">🎖️ Season Pass · ${p.season}</div>
        <div class="bp-sub">ฟรีทั้งหมด · เสิร์ฟเพื่อสะสม XP</div>
      </div>
      <div class="bp-xp">Lv.${p.tier} · ${p.xp} XP</div>
    </div>
    <div class="bp-bar"><div class="bp-fill" style="width:${p.pct}%"></div></div>
    ${p.claimable ? `<button class="bp-claim-all" onclick="claimAllBattlePass()">รับทั้งหมด (${p.claimable})</button>` : ''}
    <div class="bp-list">${rows}</div>
  `;
}
