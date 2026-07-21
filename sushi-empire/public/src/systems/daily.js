// ── Daily Special menu ────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { MENUS } from '../data.js';
import { getEl } from '../core/dom.js';

function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Roll or refresh today's special from unlocked menus. */
export function ensureDailySpecial() {
  if (!G.dailySpecial) G.dailySpecial = { dayKey: '', menuId: null, mult: 1.75 };
  const key = dayKey();
  if (G.dailySpecial.dayKey === key && G.dailySpecial.menuId) {
    // Keep special if still valid; re-pick if menu locked again after prestige
    const m = MENUS.find(x => x.id === G.dailySpecial.menuId);
    if (m && (m.unlockLv || 1) <= G.level && !m.secret) return G.dailySpecial;
  }

  const pool = MENUS.filter(m =>
    !m.secret && (m.unlockLv || 1) <= Math.max(1, G.level) && m.id !== 'omakase_ex'
  );
  // Prefer mid-tier when available
  const mid = pool.filter(m => m.price >= 40 && m.price <= 400);
  const use = mid.length ? mid : pool;
  const pick = use[~~(Math.random() * use.length)] || MENUS[0];
  G.dailySpecial = { dayKey: key, menuId: pick.id, mult: 1.75 };
  return G.dailySpecial;
}

export function getDailySpecialMenu() {
  ensureDailySpecial();
  return MENUS.find(m => m.id === G.dailySpecial.menuId) || null;
}

export function isDailySpecial(menuId) {
  ensureDailySpecial();
  return G.dailySpecial && G.dailySpecial.menuId === menuId;
}

export function dailySpecialMult(menuId) {
  if (!isDailySpecial(menuId)) return 1;
  return G.dailySpecial.mult || 1.75;
}

export function renderDailySpecialBanner() {
  ensureDailySpecial();
  const host = getEl('dailySpecialBanner');
  if (!host) return;
  const m = getDailySpecialMenu();
  if (!m) { host.style.display = 'none'; return; }
  host.style.display = 'flex';
  host.innerHTML = `
    <span class="ds-ico">${m.emoji}</span>
    <div class="ds-inf">
      <div class="ds-lbl">⭐ Daily Special</div>
      <div class="ds-name">${m.name} · รายได้ x${(G.dailySpecial.mult || 1.75).toFixed(2)}</div>
    </div>
    <button class="ds-btn" onclick="selMenu('${m.id}')">เลือก</button>
  `;
}
