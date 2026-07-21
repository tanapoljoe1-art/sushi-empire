// ── Decorations system (multi-slot + set bonuses) ─────────────────────────────
import { G, save, DECO_SLOTS } from '../core/state.js';
import { DECO_DATA, DECO_SLOT_LABEL, DECO_SETS } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { updateKitchenTheme } from '../ui/kitchen-scene.js';

function ensureDeco() {
  if (!G.deco || typeof G.deco !== 'object') {
    G.deco = { owned: [], equipped: null, slots: { wall:null, counter:null, light:null, floor:null } };
  }
  if (!G.deco.slots) G.deco.slots = { wall:null, counter:null, light:null, floor:null };
  DECO_SLOTS.forEach(s => {
    if (!(s in G.deco.slots)) G.deco.slots[s] = null;
  });
  if (!Array.isArray(G.deco.owned)) G.deco.owned = [];
}

export function getEquippedDecoIds() {
  ensureDeco();
  return DECO_SLOTS.map(s => G.deco.slots[s]).filter(Boolean);
}

export function applyDecoBonus() {
  ensureDeco();
  G.decoRatingBonus   = 0;
  G.decoIncomeBonus   = 0;
  G.decoVipBonus      = false;
  G.decoPatienceBonus = 0;
  G.decoStreakMult    = 1;
  G.decoRushBonus     = false;
  G.decoIdleBonus     = false;
  G.decoSetBonus      = 0;

  const equipped = getEquippedDecoIds();
  equipped.forEach(id => {
    const d = DECO_DATA.find(x => x.id === id);
    if (d?.fx) d.fx(G);
  });

  // Set bonuses
  Object.values(DECO_SETS).forEach(set => {
    const n = set.pieces.filter(id => equipped.includes(id)).length;
    if (n >= 2 && set.at2) set.at2(G);
    if (n >= 3 && set.at3) set.at3(G);
  });

  if (G.staffDecoBonus) {
    const m = G.staffDecoMult || 1.2;
    G.decoRatingBonus  *= m;
    G.decoIncomeBonus   = Math.min(0.55, G.decoIncomeBonus * m);
    G.decoPatienceBonus *= m;
  }

  // Compat: equipped = first filled slot (for older UI / prestige)
  G.deco.equipped = equipped[0] || null;
}

export function buyDeco(id) {
  ensureDeco();
  const d = DECO_DATA.find(x => x.id === id);
  if (!d) return;
  if (G.deco.owned.includes(id)) { equipDeco(id); return; }
  if (G.money < d.cost) { toast('✕ เงินไม่พอ!'); return; }
  G.money -= d.cost;
  G.deco.owned.push(id);
  equipDeco(id);
  toast('🎨 ซื้อ ' + d.name + ' แล้ว!');
  updateUI();
  renderDeco();
  save();
}

export function equipDeco(id) {
  ensureDeco();
  const d = DECO_DATA.find(x => x.id === id);
  if (!d || !G.deco.owned.includes(id)) return;
  const slot = d.slot || 'counter';
  // Toggle off if already in this slot
  if (G.deco.slots[slot] === id) {
    G.deco.slots[slot] = null;
    applyDecoBonus();
    toast('ถอด ' + d.name);
  } else {
    G.deco.slots[slot] = id;
    applyDecoBonus();
    toast('✨ ใส่ ' + d.name + ' (' + (DECO_SLOT_LABEL[slot] || slot) + ')');
  }
  try { updateKitchenTheme(G); } catch (_) {}
  try { import('./game.js').then(m => m.checkAch()).catch(() => {}); } catch (_) {}
  renderDeco();
  updateUI();
  save();
}

export function unequipSlot(slot) {
  ensureDeco();
  if (!DECO_SLOTS.includes(slot)) return;
  G.deco.slots[slot] = null;
  applyDecoBonus();
  try { updateKitchenTheme(G); } catch (_) {}
  renderDeco();
  updateUI();
  save();
}

function setStatusHtml() {
  const equipped = getEquippedDecoIds();
  const bits = [];
  Object.entries(DECO_SETS).forEach(([id, set]) => {
    const n = set.pieces.filter(pid => equipped.includes(pid)).length;
    if (n <= 0) return;
    const tag = n >= 3 ? '✦3' : n >= 2 ? '✦2' : `${n}/2`;
    bits.push(`${set.name} ${tag}`);
  });
  return bits.length
    ? `<div style="font-size:11px;color:var(--gold);margin-top:6px">ชุด: ${bits.join(' · ')}</div>`
    : '';
}

export function renderDeco() {
  ensureDeco();
  applyDecoBonus();

  // Slot strip
  const slotHtml = DECO_SLOTS.map(slot => {
    const id = G.deco.slots[slot];
    const d = id ? DECO_DATA.find(x => x.id === id) : null;
    return `<div class="deco-slot" data-slot="${slot}" ${d ? `onclick="unequipSlot('${slot}')"` : ''}>
      <div class="deco-slot-lbl">${DECO_SLOT_LABEL[slot] || slot}</div>
      <div class="deco-slot-ico">${d ? d.emoji : '·'}</div>
      <div class="deco-slot-n">${d ? d.name : 'ว่าง'}</div>
    </div>`;
  }).join('');

  const bonusBits = [];
  if (G.decoIncomeBonus) bonusBits.push(`+${Math.round(G.decoIncomeBonus * 100)}% ฿`);
  if (G.decoRatingBonus) bonusBits.push(`+${Math.round(G.decoRatingBonus * 100)}% ⭐`);
  if (G.decoPatienceBonus) bonusBits.push(`+${Math.round(G.decoPatienceBonus * 100)}% อดทน`);
  if (G.decoStreakMult > 1) bonusBits.push(`Streak ×${G.decoStreakMult}`);
  if (G.decoIdleBonus) bonusBits.push('Idle ×2');
  if (G.decoVipBonus) bonusBits.push('VIP+');

  getEl('decoPreview').innerHTML = `
    <div class="deco-slots">${slotHtml}</div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">กดชิ้นที่มีแล้วเพื่อใส่/ถอด · ช่องละ 1 ชิ้น · ชุดซากุระ/เซน ให้โบนัสพิเศษ</div>
    ${bonusBits.length ? `<div style="font-size:12px;color:var(--teal);margin-top:6px;font-weight:700">${bonusBits.join(' · ')}</div>` : ''}
    ${setStatusHtml()}
  `;

  getEl('decoGrid').innerHTML = DECO_DATA.map(d => {
    const owned = (G.deco.owned || []).includes(d.id);
    const slot = d.slot || 'counter';
    const isEq = G.deco.slots[slot] === d.id;
    const slotLbl = DECO_SLOT_LABEL[slot] || slot;
    return `<div class="deco-card ${isEq ? 'equipped' : owned ? 'owned' : ''}" onclick="buyDeco('${d.id}')">
      ${isEq  ? '<div class="deco-badge eq">✓ ใส่อยู่</div>' : ''}
      ${owned && !isEq ? '<div class="deco-badge owned">มีแล้ว</div>' : ''}
      <div class="deco-emoji">${d.emoji}</div>
      <div class="deco-name">${d.name}</div>
      <div class="deco-bonus">${d.bonus}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">${slotLbl}${d.set ? ' · ' + (DECO_SETS[d.set]?.name || d.set) : ''}</div>
      ${owned
        ? `<div class="deco-cost" style="color:var(--teal)">${isEq ? 'กดเพื่อถอด' : 'กดเพื่อใส่'}</div>`
        : `<div class="deco-cost">${d.cost.toLocaleString()}฿</div>`}
    </div>`;
  }).join('');
}
