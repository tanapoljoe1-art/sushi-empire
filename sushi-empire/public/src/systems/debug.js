// ── Debug panel (dev) — enable via settings, ?debug=1, or long-press logo ─────
import { G, save, defaultState } from '../core/state.js';
import { UPGRADES, MENUS } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, renderUpgrades, renderIngredients, updateEarnPreview } from '../ui/render.js';
import { spawnQueue } from './game.js';
import { checkFeatureUnlocks } from './unlocks.js';
import { ensureDailySpecial } from './daily.js';
import { ensureFishMarket, renderMarketBanner } from './market.js';
import { ensureRivalWeekly, renderRivalBanner } from './rival.js';
import { ensureBattlePass, renderBattlePass, addBattlePassXp } from './battlepass.js';
import { updateKitchenTheme } from '../ui/kitchen-scene.js';

const FLAG_KEY = 'SE5_debug';

export function isDebugEnabled() {
  try {
    if (typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)) return true;
    if (localStorage.getItem(FLAG_KEY) === '1') return true;
  } catch (_) {}
  return false;
}

export function setDebugEnabled(on) {
  try { localStorage.setItem(FLAG_KEY, on ? '1' : '0'); } catch (_) {}
  const btn = getEl('debugFab');
  if (btn) btn.style.display = on ? 'flex' : 'none';
  if (!on) closeDebugPanel();
}

export function toggleDebugEnabled() {
  const next = !isDebugEnabled();
  setDebugEnabled(next);
  toast(next ? '🛠️ Debug เปิด' : 'Debug ปิด');
  return next;
}

function ensureFab() {
  let fab = getEl('debugFab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'debugFab';
    fab.type = 'button';
    fab.className = 'debug-fab';
    fab.innerText = '🛠️';
    fab.title = 'Debug panel';
    fab.onclick = () => openDebugPanel();
    document.body.appendChild(fab);
  }
  fab.style.display = isDebugEnabled() ? 'flex' : 'none';
}

export function initDebug() {
  ensureFab();
  // Long-press logo (if present) to unlock debug
  const logo = document.querySelector('.logo, .ts-title, #logoBtn');
  if (logo && !logo._debugBound) {
    logo._debugBound = true;
    let t = null;
    const start = () => {
      t = setTimeout(() => {
        setDebugEnabled(true);
        openDebugPanel();
        toast('🛠️ Debug unlock (กดค้างโลโก้)');
      }, 1200);
    };
    const end = () => clearTimeout(t);
    logo.addEventListener('pointerdown', start);
    logo.addEventListener('pointerup', end);
    logo.addEventListener('pointerleave', end);
  }
  // Keyboard cheats
  if (!window._debugKey) {
    window._debugKey = true;
    window.addEventListener('keydown', (e) => {
      // F1 = +100,000฿ each press
      if (e.key === 'F1' || e.code === 'F1') {
        e.preventDefault();
        debugGiveMoney(100000);
        return;
      }
      // Ctrl+Shift+D = open debug panel
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setDebugEnabled(true);
        openDebugPanel();
      }
    });
  }
}

function panelEl() {
  let p = getEl('debugPanel');
  if (p) return p;
  p = document.createElement('div');
  p.id = 'debugPanel';
  p.className = 'debug-panel';
  p.innerHTML = `
    <div class="debug-head">
      <strong>🛠️ Debug</strong>
      <button type="button" class="debug-x" onclick="closeDebugPanel()">✕</button>
    </div>
    <div class="debug-grid">
      <button type="button" onclick="debugGiveMoney(1000)">+1k ฿</button>
      <button type="button" onclick="debugGiveMoney(10000)">+10k ฿</button>
      <button type="button" onclick="debugGiveMoney(100000)">+100k ฿ (F1)</button>
      <button type="button" onclick="debugAddLevel(1)">+1 Lv</button>
      <button type="button" onclick="debugAddLevel(5)">+5 Lv</button>
      <button type="button" onclick="debugSetLevel(20)">Lv.20</button>
      <button type="button" onclick="debugFillIng()">วัตถุดิบเต็ม</button>
      <button type="button" onclick="debugSkipTime(300)">ข้าม 5 นาที</button>
      <button type="button" onclick="debugSkipTime(3600)">ข้าม 1 ชม.</button>
      <button type="button" onclick="debugForceEvent('rush')">Event Rush</button>
      <button type="button" onclick="debugForceEvent('critic')">Event Critic</button>
      <button type="button" onclick="debugForceEvent('vip')">Event VIP</button>
      <button type="button" onclick="debugForceEvent('blackout')">ไฟดับ</button>
      <button type="button" onclick="debugForceEvent('inspect')">สุขาภิบาล</button>
      <button type="button" onclick="debugForceEvent('rival_sale')">Tsunami ลด</button>
      <button type="button" onclick="debugSpawnSpy()">คิว Spy</button>
      <button type="button" onclick="debugSpawnCriticCust()">คิว Critic</button>
      <button type="button" onclick="debugBpXp(50)">BP +50 XP</button>
      <button type="button" onclick="debugMaxUpgrades()">Max อัปเกรด</button>
      <button type="button" onclick="debugResetDay()">รีเซ็ต daily</button>
      <button type="button" onclick="debugCloseAndDisable()">ปิด + ซ่อน</button>
    </div>
    <div class="debug-stat" id="debugStat"></div>
  `;
  document.body.appendChild(p);
  return p;
}

export function openDebugPanel() {
  if (!isDebugEnabled()) setDebugEnabled(true);
  ensureFab();
  const p = panelEl();
  p.classList.add('vis');
  refreshDebugStat();
}

export function closeDebugPanel() {
  getEl('debugPanel')?.classList.remove('vis');
}

export function debugCloseAndDisable() {
  closeDebugPanel();
  setDebugEnabled(false);
}

function refreshDebugStat() {
  const el = getEl('debugStat');
  if (!el) return;
  let telLine = '';
  try {
    // sync import path may not be ready; use dynamic
  } catch (_) {}
  import('./telemetry.js').then(m => {
    const t = m.formatTelemetryDebug();
    el.innerText =
      `Lv.${G.level} · ฿${G.money.toLocaleString()} · เสิร์ฟ ${G.served}\n`
      + `rating ${G.rating} · prest ${G.prestigeLevel} · Perfect ${G.perfectCount || 0}\n`
      + `match ${G.orderMatchCount || 0} · chain max ${G.maxOrderMatchStreak || 0}\n`
      + t;
  }).catch(() => {
    el.innerText = `Lv.${G.level} · ฿${G.money} · เสิร์ฟ ${G.served} · rating ${G.rating} · prest ${G.prestigeLevel}`;
  });
}

export function debugGiveMoney(n) {
  G.money += n;
  toast(`+${n.toLocaleString()}฿ (debug)`);
  updateUI(); save(); refreshDebugStat();
}

export function debugAddLevel(n) {
  const prev = G.level;
  G.level += n;
  G.rating = 20;
  checkFeatureUnlocks(prev, G.level);
  toast(`Lv.${G.level}`);
  updateUI(); save(); refreshDebugStat();
}

export function debugSetLevel(lv) {
  const prev = G.level;
  G.level = lv;
  checkFeatureUnlocks(prev, G.level);
  toast(`ตั้ง Lv.${lv}`);
  updateUI(); save(); refreshDebugStat();
}

export function debugFillIng() {
  Object.keys(G.ing || {}).forEach(k => { G.ing[k] = 99; });
  // ensure all ingredient keys
  ['rice','salmon','tuna','shrimp','uni','nori','gold','caviar','wagyu','egg','diamond'].forEach(k => {
    G.ing[k] = Math.max(G.ing[k] || 0, 50);
  });
  toast('วัตถุดิบเต็ม');
  renderIngredients(); updateUI(); save();
}

export function debugSkipTime(sec) {
  G.lastSave = Date.now() - sec * 1000;
  toast(`ข้าม ${sec}s (รีโหลดเพื่อ idle เต็ม)`);
  save();
  // soft: add idle money estimate
  const add = Math.round(sec / 60 * (5 + G.level * 2) * (G.idleMult || 1));
  G.money += add;
  toast(`~idle +${add}฿`);
  updateUI(); save(); refreshDebugStat();
}

export async function debugForceEvent(id) {
  try {
    const ev = await import('./events.js');
    if (typeof ev.forceEvent === 'function') {
      ev.forceEvent(id);
    } else if (typeof ev.triggerRandomEvent === 'function') {
      // fallback: set active manually
      G.activeEvent = id;
      G.eventTimeLeft = id === 'vip' ? 0 : 60;
      toast('Event: ' + id);
    }
  } catch {
    G.activeEvent = id;
    G.eventTimeLeft = 60;
    toast('Event set: ' + id);
  }
  updateUI(); save(); refreshDebugStat();
}

export function debugSpawnSpy() {
  G.level = Math.max(G.level, 8);
  // inject spy into queue
  import('./game.js').then(mod => {
    // force next picks by temp flag
    G._debugForceCtype = 'spy';
    mod.spawnQueue();
    G._debugForceCtype = null;
    toast('🕵️ Spy ในคิว');
  });
  save();
}

export function debugSpawnCriticCust() {
  G.level = Math.max(G.level, 7);
  G._debugForceCtype = 'critic';
  import('./game.js').then(mod => {
    mod.spawnQueue();
    G._debugForceCtype = null;
    toast('📰 Critic ในคิว');
  });
  save();
}

export function debugBpXp(n) {
  ensureBattlePass();
  addBattlePassXp(n);
  renderBattlePass();
  toast(`BP +${n} XP`);
  save(); refreshDebugStat();
}

export function debugMaxUpgrades() {
  UPGRADES.forEach(u => { G.up[u.id] = u.max; });
  import('./game.js').then(m => {
    m.reapplyUpgradeFx();
    toast('อัปเกรด MAX (soft-cap แล้ว)');
    renderUpgrades(); updateUI(); save(); refreshDebugStat();
  }).catch(() => {
    UPGRADES.forEach(u => u.fx(G));
    toast('อัปเกรด MAX');
    renderUpgrades(); updateUI(); save(); refreshDebugStat();
  });
}

export function debugResetDay() {
  if (G.dailySpecial) G.dailySpecial.dayKey = '';
  if (G.fishMarket) G.fishMarket.dayKey = '';
  ensureDailySpecial();
  ensureFishMarket();
  renderMarketBanner();
  toast('รีเซ็ต daily / ตลาดปลา');
  updateUI(); save();
}
