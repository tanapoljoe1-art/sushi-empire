// ── Event lifecycle (trigger / banner / end / VIP) ────────────────────────────
// Reads effects generically off EVENTS' declarative fields (see data.js) via
// core/effects.js. The only per-id checks left here are genuinely UI-specific
// one-offs (rush's cook-button styling, rush's own decoRushBonus duration
// extension) — deliberate, not an oversight: see the plan doc for why those
// stay explicit instead of growing the data schema for a single callsite each.
import { G, save } from '../core/state.js';
import { EVENTS, BRANCHES } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { renderQ, checkAch, spawnQueue, allocCustomerId, clearCustomerTimer, trackQuestProgress } from './game.js';

let eventCountdown = null;

export function triggerRandomEvent() {
  if (G.activeEvent) return;
  // decoVipBonus (koi/fountain/crystal) biases toward VIP customers showing up
  const pool = G.decoVipBonus
    ? [...EVENTS, ...EVENTS.filter(e => e.id === 'vip'), ...EVENTS.filter(e => e.id === 'vip')]
    : EVENTS;
  const ev = pool[~~(Math.random() * pool.length)];
  G.activeEvent = ev.id;
  if (ev.instant) { triggerVIP(); return; } // only 'vip' today; see file header
  G.eventTimeLeft = ev.dur;
  getEl('evMI').innerText = ev.icon;
  getEl('evMN').innerText = ev.name;
  getEl('evMD').innerText = ev.desc;
  getEl('evMA').innerText = ev.badge || '';
  getEl('eventModal').classList.add('vis');
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
  G.activeEvent = null; G.eventTimeLeft = 0;
  getEl('evBanner').style.display = 'none';
  toast('⏰ Event สิ้นสุดแล้ว!');
  checkAch();
  save();
}

// Sibling of the cookInt-leak fix: called from doPrestige() so a running
// countdown can't outlive a full state reset (see systems/game.js).
export function cancelEventCountdown() {
  clearInterval(eventCountdown);
  getEl('evBanner').style.display = 'none';
  getEl('cookBtn').classList.remove('rush');
  getEl('cookBtn').innerText = '🍣 ทำซูชิ!';
}

export function triggerVIP() {
  const br       = BRANCHES.find(b => b.id === G.activeBranch);
  const vipBonus = Math.round(200 * G.level * (br ? br.mult : 1));
  getEl('vipDesc').innerText = 'ลูกค้า VIP ต้องการเสิร์ฟทันที รับโบนัสพิเศษ!';
  getEl('vipAmt').innerText  = `+${vipBonus}฿`;
  getEl('vipModal').classList.add('vis');
  const id = allocCustomerId();
  G.queue.unshift({ id, e: '👑', anger: 0, state: 'vip', vipBonus });
  renderQ();
}

export function closeVip() {
  getEl('vipModal').classList.remove('vis');
  const vip = G.queue.find(c => c.state === 'vip');
  G.money += (vip && vip.vipBonus) || 0;
  G.vipServed++;
  G.rating = Math.min(100, G.rating + 5);
  const idx = G.queue.findIndex(c => c.state === 'vip');
  if (idx >= 0) {
    const custId = G.queue[idx].id;
    clearCustomerTimer(custId);
    G.queue.splice(idx, 1);
  }
  if (!G.queue.length) spawnQueue();
  G.activeEvent = null;
  toast('👑 VIP เก็บเงินมา! +Rating +5');
  checkAch();
  updateUI();
  save();
}
