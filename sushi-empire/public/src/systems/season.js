// ── Calendar seasonality (menus + light market lean) ──────────────────────────
import { SEASONS } from '../data.js';
import { getEl } from '../core/dom.js';

export function getSeason(d = new Date()) {
  const m = d.getMonth(); // 0–11
  return SEASONS.find(s => s.months.includes(m)) || SEASONS[0];
}

/** Extra earn mult if current menu is in season spotlight */
export function seasonMenuMult(menuId) {
  const s = getSeason();
  if (!menuId || !s.menuBoost) return 1;
  // exact id or fusion/name contains seasonal keyword
  if (s.menuBoost.includes(menuId)) return s.menuEarnMult || 1.1;
  return 1;
}

/** Price lean for ingredients (stacks under fish market) */
export function seasonIngMult(ingId) {
  const s = getSeason();
  if (s.ingCheap?.includes(ingId)) return 0.88;
  if (s.ingDear?.includes(ingId)) return 1.12;
  return 1;
}

export function renderSeasonBanner() {
  const host = getEl('seasonBanner');
  if (!host) return;
  const s = getSeason();
  host.style.display = 'flex';
  host.innerHTML = `
    <span class="sz-ico">${s.emoji}</span>
    <div class="sz-inf">
      <div class="sz-lbl">ฤดูนี้ · ${s.name}</div>
      <div class="sz-line">${s.earnTag || ''} · เมนูฮิตได้โบนัส</div>
    </div>
  `;
  host.title = `เมนูเด่น: ${(s.menuBoost || []).join(', ')}`;
}
