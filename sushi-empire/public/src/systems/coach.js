// ── First-time coach marks (dismissible tips) ─────────────────────────────────
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';

const TIPS = {
  cook: {
    anchor: '#cookBtn',
    title: 'ทำซูชิ',
    body: 'กดปุ่มทองเพื่อเริ่มทำ · แตะอีกครั้งตอนวงเขียว = Perfect!',
    place: 'top',
  },
  serve: {
    anchor: '#serveBtn',
    title: 'เสิร์ฟลูกค้า',
    body: 'จานพร้อมแล้ว กดเสิร์ฟ — เสิร์ฟตรงออเดอร์ได้เงินเพิ่ม',
    place: 'top',
  },
  buyIng: {
    anchor: '#ingRow',
    title: 'ซื้อวัตถุดิบ',
    body: 'แตะชิปวัตถุดิบเพื่อซื้อ · ดูตลาดปลา: ถูก/แพงเปลี่ยนทุกวัน',
    place: 'bottom',
  },
  upgrade: {
    anchor: '#upgList',
    title: 'อัปเกรดร้าน',
    body: 'ครัว / บริกร / โฆษณา ช่วยให้เร็วขึ้นและทำเงินได้อัตโนมัติ',
    place: 'top',
  },
  perfect: {
    anchor: '#cookBtn',
    title: 'Perfect Cook',
    body: 'ตอนปุ่มเป็นสีเขียว กดเร็ว ๆ — ได้เงิน +35% และ rating เพิ่ม',
    place: 'top',
  },
  rival: {
    anchor: '#rivalBanner',
    title: 'แข่ง Tsunami',
    body: 'ทำเงินให้ถึงเป้าสัปดาห์นี้แล้วกดรับรางวัลบนแบนเนอร์',
    place: 'bottom',
  },
};

let hideTimer = null;

function ensureCoach() {
  if (!G.coachSeen || typeof G.coachSeen !== 'object') G.coachSeen = {};
}

export function isCoachSeen(id) {
  ensureCoach();
  return !!G.coachSeen[id];
}

export function markCoachSeen(id) {
  ensureCoach();
  G.coachSeen[id] = true;
  save();
}

export function dismissCoach() {
  const tip = getEl('coachTip');
  if (tip) {
    tip.classList.remove('vis');
    tip.style.display = 'none';
  }
  clearTimeout(hideTimer);
}

/** Show tip once if not seen and anchor exists/visible */
export function maybeShowCoach(id, { force = false } = {}) {
  ensureCoach();
  if (!force && G.coachSeen[id]) return false;
  const def = TIPS[id];
  if (!def) return false;
  const anchor = document.querySelector(def.anchor);
  if (!anchor) return false;
  // Skip if anchor hidden
  const st = getComputedStyle(anchor);
  if (st.display === 'none' || st.visibility === 'hidden' || anchor.offsetParent === null) {
    // cookWrap is fixed outside shell — offsetParent may be null; allow cook/serve by rect
    const r = anchor.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
  }

  let tip = getEl('coachTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'coachTip';
    tip.className = 'coach-tip';
    document.body.appendChild(tip);
  }
  tip.innerHTML = `
    <div class="coach-title">${def.title}</div>
    <div class="coach-body">${def.body}</div>
    <button type="button" class="coach-ok" onclick="dismissCoachTip('${id}')">เข้าใจแล้ว</button>
  `;
  tip.style.display = 'block';
  tip.classList.add('vis');

  // Position near anchor
  const r = anchor.getBoundingClientRect();
  const tipW = Math.min(280, window.innerWidth - 24);
  tip.style.width = tipW + 'px';
  let left = r.left + r.width / 2 - tipW / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12));
  let top;
  if (def.place === 'bottom') {
    top = r.bottom + 10;
  } else {
    top = r.top - 12;
    // measure after paint
    requestAnimationFrame(() => {
      const h = tip.offsetHeight || 100;
      let t = r.top - h - 10;
      if (t < 8) t = r.bottom + 10;
      tip.style.top = t + 'px';
    });
  }
  tip.style.left = left + 'px';
  tip.style.top = (top || r.top) + 'px';

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    markCoachSeen(id);
    dismissCoach();
  }, 9000);
  return true;
}

export function dismissCoachTip(id) {
  if (id) markCoachSeen(id);
  dismissCoach();
}

/** Call after title dismissed / major milestones */
export function runCoachSequence() {
  ensureCoach();
  // Stagger tips so only one shows
  setTimeout(() => maybeShowCoach('cook'), 800);
}

export function coachOnFirstServe() {
  if (!isCoachSeen('buyIng')) setTimeout(() => maybeShowCoach('buyIng'), 600);
  if (!isCoachSeen('perfect')) setTimeout(() => maybeShowCoach('perfect'), 4000);
}

export function coachOnLevel(level) {
  if (level >= 2 && !isCoachSeen('upgrade')) setTimeout(() => maybeShowCoach('upgrade'), 700);
  if (level >= 8 && !isCoachSeen('rival')) setTimeout(() => maybeShowCoach('rival'), 1200);
}
