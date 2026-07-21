// ── Navigation ────────────────────────────────────────────────────────────────
// nav.js is a hub: most feature modules call setBDot/showConfirm/goTab from
// here, and this file calls back into their render functions for lazy-render
// on tab switch. That makes several two-way circular imports (nav.js <->
// staff.js/game.js/fusion.js/story.js/progress.js) — safe in ESM as long as no
// module reads an imported binding at top-level module-evaluation time, only
// inside function bodies. Every read below is inside a function, so plain
// static imports are used throughout (no dynamic import() needed).
import {
  G, save, defaultState, SAVE_KEY,
  exportSaveDownload, exportSaveClipboard, parseImportText, applyImportData,
} from '../core/state.js';
import { UPGRADES } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, renderUpgrades, renderIngredients, updateEarnPreview } from '../ui/render.js';
import { startTitleBg } from '../ui/background.js';
import { settings, startBgm, stopBgm, unlockAudio, applyA11yClasses, persistSettings } from './audio.js';
import { renderStaff, applyAllStaffBonuses } from './staff.js';
import { renderDeco, applyDecoBonus } from './decoration.js';
import { renderQuests, renderLB, renderAch, hasUnclaimedQuests, initQuests } from './progress.js';
import { renderBr, renderPrest, spawnQueue } from './game.js';
import { renderFusionLab, initFusion } from './fusion.js';
import { updateMGHighScores } from './minigames.js';
import { initStory } from './story.js';
import { requireFeature, isGroupUnlocked, refreshUnlockUI, FEATURE_UNLOCKS } from './unlocks.js';

export function goTab(t) {
  // Progressive unlock gate (main is always open)
  if (t !== 'main' && FEATURE_UNLOCKS[t] && !requireFeature(t)) return;

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
    import('./events.js').then(m => m.renderEventLog()).catch(() => {});
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
  if (group !== 'main' && !isGroupUnlocked(group)) {
    const first = Object.entries(FEATURE_UNLOCKS).find(([, u]) => u.group === group);
    const lv = first ? first[1].level : '?';
    toast(`🔒 กลุ่มนี้ปลดที่ Lv.${lv}+`);
    return;
  }
  if (activeDrawer === group) { closeDrawer(); return; }
  closeDrawer();
  activeDrawer = group;
  refreshUnlockUI();
  getEl('drawer-' + group)?.classList.add('vis');
  getEl('drawerBg')?.classList.add('vis');
  document.querySelectorAll('.bntab').forEach(b => b.classList.remove('on'));
  getEl('bnt-' + group)?.classList.add('on');
}

export function drawerGo(tab, group) {
  if (FEATURE_UNLOCKS[tab] && !requireFeature(tab)) return;
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
  if (localStorage.getItem(SAVE_KEY)) {
    showConfirm('🔄', 'เริ่มเกมใหม่?', 'เซฟเดิมจะถูกลบทั้งหมด ไม่สามารถย้อนกลับได้!', 'danger', () => {
      localStorage.removeItem(SAVE_KEY);
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
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  });
}

export function titleSettings() { openSettings(); }

export function hideTitle() {
  const ts = getEl('titleScreen');
  ts.classList.add('out');
  setTimeout(() => { ts.style.display = 'none'; }, 650);
  import('./coach.js').then(m => m.runCoachSequence()).catch(() => {});
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

export function openSettings()  {
  getEl('settingsModal').classList.add('vis');
  const hint = getEl('importSaveHint');
  if (hint) hint.innerText = '';
  syncSettingToggles();
}
export function closeSettings() { getEl('settingsModal').classList.remove('vis'); }

// ── Save export / import (settings modal) ─────────────────────────────────────
export function exportSaveFile() {
  try {
    exportSaveDownload();
    toast('📥 ดาวน์โหลดเซฟแล้ว');
  } catch (e) {
    toast('❌ ส่งออกไม่สำเร็จ');
    console.error(e);
  }
}

export async function exportSaveCopy() {
  try {
    const r = await exportSaveClipboard();
    if (r.method === 'clipboard') toast('📋 คัดลอก JSON แล้ว');
    else if (r.text) {
      const ta = getEl('importSaveText');
      if (ta) { ta.value = r.text; ta.select(); }
      toast('📋 วาง JSON ในช่องด้านล่าง — คัดลอกเองได้');
    }
  } catch (e) {
    toast('❌ คัดลอกไม่สำเร็จ');
    console.error(e);
  }
}

export function importSaveFromText() {
  const ta = getEl('importSaveText');
  const hint = getEl('importSaveHint');
  const text = ta ? ta.value : '';
  const parsed = parseImportText(text);
  if (!parsed.ok) {
    if (hint) hint.innerText = '❌ ' + parsed.error;
    toast('❌ ' + parsed.error);
    return;
  }
  showConfirm(
    '📥',
    'นำเข้าเซฟนี้?',
    `Lv.${parsed.data.level || 1} · เงิน ${Number(parsed.data.money || 0).toLocaleString()}฿ · เซฟปัจจุบันจะถูกแทนที่`,
    'danger',
    () => {
      applyImportData(parsed.data);
      toast('✅ นำเข้าแล้ว — กำลังรีโหลด…');
      setTimeout(() => location.reload(), 400);
    }
  );
}

export function importSaveFromFile(ev) {
  const file = ev?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ta = getEl('importSaveText');
    if (ta) ta.value = String(reader.result || '');
    importSaveFromText();
    if (ev.target) ev.target.value = '';
  };
  reader.onerror = () => toast('❌ อ่านไฟล์ไม่สำเร็จ');
  reader.readAsText(file);
}

// The original code built the element ID as `'toggle' + key[0].toUpperCase() + key.slice(1)`
// which produces 'toggleAutosave' but the HTML uses id="toggleAutoSave". Use an
// explicit map to avoid the case-sensitivity mismatch.
const TOGGLE_ID_MAP = {
  sound: 'toggleSound',
  music: 'toggleMusic',
  anim: 'toggleAnim',
  autosave: 'toggleAutoSave',
  bigTap: 'toggleBigTap',
};

export function toggleSetting(key) {
  settings[key] = !settings[key];
  const elId = TOGGLE_ID_MAP[key];
  const el   = elId ? getEl(elId) : null;
  if (el) el.classList.toggle('on', settings[key]);
  if (key === 'music') {
    if (settings.music) { unlockAudio(); startBgm(); }
    else stopBgm();
  }
  if (key === 'sound' && settings.sound) unlockAudio();
  if (key === 'anim' || key === 'bigTap') applyA11yClasses();
  persistSettings();
}

export function syncSettingToggles() {
  Object.entries(TOGGLE_ID_MAP).forEach(([key, id]) => {
    const el = getEl(id);
    if (el) el.classList.toggle('on', !!settings[key]);
  });
  applyA11yClasses();
}
