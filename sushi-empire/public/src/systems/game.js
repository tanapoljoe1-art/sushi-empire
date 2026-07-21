// ── Core gameplay loop ────────────────────────────────────────────────────────
// Ingredients, queue, cooking, serving, upgrades, achievements, branches,
// prestige. Event *triggering/lifecycle* lives in ./events.js — this file only
// *reads* the active event's declarative data via core/effects.js, it never
// hardcodes an event id.
import { G, save, BAL, defaultState, resetForPrestige } from '../core/state.js';
import { MENUS, INGREDIENTS, BRANCHES, UPGRADES, ACHIEVEMENTS, EVENTS, FUSION_RECIPES, STAFF_DATA } from '../data.js';
import { activeEvent } from '../core/effects.js';
import { getEl } from '../core/dom.js';
import { toast, spawnFE, renderUpgrades, renderIngredients, updateEarnPreview, updateUI } from '../ui/render.js';
import {
  showCooking, showPlateReady, resetPlate, spawnSteam, updateKitchenTheme, cameraPunchPerfect,
} from '../ui/kitchen-scene.js';
import { sfxError, sfxCook, sfxCoin, sfxServe, sfxLevelUp, sfxAngry, sfxStreak, sfxPerfect, syncBgmToGame } from './audio.js';
import { checkStoryTriggers } from './story.js';
import { tickStaffMood } from './staff.js';
import { cancelEventCountdown } from './events.js';
import { applyDecoBonus } from './decoration.js';
import { goTab } from './nav.js';
import { checkFeatureUnlocks } from './unlocks.js';
import { dailySpecialMult, isDailySpecial } from './daily.js';
import { applyPrestigeShop, renderPrestigeShop } from './prestige-shop.js';
import { addBattlePassXp, bpXpForServe, renderBattlePass } from './battlepass.js';
import { seasonMenuMult, seasonIngMult } from './season.js';

let cookInt        = null;
let nextCustomerId = 0;
let angerTimers    = {};   // { customerId: intervalId } — ID-based, no index drift
let cookProgress   = 0;    // 0–1 while cooking (for Perfect window)
let cookQuality    = 'good'; // 'perfect' | 'good'
let cookMenuRef    = null; // menu object for current cook

// Perfect-hit window: tap cook button again while progress is in this range
function perfectWindow() {
  const pad = G.perfectPad || 0;
  return { min: Math.max(0.62, 0.78 - pad), max: Math.min(0.98, 0.92 + pad) };
}

export function allocCustomerId() { return nextCustomerId++; }

export function clearCustomerTimer(custId) {
  clearInterval(angerTimers[custId]);
  delete angerTimers[custId];
}

// ── Ingredient helpers (Rice Master reduces rice cost by 1 per dish) ───────────
export function effectiveIng(menuId) {
  const m = MENUS.find(x => x.id === menuId);
  if (!m) return {};
  const ing = { ...m.ing };
  if (G.staffRiceDiscount && ing.rice) {
    ing.rice = Math.max(0, ing.rice - 1);
    if (ing.rice === 0) delete ing.rice;
  }
  return ing;
}

export function hasIngredients(menuId) {
  const need = effectiveIng(menuId);
  return Object.keys(need).every(k => (G.ing[k] || 0) >= need[k]);
}

export function consumeIngredients(menuId) {
  const need = effectiveIng(menuId);
  Object.keys(need).forEach(k => G.ing[k] = Math.max(0, (G.ing[k] || 0) - need[k]));
}

export function isPremiumMenu(m) {
  if (!m) return false;
  return m.unlockLv >= 12 || m.price >= 350 || m.id === 'omakase' || m.id === 'omakase_ex';
}

export function getUnlockedMenus() {
  return MENUS.filter(m => {
    if (m.secret && !G.staffSecretMenu) return false;
    return m.unlockLv <= G.level;
  });
}

/** Fusion recipe tags → real combat multipliers (tags used to be cosmetic only). */
export function getFusionMods(menuId) {
  const r = FUSION_RECIPES.find(x => x.id === menuId);
  if (!r) return { earn: 1, ratingExtra: 0, streakMult: 1, rushMult: 1, idleMult: 1 };
  const tags = r.tags || [];
  const has = (re) => tags.some(t => re.test(t));
  const all = has(/ทุก\s*bonus/i);
  return {
    earn:       all || has(/Income/i) ? (all ? 1.3 : 1.15) : 1,
    ratingExtra: all || has(/Rating/i) ? (all ? 2 : 1) : 0,
    streakMult: all || has(/Streak/i) ? (all ? 1.4 : 1.2) : 1,
    rushMult:   all || has(/Rush/i)   ? (all ? 1.4 : 1.25) : 1,
    idleMult:   all || has(/Idle/i)   ? 1.25 : 1,
    vipHint:    has(/VIP/i),
  };
}

/**
 * Central earn calculator — used by serve() and updateEarnPreview().
 * opts: { quality, orderMatch, isVipServe, skipStreak }
 */
function activeBranchSpec() {
  const br = BRANCHES.find(b => b.id === G.activeBranch);
  return br?.spec || null;
}

function isSeafoodMenu(m) {
  if (!m?.ing) return false;
  return ['salmon', 'tuna', 'shrimp', 'uni'].some(k => m.ing[k]);
}

export function calcServeEarn(menuId, opts = {}) {
  const m  = MENUS.find(x => x.id === menuId);
  if (!m) return { earn: 0, ratingGain: 0, m: null };
  const br = BRANCHES.find(b => b.id === G.activeBranch);
  const spec = br?.spec;
  const ev = activeEvent(G, EVENTS);
  const fus = getFusionMods(menuId);

  let earn = Math.round(
    m.price * G.level * (br ? br.mult : 1) * G.prestigeIncomeMult
    * (1 + (G.staffIncomeBonus || 0)) * (1 + (G.decoIncomeBonus || 0))
    * BAL.incomeLvMult(G.level)
    * (G.goldenBonus || 1)
    * (1 + (G.shopIncomeBonus || 0))
    * (1 + (G.storyFlags?.storyIncome || 0))
    * (G.storyFlags?.rivalPride ? 1.03 : 1)
    * (G.storyFlags?.staffAffinity ? 1.02 : 1)
  );
  if (G.staffOmakaseBonus && (m.id === 'omakase' || m.id === 'omakase_ex')) earn = Math.round(earn * 1.5);
  if (G.staffPremiumBonus && isPremiumMenu(m)) earn = Math.round(earn * 1.3);
  if (ev?.earnMult) earn = Math.round(earn * ev.earnMult);
  // Fusion Rush+ tag: stronger during rush-like events (earnMult ≥ 2)
  if (fus.rushMult > 1 && ev?.earnMult >= 2) earn = Math.round(earn * fus.rushMult);
  earn = Math.round(earn * fus.earn);

  // Branch specialization
  if (spec?.earnMult) earn = Math.round(earn * spec.earnMult);
  if (spec?.seafoodBonus && isSeafoodMenu(m)) earn = Math.round(earn * spec.seafoodBonus);
  if (spec?.premiumBonus && isPremiumMenu(m)) earn = Math.round(earn * spec.premiumBonus);

  // Daily special
  const dsMult = dailySpecialMult(menuId);
  if (dsMult > 1) earn = Math.round(earn * dsMult);
  const sMult = seasonMenuMult(menuId);
  if (sMult > 1) earn = Math.round(earn * sMult);

  if (G.streak >= 5) {
    const sm = (G.decoStreakMult || 1) * fus.streakMult;
    earn = Math.round(earn * sm);
  }
  if (G.staffViralBonus && G.streak >= 3) earn = Math.round(earn * 1.2);

  // Order match / mismatch
  if (opts.orderMatch === true)  earn = Math.round(earn * 1.25);
  if (opts.orderMatch === false) earn = Math.round(earn * 0.65);

  // Perfect cook
  if (opts.quality === 'perfect') earn = Math.round(earn * 1.35);

  // Customer type earn mult
  if (opts.custEarnMult && opts.custEarnMult !== 1) {
    earn = Math.round(earn * opts.custEarnMult);
  }

  // VIP in queue being served
  if (opts.isVipServe) {
    earn = Math.round(earn * (G.staffVipBonus ? 2.0 : 1.5));
  }

  let ratingGain = ev?.ratingGainOverride ?? BAL.ratingGain(G.streak);
  if (G.staffExtraRating) ratingGain += 1;
  if (G.decoRatingBonus)  ratingGain = Math.round(ratingGain * (1 + G.decoRatingBonus));
  ratingGain = Math.round(ratingGain * (G.xpMult || 1)); // mastery
  ratingGain += fus.ratingExtra;
  if (spec?.ratingMult) ratingGain = Math.round(ratingGain * spec.ratingMult);
  if (opts.orderMatch === true)  ratingGain += 1;
  if (opts.orderMatch === false) ratingGain = Math.max(0, ratingGain - 1);
  if (opts.quality === 'perfect') ratingGain += 1;
  if (dsMult > 1) ratingGain += 1;

  return { earn, ratingGain, m };
}

export function ingredientCost(id) {
  const ing = INGREDIENTS[id];
  if (!ing) return 0;
  const ev  = activeEvent(G, EVENTS);
  let cost = ing.buyCost;
  // Daily fish market mult
  try {
    const m = G.fishMarket?.prices?.[id];
    if (typeof m === 'number' && m > 0) cost = Math.round(cost * m);
  } catch (_) {}
  // Season lean
  try { cost = Math.round(cost * seasonIngMult(id)); } catch (_) {}
  if (ev?.ingredientDiscount) cost = Math.round(cost * (1 - ev.ingredientDiscount));
  return Math.max(1, cost);
}

export function buyIngredient(id) {
  const ing  = INGREDIENTS[id];
  const cap  = Math.floor(ing.maxAmt * G.storageMult);
  const cost = ingredientCost(id);
  if ((G.ing[id] || 0) >= cap) { toast('📦 คลังเต็มแล้ว!'); return; }
  if (G.money < cost)          { toast('✕ เงินไม่พอ!'); return; }
  G.money -= cost;
  G.ing[id] = Math.min(cap, (G.ing[id] || 0) + ing.buyAmt);
  const cv = getEl('money');
  cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop');
  renderIngredients();
  updateUI();
  save();
}

// ── Queue ─────────────────────────────────────────────────────────────────────
export function getPatience() {
  const m    = MENUS.find(x => x.id === G.menu);
  let base   = (m.time / G.speedMult) * 2.6 * G.patMult
               * (1 + (G.staffPatBonus     || 0))
               * (1 + (G.decoPatienceBonus || 0));
  const ev = activeEvent(G, EVENTS);
  if (ev?.patienceMult) base *= ev.patienceMult;
  const spec = activeBranchSpec();
  if (spec?.patienceMult) base *= spec.patienceMult;
  if (G.shopPatBonus) base *= (1 + G.shopPatBonus);
  return base;
}

const CUST_EMOJIS = ['🤷','👩','👨','🧑','👴','👵','🧔'];

/** Customer archetypes — unlock more types as level rises. */
export const CUSTOMER_TYPES = {
  regular:     { id: 'regular',     badge: '',   patienceMult: 1.0,  earnMult: 1.0,  tipNote: null },
  tourist:     { id: 'tourist',     badge: '✈️', patienceMult: 0.72, earnMult: 1.2,  tipNote: 'นักท่องเที่ยว' },
  foodie:      { id: 'foodie',      badge: '🍽️', patienceMult: 1.15, earnMult: 1.12, tipNote: 'สายกิน' },
  influencer:  { id: 'influencer',  badge: '📱', patienceMult: 0.88, earnMult: 1.08, tipNote: 'อินฟลู' },
  // Critic: high stakes — miss hurts; match pays well
  critic:      { id: 'critic',      badge: '📰', patienceMult: 0.85, earnMult: 1.35, tipNote: 'นักวิจารณ์', missRating: -12 },
  // Rival spy: wrong order sabotages marketing temporarily
  spy:         { id: 'spy',         badge: '🕵️', patienceMult: 0.9,  earnMult: 1.05, tipNote: 'สายลับ Tsunami', spy: true },
};

export function pickCustomerType() {
  // Debug force
  if (G._debugForceCtype && CUSTOMER_TYPES[G._debugForceCtype]) {
    return CUSTOMER_TYPES[G._debugForceCtype];
  }
  // Early game = only regulars
  if (G.level < 3) return CUSTOMER_TYPES.regular;
  const spec = activeBranchSpec() || {};
  const roll = Math.random();
  // Special types unlock later
  let criticW = G.level >= 7 ? 0.05 : 0;
  if (G.activeEvent === 'critic') criticW += 0.25;
  if (G.storyFlags?.criticFriend) criticW *= 0.6; // friendlier world
  let spyW = G.level >= 8 ? 0.04 : 0;
  if (G.storyFlags?.rivalHate) spyW += 0.08;
  if (G.storyFlags?.rivalPride) spyW += 0.02;
  // Branch-weighted mix
  const influW = (spec.influW ?? 0.08) + (G.level >= 6 ? 0.04 : 0);
  const foodieW = (spec.foodieW ?? 0.12) + (G.level >= 4 ? 0.05 : 0);
  const touristW = (spec.touristW ?? 0.2) + (G.level >= 3 ? 0.08 : 0);
  let acc = 0;
  acc += criticW; if (roll < acc) return CUSTOMER_TYPES.critic;
  acc += spyW;    if (roll < acc) return CUSTOMER_TYPES.spy;
  acc += influW;  if (roll < acc) return CUSTOMER_TYPES.influencer;
  acc += foodieW; if (roll < acc) return CUSTOMER_TYPES.foodie;
  acc += touristW; if (roll < acc) return CUSTOMER_TYPES.tourist;
  return CUSTOMER_TYPES.regular;
}

/** Pick a menu this customer wants. Types bias the choice. */
export function pickWantedMenu(ctype) {
  let unlocked = getUnlockedMenus().filter(m => !m.secret || G.staffSecretMenu);
  if (!unlocked.length) return 'salmon';

  if (ctype?.id === 'foodie') {
    const fancy = unlocked.filter(m => m.isFusion || m.price >= 100 || m.unlockLv >= 5);
    if (fancy.length && Math.random() < 0.7) unlocked = fancy;
  }
  if (ctype?.id === 'tourist') {
    const easy = unlocked.filter(m => m.price <= 80);
    if (easy.length && Math.random() < 0.55) unlocked = easy;
  }
  // 35% chance they want whatever you're currently prepping (forgiveness)
  if (Math.random() < 0.35 && unlocked.find(m => m.id === G.menu)) return G.menu;
  return unlocked[~~(Math.random() * unlocked.length)].id;
}

export function spawnQueue() {
  Object.values(angerTimers).forEach(clearInterval);
  angerTimers = {};
  G.queue = [];

  // Expire temp influencer queue bonus
  if (G.tempQSizeUntil && Date.now() > G.tempQSizeUntil) {
    G.tempQSizeBonus = 0;
    G.tempQSizeUntil = 0;
  }

  // Expire spy marketing nerf
  if (G.tempMarketingUntil && Date.now() > G.tempMarketingUntil) {
    G.tempMarketingNerf = 0;
    G.tempMarketingUntil = 0;
  }

  let size = G.qSize + (G.tempQSizeBonus || 0) - (G.tempMarketingNerf || 0);
  const ev = activeEvent(G, EVENTS);
  if (ev?.queueDelta) size = Math.max(1, size + ev.queueDelta);
  size = Math.max(1, size);

  const basePatience = getPatience();

  for (let i = 0; i < size; i++) {
    const id = allocCustomerId();
    const ctype = pickCustomerType();
    const wantedMenuId = pickWantedMenu(ctype);
    const wanted = MENUS.find(m => m.id === wantedMenuId);
    G.queue.push({
      id,
      e: CUST_EMOJIS[~~(Math.random() * CUST_EMOJIS.length)],
      anger: 0,
      state: 'wait',
      wantedMenuId,
      wantedEmoji: wanted ? wanted.emoji : '🍣',
      ctype: ctype.id,
      typeBadge: ctype.badge,
      patienceMult: ctype.patienceMult,
      earnMult: ctype.earnMult,
      missRating: ctype.missRating || null,
      isSpy: !!ctype.spy,
    });
  }

  G.queue.forEach((cust, i) => {
    const pat = basePatience * (cust.patienceMult || 1) * (1 + i * 0.35);
    angerTimers[cust.id] = setInterval(() => tickAnger(cust.id), pat / 100 * 1000);
  });

  renderQ();
}

export function tickAnger(custId) {
  const idx = G.queue.findIndex(c => c.id === custId);
  if (idx === -1) return;
  const c = G.queue[idx];
  if (c.state === 'gone' || c.state === 'vip') return;

  c.anger = Math.min(100, c.anger + 1);
  if (c.anger >= 65) c.state = 'angry';

  if (c.anger >= 100) {
    c.state = 'gone';
    clearCustomerTimer(custId);

    const ev = activeEvent(G, EVENTS);
    if (!G.staffStreakGuard && !ev?.streakProtect) G.streak = 0;
    sfxAngry();
    G.missToday = (G.missToday || 0) + 1;
    try { import('./telemetry.js').then(m => m.tel('miss')).catch(() => {}); } catch (_) {}
    const isCriticEv = G.activeEvent === 'critic';
    const isCriticCust = c.ctype === 'critic';
    let ratingLoss = ev?.missRatingLossOverride ?? BAL.missRatingLoss(G);
    if (isCriticCust && c.missRating != null) ratingLoss = c.missRating;
    if (isCriticCust && !G.staffCriticProof) ratingLoss = Math.min(ratingLoss, -10);
    if (!G.staffCriticProof || !(isCriticEv || isCriticCust)) {
      G.rating = Math.max(0, G.rating + ratingLoss);
      spawnFE(ratingLoss + ' ⭐', true);
    }
    const harsh = (isCriticEv || isCriticCust) && !G.staffCriticProof;
    toast('😤 ลูกค้าเดินออก!' + (harsh ? ' นักวิจารณ์โกรธ!' : '') + (c.isSpy ? ' 🕵️' : ''));
    updateUI();

    setTimeout(() => {
      const i2 = G.queue.findIndex(c2 => c2.id === custId);
      if (i2 !== -1) G.queue.splice(i2, 1);
      if (!G.queue.length) spawnQueue();
      else renderQ();
    }, 500);
  }
  renderQ();
}

export function renderQ() {
  const el = getEl('qWrap');
  getEl('qCount').innerText = G.queue.length;
  if (!G.queue.length) {
    el.innerHTML = '<span style="font-size:10px;color:rgba(255,255,255,.18)">ว่าง</span>';
    return;
  }
  el.innerHTML = G.queue.map(c => {
    const fc = c.anger < 40 ? 'var(--green)' : c.anger < 65 ? 'var(--gold)' : 'var(--red)';
    const order = c.wantedEmoji
      ? `<div class="q-order" title="สั่งเมนูนี้">${c.wantedEmoji}</div>`
      : '';
    const typeTip = ({
      tourist: 'นักท่องเที่ยว — อดทนต่ำ รายได้สูง',
      foodie: 'สายกิน — อดทนสูง ชอบพรีเมียม',
      influencer: 'อินฟลู — เสิร์ฟดีแล้วคิว +1 ชั่วคราว',
      critic: 'นักวิจารณ์ — ผิดแล้วเจ็บ rating',
      spy: 'สายลับ Tsunami — ผิดเมนูแล้ว sabotage',
      regular: 'ลูกค้าทั่วไป',
    })[c.ctype] || c.ctype || '';
    const typeB = c.typeBadge
      ? `<div class="q-type" title="${typeTip}">${c.typeBadge}</div>`
      : '';
    if (c.state === 'vip')
      return `<div class="qc vip">${c.e}${order}${typeB}<div class="vip-crown">👑</div></div>`;
    return `<div class="qc ${c.state}">${c.e}${order}${typeB}<div class="apip"><div class="afill" style="width:${c.anger}%;background:${fc}"></div></div></div>`;
  }).join('');
}

// ── Cooking ───────────────────────────────────────────────────────────────────
function setCookBtnIdle() {
  const btn = getEl('cookBtn');
  btn.disabled = false;
  btn.classList.remove('perfect-ready');
  if (!btn.classList.contains('rush') || !G.activeEvent) {
    if (G.activeEvent !== 'rush') btn.innerText = '🍣 ทำซูชิ!';
  } else {
    btn.innerText = '⚡ Rush Hour! ทำซูชิ!';
  }
  if (G.activeEvent === 'rush') btn.innerText = '⚡ Rush Hour! ทำซูชิ!';
  else btn.innerText = '🍣 ทำซูชิ!';
}

function setCookBtnPerfect(inZone) {
  const btn = getEl('cookBtn');
  // Keep clickable during cook so player can hit Perfect
  btn.disabled = false;
  if (inZone) {
    btn.classList.add('perfect-ready');
    btn.innerText = '✨ PERFECT! แตะเลย';
  } else {
    btn.classList.remove('perfect-ready');
    btn.innerText = '⏳ กำลังทำ...';
  }
}

export function cook() {
  // Second tap during cook → attempt Perfect hit
  if (G.cooking) {
    tryPerfectHit();
    return;
  }
  if (G.plateReady) return;
  if (!hasIngredients(G.menu)) { sfxError(); toast('✕ วัตถุดิบไม่พอ! ซื้อก่อนนะ'); return; }
  if (!G.queue.length) spawnQueue();

  const m   = MENUS.find(x => x.id === G.menu);
  let spd = G.speedMult + G.prestigeSpeedBonus + (G.staffSpeedBonus || 0) + (G.shopSpeedBonus || 0);
  // Speed Burst: next cook(s) at 2× after every 5 serves
  if ((G.speedBurstCooks || 0) > 0) {
    spd *= 2;
    G.speedBurstCooks--;
    toast('⚡ Speed Burst! x2');
  }
  const dur = m.time / spd;

  G.cooking = true;
  cookProgress = 0;
  cookQuality  = 'good';
  cookMenuRef  = m;
  // AutoChef never gets Perfect — always good
  const autoMode = !!(G.autoChef);
  consumeIngredients(G.menu);
  sfxCook();
  showCooking();
  getEl('ringWrap').style.display = 'block';
  setCookBtnPerfect(false);

  const start = Date.now();
  const arc   = getEl('ringArc');
  const txt   = getEl('ringTxt');
  const secEl = getEl('cookTimerSec');
  const zone  = getEl('ringZone');
  if (zone) zone.style.opacity = autoMode ? '0.15' : '0.7';

  // requestAnimationFrame instead of setInterval for smoother animation.
  // IMPORTANT: cookInt always holds the latest scheduled frame id, and every
  // reset path (switchBranch/doPrestige) calls cancelAnimationFrame(cookInt) —
  // a prior version of this file lost that invariant and let a cancelled cook
  // fire doneCook() anyway. Keep the `if (!G.cooking) return;` guard and the
  // cancelAnimationFrame calls in sync with any future changes here.
  let lastFrameTime = start;
  const animateCook = () => {
    if (!G.cooking) return;
    const now = Date.now();
    if (now - lastFrameTime >= 16) {
      const p        = Math.min((now - start) / dur, 1);
      cookProgress   = p;
      const secsLeft = ((dur - (now - start)) / 1000);
      arc.style.strokeDashoffset = 157 * (1 - p);
      const inZone = !autoMode && (() => { const w=perfectWindow(); return p >= w.min && p <= w.max; })();
      txt.innerText = inZone ? '✨' : (~~(p * 100) + '%');
      if (secEl) secEl.innerText = secsLeft > 0 ? secsLeft.toFixed(1) + 's' : '';
      if (!autoMode) setCookBtnPerfect(inZone);
      lastFrameTime = now;

      if (p >= 1) {
        if (secEl) secEl.innerText = '';
        // Natural finish → good (unless already perfect)
        doneCook(m);
        return;
      }
    }
    cookInt = requestAnimationFrame(animateCook);
  };
  cookInt = requestAnimationFrame(animateCook);

  updateEarnPreview();
}

function tryPerfectHit() {
  if (!G.cooking) return;
  if (G.autoChef) return; // auto path never perfect
  const win = perfectWindow();
  if (cookProgress < win.min) {
    toast('เร็วไป! รอวงเขียว');
    sfxError();
    return;
  }
  if (cookProgress > win.max) {
    toast('ช้าไป!');
    sfxError();
    return;
  }
  cookQuality = 'perfect';
  cancelAnimationFrame(cookInt);
  const m = cookMenuRef || MENUS.find(x => x.id === G.menu);
  sfxStreak();
  doneCook(m);
}

export function doneCook(m) {
  G.cooking = false;
  G.plateReady = true;
  cookProgress = 0;
  getEl('ringWrap').style.display = 'none';
  getEl('cookBtn').classList.remove('perfect-ready');
  getEl('cookBtn').disabled = true;
  showPlateReady(m.emoji);
  sfxCoin();
  if (cookQuality === 'perfect') {
    G.perfectCount = (G.perfectCount || 0) + 1;
    trackQuestProgress('perfect');
    toast('✨ PERFECT! +35% รายได้');
    spawnFE('✨ PERFECT');
    try { cameraPunchPerfect(); } catch (_) {}
    sfxPerfect();
    try { import('../ui/render.js').then(m => m.haptic?.(18)).catch(() => {}); } catch (_) {}
    try { import('./telemetry.js').then(m => m.tel('perfect')).catch(() => {}); } catch (_) {}
  }
  if (G.autoServe || G.autoChef) setTimeout(serve, 650);
  else {
    getEl('serveBtn').classList.add('vis');
    getEl('cookBtn').disabled = true;
  }
  renderIngredients();
}

export function serve() {
  if (!G.plateReady) return;
  G.plateReady = false;

  const menuId = G.menu;
  const ev = activeEvent(G, EVENTS);

  // Front customer (first non-gone)
  const waitIdx = G.queue.findIndex(c => c.state !== 'gone');
  const cust    = waitIdx >= 0 ? G.queue[waitIdx] : null;
  const isVipServe = !!(cust && cust.state === 'vip');
  let orderMatch = null; // null = no order data
  if (cust && cust.wantedMenuId) {
    orderMatch = cust.wantedMenuId === menuId;
  }

  const quality = cookQuality || 'good';
  const { earn, ratingGain, m } = calcServeEarn(menuId, {
    quality,
    orderMatch,
    isVipServe,
    custEarnMult: cust?.earnMult || 1,
  });

  G.money  += earn;
  G.streak++;
  G.served++;
  G.rating  = Math.min(100, G.rating + ratingGain);
  try {
    import('./telemetry.js').then(m => {
      m.tel('serve');
      m.tel('earn', { amount: earn });
    }).catch(() => {});
  } catch (_) {}

  // Rival weekly progress
  try {
    import('./rival.js').then(m => {
      m.trackRivalEarn(earn);
      m.renderRivalBanner();
    }).catch(() => {});
  } catch (_) {}

  // Speed Burst charge: every 5 serves, next cook is 2× (if skill owned)
  if (G.staffSpeedBurst && G.served > 0 && G.served % 5 === 0) {
    G.speedBurstCooks = (G.speedBurstCooks || 0) + 1;
    toast('⚡ Speed Burst พร้อม! (เสิร์ฟครั้งถัดไป)');
  }

  if (isVipServe) {
    G.vipServed = (G.vipServed || 0) + 1;
    if (G.staffPhotoBonus) G.rating = Math.min(100, G.rating + 2);
  }

  // Influencer: successful matched serve → temporary +1 queue for 45s
  if (cust?.ctype === 'influencer' && orderMatch !== false) {
    G.tempQSizeBonus = 1;
    G.tempQSizeUntil = Date.now() + 45000;
    toast('📱 ไวรัล! คิว +1 ชั่วคราว');
  }

  trackQuestProgress('serve');
  import('./coach.js').then(m => m.coachOnFirstServe()).catch(() => {});
  try {
    addBattlePassXp(bpXpForServe(quality));
    renderBattlePass();
  } catch (_) {}
  trackQuestProgress('earn', earn);
  if (isDailySpecial(menuId)) trackQuestProgress('special');
  tickStaffMood();
  sfxServe();
  checkStreakMilestone(G.streak);
  if (isDailySpecial(menuId)) spawnFE('⭐ Special!');

  if (orderMatch === true) {
    spawnFE('👍 สั่งตรง!');
    G.orderMatchCount = (G.orderMatchCount || 0) + 1;
    G.orderMatchStreak = (G.orderMatchStreak || 0) + 1;
    if (G.orderMatchStreak > (G.maxOrderMatchStreak || 0)) {
      G.maxOrderMatchStreak = G.orderMatchStreak;
    }
  }
  if (orderMatch === false) {
    G.orderMatchStreak = 0;
    spawnFE('😕 ผิดเมนู', true);
    toast('😕 ลูกค้าสั่งคนละเมนู — รายได้ลด');
    // Rival spy sabotage
    if (cust?.isSpy || cust?.ctype === 'spy') {
      G.tempMarketingNerf = 1; // queue size -1
      G.tempMarketingUntil = Date.now() + 60000;
      G.qSize = Math.max(1, (G.qSize || 1) - 0); // visual only via spawn
      toast('🕵️ สายลับ Tsunami! โฆษณาอ่อน 60 วิ (คิว −1)');
      spawnFE('🕵️ sabotage', true);
    }
  }
  if (menuId === 'omakase_ex') G.secretServed = (G.secretServed || 0) + 1;
  if (m?.isFusion) G.fusionServed = (G.fusionServed || 0) + 1;
  if (cust?.ctype === 'critic' && orderMatch === true) {
    toast('📰 นักวิจารณ์พอใจ!');
    G.rating = Math.min(100, G.rating + 2);
  }
  if (cust?.typeBadge && orderMatch === true) spawnFE(cust.typeBadge + ' tip!');

  if (G.rating >= 100) {
    const prevLv = G.level;
    G.level++;
    G.rating = 20;
    sfxLevelUp();
    toast('🎉 Level Up! Lv.' + G.level);
    try { import('./telemetry.js').then(m => m.tel('levelup')).catch(() => {}); } catch (_) {}
    checkFeatureUnlocks(prevLv, G.level);
    checkStoryTriggers();
    import('./coach.js').then(m => m.coachOnLevel(G.level)).catch(() => {});
  }
  if (G.served % 5 === 0) checkStoryTriggers();

  // Remove the customer we served
  if (waitIdx >= 0) {
    const custId = G.queue[waitIdx].id;
    clearCustomerTimer(custId);
    G.queue.splice(waitIdx, 1);
  }
  if (!G.queue.length) spawnQueue();

  const showIcon = ev && (ev.earnMult || ev.ratingGainOverride != null);
  const qTag = quality === 'perfect' ? '✨' : '';
  const earnTxt  = qTag + (showIcon ? ev.icon : '') + '+' + earn + '฿';
  spawnFE(earnTxt);

  cookQuality = 'good';
  resetPlate();
  getEl('serveBtn').classList.remove('vis');
  setCookBtnIdle();
  const cv = getEl('money');
  cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop');

  updateEarnPreview();
  checkAch();
  updateUI();
  save();

  if (G.autoChef) setTimeout(() => { if (!G.cooking && !G.plateReady) cook(); }, 500);
}

// ── Quest tracking ────────────────────────────────────────────────────────────
export function trackQuestProgress(type, val = 1) {
  if (!G.qDaily)  G.qDaily  = defaultState().qDaily;
  if (!G.qWeekly) G.qWeekly = defaultState().qWeekly;
  if (!G.qDailyExtra) G.qDailyExtra = { specialServed: 0 };

  if (type === 'serve') {
    G.qDaily.served++;
    G.qWeekly.servedWeek++;
    if (!G.missToday) G.qDaily.servedNomiss++;
    // Track best streak of the UTC/day quest window
    if ((G.streak || 0) > (G.qDaily.maxStreakToday || 0)) {
      G.qDaily.maxStreakToday = G.streak;
    }
  }
  if (type === 'earn')    G.qDaily.moneyEarned += val;
  if (type === 'mg')    { G.qDaily.mgWinsToday++; G.qWeekly.mgWinsWeek++; }
  if (type === 'upgrade') G.qWeekly.upgradesWeek++;
  if (type === 'event')   G.qWeekly.eventsWeek++;
  if (type === 'special') G.qDailyExtra.specialServed = (G.qDailyExtra.specialServed || 0) + 1;
  if (type === 'perfect') {
    G.qDaily.perfects = (G.qDaily.perfects || 0) + 1;
    G.qWeekly.perfectsWeek = (G.qWeekly.perfectsWeek || 0) + 1;
  }
}

// ── Upgrades ──────────────────────────────────────────────────────────────────
export function buyUpgrade(id) {
  const u  = UPGRADES.find(x => x.id === id);
  if (!u) return;
  if (G.up[id] == null) G.up[id] = 0;
  const lv = G.up[id];
  if (lv >= u.max) return;
  if (u.require) {
    const need = G.up[u.require.id] || 0;
    if (need < (u.require.min || 1)) {
      sfxError();
      toast(`🔒 ต้อง ${u.require.id} Lv.${u.require.min} ก่อน`);
      return;
    }
  }
  const cost = BAL.upgradeCost(u.base, lv);
  if (G.money < cost) { sfxError(); toast('✕ เงินไม่พอ!'); return; }
  G.money -= Math.round(cost);
  G.up[id]++;
  reapplyUpgradeFx();
  sfxCoin();
  trackQuestProgress('upgrade');
  toast('✅ ' + u.name + '!');
  updateUI();
  renderUpgrades();
  save();
}

/** Reset derived upgrade fields, re-run all fx, then soft-cap stack totals. */
export function reapplyUpgradeFx() {
  G.speedMult = 1; G.autoServe = false; G.qSize = 1; G.patMult = 1; G.storageMult = 1;
  G.autoChef = false; G.goldenBonus = 1; G.xpMult = 1; G.idleMult = 1;
  G.perfectPad = 0; G.branchIdleBonus = 0;
  UPGRADES.forEach(up => up.fx(G));
  // Soft caps — keep late game from exploding via pure upgrade stacks
  G.qSize = Math.min(BAL.maxQSize ?? 6, Math.max(1, G.qSize || 1));
  G.speedMult = Math.min(BAL.maxSpeedMult ?? 3, Math.max(1, G.speedMult || 1));
  G.storageMult = Math.min(BAL.maxStorageMult ?? 3, Math.max(1, G.storageMult || 1));
  G.patMult = Math.min(BAL.maxPatMult ?? 3, Math.max(1, G.patMult || 1));
}

/** Respec all upgrades — refund 40%, costs 15% of total spent */
export function respecUpgrades() {
  let spent = 0;
  UPGRADES.forEach(u => {
    const lv = G.up[u.id] || 0;
    for (let i = 0; i < lv; i++) spent += BAL.upgradeCost(u.base, i);
  });
  if (spent <= 0) { toast('ยังไม่มีอัปเกรด'); return; }
  const fee = Math.round(spent * 0.15);
  const refund = Math.round(spent * 0.40);
  if (G.money < fee) { toast('ต้องการ ' + fee.toLocaleString() + '฿ เป็นค่า respec'); return; }
  G.money -= fee;
  G.money += refund;
  UPGRADES.forEach(u => { G.up[u.id] = 0; });
  reapplyUpgradeFx();
  toast(`🔄 Respec! คืน ${refund.toLocaleString()}฿ (ค่าธรรมเนียม ${fee.toLocaleString()}฿)`);
  updateUI();
  renderUpgrades();
  save();
}

export function setUpgTreeFilter(tree) {
  G.upgTreeFilter = tree || 'all';
  renderUpgrades();
  save();
}

// ── Achievements ──────────────────────────────────────────────────────────────
let achQueue = [];

export function checkAch() {
  ACHIEVEMENTS.forEach(a => {
    if (!G.ach[a.id] && a.chk(G)) {
      G.ach[a.id] = true;
      G.money += a.reward;
      achQueue.push(a);
    }
  });
  if (achQueue.length && !getEl('achModal').classList.contains('vis')) showNextAch();
}

function showNextAch() {
  const a = achQueue[0];
  if (!a) return;
  getEl('achMI').innerText = a.icon;
  getEl('achMN').innerText = a.name;
  getEl('achMD').innerText = a.desc;
  getEl('achMA').innerText = '+' + a.reward + '฿';
  const title = getEl('achModal')?.querySelector('.mtitle');
  if (title) title.innerText = a.hidden ? '🔒 ปลดล็อคลับ!' : 'Achievement ปลดล็อค!';
  getEl('achModal').classList.add('vis');
}

export function closeAch() {
  achQueue.shift();
  if (achQueue.length) {
    showNextAch();
  } else {
    getEl('achModal').classList.remove('vis');
  }
  updateUI();
}

// ── Streak FX ─────────────────────────────────────────────────────────────────
export function checkStreakMilestone(streak) {
  if ([5, 10, 15, 20, 30, 50].includes(streak)) {
    sfxStreak();
    spawnFE('🔥 ' + streak + ' Streak!');
  }
}

// ── Branches ──────────────────────────────────────────────────────────────────
export function buyBranch(id) {
  toast('⏳ กำลังประมวลผล...');
  const bd = BRANCHES.find(b => b.id === id);
  if (!bd) {
    console.error('Branch definition not found:', id);
    toast('✕ ไม่พบสาขา!');
    return;
  }
  let gb = G.branches.find(b => b.id === id);
  if (!gb) {
    gb = { id, owned: false };
    G.branches.push(gb);
  }
  if (gb.owned) {
    toast('📍 สาขานี้มีอยู่แล้ว');
    return;
  }
  if (G.money < bd.cost) {
    toast('✕ เงินไม่พอ! ต้องการ ' + bd.cost.toLocaleString() + '฿');
    return;
  }
  G.money -= bd.cost;
  gb.owned = true;
  toast('🏪 เปิด ' + bd.name + ' แล้ว!');
  checkAch();
  updateUI();
  renderBr();
  save();
}

export function switchBranch(id) {
  G.activeBranch = id;
  G.cooking = false; G.plateReady = false;
  cancelAnimationFrame(cookInt);
  getEl('cookBtn').disabled = false;
  resetPlate();
  getEl('serveBtn').classList.remove('vis');
  getEl('ringWrap').style.display = 'none';
  spawnQueue();
  updateKitchenTheme(G);
  updateUI();
  renderBr();
  save();
  toast('📍 สลักสาขาแล้ว!');
}

// Simple world map of branches (positions are art-directed, not geo)
const BRANCH_MAP_POS = {
  main: { x: 22, y: 58 },
  mall: { x: 48, y: 42 },
  beach: { x: 72, y: 68 },
  airport: { x: 38, y: 22 },
  tokyo: { x: 78, y: 28 },
  paris: { x: 18, y: 28 },
  dubai: { x: 62, y: 48 },
  space: { x: 88, y: 12 },
};

function renderBranchMap() {
  const map = getEl('brMap');
  if (!map) return;
  const nodes = BRANCHES.map(bd => {
    const gb = G.branches.find(b => b.id === bd.id) || { owned: false };
    const pos = BRANCH_MAP_POS[bd.id] || { x: 50, y: 50 };
    const own = gb.owned;
    const cur = G.activeBranch === bd.id;
    const cls = cur ? 'cur' : own ? 'own' : 'locked';
    const click = own
      ? `switchBranch('${bd.id}')`
      : `buyBranch('${bd.id}')`;
    return `<button type="button" class="br-node ${cls}" style="left:${pos.x}%;top:${pos.y}%"
      onclick="${click}" title="${bd.name} · ${bd.loc}">
      <span class="br-node-e">${bd.emoji}</span>
      <span class="br-node-n">${bd.name}</span>
      ${cur ? '<span class="br-node-pip">●</span>' : ''}
    </button>`;
  }).join('');
  map.innerHTML = `<div class="br-map-bg"></div><div class="br-map-label">🗺️ แผนที่อาณาจักร</div>${nodes}`;
}

export function renderBr() {

  renderBranchMap();
  getEl('brList').innerHTML = BRANCHES.map(bd => {
    const gb  = G.branches.find(b => b.id === bd.id) || { id: bd.id, owned: false };
    const own = gb.owned;
    const cur = G.activeBranch === bd.id;
    const sp  = bd.spec;
    const spBits = [];
    if (sp?.label) spBits.push(sp.label);
    if (sp?.seafoodBonus) spBits.push(`ซีฟู้ด x${sp.seafoodBonus}`);
    if (sp?.premiumBonus) spBits.push(`พรีเมียม x${sp.premiumBonus}`);
    if (sp?.touristW >= 0.4) spBits.push('นักท่องเที่ยวเยอะ');
    if (sp?.foodieW >= 0.35) spBits.push('สายกินเยอะ');
    if (sp?.patienceMult && sp.patienceMult < 0.85) spBits.push('ใจร้อน');
    if (sp?.ratingMult > 1.05) spBits.push(`Rating x${sp.ratingMult}`);
    return `<div class="br ${own?'own':''} ${cur?'cur':''}">
      <div class="brh">
        <div class="brico">${bd.emoji}</div>
        <div><div class="brnm">${bd.name}${cur?' <span style="font-size:9px;color:var(--gold)">● ใช้งาน</span>':''}</div>
        <div class="brloc">📍 ${bd.loc}</div></div>
      </div>
      <div class="brstats">
        <div class="brs">รายได้ x<span>${bd.mult}</span></div>
        <div class="brs">Idle <span>${bd.idleRate}฿/นาที</span></div>
      </div>
      ${spBits.length ? `<div class="br-spec">${spBits.map(s => `<span class="br-tag">${s}</span>`).join('')}</div>` : ''}
      ${own
        ? cur
          ? `<button class="brbtn cur">● สาขาปัจจุบัน</button>`
          : `<button class="brbtn sw" onclick="switchBranch('${bd.id}')">📍 สลักมาที่นี่</button>`
        : `<button class="brbtn buy" onclick="buyBranch('${bd.id}')">เปิดสาขา → ${bd.cost.toLocaleString()}฿</button>`}
      ${own && !cur ? `<div class="bridle">💰 Auto-income ${bd.idleRate}฿/นาที${mgrLabel(bd.id)}</div>` : ''}
      ${own ? managerSelectHtml(bd.id) : ''}
    </div>`;
  }).join('');
}

function mgrLabel(branchId) {
  if (!G.branchManagers) return '';
  const sid = G.branchManagers[branchId];
  if (!sid || !G.staff?.[sid]?.hired) return '';
  const s = STAFF_DATA.find(x => x.id === sid);
  return s ? ` · 👔 ${s.name}` : '';
}

function managerSelectHtml(branchId) {
  if (!G.branchManagers) G.branchManagers = {};
  const hired = STAFF_DATA.filter(s => G.staff?.[s.id]?.hired);
  if (!hired.length) {
    return `<div class="br-mgr"><span class="br-mgr-lbl">👔 ผู้จัดการ</span><span class="br-mgr-empty">จ้างพนักงานก่อน</span></div>`;
  }
  const cur = G.branchManagers[branchId] || '';
  // Staff already assigned elsewhere
  const used = new Set(Object.entries(G.branchManagers)
    .filter(([bid, sid]) => bid !== branchId && sid)
    .map(([, sid]) => sid));
  const opts = hired.map(s => {
    const busy = used.has(s.id) ? ' (สาขาอื่น)' : '';
    const dis = used.has(s.id) ? 'disabled' : '';
    return `<option value="${s.id}" ${cur === s.id ? 'selected' : ''} ${dis}>${s.emoji} ${s.name}${busy}</option>`;
  }).join('');
  return `<div class="br-mgr">
    <label class="br-mgr-lbl">👔 ผู้จัดการสาขา</label>
    <select class="br-mgr-sel" onchange="assignBranchManager('${branchId}', this.value)">
      <option value="">— ไม่มี —</option>
      ${opts}
    </select>
    <div class="br-mgr-hint">idle +20% ขึ้นไปตาม Lv/Mood</div>
  </div>`;
}

export function assignBranchManager(branchId, staffId) {
  if (!G.branchManagers) G.branchManagers = {};
  // Clear this staff from other branches
  if (staffId) {
    Object.keys(G.branchManagers).forEach(bid => {
      if (G.branchManagers[bid] === staffId) delete G.branchManagers[bid];
    });
    if (!G.staff?.[staffId]?.hired) {
      toast('✕ พนักงานคนนี้ยังไม่ถูกจ้าง');
      return;
    }
    G.branchManagers[branchId] = staffId;
    const s = STAFF_DATA.find(x => x.id === staffId);
    toast(`👔 ${s?.name || staffId} ดูแลสาขานี้`);
  } else {
    delete G.branchManagers[branchId];
    toast('ถอดผู้จัดการแล้ว');
  }
  renderBr();
  updateUI();
  save();
}

// ── Prestige ──────────────────────────────────────────────────────────────────
export function showPrestModal() {
  if (G.level < 20) { toast('✕ ต้องการ Level 20 ขึ้นไป!'); return; }
  const nextLv = G.prestigeLevel + 1;
  getEl('prestMA').innerText = `+${nextLv * 10}% รายได้ + Bonus อื่น`;
  getEl('prestigeModal').classList.add('vis');
}

export function closePrest() { getEl('prestigeModal').classList.remove('vis'); }

export function doPrestige() {
  getEl('prestigeModal').classList.remove('vis');
  G.prestigeLevel++;
  // Soft-cap prestige income: +10%/lv for first 5, then +6%, floor soft at ~2.5×
  {
    const p = G.prestigeLevel;
    let mult = 1;
    for (let i = 1; i <= p; i++) mult += i <= 5 ? 0.10 : i <= 10 ? 0.06 : 0.03;
    G.prestigeIncomeMult = Math.min(2.6, mult);
  }
  G.prestigeSpeedBonus = Math.min(0.45, G.prestigeLevel * 0.04);
  // Earn 1★ base + 1★ every 2 prestige levels
  const starsGain = 1 + Math.floor(G.prestigeLevel / 2);
  G.prestigeStars = (G.prestigeStars || 0) + starsGain;
  try { import('./telemetry.js').then(m => m.tel('prestige')).catch(() => {}); } catch (_) {}

  // Soft-keep staff: still hired, levels reset to 1, skills kept, mood restored
  const softStaff = {};
  Object.entries(G.staff || {}).forEach(([id, info]) => {
    if (!info?.hired) return;
    softStaff[id] = {
      hired: true,
      level: 1,
      mood: 100,
      skills: Array.isArray(info.skills) ? [...info.skills] : [],
      softKept: true,
    };
  });

  // Save persistent values (fusion/deco/staff soft-keep; upgrades hard-reset)
  const keep = {
    prestigeLevel:       G.prestigeLevel,
    prestigeIncomeMult:  G.prestigeIncomeMult,
    prestigeSpeedBonus:  G.prestigeSpeedBonus,
    prestigeStars:       G.prestigeStars,
    prestShop:           G.prestShop || {},
    branches:            G.branches,
    ach:                 G.ach,
    mgWins:              G.mgWins,
    vipServed:           G.vipServed,
    rushCleared:         G.rushCleared,
    // Hidden-ach counters survive prestige
    perfectCount:        G.perfectCount || 0,
    orderMatchCount:     G.orderMatchCount || 0,
    orderMatchStreak:    0, // live streak resets; max keeps
    maxOrderMatchStreak: G.maxOrderMatchStreak || 0,
    festivalHosted:      G.festivalHosted || 0,
    rivalWins:           G.rivalWins || 0,
    secretServed:        G.secretServed || 0,
    fusionServed:        G.fusionServed || 0,
    storyData:           G.storyData,
    storyFlags:          G.storyFlags || {},
    coachSeen:            G.coachSeen || {},
    battlePass:           G.battlePass || { season:'', xp:0, claimed:{}, premiumClaimed:{}, premium:false, lastDay:'' },
    rivalWeekly:         G.rivalWeekly || { weekKey:'', playerEarn:0, rivalTarget:0, claimed:false },
    eventLog:            Array.isArray(G.eventLog) ? G.eventLog.slice(0, 10) : [],
    playerName:          G.playerName,
    mgHighScores:        G.mgHighScores,
    fusion:              G.fusion,
    deco:                G.deco,
    // managers cleared — re-assign after prestige (staff levels reset)
    branchManagers:      {},
    staff:               softStaff,
  };

  resetForPrestige(keep);
  applyPrestigeShop();
  G.money = 100 + keep.prestigeLevel * 500 + (G.shopStartBonus || 0);
  const keptCount = Object.keys(softStaff).length;

  // Re-register discovered fusion menus into MENUS after reset
  (G.fusion && G.fusion.discovered || []).forEach(id => {
    if (!MENUS.find(m => m.id === id)) {
      const r = FUSION_RECIPES.find(x => x.id === id);
      if (r) {
        const fusionIng = {};
        r.combo.forEach(k => fusionIng[k] = (fusionIng[k] || 0) + 1);
        MENUS.push({
          id: r.id, name: r.name, emoji: r.emoji, price: r.price,
          time: r.time, unlockLv: 1, ing: fusionIng, isFusion: true, tags: r.tags || [],
        });
      }
    }
  });

  UPGRADES.forEach(u => u.fx(G));
  applyDecoBonus();
  cancelAnimationFrame(cookInt);
  Object.values(angerTimers).forEach(clearInterval);
  angerTimers = {};
  cancelEventCountdown();

  // Re-apply soft-kept staff (async import avoids circular dep with staff.js)
  const finishPrestige = () => {
    toast(`✨ Prestige! ได้ ${starsGain}★ · โบนัสถาวร!`);
    if (keptCount) toast(`👥 ทีม ${keptCount} คนอยู่ต่อ (Lv รีเซ็ต · สกิลเก็บไว้)`);
    checkAch();
    spawnQueue();
    spawnSteam();
    updateKitchenTheme(G);
    updateUI();
    renderUpgrades();
    renderIngredients();
    import('./prestige-skin.js').then(m => m.applyPrestigeSkin(G.prestigeLevel || 0)).catch(() => {});
    save();
    goTab('main');
  };
  import('./staff.js')
    .then(m => { m.applyAllStaffBonuses(); finishPrestige(); })
    .catch(() => finishPrestige());
}

export function renderPrest() {
  const lv     = G.prestigeLevel;
  const nextLv = lv + 1;
  const starGainNext = 1 + Math.floor(nextLv / 2);
  getEl('prestStars').innerText  = '★'.repeat(Math.min(lv, 5)) + '☆'.repeat(Math.max(0, 5 - lv));
  getEl('prestLv').innerText     = lv;
  getEl('prestDesc').innerText   =
    `รีเซ็ตเกมเพื่อรับ Permanent Bonus + ★\n${G.level >= 20 ? 'พร้อม Prestige!' : 'ต้องการ Level 20 (ปัจจุบัน Lv.' + G.level + ')'}`;
  const nextIncomePct = Math.round((prestigeIncomeMultAt(nextLv) - 1) * 100);
  const nextSpeedPct = Math.round(Math.min(0.45, nextLv * 0.04) * 100);
  getEl('prestBonuses').innerHTML =
    `<div class="pb">รายได้ +${nextIncomePct}% (soft-cap)</div>
     <div class="pb">ความเร็ว +${nextSpeedPct}%</div>
     <div class="pb">เริ่ม ${(100 + nextLv * 500 + (G.shopStartBonus || 0)).toLocaleString()}฿</div>
     <div class="pb">+${starGainNext}★ ร้านค้า</div>`
    + prestigeEtaHtml();
  getEl('prestBtnWrap').innerHTML =
    `<button class="mbtn purple" onclick="showPrestModal()" ${G.level < 20 ? 'style="opacity:.5"' : ''}>
       ✨ Prestige Lv.${nextLv}${G.level < 20 ? ' (ต้องการ Lv.20)' : ''}
     </button>`;
  const shopBits = [];
  if (G.shopIncomeBonus) shopBits.push(`ร้านค้า รายได้ +${Math.round(G.shopIncomeBonus * 100)}%`);
  if (G.shopSpeedBonus)  shopBits.push(`เร็ว +${Math.round(G.shopSpeedBonus * 100)}%`);
  if (G.shopStartBonus)  shopBits.push(`ทุน +${G.shopStartBonus}฿`);
  if (G.shopPatBonus)    shopBits.push(`อดทน +${Math.round(G.shopPatBonus * 100)}%`);
  if (G.shopVipTipBonus) shopBits.push(`VIP tip +${Math.round(G.shopVipTipBonus * 100)}%`);
  getEl('prestCurrentBonuses').innerHTML = (lv === 0 && !shopBits.length)
    ? '<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px">ยังไม่มี Prestige — ทำถึง Lv.20 แล้วรีเซ็ตเพื่อรับ ★</div>'
    : `<div class="prestige-card" style="text-align:left">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Bonus ที่มี · ★ ${G.prestigeStars || 0} ใช้ได้</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <div class="pb">💰 รายได้ x${G.prestigeIncomeMult.toFixed(1)}</div>
          <div class="pb">⚡ ความเร็ว +${(G.prestigeSpeedBonus * 100).toFixed(0)}%</div>
          <div class="pb">🎁 เริ่ม ${(100 + lv * 500 + (G.shopStartBonus || 0)).toLocaleString()}฿</div>
          ${shopBits.map(s => `<div class="pb">${s}</div>`).join('')}
        </div>
      </div>`;
  renderPrestigeShop();
}

function prestigeIncomeMultAt(level) {
  let mult = 1;
  const p = Math.max(0, level || 0);
  for (let i = 1; i <= p; i++) mult += i <= 5 ? 0.10 : i <= 10 ? 0.06 : 0.03;
  return Math.min(2.6, mult);
}

/** Recompute prestige mult from level (for old saves / display). */
export function recomputePrestigeMult() {
  G.prestigeIncomeMult = prestigeIncomeMultAt(G.prestigeLevel || 0);
  G.prestigeSpeedBonus = Math.min(0.45, (G.prestigeLevel || 0) * 0.04);
}

/** ETA helper: rating left + rough serves until prestige (Lv.20). */
function prestigeEtaHtml() {
  if (G.level >= 20) {
    return `<div class="prest-eta">✅ ถึง Lv.20 แล้ว — Prestige ได้ทันที (ทีม soft-keep · เก็บ deco/fusion)</div>`;
  }
  const levelsLeft = 20 - G.level;
  const ratingLeft = Math.max(0, 100 - (G.rating || 0)) + Math.max(0, levelsLeft - 1) * 100;
  // ~2–3 rating per serve mid-game; use 2.5 as conservative average
  const avgRatingPerServe = Math.max(1.5, 1.5 + Math.min(2, (G.streak || 0) / 10) + (G.xpMult || 1) - 1);
  const servesEst = Math.ceil(ratingLeft / avgRatingPerServe);
  return `<div class="prest-eta">⏱ ถึง Prestige ~อีก <b>${levelsLeft}</b> เลเวล`
    + ` · rating เหลือประมาณ <b>${ratingLeft}</b>`
    + ` · ราว <b>${servesEst}</b> เสิร์ฟ (คร่าว ๆ)</div>`;
}
