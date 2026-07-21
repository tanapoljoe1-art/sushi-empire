// ── Prestige Shop — spend ★ earned on prestige for permanent upgrades ─────────
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';

/**
 * Each entry: levels[] costs in stars for rank 1..n
 * apply(g, rank) mutates derived shop_* fields (recomputed from scratch in applyAll).
 */
export const PRESTIGE_SHOP = [
  {
    id: 'inc', name: 'รายได้ถาวร', emoji: '💰', desc: '+5% รายได้ / ขั้น',
    costs: [1, 1, 2, 2, 3],
    apply: (g, r) => { g.shopIncomeBonus = r * 0.05; },
  },
  {
    id: 'spd', name: 'มีดไวขึ้น', emoji: '⚡', desc: '+4% ความเร็ว / ขั้น',
    costs: [1, 1, 2, 2, 3],
    apply: (g, r) => { g.shopSpeedBonus = r * 0.04; },
  },
  {
    id: 'start', name: 'ทุนตั้งต้น', emoji: '🎁', desc: '+300฿ ตอน prestige / ขั้น',
    costs: [1, 2, 2, 3, 3],
    apply: (g, r) => { g.shopStartBonus = r * 300; },
  },
  {
    id: 'pat', name: 'บริการเยี่ยม', emoji: '😊', desc: '+6% ความอดทนลูกค้า / ขั้น',
    costs: [1, 2, 3],
    apply: (g, r) => { g.shopPatBonus = r * 0.06; },
  },
  {
    id: 'tip', name: 'ทิป VIP', emoji: '👑', desc: 'ทิป VIP +15% / ขั้น',
    costs: [2, 3, 4],
    apply: (g, r) => { g.shopVipTipBonus = r * 0.15; },
  },
  {
    id: 'luck', name: 'โชคอีเวนต์', emoji: '🍀', desc: 'cooldown อีเวนต์ −10% / ขั้น',
    costs: [2, 3],
    apply: (g, r) => { g.shopEventCdMult = 1 - r * 0.10; },
  },
];

export function ensurePrestShop() {
  if (!G.prestShop || typeof G.prestShop !== 'object') G.prestShop = {};
  if (G.prestigeStars == null) G.prestigeStars = 0;
  // Migrate older saves that prestiges but never had ★ currency
  if (!G._starsMigrated && G.prestigeLevel > 0 && G.prestigeStars === 0
      && !Object.keys(G.prestShop).length) {
    G.prestigeStars = G.prestigeLevel;
    G._starsMigrated = true;
  }
}

/** Recompute all shop-derived bonuses from ranks. */
export function applyPrestigeShop() {
  ensurePrestShop();
  G.shopIncomeBonus = 0;
  G.shopSpeedBonus  = 0;
  G.shopStartBonus  = 0;
  G.shopPatBonus    = 0;
  G.shopVipTipBonus = 0;
  G.shopEventCdMult = 1;
  PRESTIGE_SHOP.forEach(item => {
    const r = G.prestShop[item.id] || 0;
    if (r > 0) item.apply(G, r);
  });
}

export function buyPrestigeItem(id) {
  ensurePrestShop();
  const item = PRESTIGE_SHOP.find(x => x.id === id);
  if (!item) return;
  const rank = G.prestShop[id] || 0;
  if (rank >= item.costs.length) { toast('MAX แล้ว!'); return; }
  const cost = item.costs[rank];
  if ((G.prestigeStars || 0) < cost) {
    toast(`✕ ต้องการ ${cost}★ (มี ${G.prestigeStars || 0}★)`);
    return;
  }
  G.prestigeStars -= cost;
  G.prestShop[id] = rank + 1;
  applyPrestigeShop();
  toast(`${item.emoji} ${item.name} Lv.${rank + 1}!`);
  renderPrestigeShop();
  updateUI();
  save();
}

export function renderPrestigeShop() {
  ensurePrestShop();
  applyPrestigeShop();
  const host = getEl('prestShop');
  if (!host) return;
  host.innerHTML = `
    <div class="ps-head">
      <span>🛒 Prestige Shop</span>
      <span class="ps-stars">★ ${G.prestigeStars || 0}</span>
    </div>
    <div class="ps-hint">ได้ ★ ทุกครั้งที่ Prestige · โบนัสถาวรไม่รีเซ็ต</div>
    <div class="ps-grid">
      ${PRESTIGE_SHOP.map(item => {
        const rank = G.prestShop[item.id] || 0;
        const maxed = rank >= item.costs.length;
        const cost = maxed ? 0 : item.costs[rank];
        const can = !maxed && (G.prestigeStars || 0) >= cost;
        const dots = item.costs.map((_, i) =>
          `<span class="ps-dot ${i < rank ? 'on' : ''}"></span>`).join('');
        return `<div class="ps-card ${maxed ? 'max' : ''}">
          <div class="ps-ico">${item.emoji}</div>
          <div class="ps-body">
            <div class="ps-name">${item.name} <span class="ps-lv">Lv.${rank}/${item.costs.length}</span></div>
            <div class="ps-desc">${item.desc}</div>
            <div class="ps-dots">${dots}</div>
          </div>
          <button class="ps-buy ${can ? '' : 'dis'}" onclick="buyPrestigeItem('${item.id}')"
            ${maxed || !can ? 'disabled' : ''}>
            ${maxed ? 'MAX' : cost + '★'}
          </button>
        </div>`;
      }).join('')}
    </div>
  `;
}
