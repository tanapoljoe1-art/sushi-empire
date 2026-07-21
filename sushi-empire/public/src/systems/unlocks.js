// ── Progressive feature unlocks ───────────────────────────────────────────────
// Tabs / systems gate by level so new players are not flooded on day one.
// Note: local toast() avoids circular import with ui/render.js.
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';

function toast(msg) {
  const t = getEl('toast');
  if (!t) return;
  t.innerText = msg;
  t.classList.add('vis');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('vis'), 2400);
}

/** featureId → unlock requirement */
export const FEATURE_UNLOCKS = {
  ach:    { level: 1,  label: 'ความสำเร็จ', icon: '🏆', group: 'prog' },
  quest:  { level: 2,  label: 'Quest',      icon: '📋', group: 'prog' },
  lb:     { level: 2,  label: 'อันดับ',     icon: '🏅', group: 'prog' },
  staff:  { level: 3,  label: 'ทีมงาน',     icon: '👨‍🍳', group: 'team' },
  mg:     { level: 3,  label: 'Mini-game',  icon: '🎮', group: 'play' },
  deco:   { level: 4,  label: 'ตกแต่ง',     icon: '🎨', group: 'team' },
  fusion: { level: 5,  label: 'Fusion Lab', icon: '🧪', group: 'play' },
  br:     { level: 8,  label: 'สาขา',       icon: '🏪', group: 'shop' },
  prest:  { level: 15, label: 'Prestige',   icon: '✨', group: 'shop' },
};

export function isFeatureUnlocked(id) {
  const u = FEATURE_UNLOCKS[id];
  if (!u) return true;
  return G.level >= u.level;
}

export function requireFeature(id) {
  if (isFeatureUnlocked(id)) return true;
  const u = FEATURE_UNLOCKS[id];
  toast(`🔒 ต้องการ Lv.${u.level} เพื่อเปิด${u.label}`);
  return false;
}

export function isGroupUnlocked(group) {
  return Object.entries(FEATURE_UNLOCKS)
    .filter(([, u]) => u.group === group)
    .some(([id]) => isFeatureUnlocked(id));
}

/** On load: mark already-unlocked features as seen (no spam toasts). */
export function markExistingUnlocksSeen() {
  if (!G.featureUnlockToast) G.featureUnlockToast = {};
  Object.entries(FEATURE_UNLOCKS).forEach(([id, u]) => {
    if (G.level >= u.level) G.featureUnlockToast[id] = true;
  });
  refreshUnlockUI();
}

/** Call after level-up: toast newly unlocked features. */
export function checkFeatureUnlocks(prevLevel, newLevel) {
  if (!G.featureUnlockToast) G.featureUnlockToast = {};
  Object.entries(FEATURE_UNLOCKS).forEach(([id, u]) => {
    if (prevLevel < u.level && newLevel >= u.level && !G.featureUnlockToast[id]) {
      G.featureUnlockToast[id] = true;
      setTimeout(() => toast(`${u.icon} ปลดล็อก: ${u.label}!`), 400);
    }
  });
  refreshUnlockUI();
  save();
}

export function refreshUnlockUI() {
  Object.entries(FEATURE_UNLOCKS).forEach(([id, u]) => {
    const el = getEl('ditem-' + id);
    if (!el) return;
    const locked = !isFeatureUnlocked(id);
    el.classList.toggle('locked-feature', locked);
    el.classList.toggle('unlocked-feature', !locked);
    let badge = el.querySelector('.lock-badge');
    if (locked) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'lock-badge';
        el.appendChild(badge);
      }
      badge.innerText = `🔒 Lv.${u.level}`;
    } else if (badge) {
      badge.remove();
    }
  });

  // Bottom-nav groups
  ['play', 'team', 'prog', 'shop'].forEach(group => {
    const btn = getEl('bnt-' + group);
    if (!btn) return;
    const open = isGroupUnlocked(group);
    btn.classList.toggle('nav-locked', !open);
    btn.title = open ? '' : 'ยังไม่ปลดล็อก';
  });
}
