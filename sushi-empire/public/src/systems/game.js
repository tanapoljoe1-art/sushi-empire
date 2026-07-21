// ── Core gameplay loop ────────────────────────────────────────────────────────
// Ingredients, queue, cooking, serving, upgrades, achievements, branches,
// prestige. Event *triggering/lifecycle* lives in ./events.js — this file only
// *reads* the active event's declarative data via core/effects.js, it never
// hardcodes an event id.
import { G, save, BAL, defaultState, resetForPrestige } from '../core/state.js';
import { MENUS, INGREDIENTS, BRANCHES, UPGRADES, ACHIEVEMENTS, EVENTS, FUSION_RECIPES } from '../data.js';
import { activeEvent } from '../core/effects.js';
import { getEl } from '../core/dom.js';
import { toast, spawnFE, renderUpgrades, renderIngredients, updateEarnPreview, updateUI } from '../ui/render.js';
import { showCooking, showPlateReady, resetPlate, spawnSteam } from '../ui/kitchen-scene.js';
import { sfxError, sfxCook, sfxCoin, sfxServe, sfxLevelUp, sfxAngry, sfxStreak } from './audio.js';
import { checkStoryTriggers } from './story.js';
import { tickStaffMood } from './staff.js';
import { cancelEventCountdown } from './events.js';
import { applyDecoBonus } from './decoration.js';
import { goTab } from './nav.js';
import { checkFeatureUnlocks } from './unlocks.js';
import { dailySpecialMult, isDailySpecial } from './daily.js';

let cookInt        = null;
let nextCustomerId = 0;
let angerTimers    = {};   // { customerId: intervalId } — ID-based, no index drift
let cookProgress   = 0;    // 0–1 while cooking (for Perfect window)
let cookQuality    = 'good'; // 'perfect' | 'good'
let cookMenuRef    = null; // menu object for current cook

// Perfect-hit window: tap cook button again while progress is in this range
const PERFECT_MIN = 0.78;
const PERFECT_MAX = 0.92;

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
  const ev  = activeEvent(G, EVENTS);
  return ev?.ingredientDiscount ? Math.round(ing.buyCost * (1 - ev.ingredientDiscount)) : ing.buyCost;
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
  return base;
}

const CUST_EMOJIS = ['🤷','👩','👨','🧑','👴','👵','🧔'];

/** Customer archetypes — unlock more types as level rises. */
export const CUSTOMER_TYPES = {
  regular:     { id: 'regular',     badge: '',   patienceMult: 1.0,  earnMult: 1.0,  tipNote: null },
  tourist:     { id: 'tourist',     badge: '✈️', patienceMult: 0.72, earnMult: 1.2,  tipNote: 'นักท่องเที่ยว' },
  foodie:      { id: 'foodie',      badge: '🍽️', patienceMult: 1.15, earnMult: 1.12, tipNote: 'สายกิน' },
  influencer:  { id: 'influencer',  badge: '📱', patienceMult: 0.88, earnMult: 1.08, tipNote: 'อินฟลู' },
};

export function pickCustomerType() {
  // Early game = only regulars
  if (G.level < 3) return CUSTOMER_TYPES.regular;
  const spec = activeBranchSpec() || {};
  const roll = Math.random();
  // Branch-weighted mix (weights are cumulative bands)
  const influW = (spec.influW ?? 0.08) + (G.level >= 6 ? 0.04 : 0);
  const foodieW = (spec.foodieW ?? 0.12) + (G.level >= 4 ? 0.05 : 0);
  const touristW = (spec.touristW ?? 0.2) + (G.level >= 3 ? 0.08 : 0);
  if (roll < influW) return CUSTOMER_TYPES.influencer;
  if (roll < influW + foodieW) return CUSTOMER_TYPES.foodie;
  if (roll < influW + foodieW + touristW) return CUSTOMER_TYPES.tourist;
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

  let size = G.qSize + (G.tempQSizeBonus || 0);
  const ev = activeEvent(G, EVENTS);
  if (ev?.queueDelta) size = Math.max(1, size + ev.queueDelta);

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
    const isCritic   = G.activeEvent === 'critic';
    const ratingLoss = ev?.missRatingLossOverride ?? -5;
    if (!G.staffCriticProof || !isCritic) {
      G.rating = Math.max(0, G.rating + ratingLoss);
      spawnFE(ratingLoss + ' ⭐', true);
    }
    toast('😤 ลูกค้าเดินออก!' + (isCritic && !G.staffCriticProof ? ' -8 Rating!!' : ''));
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
    const typeB = c.typeBadge
      ? `<div class="q-type" title="${c.ctype || ''}">${c.typeBadge}</div>`
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
  let spd = G.speedMult + G.prestigeSpeedBonus + (G.staffSpeedBonus || 0);
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
      const inZone = !autoMode && p >= PERFECT_MIN && p <= PERFECT_MAX;
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
  if (cookProgress < PERFECT_MIN) {
    toast('เร็วไป! รอวงเขียว');
    sfxError();
    return;
  }
  if (cookProgress > PERFECT_MAX) {
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
    toast('✨ PERFECT! +35% รายได้');
    spawnFE('✨ PERFECT');
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
  trackQuestProgress('earn', earn);
  if (isDailySpecial(menuId)) trackQuestProgress('special');
  tickStaffMood();
  sfxServe();
  checkStreakMilestone(G.streak);
  if (isDailySpecial(menuId)) spawnFE('⭐ Special!');

  if (orderMatch === true)  spawnFE('👍 สั่งตรง!');
  if (orderMatch === false) { spawnFE('😕 ผิดเมนู', true); toast('😕 ลูกค้าสั่งคนละเมนู — รายได้ลด'); }
  if (cust?.typeBadge && orderMatch === true) spawnFE(cust.typeBadge + ' tip!');

  if (G.rating >= 100) {
    const prevLv = G.level;
    G.level++;
    G.rating = 20;
    sfxLevelUp();
    toast('🎉 Level Up! Lv.' + G.level);
    checkFeatureUnlocks(prevLv, G.level);
    checkStoryTriggers();
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
  }
  if (type === 'earn')    G.qDaily.moneyEarned += val;
  if (type === 'mg')    { G.qDaily.mgWinsToday++; G.qWeekly.mgWinsWeek++; }
  if (type === 'upgrade') G.qWeekly.upgradesWeek++;
  if (type === 'event')   G.qWeekly.eventsWeek++;
  if (type === 'special') G.qDailyExtra.specialServed = (G.qDailyExtra.specialServed || 0) + 1;
}

// ── Upgrades ──────────────────────────────────────────────────────────────────
export function buyUpgrade(id) {
  const u  = UPGRADES.find(x => x.id === id);
  const lv = G.up[id];
  if (lv >= u.max) return;
  const cost = BAL.upgradeCost(u.base, lv);
  if (G.money < cost) { sfxError(); toast('✕ เงินไม่พอ!'); return; }
  G.money -= Math.round(cost);
  G.up[id]++;
  u.fx(G);
  sfxCoin();
  trackQuestProgress('upgrade');
  toast('✅ ' + u.name + '!');
  updateUI();
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
  updateUI();
  renderBr();
  save();
  toast('📍 สลักสาขาแล้ว!');
}

export function renderBr() {
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
      ${own && !cur ? `<div class="bridle">💰 Auto-income ${bd.idleRate}฿/นาที</div>` : ''}
    </div>`;
  }).join('');
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
  G.prestigeIncomeMult = 1 + G.prestigeLevel * 0.1;
  G.prestigeSpeedBonus = G.prestigeLevel * 0.05;

  // Save persistent values (fusion recipes + deco collection persist — staff/upgrades reset)
  const keep = {
    prestigeLevel:       G.prestigeLevel,
    prestigeIncomeMult:  G.prestigeIncomeMult,
    prestigeSpeedBonus:  G.prestigeSpeedBonus,
    branches:            G.branches,
    ach:                 G.ach,
    mgWins:              G.mgWins,
    vipServed:           G.vipServed,
    rushCleared:         G.rushCleared,
    storyData:           G.storyData,
    playerName:          G.playerName,
    mgHighScores:        G.mgHighScores,
    fusion:              G.fusion,
    deco:                G.deco,
  };

  resetForPrestige(keep);
  G.money = 100 + keep.prestigeLevel * 500;
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

  toast('✨ Prestige! เริ่มต้นใหม่ด้วย Bonus ถาวร!');
  checkAch();
  spawnQueue();
  spawnSteam();
  updateUI();
  renderUpgrades();
  renderIngredients();
  save();
  goTab('main');
}

export function renderPrest() {
  const lv     = G.prestigeLevel;
  const nextLv = lv + 1;
  getEl('prestStars').innerText  = '★'.repeat(Math.min(lv, 5)) + '☆'.repeat(Math.max(0, 5 - lv));
  getEl('prestLv').innerText     = lv;
  getEl('prestDesc').innerText   =
    `รีเซ็ตเกมเพื่อรับ Permanent Bonus ถาวร\n${G.level >= 20 ? 'พร้อม Prestige!' : 'ต้องการ Level 20 (ปัจจุบัน Lv.' + G.level + ')'}`;
  getEl('prestBonuses').innerHTML =
    `<div class="pb">รายได้ +${nextLv * 10}%</div>
     <div class="pb">ความเร็ว +${nextLv * 5}%</div>
     <div class="pb">เริ่มด้วย ${(100 + nextLv * 500).toLocaleString()}฿</div>`;
  getEl('prestBtnWrap').innerHTML =
    `<button class="mbtn purple" onclick="showPrestModal()" ${G.level < 20 ? 'style="opacity:.5"' : ''}>
       ✨ Prestige Lv.${nextLv}${G.level < 20 ? ' (ต้องการ Lv.20)' : ''}
     </button>`;
  getEl('prestCurrentBonuses').innerHTML = lv === 0
    ? '<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px">ยังไม่มี Prestige</div>'
    : `<div class="prestige-card" style="text-align:left">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Bonus ที่มีอยู่:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <div class="pb">💰 รายได้ x${G.prestigeIncomeMult.toFixed(1)}</div>
          <div class="pb">⚡ ความเร็ว +${(G.prestigeSpeedBonus * 100).toFixed(0)}%</div>
          <div class="pb">🎁 เริ่มด้วย ${(100 + lv * 500).toLocaleString()}฿</div>
        </div>
      </div>`;
}
