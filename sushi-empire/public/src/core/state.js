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
    ing: { rice:10, salmon:5, tuna:3, shrimp:3, uni:2, nori:5 },
    lastSave: Date.now(),
    ach: {},
    branches: [
      {id:'main',owned:true},{id:'mall',owned:false},
      {id:'beach',owned:false},{id:'airport',owned:false},{id:'tokyo',owned:false},
    ],
    activeBranch: 'main',
    activeEvent: null, eventTimeLeft: 0,
    prestigeLevel: 0, prestigeIncomeMult: 1, prestigeSpeedBonus: 0,
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

// Reassigning the exported `G` binding (as opposed to mutating its fields) can
// only happen inside this module — an importer holds a live *view* of G, not a
// settable reference. doPrestige() needs a full replace-with-kept-fields reset,
// so it goes through this function instead of doing `G = {...}` itself.
export function resetForPrestige(keep) {
  G = { ...defaultState(), ...keep };
  return G;
}

// ── Save / Load ───────────────────────────────────────────────────────────────
export function save() {
  G.lastSave = Date.now();
  localStorage.setItem('SE5', JSON.stringify(G));
}

export function load() {
  const raw = localStorage.getItem('SE5');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    G = { ...defaultState(), ...parsed };

    // Reset runtime-only state
    G.queue    = [];
    G.cooking  = false;
    G.plateReady = false;

    // Guard nested objects that might be missing in old saves
    if (!G.deco || typeof G.deco !== 'object') G.deco = { owned:[], equipped:null };
    if (!G.fusion) G.fusion = { discovered:[], newDisc:[] };
    if (!G.storyData) G.storyData = { seenChapters:{}, pendingChapters:[] };
    if (!G.mgHighScores) G.mgHighScores = { rhythm:null, fish:null, memory:null };
    if (!G.quests) G.quests = defaultState().quests;
    if (!G.qDaily) G.qDaily = defaultState().qDaily;
    if (!G.qWeekly) G.qWeekly = defaultState().qWeekly;

    // Merge any upgrade keys added after the save was created
    G.up = { ...defaultState().up, ...G.up };

    // Merge any branches added after the save was created
    if (!Array.isArray(G.branches)) G.branches = [];
    defaultState().branches.forEach(def => {
      if (!G.branches.find(b => b.id === def.id)) G.branches.push({ ...def });
    });

    // Re-apply upgrade effects
    UPGRADES.forEach(u => u.fx(G));

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
    if (bd) G.money += Math.round(bd.idleRate * (elapsed / 60) * idleM);
  });
}

export function closeIdle() {
  document.getElementById('idleModal').classList.remove('vis');
  updateUI();
  save();
}
