// ── Free + Premium battle pass (30-tier seasonal track) ───────────────────────
import { G, save } from '../core/state.js';
import { BATTLE_PASS, BATTLE_PASS_PREMIUM, INGREDIENTS, battlePassPremiumCost } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, spawnFE } from '../ui/render.js';

function seasonKey() {
  const day = Math.floor(Date.now() / 86400000);
  const season = Math.floor(day / 30);
  return `S${season}`;
}

export function ensureBattlePass() {
  if (!G.battlePass || typeof G.battlePass !== 'object') {
    G.battlePass = { season: '', xp: 0, claimed: {}, premiumClaimed: {}, premium: false, lastDay: '' };
  }
  if (!G.battlePass.claimed) G.battlePass.claimed = {};
  if (!G.battlePass.premiumClaimed) G.battlePass.premiumClaimed = {};
  if (G.battlePass.premium == null) G.battlePass.premium = false;
  const sk = seasonKey();
  if (G.battlePass.season !== sk) {
    G.battlePass = {
      season: sk, xp: 0, claimed: {}, premiumClaimed: {}, premium: false, lastDay: '',
    };
  }
  return G.battlePass;
}

export function bpXpForServe(quality) {
  let xp = 1;
  if (quality === 'perfect') xp += 1;
  if (G.streak >= 5) xp += 1;
  if (G.battlePass?.premium) xp += 1; // premium XP boost
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
  for (const t of BATTLE_PASS) {
    if (xp >= t.xp) tier = t.tier;
    else break;
  }
  const prevXp = tier > 0 ? (BATTLE_PASS.find(t => t.tier === tier)?.xp || 0) : 0;
  const next = BATTLE_PASS.find(t => t.tier === tier + 1);
  const pct = next
    ? Math.min(100, Math.round(((xp - prevXp) / Math.max(1, next.xp - prevXp)) * 100))
    : 100;
  const claimable = BATTLE_PASS.filter(
    t => xp >= t.xp && !G.battlePass.claimed[t.tier]
  ).length;
  const premClaimable = G.battlePass.premium
    ? BATTLE_PASS_PREMIUM.filter(
      t => xp >= (BATTLE_PASS.find(f => f.tier === t.tier)?.xp || 99999)
        && !G.battlePass.premiumClaimed[t.tier]
    ).length
    : 0;
  return {
    xp, tier, nextNeed: next?.xp || prevXp, pct,
    claimable: claimable + premClaimable,
    freeClaimable: claimable,
    premClaimable,
    season: G.battlePass.season,
    premium: !!G.battlePass.premium,
  };
}

function applyReward(reward, tag = 'BP') {
  if (reward.money) {
    G.money += reward.money;
    spawnFE('+' + reward.money + '฿ ' + tag);
  }
  if (reward.rating) G.rating = Math.min(100, G.rating + reward.rating);
  if (reward.ing) {
    Object.entries(reward.ing).forEach(([id, n]) => {
      G.ing[id] = (G.ing[id] || 0) + n;
    });
  }
}

function formatReward(reward) {
  const bits = [];
  if (reward.money) bits.push(`+${reward.money}฿`);
  if (reward.rating) bits.push(`+${reward.rating}⭐`);
  if (reward.ing) {
    Object.entries(reward.ing).forEach(([id, n]) => {
      bits.push(`${INGREDIENTS[id]?.emoji || id}×${n}`);
    });
  }
  return bits.join(' · ');
}

export function buyPremiumPass() {
  ensureBattlePass();
  if (G.battlePass.premium) { toast('มี Premium แล้วซีซันนี้'); return; }
  const cost = battlePassPremiumCost(G.level || 1);
  if (G.money < cost) { toast(`ต้องการ ${cost.toLocaleString()}฿`); return; }
  G.money -= cost;
  G.battlePass.premium = true;
  toast(`⭐ ปลด Premium Pass! (−${cost.toLocaleString()}฿)`);
  updateUI();
  renderBattlePass();
  save();
}

export function claimBattlePassTier(tier) {
  ensureBattlePass();
  const t = BATTLE_PASS.find(x => x.tier === tier);
  if (!t) return;
  if ((G.battlePass.xp || 0) < t.xp) { toast('ยัง XP ไม่พอ'); return; }
  if (G.battlePass.claimed[tier]) { toast('รับฟรีแล้ว'); return; }
  G.battlePass.claimed[tier] = true;
  applyReward(t.reward, 'Free');
  toast(`🎖️ Free ${tier}: ${t.label}`);
  updateUI();
  renderBattlePass();
  save();
}

export function claimPremiumTier(tier) {
  ensureBattlePass();
  if (!G.battlePass.premium) { toast('ต้องซื้อ Premium ก่อน'); return; }
  const free = BATTLE_PASS.find(x => x.tier === tier);
  const prem = BATTLE_PASS_PREMIUM.find(x => x.tier === tier);
  if (!prem || !free) { toast('ขั้นนี้ไม่มีรางวัล Premium'); return; }
  if ((G.battlePass.xp || 0) < free.xp) { toast('ยัง XP ไม่พอ'); return; }
  if (G.battlePass.premiumClaimed[tier]) { toast('รับ Premium แล้ว'); return; }
  G.battlePass.premiumClaimed[tier] = true;
  applyReward(prem.reward, '★');
  toast(`⭐ Premium ${tier}: ${prem.label}`);
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
      applyReward(t.reward, 'Free');
      n++;
    }
  });
  if (G.battlePass.premium) {
    BATTLE_PASS_PREMIUM.forEach(t => {
      const free = BATTLE_PASS.find(f => f.tier === t.tier);
      if (free && (G.battlePass.xp || 0) >= free.xp && !G.battlePass.premiumClaimed[t.tier]) {
        G.battlePass.premiumClaimed[t.tier] = true;
        applyReward(t.reward, '★');
        n++;
      }
    });
  }
  if (!n) { toast('ไม่มีรางวัลให้รับ'); return; }
  toast(`🎖️ รับ ${n} รางวัล!`);
  updateUI();
  renderBattlePass();
  save();
}

export function renderBattlePass() {
  const host = getEl('bpPanel');
  if (!host) return;
  const p = bpProgress();
  const cost = battlePassPremiumCost(G.level || 1);
  const premBtn = p.premium
    ? `<span class="bp-prem-on">⭐ Premium เปิดอยู่</span>`
    : `<button type="button" class="bp-prem-buy" onclick="buyPremiumPass()">⭐ ซื้อ Premium · ${cost.toLocaleString()}฿</button>`;

  const rows = BATTLE_PASS.map(t => {
    const unlocked = p.xp >= t.xp;
    const claimed = !!G.battlePass.claimed[t.tier];
    const prem = BATTLE_PASS_PREMIUM.find(x => x.tier === t.tier);
    const premClaimed = !!(prem && G.battlePass.premiumClaimed[t.tier]);
    const freeBtn = claimed
      ? '<span class="bp-tag">✓</span>'
      : unlocked
        ? `<button class="bp-claim" onclick="claimBattlePassTier(${t.tier})">ฟรี</button>`
        : `<span class="bp-tag">${t.xp}xp</span>`;
    let premHtml = '';
    if (prem) {
      if (!p.premium) {
        premHtml = `<span class="bp-tag prem-lock">★ ล็อก</span>`;
      } else if (premClaimed) {
        premHtml = `<span class="bp-tag">★✓</span>`;
      } else if (unlocked) {
        premHtml = `<button class="bp-claim prem" onclick="claimPremiumTier(${t.tier})">★</button>`;
      } else {
        premHtml = `<span class="bp-tag">★</span>`;
      }
    }
    const cls = claimed && (!prem || premClaimed) ? 'done' : unlocked ? 'ready' : 'lock';
    return `<div class="bp-row ${cls}">
      <div class="bp-tier">${t.tier}</div>
      <div class="bp-inf">
        <div class="bp-name">${t.label}</div>
        <div class="bp-rew">ฟรี: ${formatReward(t.reward)}${prem ? ` · ★ ${formatReward(prem.reward)}` : ''}</div>
      </div>
      <div class="bp-btns">${freeBtn}${premHtml}</div>
    </div>`;
  }).join('');

  host.innerHTML = `
    <div class="bp-head">
      <div>
        <div class="bp-title">🎖️ Season Pass · ${p.season}</div>
        <div class="bp-sub">ฟรีทุกขั้น · Premium ได้รางวัลคู่ + XP โบนัส</div>
      </div>
      <div class="bp-xp">Lv.${p.tier} · ${p.xp} XP</div>
    </div>
    ${premBtn}
    <div class="bp-bar"><div class="bp-fill" style="width:${p.pct}%"></div></div>
    ${p.claimable ? `<button class="bp-claim-all" onclick="claimAllBattlePass()">รับทั้งหมด (${p.claimable})</button>` : ''}
    <div class="bp-list">${rows}</div>
  `;
}
