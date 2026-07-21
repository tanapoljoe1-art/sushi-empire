// ── Event lifecycle (trigger / banner / end / VIP) + scheduler / forecast ─────
// Reads effects generically off EVENTS' declarative fields (see data.js) via
// core/effects.js. Per-id UI one-offs (rush button styling, decoRushBonus) stay
// explicit on purpose.
import { G, save } from '../core/state.js';
import { EVENTS, BRANCHES, MENUS } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { renderQ, checkAch, spawnQueue, allocCustomerId, clearCustomerTimer, trackQuestProgress } from './game.js';
import { startContextChallenge } from './context-mg.js';

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
  blackout: 100000,
  inspect: 110000,
  rival_sale: 95000,
};

const GLOBAL_GAP_MS = 55000; // minimum quiet time between events

function ensureEventState() {
  if (!G.eventCooldowns || typeof G.eventCooldowns !== 'object') G.eventCooldowns = {};
  if (!G.nextEventAt) G.nextEventAt = Date.now() + 18000 + Math.random() * 12000;
  if (!Array.isArray(G.eventLog)) G.eventLog = [];
  if (G.festivalCdUntil == null) G.festivalCdUntil = 0;
}

export function pushEventLog(entry) {
  ensureEventState();
  const row = {
    ts: Date.now(),
    id: entry.id || '',
    name: entry.name || entry.id || 'event',
    icon: entry.icon || '⚡',
    note: entry.note || '',
  };
  G.eventLog.unshift(row);
  G.eventLog = G.eventLog.slice(0, 10);
  try { renderEventLog(); } catch (_) {}
}

export function renderEventLog() {
  ensureEventState();
  const host = getEl('eventLogList');
  if (!host) return;
  if (!G.eventLog.length) {
    host.innerHTML = '<div class="elog-empty">ยังไม่มีประวัติอีเวนต์</div>';
    return;
  }
  host.innerHTML = G.eventLog.map(r => {
    const t = new Date(r.ts);
    const hh = String(t.getHours()).padStart(2,'0');
    const mm = String(t.getMinutes()).padStart(2,'0');
    return `<div class="elog-row">
      <span class="elog-ico">${r.icon}</span>
      <div class="elog-inf">
        <div class="elog-n">${r.name}</div>
        <div class="elog-note">${r.note || r.id}</div>
      </div>
      <span class="elog-t">${hh}:${mm}</span>
    </div>`;
  }).join('');
}

/** Player pays to host a food festival (festival event). */
export function hostFestival() {
  ensureEventState();
  if (G.activeEvent) { toast('มีอีเวนต์อยู่แล้ว'); return; }
  if (document.querySelector('.mbg.vis')) { toast('ปิดหน้าต่างก่อน'); return; }
  const now = Date.now();
  if (now < (G.festivalCdUntil || 0)) {
    const s = Math.ceil((G.festivalCdUntil - now) / 1000);
    toast(`เทศกาลคูลดาวน์อีก ${s}s`);
    return;
  }
  const cost = Math.round(400 + (G.level || 1) * 60);
  if (G.money < cost) { toast(`ต้องการ ${cost.toLocaleString()}฿`); return; }
  const fest = EVENTS.find(e => e.id === 'festival');
  if (!fest) { toast('ไม่พบ festival'); return; }
  G.money -= cost;
  G.festivalCdUntil = now + 180000; // 3 min
  G.festivalHosted = (G.festivalHosted || 0) + 1;
  pushEventLog({ id: 'festival', name: fest.name, icon: fest.icon, note: `จัดเอง (−${cost}฿)` });
  fireEvent(fest);
  toast(`🎊 จัดเทศกาล! (−${cost.toLocaleString()}฿)`);
  checkAch();
  updateUI();
  save();
  renderFestivalBtn();
}

export function renderFestivalBtn() {
  const btn = getEl('festivalBtn');
  const sub = getEl('festivalBtnSub');
  if (!btn) return;
  ensureEventState();
  const cost = Math.round(400 + (G.level || 1) * 60);
  const now = Date.now();
  const cd = Math.max(0, (G.festivalCdUntil || 0) - now);
  if (cd > 0) {
    btn.disabled = true;
    const s = Math.ceil(cd / 1000);
    btn.innerText = `🎊 เทศกาล (${s}s)`;
    if (sub) sub.innerText = 'คูลดาวน์';
  } else {
    btn.disabled = !!G.activeEvent;
    btn.innerText = `🎊 จัดเทศกาล · ${cost.toLocaleString()}฿`;
    if (sub) sub.innerText = 'รายได้ x2 + คิว 90 วิ';
  }
}

function eligibleEvents(now) {
  ensureEventState();
  let list = EVENTS.filter(e => {
    // skip synthetic choice overlays
    if (e.id && e.id.includes('_') && e.negative) return false;
    if (e._overlay) return false;
    const cd = G.eventCooldowns[e.id] || 0;
    if (now < cd) return false;
    // negative crisis unlock mid-game
    if (e.negative && (G.level || 1) < 5) return false;
    // hide base defs that are only choice shells without dur when already handled
    return true;
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
  try { renderFestivalBtn(); } catch (_) {}
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
  const pity = quietFor > 150000;
  const chance = pity ? 1 : (0.16 + (G.up.marketing || 0) * 0.05);

  if (Math.random() > chance) {
    // Missed roll — try again soon
    G.nextEventAt = now + 15000 + Math.random() * 15000;
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
  try { import('./telemetry.js').then(m => m.tel('event')).catch(() => {}); } catch (_) {}
  pushEventLog({
    id: ev.id,
    name: ev.name,
    icon: ev.icon,
    note: ev.negative ? 'วิกฤต' : (ev.badge || ''),
  });
  if (ev.instant) {
    triggerVIP();
    // VIP is instant; schedule next after gap
    G.eventCooldowns[ev.id] = Date.now() + (EVENT_COOLDOWN_MS[ev.id] || 60000);
    G.nextEventAt = Date.now() + GLOBAL_GAP_MS + Math.random() * 15000;
    G._lastEventEndAt = Date.now();
    return;
  }
  // Negative / choice events — pick 1 of 3 before any timer
  if (ev.choice && Array.isArray(ev.choices)) {
    showChoiceEvent(ev);
    updateEventForecastUI();
    return;
  }
  G.eventTimeLeft = ev.dur;
  getEl('evMI').innerText = ev.icon;
  getEl('evMN').innerText = ev.name;
  getEl('evMD').innerText = ev.desc;
  getEl('evMA').innerText = ev.badge || '';
  // hide choice box if present
  const ch = getEl('evChoices');
  if (ch) { ch.style.display = 'none'; ch.innerHTML = ''; }
  const accept = getEl('evAcceptBtn');
  if (accept) accept.style.display = '';
  getEl('eventModal').classList.add('vis');
  updateEventForecastUI();
}

function showChoiceEvent(ev) {
  getEl('evMI').innerText = ev.icon;
  getEl('evMN').innerText = ev.name;
  getEl('evMD').innerText = ev.desc;
  getEl('evMA').innerText = ev.badge || 'เลือกทาง';
  const accept = getEl('evAcceptBtn');
  if (accept) accept.style.display = 'none';
  let box = getEl('evChoices');
  if (!box) {
    box = document.createElement('div');
    box.id = 'evChoices';
    box.className = 'ev-choices';
    getEl('eventModal').querySelector('.mbox')?.appendChild(box);
  }
  box.style.display = 'flex';
  box.innerHTML = ev.choices.map((c, i) => {
    const cost = choiceCost(c);
    const costTxt = cost > 0 ? ` · ${cost.toLocaleString()}฿` : '';
    return `<button type="button" class="ev-choice ${i===0?'primary':''}" onclick="chooseEventOption(${i})">
      <div class="ev-ch-l">${c.label}${costTxt}</div>
      <div class="ev-ch-d">${c.desc || ''}</div>
    </button>`;
  }).join('');
  getEl('eventModal').classList.add('vis');
}

function choiceCost(c) {
  if (!c) return 0;
  if (c.cost != null) return c.cost;
  if (c.costBase != null || c.costMult != null) {
    return Math.round((c.costBase || 0) + (c.costMult || 0) * (G.level || 1));
  }
  return 0;
}

/** Player picked response for a choice event */
export function chooseEventOption(idx) {
  const ev = EVENTS.find(e => e.id === G.activeEvent);
  if (!ev?.choices?.[idx]) return;
  const c = ev.choices[idx];
  const cost = choiceCost(c);
  if (cost > 0 && G.money < cost) {
    toast('✕ เงินไม่พอสำหรับทางนี้');
    return;
  }
  if (cost > 0) G.money -= cost;
  if (c.rating) G.rating = Math.min(100, G.rating + c.rating);
  pushEventLog({
    id: ev.id + ':' + c.id,
    name: ev.name,
    icon: ev.icon,
    note: 'เลือก: ' + c.label,
  });

  getEl('eventModal').classList.remove('vis');
  const box = getEl('evChoices');
  if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  const accept = getEl('evAcceptBtn');
  if (accept) accept.style.display = '';

  // Timed debuff/buff path
  if (c.start && c.start.dur) {
    // Merge temporary event fields onto a synthetic runtime overlay
    G._choiceOverlay = { ...c.start, id: ev.id + '_' + c.id, icon: ev.icon, name: ev.name + ' · ' + c.label, desc: c.desc || '' };
    G.activeEvent = G._choiceOverlay.id;
    G.eventTimeLeft = c.start.dur;
    // Register overlay so activeEvent() finds it — stash on EVENTS runtime
    G._choiceOverlay._overlay = true;
    if (!EVENTS.find(e => e.id === G._choiceOverlay.id)) {
      EVENTS.push(G._choiceOverlay);
    } else {
      const i = EVENTS.findIndex(e => e.id === G._choiceOverlay.id);
      EVENTS[i] = G._choiceOverlay;
    }
    showEventBanner();
    clearInterval(eventCountdown);
    eventCountdown = setInterval(() => {
      G.eventTimeLeft--;
      const el = getEl('evTimer');
      if (el) el.innerText = G.eventTimeLeft + 's';
      updateEventForecastUI();
      if (G.eventTimeLeft <= 0) endEvent();
    }, 1000);
    toast(c.label);
  } else {
    // Instant resolve
    G.activeEvent = null;
    G.eventTimeLeft = 0;
    const now = Date.now();
    G.eventCooldowns[ev.id] = now + (EVENT_COOLDOWN_MS[ev.id] || 90000);
    G._lastEventEndAt = now;
    G.nextEventAt = now + GLOBAL_GAP_MS + Math.random() * 15000;
    toast(c.label + (cost ? ` (−${cost.toLocaleString()}฿)` : ''));
    trackQuestProgress('event');
  }
  updateUI();
  save();
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

  // Critic: optional skill check after accepting the event — waits for any
  // modal opened by this same event (e.g. guaranteedVip's vipModal) to close
  // first, so the two never show stacked on top of each other.
  if (ev.id === 'critic') {
    const startCriticChallenge = () => {
      startContextChallenge('critic', {
        title: '📰 นักวิจารณ์ทดสอบ!',
        desc: 'ตัดให้ตรงโซนเขียว 3 ครั้ง — ผ่านแล้วได้ Rating โบนัส',
        skipLabel: 'ไม่ท้า · แค่เสิร์ฟต่อ',
        onWin: () => {
          G.rating = Math.min(100, G.rating + 8);
          G.money += 150 + G.level * 20;
          toast('📰 ผ่านทดสอบ! +Rating +เงิน');
          updateUI();
        },
        onLose: (info) => {
          if (info?.skipped) return;
          G.rating = Math.max(0, G.rating - 3);
          toast('📰 นักวิจารณ์ไม่ประทับใจ −3 Rating');
          updateUI();
        },
      });
    };
    let attemptsLeft = 40; // ~20s worth of polling before giving up
    const waitThenStart = () => {
      if (document.querySelector('.mbg.vis')) {
        if (--attemptsLeft <= 0) return; // player left another modal open — skip this bonus check
        setTimeout(waitThenStart, 500);
        return;
      }
      startCriticChallenge();
    };
    setTimeout(waitThenStart, 350);
  }
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
  const cdScale = G.shopEventCdMult || 1;
  if (ev) {
    const baseId = (ev.id || '').split('_')[0];
    const cdKey = EVENT_COOLDOWN_MS[ev.id] != null ? ev.id : (EVENT_COOLDOWN_MS[baseId] != null ? baseId : ev.id);
    // map blackout_pay etc. → blackout
    const negBase = ['blackout','inspect','rival'].find(k => (ev.id||'').startsWith(k));
    const key = negBase || cdKey;
    G.eventCooldowns[key] = now + Math.round((EVENT_COOLDOWN_MS[key] || EVENT_COOLDOWN_MS[baseId] || 60000) * cdScale);
  }
  G._lastEventEndAt = now;
  G.nextEventAt = now + Math.round((GLOBAL_GAP_MS + 10000 + Math.random() * 20000) * cdScale);

  G.activeEvent = null; G.eventTimeLeft = 0;
  getEl('evBanner').style.display = 'none';
  toast('⏰ Event สิ้นสุดแล้ว!');
  checkAch();
  updateEventForecastUI();
  try { renderFestivalBtn(); } catch (_) {}
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
  if (G.shopVipTipBonus) vipBonus = Math.round(vipBonus * (1 + G.shopVipTipBonus));
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
  // stash pending tip for challenge path
  G._pendingVipTip = vipBonus;
  renderQ();
}

function finishVipPayout(tipMult = 1) {
  getEl('vipModal').classList.remove('vis');
  const vip = G.queue.find(c => c.state === 'vip');
  let tip = (vip && vip.vipBonus) || G._pendingVipTip || 0;
  tip = Math.round(tip * tipMult);
  G.money += tip;
  G.vipServed++;
  G.rating = Math.min(100, G.rating + (tipMult >= 1.5 ? 8 : 5));
  if (G.staffPhotoBonus) G.rating = Math.min(100, G.rating + 2);
  const idx = G.queue.findIndex(c => c.state === 'vip');
  if (idx >= 0) {
    const custId = G.queue[idx].id;
    clearCustomerTimer(custId);
    G.queue.splice(idx, 1);
  }
  if (!G.queue.length) spawnQueue();
  G.activeEvent = null;
  G._pendingVipTip = 0;
  toast('👑 VIP! +' + tip.toLocaleString() + '฿' + (tipMult > 1 ? ' (ท้าทายโบนัส!)' : tipMult < 1 ? ' (พลาดท้าทาย)' : ''));
  checkAch();
  updateUI();
  save();
}

/** Take tip immediately (no challenge). */
export function closeVip() {
  finishVipPayout(1);
}

/** Optional skill challenge for double tip. */
export function challengeVip() {
  getEl('vipModal').classList.remove('vis');
  startContextChallenge('vip', {
    title: '👑 ท้าทาย VIP!',
    desc: 'ตัดตรงโซนเขียว 3 ครั้ง → ทิป x2 · พลาด = ทิปครึ่ง',
    skipLabel: 'ไม่ท้า · รับทิปปกติ',
    onWin: () => finishVipPayout(2),
    onLose: (info) => finishVipPayout(info?.skipped ? 1 : 0.5),
  });
}


/** Debug / tests: force a named event by id */
export function forceEvent(id) {
  const def = EVENTS.find(e => e.id === id);
  if (!def) {
    toast('ไม่พบ event ' + id);
    return;
  }
  if (document.querySelector('.mbg.vis')) {
    document.querySelectorAll('.mbg.vis').forEach(el => el.classList.remove('vis'));
  }
  fireEvent(def);
  toast('Event: ' + (def.name || id));
  updateUI();
  save();
}
