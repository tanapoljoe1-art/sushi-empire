// ── Daily fish market + light spoil tension ───────────────────────────────────
// Note: do not static-import ui/render.js (circular: render → market → render).
import { G, save, dayKeyUTC } from '../core/state.js';
import { INGREDIENTS } from '../data.js';
import { getEl } from '../core/dom.js';

/** Perishable seafood — can spoil slowly when stock is high */
const PERISHABLE = new Set(['salmon', 'tuna', 'shrimp', 'uni', 'caviar', 'wagyu', 'egg']);

/** Deterministic 0–1 from dayKey + ingredient id */
function seedUnit(day, id) {
  let h = 2166136261;
  const s = `${day}:${id}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Market mult ~0.72–1.38. Rice/nori stabler; premium more volatile.
 * Event discounts still apply on top in ingredientCost.
 */
export function marketMult(id) {
  ensureFishMarket();
  const m = G.fishMarket?.prices?.[id];
  return typeof m === 'number' && m > 0 ? m : 1;
}

export function ensureFishMarket() {
  if (!G.fishMarket || typeof G.fishMarket !== 'object') {
    G.fishMarket = { dayKey: '', prices: {}, spoilTick: 0 };
  }
  const key = dayKeyUTC();
  if (G.fishMarket.dayKey === key && G.fishMarket.prices && Object.keys(G.fishMarket.prices).length) {
    return G.fishMarket;
  }
  const prices = {};
  Object.keys(INGREDIENTS).forEach(id => {
    const u = seedUnit(key, id);
    // Premium more swing
    const premium = ['uni', 'gold', 'caviar', 'wagyu', 'diamond'].includes(id);
    const mid = premium ? 0.95 : 1.0;
    const amp = premium ? 0.38 : 0.22;
    // Map u to [-1,1] then mult
    const swing = (u * 2 - 1) * amp;
    let mult = mid + swing;
    // Slight chance of "deal of the day" or "scarcity"
    if (u > 0.92) mult = Math.min(1.45, mult + 0.12); // scarce
    if (u < 0.08) mult = Math.max(0.65, mult - 0.15); // deal
    prices[id] = Math.round(mult * 100) / 100;
  });
  G.fishMarket = { dayKey: key, prices, spoilTick: G.fishMarket.spoilTick || 0 };
  return G.fishMarket;
}

export function marketTag(id) {
  const m = marketMult(id);
  if (m <= 0.82) return { cls: 'deal', label: 'ถูก' };
  if (m >= 1.18) return { cls: 'scarce', label: 'แพง' };
  return { cls: '', label: '' };
}

/** Light spoil: high stock of perishables decays occasionally */
export function tickSpoil() {
  if (!G.ing) return;
  ensureFishMarket();
  G.fishMarket.spoilTick = (G.fishMarket.spoilTick || 0) + 1;
  // Every ~90s if interval is 1s from caller, use every 90 ticks — caller uses 45s
  let spoiled = [];
  Object.keys(INGREDIENTS).forEach(id => {
    if (!PERISHABLE.has(id)) return;
    const have = G.ing[id] || 0;
    const max = Math.floor((INGREDIENTS[id].maxAmt || 20) * (G.storageMult || 1));
    // Only spoil when stock is more than half full
    if (have < Math.max(6, Math.floor(max * 0.45))) return;
    // ~35% chance per tick call
    if (Math.random() > 0.35) return;
    const loss = have >= max * 0.8 ? 2 : 1;
    G.ing[id] = Math.max(0, have - loss);
    spoiled.push(`${INGREDIENTS[id].emoji}−${loss}`);
  });
  if (spoiled.length) {
    import('../ui/render.js').then(ui => {
      ui.toast('❄️ วัตถุดิบเริ่มเสีย: ' + spoiled.join(' '));
      ui.renderIngredients();
      ui.updateUI();
    }).catch(() => {});
    save();
  }
}

export function renderMarketBanner() {
  ensureFishMarket();
  const host = getEl('marketBanner');
  if (!host) return;
  const prices = G.fishMarket.prices || {};
  // Pick top deal + scarcest among common fish
  const ids = Object.keys(prices);
  if (!ids.length) { host.style.display = 'none'; return; }
  let dealId = null, dealM = 99;
  let scarceId = null, scarceM = 0;
  ids.forEach(id => {
    if (['gold', 'diamond', 'caviar'].includes(id) && (G.level || 1) < 12) return;
    const m = prices[id];
    if (m < dealM) { dealM = m; dealId = id; }
    if (m > scarceM) { scarceM = m; scarceId = id; }
  });
  const d = dealId && INGREDIENTS[dealId];
  const s = scarceId && INGREDIENTS[scarceId];
  host.style.display = 'flex';
  host.innerHTML = `
    <span class="mk-ico">🐟</span>
    <div class="mk-inf">
      <div class="mk-lbl">ตลาดปลาวันนี้</div>
      <div class="mk-line">
        ${d ? `<span class="mk-deal">${d.emoji} ${d.name} ×${dealM.toFixed(2)}</span>` : ''}
        ${s && s !== d ? `<span class="mk-scarce">${s.emoji} ${s.name} ×${scarceM.toFixed(2)}</span>` : ''}
      </div>
    </div>
    <span class="mk-day">${G.fishMarket.dayKey?.slice(5) || ''}</span>
  `;
}
