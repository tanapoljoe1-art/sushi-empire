// ── Decoration system ─────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { DECO_DATA } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';

export function applyDecoBonus() {
  G.decoRatingBonus  = 0; G.decoIncomeBonus   = 0; G.decoVipBonus      = false;
  G.decoPatienceBonus = 0; G.decoStreakMult    = 1; G.decoRushBonus   = false;
  G.decoIdleBonus    = false;
  if (G.deco.equipped) {
    const d = DECO_DATA.find(x => x.id === G.deco.equipped);
    if (d) {
      d.fx(G);
      if (G.staffDecoBonus) {
        G.decoRatingBonus  *= G.staffDecoMult;
        G.decoIncomeBonus   = Math.min(0.3, G.decoIncomeBonus * G.staffDecoMult);
      }
    }
  }
}

export function buyDeco(id) {
  const d = DECO_DATA.find(x => x.id === id);
  if (!G.deco) G.deco = { owned: [], equipped: null };
  if (G.deco.owned.includes(id)) { equipDeco(id); return; }
  if (G.money < d.cost) { toast('✕ เงินไม่พอ!'); return; }
  G.money -= d.cost;
  G.deco.owned.push(id);
  equipDeco(id);
  toast('🎨 ซื้อ ' + d.name + ' แล้ว!');
  updateUI(); renderDeco(); save();
}

export function equipDeco(id) {
  if (!G.deco) G.deco = { owned: [], equipped: null };
  G.deco.equipped = id;
  applyDecoBonus();
  const d = DECO_DATA.find(x => x.id === id);
  toast('✨ ใส่ ' + d.name + ' แล้ว!');
  renderDeco(); updateUI(); save();
}

export function renderDeco() {
  const eq     = G.deco.equipped;
  const eqData = eq ? DECO_DATA.find(x => x.id === eq) : null;
  getEl('decoPreview').innerHTML = eqData
    ? `<span style="font-size:32px">${eqData.emoji}</span>
       <div style="font-size:13px;font-weight:700;margin-top:4px;color:var(--text)">${eqData.name}</div>
       <div style="font-size:11px;color:var(--teal);margin-top:2px">${eqData.bonus}</div>`
    : '<span style="font-size:24px">🏚️</span><div style="margin-top:6px">ยังไม่ได้ตกแต่ง</div>';

  getEl('decoGrid').innerHTML = DECO_DATA.map(d => {
    const owned = (G.deco.owned || []).includes(d.id);
    const isEq  = G.deco.equipped === d.id;
    return `<div class="deco-card ${isEq ? 'equipped' : owned ? 'owned' : ''}" onclick="buyDeco('${d.id}')">
      ${isEq  ? '<div class="deco-badge eq">✓ ใส่อยู่</div>' : ''}
      ${owned && !isEq ? '<div class="deco-badge owned">มีแล้ว</div>' : ''}
      <div class="deco-emoji">${d.emoji}</div>
      <div class="deco-name">${d.name}</div>
      <div class="deco-bonus">${d.bonus}</div>
      ${owned
        ? `<div class="deco-cost" style="color:var(--teal)">กดเพื่อใส่</div>`
        : `<div class="deco-cost">${d.cost.toLocaleString()}฿</div>`}
    </div>`;
  }).join('');
}
