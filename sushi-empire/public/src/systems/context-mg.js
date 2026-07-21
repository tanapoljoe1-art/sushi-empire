// ── Contextual mini-challenge (VIP / Critic) ──────────────────────────────────
// Lightweight timing game — not the full minigame tab. Win/lose callbacks set by caller.
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, spawnFE } from '../ui/render.js';
import { trackQuestProgress, checkAch } from './game.js';

let ctx = {
  active: false,
  kind: null,       // 'vip' | 'critic'
  hits: 0,
  need: 3,
  misses: 0,
  maxMiss: 2,
  pos: 10,
  dir: 1,
  raf: null,
  onWin: null,
  onLose: null,
  skipTip: null,
};

function zoneHit() {
  // Lane 0–100; green zone 62–78
  return ctx.pos >= 62 && ctx.pos <= 78;
}

function animate() {
  if (!ctx.active) return;
  ctx.pos += ctx.dir * (2.4 + ctx.hits * 0.35);
  if (ctx.pos >= 96) { ctx.pos = 96; ctx.dir = -1; }
  if (ctx.pos <= 4)  { ctx.pos = 4;  ctx.dir = 1; }
  const bar = getEl('ctxBar');
  if (bar) bar.style.left = ctx.pos + '%';
  ctx.raf = requestAnimationFrame(animate);
}

export function startContextChallenge(kind, { title, desc, onWin, onLose, skipLabel } = {}) {
  if (ctx.active) return;
  ctx.active = true;
  ctx.kind = kind || 'vip';
  ctx.hits = 0;
  ctx.misses = 0;
  ctx.pos = 10;
  ctx.dir = 1;
  ctx.onWin = onWin || null;
  ctx.onLose = onLose || null;

  getEl('ctxMgIcon').innerText  = kind === 'critic' ? '📰' : '👑';
  getEl('ctxMgTitle').innerText = title || (kind === 'critic' ? 'ทดสอบฝีมือ!' : 'ท้าทาย VIP!');
  getEl('ctxMgDesc').innerText  =
    desc || 'กดปุ่มตอนแถบอยู่ในโซนเขียว 3 ครั้ง (พลาดได้ 2 ครั้ง)';
  getEl('ctxMgStatus').innerText = '0 / 3';
  getEl('ctxMgSkip').innerText  = skipLabel || 'ข้าม';
  getEl('ctxMgModal').classList.add('vis');
  cancelAnimationFrame(ctx.raf);
  ctx.raf = requestAnimationFrame(animate);
}

export function ctxMgTap() {
  if (!ctx.active) return;
  if (zoneHit()) {
    ctx.hits++;
    getEl('ctxMgStatus').innerText = `${ctx.hits} / ${ctx.need} ✨`;
    spawnFE('Perfect!');
    if (ctx.hits >= ctx.need) finish(true);
  } else {
    ctx.misses++;
    getEl('ctxMgStatus').innerText = `${ctx.hits} / ${ctx.need} · miss ${ctx.misses}`;
    spawnFE('Miss', true);
    if (ctx.misses > ctx.maxMiss) finish(false);
  }
}

export function ctxMgSkip() {
  if (!ctx.active) return;
  // Skip counts as soft lose (no punishment beyond missing bonus)
  finish(false, true);
}

function finish(won, skipped = false) {
  ctx.active = false;
  cancelAnimationFrame(ctx.raf);
  getEl('ctxMgModal').classList.remove('vis');

  if (won) {
    G.mgWins = (G.mgWins || 0) + 1;
    trackQuestProgress('mg');
    toast(ctx.kind === 'critic' ? '📰 ผ่าน! นักวิจารณ์ประทับใจ' : '👑 ชนะท้าทาย VIP!');
    if (ctx.onWin) ctx.onWin();
  } else if (!skipped) {
    toast(ctx.kind === 'critic' ? '📰 ฝีมือยังไม่ถึง…' : '😅 พลาดท้าทาย');
    if (ctx.onLose) ctx.onLose();
  } else {
    if (ctx.onLose) ctx.onLose({ skipped: true });
  }

  checkAch();
  updateUI();
  save();
  ctx.onWin = ctx.onLose = null;
}
