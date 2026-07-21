// ── Game state & persistence ──────────────────────────────────────────────────
import { UPGRADES, MENUS, BRANCHES } from '../data.js';
import { updateUI } from '../ui/render.js';

export const BAL = {
  incomeLvMult: (lv) => 1 + (lv - 1) * 0.08,
  upgradeCost:  (base, lvl) => Math.round(base * Math.pow(1.8, lvl)),
  ratingGain:   (streak) => streak >= 15 ? 4 : streak >= 10 ? 3 : streak >= 5 ? 2 : 1,
};

export function defaultState() {
  return {
    saveVersion: 2,
    money: 100, rating: 0, level: 1,
    menu: 'salmon', cooking: false, plateReady: false,
    streak: 0, served: 0, vipServed: 0, rushCleared: 0, mgWins: 0,
    queue: [],
    up: { kitchen:0, waiter:0, marketing:0, patience:0, storage:0, autoChef:0, golden:0, mastery:0, franchise:0 },
    speedMult: 1, autoServe: false, qSize: 1, patMult: 1, storageMult: 1, autoChef: false,
    goldenBonus: 1, xpMult: 1, idleMult: 1,
    speedBurstCooks: 0, // remaining cooks at 2× speed (from staffSpeedBurst)
    // Events scheduler
    eventCooldowns: {}, // { eventId: timestamp when available again }
    nextEventAt: 0,     // timestamp of next event attempt
    // Feature unlock toasts already shown
    featureUnlockToast: {},
    // Temporary boosts (influencer etc.)
    tempQSizeBonus: 0,
    tempQSizeUntil: 0,
    // Daily special: { dayKey, menuId, mult }
    dailySpecial: { dayKey: '', menuId: null, mult: 1.75 },
    // Quest counters beyond defaults
    qDailyExtra: { specialServed: 0 },
    ing: { rice:10, salmon:5, tuna:3, shrimp:3, uni:2, nori:5 },
    lastSave: Date.now(),
    ach: {},
    branches: [
      {id:'main',owned:true},{id:'mall',owned:false},
      {id:'beach',owned:false},{id:'airport',owned:false},{id:'tokyo',owned:false},
    ],
    activeBranch: 'main',
    // branchId → hired staff id (manager for idle bonus)
    branchManagers: {},
    activeEvent: null, eventTimeLeft: 0,
    prestigeLevel: 0, prestigeIncomeMult: 1, prestigeSpeedBonus: 0,
    prestigeStars: 0,
    prestShop: {},
    shopIncomeBonus: 0, shopSpeedBonus: 0, shopStartBonus: 0,
    shopPatBonus: 0, shopVipTipBonus: 0, shopEventCdMult: 1,
    // Staff
    staff: {},
    staffSpeedBonus:0, staffPatBonus:0, staffIncomeBonus:0,
    staffStreakGuard:false, staffOmakaseBonus:false, staffDecoBonus:false,
    staffRiceDiscount:false, staffSpeedBurst:false, staffVipBonus:false,
    staffPremiumBonus:false, staffCriticProof:false, staffLeaderBonus:false,
    staffEventBonus:false, staffTrainerBonus:false, staffPhotoBonus:false,
    staffViralBonus:false, staffSecretMenu:false, staffExtraRating:false,
    staffDecoMult: 1,
    // Decoration
    deco: { owned:[], equipped:null },
    decoRatingBonus:0, decoIncomeBonus:0, decoVipBonus:false,
    decoPatienceBonus:0, decoStreakMult:1, decoRushBonus:false, decoIdleBonus:false,
    // Quests
    quests: { daily:{}, weekly:{}, lastDailyReset:0, lastWeeklyReset:0, activeDailyIds:[], activeWeeklyIds:[] },
    qDaily:  { served:0, streak:0, moneyEarned:0, servedNomiss:0, mgWinsToday:0 },
    qWeekly: { servedWeek:0, upgradesWeek:0, eventsWeek:0, mgWinsWeek:0 },
    missToday: 0, totalScore: 0,
    // Fusion
    fusion: { discovered:[], newDisc:[] },
    // Mini-games
    mgHighScores: { rhythm:null, fish:null, memory:null },
    // Story
    storyData: { seenChapters:{}, pendingChapters:[] },
    // Player
    playerName: '',
  };
}

export let G = defaultState();

/** Bump when save shape needs a migration. Written on every save. */
export const SAVE_VERSION = 2;
export const SAVE_KEY = 'SE5';

// Reassigning the exported `G` binding (as opposed to mutating its fields) can
// only happen inside this module — an importer holds a live *view* of G, not a
// settable reference. doPrestige() needs a full replace-with-kept-fields reset,
// so it goes through this function instead of doing `G = {...}` itself.
export function resetForPrestige(keep) {
  G = { ...defaultState(), ...keep };
  return G;
}

/** UTC calendar day key for daily leaderboard / daily special alignment */
export function dayKeyUTC(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── Migrations ────────────────────────────────────────────────────────────────
function migrateSave(data) {
  let v = Number(data.saveVersion) || 1;
  // v1 → v2: ensure prestige shop + daily special shells
  if (v < 2) {
    if (!data.prestShop || typeof data.prestShop !== 'object') data.prestShop = {};
    if (!data.dailySpecial || typeof data.dailySpecial !== 'object') {
      data.dailySpecial = { dayKey: '', menuId: null, mult: 1.75 };
    }
    if (data.prestigeStars == null) data.prestigeStars = data.prestigeLevel || 0;
    if (!data.branchManagers || typeof data.branchManagers !== 'object') data.branchManagers = {};
    if (!data.eventCooldowns || typeof data.eventCooldowns !== 'object') data.eventCooldowns = {};
    if (!data.featureUnlockToast || typeof data.featureUnlockToast !== 'object') data.featureUnlockToast = {};
    v = 2;
  }
  data.saveVersion = SAVE_VERSION;
  return data;
}

function normalizeLoadedState(parsed) {
  const migrated = migrateSave({ ...parsed });
  G = { ...defaultState(), ...migrated };

  // Reset runtime-only state
  G.queue    = [];
  G.cooking  = false;
  G.plateReady = false;
  G.saveVersion = SAVE_VERSION;

  // Guard nested objects that might be missing in old saves
  if (!G.deco || typeof G.deco !== 'object') G.deco = { owned:[], equipped:null };
  if (!G.fusion) G.fusion = { discovered:[], newDisc:[] };
  if (!G.storyData) G.storyData = { seenChapters:{}, pendingChapters:[] };
  if (!G.mgHighScores) G.mgHighScores = { rhythm:null, fish:null, memory:null };
  if (!G.quests) G.quests = defaultState().quests;
  if (!G.qDaily) G.qDaily = defaultState().qDaily;
  if (!G.qWeekly) G.qWeekly = defaultState().qWeekly;
  if (!G.qDailyExtra) G.qDailyExtra = { specialServed: 0 };
  if (!G.dailySpecial) G.dailySpecial = defaultState().dailySpecial;
  if (!G.prestShop) G.prestShop = {};
  if (!G.branchManagers) G.branchManagers = {};
  if (!G.eventCooldowns) G.eventCooldowns = {};
  if (!G.featureUnlockToast) G.featureUnlockToast = {};
  if (!G.staff || typeof G.staff !== 'object') G.staff = {};
  if (!G.ach || typeof G.ach !== 'object') G.ach = {};

  // Merge any upgrade keys added after the save was created
  G.up = { ...defaultState().up, ...G.up };

  // Merge any branches added after the save was created
  if (!Array.isArray(G.branches)) G.branches = [];
  defaultState().branches.forEach(def => {
    if (!G.branches.find(b => b.id === def.id)) G.branches.push({ ...def });
  });

  // Clamp obvious corrupt numbers
  if (!Number.isFinite(G.money) || G.money < 0) G.money = 0;
  if (!Number.isFinite(G.level) || G.level < 1) G.level = 1;
  if (!Number.isFinite(G.served) || G.served < 0) G.served = 0;

  return G;
}

// ── Save / Load ───────────────────────────────────────────────────────────────
export function save() {
  G.lastSave = Date.now();
  G.saveVersion = SAVE_VERSION;
  localStorage.setItem(SAVE_KEY, JSON.stringify(G));
}

export function load() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const prevVer = Number(parsed.saveVersion) || 1;
    normalizeLoadedState(parsed);

    // Re-apply upgrade effects
    UPGRADES.forEach(u => u.fx(G));

    // Persist migrations immediately so next load sees current SAVE_VERSION
    if (prevVer < SAVE_VERSION) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(G));
    }

    // Idle earnings while away
    const elapsed = (Date.now() - G.lastSave) / 1000;
    if (elapsed > 30 && G.autoChef) {
      _applyIdleEarnings(elapsed);
    }
    if (elapsed > 60) {
      _applyBranchIdleEarnings(elapsed);
    }
  } catch (e) {
    console.error('Save load error:', e);
  }
}

/** Export payload: wrapper with checksum for paste safety */
export function buildExportPayload() {
  G.saveVersion = SAVE_VERSION;
  G.lastSave = Date.now();
  const data = JSON.parse(JSON.stringify(G));
  // Strip runtime noise
  data.queue = [];
  data.cooking = false;
  data.plateReady = false;
  const body = JSON.stringify(data);
  const checksum = simpleChecksum(body);
  return {
    magic: 'SUSHI_EMPIRE_SAVE',
    v: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    checksum,
    data,
  };
}

function simpleChecksum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function exportSaveDownload() {
  const payload = buildExportPayload();
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload.data));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sushi-empire-${dayKeyUTC()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return payload;
}

export async function exportSaveClipboard() {
  const payload = buildExportPayload();
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload.data));
  const text = JSON.stringify(payload);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard' };
    }
  } catch (_) {}
  // Fallback: prompt select
  return { ok: true, method: 'text', text };
}

/**
 * Parse import text (raw SE5 JSON or wrapped payload).
 * Returns { ok, error?, data? }
 */
export function parseImportText(text) {
  if (!text || typeof text !== 'string') return { ok: false, error: 'ไม่มีข้อมูล' };
  let raw = text.trim();
  // Strip accidental markdown fences
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON ไม่ถูกต้อง' };
  }
  let data = parsed;
  if (parsed && parsed.magic === 'SUSHI_EMPIRE_SAVE' && parsed.data) {
    if (parsed.checksum) {
      const body = JSON.stringify(parsed.data);
      if (simpleChecksum(body) !== parsed.checksum) {
        return { ok: false, error: 'Checksum ไม่ตรง — ไฟล์อาจเสีย' };
      }
    }
    data = parsed.data;
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'รูปแบบเซฟไม่รู้จัก' };
  // Sanity: must look like a game save
  if (data.money == null && data.level == null && !data.up) {
    return { ok: false, error: 'ไม่ใช่เซฟ Sushi Empire' };
  }
  return { ok: true, data };
}

/** Apply import and persist. Caller should reload for clean re-init. */
export function applyImportData(data) {
  const cleaned = migrateSave({ ...data });
  cleaned.queue = [];
  cleaned.cooking = false;
  cleaned.plateReady = false;
  cleaned.saveVersion = SAVE_VERSION;
  cleaned.lastSave = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

function _idleIncomeMult() {
  let mult = (G.idleMult || 1) * (G.goldenBonus || 1);
  if (G.decoIdleBonus) mult *= 2;
  return mult;
}

function _applyIdleEarnings(elapsed) {
  const m  = MENUS.find(x => x.id === G.menu);
  if (!m) return;
  const br = BRANCHES.find(b => b.id === G.activeBranch);
  const spd = G.speedMult + G.prestigeSpeedBonus + (G.staffSpeedBonus || 0);
  const cycles = Math.floor(elapsed / (m.time / 1000 / spd));
  if (cycles <= 0) return;

  // Effective ingredient cost (Rice Master skill)
  const need = { ...m.ing };
  if (G.staffRiceDiscount && need.rice) need.rice = Math.max(0, need.rice - 1);

  const keys = Object.keys(need).filter(k => need[k] > 0);
  const maxCycles = keys.length
    ? Math.min(cycles, ...keys.map(k => Math.floor((G.ing[k] || 0) / need[k])))
    : cycles;
  if (maxCycles <= 0) return;

  let earn = Math.round(
    maxCycles * m.price * G.level * (br ? br.mult : 1)
    * G.prestigeIncomeMult
    * (1 + (G.staffIncomeBonus || 0))
    * (1 + (G.decoIncomeBonus  || 0))
    * BAL.incomeLvMult(G.level)
    * _idleIncomeMult()
  );
  // Fusion Idle+ tag
  if (m.isFusion && (m.tags || []).some(t => /Idle/i.test(t))) earn = Math.round(earn * 1.25);

  G.money += earn;
  keys.forEach(k => G.ing[k] = Math.max(0, (G.ing[k] || 0) - need[k] * maxCycles));

  document.getElementById('idleAmt').innerText  = `+${earn.toLocaleString()} ฿`;
  document.getElementById('idleTime').innerText = `ไม่อยู่ ${Math.floor(elapsed / 60)} นาที`;
  document.getElementById('idleModal').classList.add('vis');
}

function _applyBranchIdleEarnings(elapsed) {
  const idleM = _idleIncomeMult();
  G.branches.forEach(b => {
    if (!b.owned || b.id === G.activeBranch) return;
    const bd = BRANCHES.find(x => x.id === b.id);
    if (!bd) return;
    let m = idleM;
    const mid = G.branchManagers && G.branchManagers[b.id];
    if (mid && G.staff && G.staff[mid]?.hired) {
      const lv = G.staff[mid].level || 1;
      const mood = (G.staff[mid].mood ?? 100) / 100;
      m *= 1.2 + lv * 0.08 * (0.5 + 0.5 * mood);
    }
    G.money += Math.round(bd.idleRate * (elapsed / 60) * m);
  });
}

export function closeIdle() {
  document.getElementById('idleModal').classList.remove('vis');
  updateUI();
  save();
}
