// ── Core gameplay loop ────────────────────────────────────────────────────────
// Ingredients, queue, cooking, serving, upgrades, achievements, branches,
// prestige. Event *triggering/lifecycle* lives in ./events.js — this file only
// *reads* the active event's declarative data via core/effects.js, it never
// hardcodes an event id.
import { G, save, BAL, defaultState, resetForPrestige } from '../core/state.js';
import { MENUS, INGREDIENTS, BRANCHES, UPGRADES, ACHIEVEMENTS, EVENTS } from '../data.js';
import { activeEvent } from '../core/effects.js';
import { getEl } from '../core/dom.js';
import { toast, spawnFE, renderUpgrades, renderIngredients, updateEarnPreview, updateUI } from '../ui/render.js';
import { showCooking, showPlateReady, resetPlate, spawnSteam } from '../ui/kitchen-scene.js';
import { sfxError, sfxCook, sfxCoin, sfxServe, sfxLevelUp, sfxAngry, sfxStreak } from './audio.js';
import { checkStoryTriggers } from './story.js';
import { tickStaffMood } from './staff.js';
import { cancelEventCountdown } from './events.js';
import { goTab } from './nav.js';

let cookInt        = null;
let nextCustomerId = 0;
let angerTimers    = {};   // { customerId: intervalId } — ID-based, no index drift

export function allocCustomerId() { return nextCustomerId++; }

export function clearCustomerTimer(custId) {
  clearInterval(angerTimers[custId]);
  delete angerTimers[custId];
}

// ── Ingredients ───────────────────────────────────────────────────────────────
export function hasIngredients(menuId) {
  const m = MENUS.find(x => x.id === menuId);
  return Object.keys(m.ing).every(k => (G.ing[k] || 0) >= m.ing[k]);
}

export function consumeIngredients(menuId) {
  const m = MENUS.find(x => x.id === menuId);
  Object.keys(m.ing).forEach(k => G.ing[k] = Math.max(0, (G.ing[k] || 0) - m.ing[k]));
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
  return base;
}

export function spawnQueue() {
  Object.values(angerTimers).forEach(clearInterval);
  angerTimers = {};
  G.queue = [];

  let size = G.qSize;
  const ev = activeEvent(G, EVENTS);
  if (ev?.queueDelta) size = Math.max(1, size + ev.queueDelta);

  const basePatience = getPatience();

  for (let i = 0; i < size; i++) {
    const id = allocCustomerId();
    G.queue.push({ id, e: EMOJIS[~~(Math.random() * EMOJIS.length)], anger: 0, state: 'wait' });
  }

  G.queue.forEach((cust, i) => {
    const pat = basePatience * (1 + i * 0.35);
    angerTimers[cust.id] = setInterval(() => tickAnger(cust.id), pat / 100 * 1000);
  });

  renderQ();
}

const EMOJIS = ['🤷','👩','👨','🧑','👴','👵','🧔'];

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
    if (c.state === 'vip')
      return `<div class="qc vip">${c.e}</div>`;
    return `<div class="qc ${c.state}">${c.e}<div class="apip"><div class="afill" style="width:${c.anger}%;background:${fc}"></div></div></div>`;
  }).join('');
}

// ── Cooking ───────────────────────────────────────────────────────────────────
export function cook() {
  if (G.cooking || G.plateReady) return;
  if (!hasIngredients(G.menu)) { sfxError(); toast('✕ วัตถุดิบไม่พอ! ซื้อก่อนนะ'); return; }
  if (!G.queue.length) spawnQueue();

  const m   = MENUS.find(x => x.id === G.menu);
  const spd = G.speedMult + G.prestigeSpeedBonus + (G.staffSpeedBonus || 0);
  const dur = m.time / spd;

  G.cooking = true;
  consumeIngredients(G.menu);
  sfxCook();
  showCooking();
  getEl('ringWrap').style.display = 'block';
  getEl('cookBtn').disabled = true;

  const start = Date.now();
  const arc   = getEl('ringArc');
  const txt   = getEl('ringTxt');
  const secEl = getEl('cookTimerSec');

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
      const secsLeft = ((dur - (now - start)) / 1000);
      arc.style.strokeDashoffset = 157 * (1 - p);
      txt.innerText = ~~(p * 100) + '%';
      if (secEl) secEl.innerText = secsLeft > 0 ? secsLeft.toFixed(1) + 's' : '';
      lastFrameTime = now;

      if (p >= 1) {
        if (secEl) secEl.innerText = '';
        doneCook(m);
        return;
      }
    }
    cookInt = requestAnimationFrame(animateCook);
  };
  cookInt = requestAnimationFrame(animateCook);

  updateEarnPreview();
}

export function doneCook(m) {
  G.cooking = false; G.plateReady = true;
  getEl('ringWrap').style.display = 'none';
  showPlateReady(m.emoji);
  sfxCoin();
  if (G.autoServe || G.autoChef) setTimeout(serve, 650);
  else getEl('serveBtn').classList.add('vis');
  renderIngredients();
}

export function serve() {
  if (!G.plateReady) return;
  G.plateReady = false;

  const m  = MENUS.find(x => x.id === G.menu);
  const br = BRANCHES.find(b => b.id === G.activeBranch);
  const ev = activeEvent(G, EVENTS);

  let earn = Math.round(
    m.price * G.level * (br ? br.mult : 1) * G.prestigeIncomeMult
    * (1 + (G.staffIncomeBonus || 0)) * (1 + (G.decoIncomeBonus || 0))
    * BAL.incomeLvMult(G.level)
  );
  if (G.staffOmakaseBonus && m.id === 'omakase') earn = Math.round(earn * 1.5);
  if (ev?.earnMult) earn = Math.round(earn * ev.earnMult);

  let ratingGain = ev?.ratingGainOverride ?? BAL.ratingGain(G.streak);
  if (G.staffExtraRating) ratingGain += 1;
  if (G.decoRatingBonus)  ratingGain  = Math.round(ratingGain * (1 + G.decoRatingBonus));
  if (G.streak >= 5) earn = Math.round(earn * (G.decoStreakMult || 1));
  if (G.staffViralBonus && G.streak >= 3)  earn = Math.round(earn * 1.2);

  G.money  += earn;
  G.streak++;
  G.served++;
  G.rating  = Math.min(100, G.rating + ratingGain);

  trackQuestProgress('serve');
  trackQuestProgress('earn', earn);
  tickStaffMood();
  sfxServe();
  checkStreakMilestone(G.streak);

  if (G.rating >= 100) {
    G.level++;
    G.rating = 20;
    sfxLevelUp();
    toast('🎉 Level Up! Lv.' + G.level);
    checkStoryTriggers();
  }
  if (G.served % 5 === 0) checkStoryTriggers();

  // Remove the first non-gone customer — by ID
  const waitIdx = G.queue.findIndex(c => c.state !== 'gone');
  if (waitIdx >= 0) {
    const custId = G.queue[waitIdx].id;
    clearCustomerTimer(custId);
    G.queue.splice(waitIdx, 1);
  }
  if (!G.queue.length) spawnQueue();

  const showIcon = ev && (ev.earnMult || ev.ratingGainOverride != null);
  const earnTxt  = (showIcon ? ev.icon : '') + '+' + earn + '฿';
  spawnFE(earnTxt);

  resetPlate();
  getEl('serveBtn').classList.remove('vis');
  getEl('cookBtn').disabled = false;
  const cv = getEl('money');
  cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop');

  updateEarnPreview();
  checkAch();
  updateUI();
  save();

  if (G.autoChef) setTimeout(() => { if (!G.cooking) cook(); }, 500);
}

// ── Quest tracking ────────────────────────────────────────────────────────────
export function trackQuestProgress(type, val = 1) {
  if (!G.qDaily)  G.qDaily  = defaultState().qDaily;
  if (!G.qWeekly) G.qWeekly = defaultState().qWeekly;

  if (type === 'serve') {
    G.qDaily.served++;
    G.qWeekly.servedWeek++;
    if (!G.missToday) G.qDaily.servedNomiss++;
  }
  if (type === 'earn')    G.qDaily.moneyEarned += val;
  if (type === 'mg')    { G.qDaily.mgWinsToday++; G.qWeekly.mgWinsWeek++; }
  if (type === 'upgrade') G.qWeekly.upgradesWeek++;
  if (type === 'event')   G.qWeekly.eventsWeek++;
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

  // Save persistent values
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
  };

  resetForPrestige(keep);
  G.money = 100 + keep.prestigeLevel * 500;

  UPGRADES.forEach(u => u.fx(G));
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
