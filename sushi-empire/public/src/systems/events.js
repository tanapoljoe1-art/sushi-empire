// ── Event lifecycle (trigger / banner / end / VIP) + scheduler / forecast ─────
// Reads effects generically off EVENTS' declarative fields (see data.js) via
// core/effects.js. Per-id UI one-offs (rush button styling, decoRushBonus) stay
// explicit on purpose.
import { G, save } from '../core/state.js';
import { EVENTS, BRANCHES, MENUS } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { renderQ, checkAch, spawnQueue, allocCustomerId, clearCustomerTimer, trackQuestProgress } from './game.js';

let eventCountdown = null;

/** Per-event cooldown after it ends (ms). */
const EVENT_COOLDOWN_MS = {
  rush: 90000,
  vip: 55000,
  critic: 120000,
  storm: 90000,
  festival: 100000,
  celebrity: 110000,
  lucky: 90000,
};

const GLOBAL_GAP_MS = 28000; // minimum quiet time between events

function ensureEventState() {
  if (!G.eventCooldowns || typeof G.eventCooldowns !== 'object') G.eventCooldowns = {};
  if (!G.nextEventAt) G.nextEventAt = Date.now() + 18000 + Math.random() * 12000;
}

function eligibleEvents(now) {
  ensureEventState();
  let list = EVENTS.filter(e => {
    const cd = G.eventCooldowns[e.id] || 0;
    return now >= cd;
  });
  // VIP bias from deco
  if (G.decoVipBonus) {
    const vips = list.filter(e => e.id === 'vip');
    list = [...list, ...vips, ...vips];
  }
  return list;
}

/** Update forecast chip in header. */
export function updateEventForecastUI() {
  ensureEventState();
  const chip = getEl('forecastChip');
  const txt  = getEl('forecastTxt');
  if (!chip || !txt) return;

  if (G.activeEvent) {
    chip.style.display = '';
    const left = Math.max(0, G.eventTimeLeft || 0);
    txt.innerText = left + 's';
    chip.title = 'อีเวนต์กำลังทำงาน';
    return;
  }

  chip.style.display = '';
  const ms = Math.max(0, (G.nextEventAt || 0) - Date.now());
  if (ms <= 0) {
    txt.innerText = 'ใกล้แล้ว';
    chip.title = 'กำลังสุ่มอีเวนต์...';
    return;
  }
  const sec = Math.ceil(ms / 1000);
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    txt.innerText = `~${m}:${String(s).padStart(2, '0')}`;
  } else {
    txt.innerText = `~${sec}s`;
  }
  chip.title = 'พยากรณ์: อาจมีอีเวนต์ในอีกไม่ช้า (ไม่การันตี 100%)';
}

/**
 * Called on an interval from main.js.
 * Schedules / rolls random events with cooldowns + marketing-based chance.
 */
export function tickEventScheduler() {
  ensureEventState();
  updateEventForecastUI();

  if (G.activeEvent) return;
  if (document.querySelector('.mbg.vis')) return;

  const now = Date.now();
  if (now < G.nextEventAt) return;

  // Chance rises with marketing upgrade; pity after long quiet gap
  const quietFor = now - (G._lastEventEndAt || (now - 60000));
  const pity = quietFor > 90000;
  const chance = pity ? 1 : (0.32 + (G.up.marketing || 0) * 0.08);

  if (Math.random() > chance) {
    // Missed roll — try again soon
    G.nextEventAt = now + 8000 + Math.random() * 10000;
    return;
  }

  const pool = eligibleEvents(now);
  if (!pool.length) {
    G.nextEventAt = now + 15000;
    return;
  }

  const ev = pool[~~(Math.random() * pool.length)];
  fireEvent(ev);
}

function fireEvent(ev) {
  G.activeEvent = ev.id;
  if (ev.instant) {
    triggerVIP();
    // VIP is instant; schedule next after gap
    G.eventCooldowns[ev.id] = Date.now() + (EVENT_COOLDOWN_MS[ev.id] || 60000);
    G.nextEventAt = Date.now() + GLOBAL_GAP_MS + Math.random() * 15000;
    G._lastEventEndAt = Date.now();
    return;
  }
  G.eventTimeLeft = ev.dur;
  getEl('evMI').innerText = ev.icon;
  getEl('evMN').innerText = ev.name;
  getEl('evMD').innerText = ev.desc;
  getEl('evMA').innerText = ev.badge || '';
  getEl('eventModal').classList.add('vis');
  updateEventForecastUI();
}

/** @deprecated use tickEventScheduler — kept for any external callers */
export function triggerRandomEvent() {
  ensureEventState();
  G.nextEventAt = Date.now(); // force attempt
  tickEventScheduler();
}

export function closeEvent() {
  getEl('eventModal').classList.remove('vis');
  const ev = EVENTS.find(e => e.id === G.activeEvent);
  if (!ev || !ev.dur) return;
  if (G.staffEventBonus) G.eventTimeLeft += 20;
  if (ev.id === 'rush' && G.decoRushBonus) G.eventTimeLeft += 30;
  showEventBanner();
  eventCountdown = setInterval(() => {
    G.eventTimeLeft--;
    getEl('evTimer').innerText = G.eventTimeLeft + 's';
    updateEventForecastUI();
    if (G.eventTimeLeft <= 0) endEvent();
  }, 1000);
  if (ev.id === 'rush') {
    getEl('cookBtn').classList.add('rush');
    getEl('cookBtn').innerText = '⚡ Rush Hour! ทำซูชิ!';
  }
  if (ev.guaranteedVip) triggerVIP();
}

export function showEventBanner() {
  const ev = EVENTS.find(e => e.id === G.activeEvent);
  if (!ev) return;
  const b = getEl('evBanner');
  b.style.display = 'flex';
  getEl('evIcon').innerText  = ev.icon;
  getEl('evName').innerText  = ev.name;
  getEl('evDesc').innerText  = ev.desc;
  getEl('evTimer').innerText = G.eventTimeLeft + 's';
}

export function endEvent() {
  clearInterval(eventCountdown);
  const ev = EVENTS.find(e => e.id === G.activeEvent);
  if (ev?.id === 'rush') {
    getEl('cookBtn').classList.remove('rush');
    getEl('cookBtn').innerText = '🍣 ทำซูชิ!';
  }
  if (ev?.onEnd) ev.onEnd(G);
  trackQuestProgress('event');

  const now = Date.now();
  if (ev) G.eventCooldowns[ev.id] = now + (EVENT_COOLDOWN_MS[ev.id] || 60000);
  G._lastEventEndAt = now;
  G.nextEventAt = now + GLOBAL_GAP_MS + 10000 + Math.random() * 20000;

  G.activeEvent = null; G.eventTimeLeft = 0;
  getEl('evBanner').style.display = 'none';
  toast('⏰ Event สิ้นสุดแล้ว!');
  checkAch();
  updateEventForecastUI();
  save();
}

export function cancelEventCountdown() {
  clearInterval(eventCountdown);
  getEl('evBanner').style.display = 'none';
  getEl('cookBtn').classList.remove('rush');
  getEl('cookBtn').innerText = '🍣 ทำซูชิ!';
}

export function triggerVIP() {
  const br       = BRANCHES.find(b => b.id === G.activeBranch);
  let vipBonus   = Math.round(200 * G.level * (br ? br.mult : 1));
  if (G.staffVipBonus) vipBonus = Math.round(vipBonus * 1.5);
  const unlocked = MENUS.filter(m => m.unlockLv <= G.level && (!m.secret || G.staffSecretMenu));
  const premium  = unlocked.filter(m => m.price >= 100).sort((a, b) => b.price - a.price);
  const wanted   = (premium[0] || unlocked[unlocked.length - 1] || MENUS[0]);
  getEl('vipDesc').innerText = `VIP อยากได้ ${wanted.emoji} ${wanted.name} — ทิปพิเศษ!`;
  getEl('vipAmt').innerText  = `+${vipBonus}฿`;
  getEl('vipModal').classList.add('vis');
  const id = allocCustomerId();
  G.queue.unshift({
    id, e: '👑', anger: 0, state: 'vip', vipBonus,
    wantedMenuId: wanted.id, wantedEmoji: wanted.emoji,
    ctype: 'vip', typeBadge: '👑',
  });
  renderQ();
}

export function closeVip() {
  getEl('vipModal').classList.remove('vis');
  const vip = G.queue.find(c => c.state === 'vip');
  const tip = (vip && vip.vipBonus) || 0;
  G.money += tip;
  G.vipServed++;
  G.rating = Math.min(100, G.rating + 5);
  if (G.staffPhotoBonus) G.rating = Math.min(100, G.rating + 2);
  const idx = G.queue.findIndex(c => c.state === 'vip');
  if (idx >= 0) {
    const custId = G.queue[idx].id;
    clearCustomerTimer(custId);
    G.queue.splice(idx, 1);
  }
  if (!G.queue.length) spawnQueue();
  G.activeEvent = null;
  toast('👑 VIP เก็บเงินมา! +' + tip.toLocaleString() + '฿ +Rating');
  checkAch();
  updateUI();
  save();
}
