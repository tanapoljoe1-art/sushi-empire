// ── Shared cached DOM accessor ────────────────────────────────────────────────
// Replaces the 3 duplicated copies that existed pre-refactor (getEl/_domCache in
// ui.js, getGameEl/_gameEls in game.js, and raw document.getElementById calls
// scattered everywhere else).
const _cache = {};

export function getEl(id) {
  if (!_cache[id]) _cache[id] = document.getElementById(id);
  return _cache[id];
}

// Escapes user-supplied text (e.g. player names) before interpolating into innerHTML.
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
