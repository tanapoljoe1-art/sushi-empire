// ── Navigation ────────────────────────────────────────────────────────────────
// nav.js is a hub: most feature modules call setBDot/showConfirm/goTab from
// here, and this file calls back into their render functions for lazy-render
// on tab switch. That makes several two-way circular imports (nav.js <->
// staff.js/game.js/fusion.js/story.js/progress.js) — safe in ESM as long as no
// module reads an imported binding at top-level module-evaluation time, only
// inside function bodies. Every read below is inside a function, so plain
// static imports are used throughout (no dynamic import() needed).
import { G, save, defaultState } from '../core/state.js';
import { UPGRADES } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, renderUpgrades, renderIngredients, updateEarnPreview } from '../ui/render.js';
import { startTitleBg } from '../ui/background.js';
import { settings } from './audio.js';
import { renderStaff, applyAllStaffBonuses } from './staff.js';
import { renderDeco, applyDecoBonus } from './decoration.js';
import { renderQuests, renderLB, renderAch, hasUnclaimedQuests, initQuests } from './progress.js';
import { renderBr, renderPrest, spawnQueue } from './game.js';
import { renderFusionLab, initFusion } from './fusion.js';
import { updateMGHighScores } from './minigames.js';
import { initStory } from './story.js';

export function goTab(t) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  const pg = getEl('pg-' + t);
  if (pg) pg.classList.add('on');

  // Show/hide cook button — only visible on main tab
  const cookWrap = getEl('cookWrap');
  if (cookWrap) cookWrap.style.display = t === 'main' ? '' : 'none';

  // Lazy-render pages when first visited
  if (t === 'staff')  renderStaff();
  if (t === 'deco')   renderDeco();
  if (t === 'quest')  renderQuests();
  if (t === 'lb')     renderLB();
  if (t === 'ach')    renderAch();
  if (t === 'br')     renderBr();
  if (t === 'prest')  renderPrest();
  if (t === 'fusion') renderFusionLab();
  if (t === 'mg')     updateMGHighScores();
}

// ── Notification dots ─────────────────────────────────────────────────────────

export function updateNavDots() {
  const storyPending = (G.storyData && G.storyData.pendingChapters && G.storyData.pendingChapters.length) > 0;
  const newFusion    = (G.fusion && G.fusion.newDisc && G.fusion.newDisc.length) > 0;
  const playDot      = getEl('dot-play');
  if (playDot) playDot.classList.toggle('vis', storyPending || newFusion);

  // Quest state is stored as 'claimed'/undefined — use hasUnclaimedQuests()
  const questDot = getEl('dot-prog');
  if (questDot) questDot.classList.toggle('vis', hasUnclaimedQuests());
}

export function setBDot(group, on) {
  const dot = getEl('dot-' + group);
  if (dot) dot.classList.toggle('vis', on);
}

// ── Bottom nav drawers ────────────────────────────────────────────────────────

const BNAV_MAP = {
  main:   'bnt-main',
  mg:     'bnt-play',
  fusion: 'bnt-play',
  staff:  'bnt-team',
  deco:   'bnt-team',
  quest:  'bnt-prog',
  lb:     'bnt-prog',
  ach:    'bnt-prog',
  br:     'bnt-shop',
  prest:  'bnt-shop',
};

let activeDrawer = null;

export function bnavGo(tab) {
  closeDrawer();
  goTab(tab);
  document.querySelectorAll('.bntab').forEach(b => b.classList.remove('on'));
  const btnId = BNAV_MAP[tab] || 'bnt-main';
  getEl(btnId)?.classList.add('on');
}

export function bnavDrawer(group) {
  if (activeDrawer === group) { closeDrawer(); return; }
  closeDrawer();
  activeDrawer = group;
  getEl('drawer-' + group)?.classList.add('vis');
  getEl('drawerBg')?.classList.add('vis');
  document.querySelectorAll('.bntab').forEach(b => b.classList.remove('on'));
  getEl('bnt-' + group)?.classList.add('on');
}

export function drawerGo(tab, group) {
  closeDrawer();
  goTab(tab);
  document.querySelectorAll('.ditem').forEach(d => d.classList.remove('active-sub'));
  getEl('ditem-' + tab)?.classList.add('active-sub');
  document.querySelectorAll('.bntab').forEach(b => b.classList.remove('on'));
  getEl('bnt-' + group)?.classList.add('on');
}

export function closeDrawer() {
  if (!activeDrawer) return;
  document.querySelectorAll('.drawer').forEach(d => d.classList.remove('vis'));
  getEl('drawerBg')?.classList.remove('vis');
  activeDrawer = null;
}

let touchStartY = 0;
document.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend',   e => {
  if (activeDrawer && e.changedTouches[0].clientY - touchStartY > 60) closeDrawer();
}, { passive: true });

// ── Title screen ──────────────────────────────────────────────────────────────

export function spawnTitleParticles() {
  const ts    = getEl('titleScreen');
  const ITEMS = ['🍣','🐟','🌸','⭐','🍤','🌿','🏮','✨','🐡','💎'];
  for (let i = 0; i < 14; i++) {
    const el   = document.createElement('div');
    el.className = 'ts-particle';
    const size = 16 + Math.random() * 20;
    el.style.cssText = `left:${Math.random()*100}%;top:${60+Math.random()*60}%;--d:${5+Math.random()*6}s;--dl:${Math.random()*4}s;--fs:${size}px;`;
    el.innerText = ITEMS[~~(Math.random() * ITEMS.length)];
    ts.appendChild(el);
  }
}

export function initTitleScreen() {
  startTitleBg();
  spawnTitleParticles();
  document.querySelectorAll('.ts-btn').forEach((b, i) => {
    b.style.animation = `fadeUp .6s cubic-bezier(.34,1.56,.64,1) ${.6 + i * .1}s both`;
  });
  const hasSave = !!localStorage.getItem('SE5');
  if (hasSave) {
    try {
      const sv = JSON.parse(localStorage.getItem('SE5'));
      getEl('tsSavePreview').style.display = 'block';
      getEl('tsSaveName').innerText = `Lv.${sv.level || 1} · ${(sv.money || 0).toLocaleString()}฿`;
      getEl('tsSaveSub').innerText  = `เสิร์ฟ ${sv.served || 0} ครั้ง · Prestige ${sv.prestigeLevel || 0}`;
      getEl('btnContinue').style.display  = 'flex';
      getEl('btnNewGame').className       = 'ts-btn secondary';
      getEl('btnDeleteSave').style.display = 'flex';
    } catch (e) {}
  }
}

export function titleContinue() { hideTitle(); }

export function titleNewGame() {
  if (localStorage.getItem('SE5')) {
    showConfirm('🔄', 'เริ่มเกมใหม่?', 'เซฟเดิมจะถูกลบทั้งหมด ไม่สามารถย้อนกลับได้!', 'danger', () => {
      localStorage.removeItem('SE5');
      Object.assign(G, defaultState());
      UPGRADES.forEach(u => u.fx(G));
      applyAllStaffBonuses();
      applyDecoBonus();
      initQuests();
      initStory();
      initFusion();
      spawnQueue();
      updateUI();
      renderUpgrades();
      renderIngredients();
      updateEarnPreview();
      hideTitle();
    });
  } else {
    hideTitle();
  }
}

export function titleDeleteSave() {
  showConfirm('🗑️', 'ลบเซฟ?', 'ข้อมูลทั้งหมดจะหายถาวร ไม่สามารถกู้คืนได้!', 'danger', () => {
    localStorage.removeItem('SE5');
    location.reload();
  });
}

export function titleSettings() { openSettings(); }

export function hideTitle() {
  const ts = getEl('titleScreen');
  ts.classList.add('out');
  setTimeout(() => { ts.style.display = 'none'; }, 650);
}

// ── Pause menu ────────────────────────────────────────────────────────────────

export function openPause() {
  getEl('pm_money').innerText  = G.money.toLocaleString();
  getEl('pm_level').innerText  = G.level;
  getEl('pm_served').innerText = G.served;
  getEl('pauseMenu').classList.add('vis');
}
export function closePause() { getEl('pauseMenu').classList.remove('vis'); }
export function pauseSettings() { closePause(); openSettings(); }

export function pauseToTitle() {
  showConfirm('🏠', 'กลับหน้าหลัก?', 'เกมจะถูก pause และบันทึกอัตโนมัติ', 'ok', () => {
    closePause(); save();
    const ts = getEl('titleScreen');
    ts.style.display = 'flex'; ts.classList.remove('out');
    initTitleScreen();
  });
}

export function pauseNewGame() {
  closePause();
  showConfirm('🔄', 'เริ่มเกมใหม่?', 'เซฟเดิมจะถูกลบ — แน่ใจหรือไม่?', 'danger', () => {
    titleNewGame();
    const ts = getEl('titleScreen');
    ts.style.display = 'flex'; ts.classList.remove('out');
    setTimeout(() => { initTitleScreen(); }, 100);
  });
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

let confirmCallback = null;

export function showConfirm(icon, title, sub, type, cb) {
  confirmCallback = cb;
  getEl('cdIcon').innerText  = icon;
  getEl('cdTitle').innerText = title;
  getEl('cdSub').innerText   = sub;
  const okBtn = getEl('cdOkBtn');
  okBtn.className = 'cd-btn ' + (type === 'danger' ? 'red' : 'ok');
  okBtn.innerText = type === 'danger' ? 'ลบเลย! 🗑️' : 'ตกลง';
  getEl('confirmDlg').classList.add('vis');
}
export function closeConfirm() { getEl('confirmDlg').classList.remove('vis'); confirmCallback = null; }
export function confirmOk()    { const cb = confirmCallback; closeConfirm(); if (cb) cb(); }

// ── Settings ──────────────────────────────────────────────────────────────────

export function openSettings()  { getEl('settingsModal').classList.add('vis'); }
export function closeSettings() { getEl('settingsModal').classList.remove('vis'); }

// The original code built the element ID as `'toggle' + key[0].toUpperCase() + key.slice(1)`
// which produces 'toggleAutosave' but the HTML uses id="toggleAutoSave". Use an
// explicit map to avoid the case-sensitivity mismatch.
const TOGGLE_ID_MAP = { sound: 'toggleSound', anim: 'toggleAnim', autosave: 'toggleAutoSave' };

export function toggleSetting(key) {
  settings[key] = !settings[key];
  const elId = TOGGLE_ID_MAP[key];
  const el   = elId ? getEl(elId) : null;
  if (el) el.classList.toggle('on', settings[key]);
}
