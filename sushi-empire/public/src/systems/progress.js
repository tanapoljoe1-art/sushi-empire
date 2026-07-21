// ── Quests ────────────────────────────────────────────────────────────────────
import { G, save, dayKeyUTC } from '../core/state.js';
import { DAILY_POOL, WEEKLY_POOL, ACHIEVEMENTS, INGREDIENTS } from '../data.js';
import { getEl, escapeHtml } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { calcScoreClient } from '../core/formulas.js';

export function initQuests() {
  if (!G.quests || typeof G.quests !== 'object') {
    G.quests = { daily:{}, weekly:{}, lastDailyReset:0, lastWeeklyReset:0, activeDailyIds:[], activeWeeklyIds:[] };
  }
  if (!G.quests.daily || typeof G.quests.daily !== 'object') G.quests.daily = {};
  if (!G.quests.weekly || typeof G.quests.weekly !== 'object') G.quests.weekly = {};
  if (!Array.isArray(G.quests.activeDailyIds)) G.quests.activeDailyIds = [];
  if (!Array.isArray(G.quests.activeWeeklyIds)) G.quests.activeWeeklyIds = [];
  if (!Number.isFinite(G.quests.lastDailyReset)) G.quests.lastDailyReset = 0;
  if (!Number.isFinite(G.quests.lastWeeklyReset)) G.quests.lastWeeklyReset = 0;

  const now    = Date.now();
  const dayMs  = 86400000;
  const weekMs = 604800000;

  if (now - G.quests.lastDailyReset > dayMs || !G.quests.activeDailyIds.length) {
    G.quests.lastDailyReset = now; G.quests.daily = {};
    const pool = [...DAILY_POOL]; G.quests.activeDailyIds = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = ~~(Math.random() * pool.length);
      G.quests.activeDailyIds.push(pool[idx].id); pool.splice(idx, 1);
    }
    G.qDaily = { served:0, streak:0, moneyEarned:0, servedNomiss:0, mgWinsToday:0, perfects:0, maxStreakToday:0 };
    G.qDailyExtra = { specialServed: 0 };
    G.missToday = 0;
  }

  if (now - G.quests.lastWeeklyReset > weekMs || !G.quests.activeWeeklyIds.length) {
    G.quests.lastWeeklyReset = now; G.quests.weekly = {};
    const pool = [...WEEKLY_POOL]; G.quests.activeWeeklyIds = [];
    for (let i = 0; i < 2 && pool.length; i++) {
      const idx = ~~(Math.random() * pool.length);
      G.quests.activeWeeklyIds.push(pool[idx].id); pool.splice(idx, 1);
    }
    G.qWeekly = { servedWeek:0, upgradesWeek:0, eventsWeek:0, mgWinsWeek:0, perfectsWeek:0 };
  }
}

export function formatQuestReward(q) {
  const bits = [`+${q.reward}฿`];
  if (q.rewardRating) bits.push(`+${q.rewardRating}⭐`);
  if (q.rewardIng) {
    Object.entries(q.rewardIng).forEach(([id, n]) => {
      const ing = INGREDIENTS[id];
      bits.push(`${ing ? ing.emoji : id}×${n}`);
    });
  }
  return bits.join(' · ');
}

export function applyQuestRewards(q) {
  G.money += q.reward || 0;
  if (q.rewardRating) G.rating = Math.min(100, G.rating + q.rewardRating);
  if (q.rewardIng) {
    Object.entries(q.rewardIng).forEach(([id, n]) => {
      G.ing[id] = (G.ing[id] || 0) + n;
    });
  }
}

export function claimQuest(id, isWeekly) {
  const pool   = isWeekly ? WEEKLY_POOL : DAILY_POOL;
  const q      = pool.find(x => x.id === id);
  if (!q) return;
  const qstate = isWeekly ? G.quests.weekly : G.quests.daily;
  if (qstate[id] === 'claimed') { toast('รับแล้ว!'); return; }
  if (getQuestVal(q.field) < q.target) { toast('ยังไม่ครบเป้า'); return; }
  applyQuestRewards(q);
  qstate[id] = 'claimed';
  toast('🎉 Quest สำเร็จ! ' + formatQuestReward(q));
  const cv = getEl('money');
  cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop');
  updateUI(); renderQuests(); save();
}

/** Claim every ready daily + weekly quest at once. */
export function claimAllReadyQuests() {
  initQuests();
  if (!G.quests.daily) G.quests.daily = {};
  if (!G.quests.weekly) G.quests.weekly = {};
  let n = 0;
  (G.quests.activeDailyIds || []).forEach(id => {
    const q = DAILY_POOL.find(x => x.id === id);
    if (!q || G.quests.daily[id] === 'claimed') return;
    if (getQuestVal(q.field) < q.target) return;
    applyQuestRewards(q);
    G.quests.daily[id] = 'claimed';
    n++;
  });
  (G.quests.activeWeeklyIds || []).forEach(id => {
    const q = WEEKLY_POOL.find(x => x.id === id);
    if (!q || G.quests.weekly[id] === 'claimed') return;
    if (getQuestVal(q.field) < q.target) return;
    applyQuestRewards(q);
    G.quests.weekly[id] = 'claimed';
    n++;
  });
  if (!n) { toast('ยังไม่มีเควสที่รับได้'); return; }
  toast(`🎉 รับ ${n} เควสแล้ว!`);
  const cv = getEl('money');
  if (cv) { cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop'); }
  updateUI(); renderQuests(); save();
}

export function renderQuests() {
  initQuests();
  const msLeft = 86400000 - (Date.now() - G.quests.lastDailyReset);
  const h = Math.floor(msLeft / 3600000), m = Math.floor((msLeft % 3600000) / 60000);
  const resetEl = getEl('questReset');
  if (resetEl) resetEl.innerText = `รีเซ็ตใน ${h}ชม ${m}น.`;

  const claimAllWrap = getEl('questClaimAllWrap');
  if (claimAllWrap) {
    claimAllWrap.innerHTML = hasUnclaimedQuests()
      ? `<button type="button" class="quest-claim-all" onclick="claimAllReadyQuests()">🎁 รับทั้งหมดที่พร้อม</button>`
      : '';
  }

  const dailyEl = getEl('dailyQuests');
  if (!dailyEl) return;
  dailyEl.innerHTML = (G.quests.activeDailyIds || []).map(id => {
    const q = DAILY_POOL.find(x => x.id === id); if (!q) return '';
    const cur     = Math.min(getQuestVal(q.field), q.target);
    const pct     = Math.round(cur / q.target * 100);
    const done    = cur >= q.target;
    const claimed = G.quests.daily[id] === 'claimed';
    const ready   = done && !claimed;
    return `<div class="quest-card ${claimed ? 'done' : ''} ${ready ? 'ready' : ''}">
      <div class="quest-head">
        <div class="quest-icon">${q.emoji}</div>
        <div class="quest-info"><div class="quest-name">${q.name}</div><div class="quest-reward">${formatQuestReward(q)}</div></div>
        ${claimed ? '<div style="font-size:20px">✅</div>' : ready ? '<div style="font-size:18px">🎁</div>' : ''}
      </div>
      <div class="quest-prog"><div class="quest-fill" style="width:${pct}%"></div></div>
      <div class="quest-progtext">${cur}/${q.target}</div>
      ${ready ? `<button class="quest-claim" onclick="claimQuest('${id}',false)" style="margin-top:8px">รับรางวัล!</button>` : ''}
    </div>`;
  }).join('');

  const weeklyEl = getEl('weeklyQuests');
  if (!weeklyEl) return;
  weeklyEl.innerHTML = (G.quests.activeWeeklyIds || []).map(id => {
    const q = WEEKLY_POOL.find(x => x.id === id); if (!q) return '';
    const cur     = Math.min(getQuestVal(q.field), q.target);
    const pct     = Math.round(cur / q.target * 100);
    const done    = cur >= q.target;
    const claimed = G.quests.weekly[id] === 'claimed';
    const ready   = done && !claimed;
    return `<div class="quest-card ${claimed ? 'done' : ''} ${ready ? 'ready' : ''}">
      <div class="weekly-badge">📅 Weekly</div>
      <div class="quest-head">
        <div class="quest-icon">${q.emoji}</div>
        <div class="quest-info"><div class="quest-name">${q.name}</div><div class="quest-reward">${formatQuestReward(q)}</div></div>
        ${claimed ? '<div style="font-size:20px">✅</div>' : ready ? '<div style="font-size:18px">🎁</div>' : ''}
      </div>
      <div class="quest-prog"><div class="quest-fill" style="width:${pct}%"></div></div>
      <div class="quest-progtext">${cur}/${q.target}</div>
      ${ready ? `<button class="quest-claim" onclick="claimQuest('${id}',true)" style="margin-top:8px">รับรางวัล!</button>` : ''}
    </div>`;
  }).join('');
}

export function getQuestVal(field) {
  const map = {
    served:         G.qDaily.served          || 0,
    streak:         G.streak,
    maxStreakToday: G.qDaily.maxStreakToday  || 0,
    moneyEarned:    G.qDaily.moneyEarned     || 0,
    servedNomiss:   G.qDaily.servedNomiss    || 0,
    mgWinsToday:    G.qDaily.mgWinsToday     || 0,
    perfects:       G.qDaily.perfects        || 0,
    specialServed:  (G.qDailyExtra && G.qDailyExtra.specialServed) || 0,
    servedWeek:     G.qWeekly.servedWeek     || 0,
    upgradesWeek:   G.qWeekly.upgradesWeek   || 0,
    eventsWeek:     G.qWeekly.eventsWeek     || 0,
    mgWinsWeek:     G.qWeekly.mgWinsWeek     || 0,
    perfectsWeek:   G.qWeekly.perfectsWeek   || 0,
  };
  return map[field] || 0;
}

// Quest state is stored as 'claimed' or undefined — never as {done, claimed}
export function hasUnclaimedQuests() {
  if (!G.quests) return false;
  const dailyIds = G.quests.activeDailyIds || [];
  const weeklyIds = G.quests.activeWeeklyIds || [];
  if (!G.quests.daily) G.quests.daily = {};
  if (!G.quests.weekly) G.quests.weekly = {};
  const dailyReady  = dailyIds.some(id => {
    const q = DAILY_POOL.find(x => x.id === id);
    return q && getQuestVal(q.field) >= q.target && G.quests.daily[id] !== 'claimed';
  });
  const weeklyReady = weeklyIds.some(id => {
    const q = WEEKLY_POOL.find(x => x.id === id);
    return q && getQuestVal(q.field) >= q.target && G.quests.weekly[id] !== 'claimed';
  });
  return dailyReady || weeklyReady;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

const LB_KEY = 'SE5_lb';
const BOTS = [
  { name:'ซาคุระ🌸', emoji:'👩', score:0 },
  { name:'TaroSushi',  emoji:'👨', score:0 },
  { name:'เชฟโกโก้',  emoji:'🧑‍🍳', score:0 },
  { name:'SushiMaster',emoji:'👑', score:0 },
  { name:'ฮิโร่🍣',   emoji:'🧑', score:0 },
  { name:'NoodleKing', emoji:'👴', score:0 },
  { name:'อายาเนะ',   emoji:'👩‍💼', score:0 },
];

/** 'daily' | 'all' — which board UI shows */
let lbMode = 'daily';

export function getLbMode() { return lbMode; }

export function setLbMode(mode) {
  lbMode = mode === 'all' ? 'all' : 'daily';
  const dBtn = getEl('lbModeDaily');
  const aBtn = getEl('lbModeAll');
  if (dBtn) dBtn.classList.toggle('on', lbMode === 'daily');
  if (aBtn) aBtn.classList.toggle('on', lbMode === 'all');
  const dayEl = getEl('lbDayKey');
  if (dayEl) dayEl.innerText = lbMode === 'daily' ? `seed ${dayKeyUTC()}` : 'all-time';
  renderLB();
}

/** Shared with server.js via core/formulas.js — keep formulas identical. */
export function calcScore(g = G) {
  return calcScoreClient({
    served: g.served,
    level: g.level,
    prestige: g.prestigeLevel,
    money: g.money,
  });
}

function lbStorageKey(mode = lbMode) {
  if (mode === 'daily') return `${LB_KEY}_D_${dayKeyUTC()}`;
  return LB_KEY;
}

export function loadLB(mode = lbMode) {
  try { return JSON.parse(localStorage.getItem(lbStorageKey(mode)) || '[]'); } catch { return []; }
}
export function saveLB(rows, mode = lbMode) {
  localStorage.setItem(lbStorageKey(mode), JSON.stringify(rows));
}

/** Deterministic-ish bot scores for a day seed so offline daily board feels fresh */
function seedBotScores(baseScore, day) {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  const fracs = [0.28, 0.48, 0.62, 0.78, 0.91, 0.55, 0.38];
  return fracs.map((f, i) => {
    const wobble = ((h >> (i * 3)) & 31) / 100; // 0–0.31
    return Math.max(10, Math.round(baseScore * (f + wobble * 0.15)));
  });
}

export function savePlayerName() {
  G.playerName = getEl('playerName').value || 'คุณ';
  save();
}

export async function submitScore() {
  const name  = getEl('playerName').value || 'คุณ';
  G.playerName = name;
  const score = calcScore(); G.totalScore = score;
  const day = dayKeyUTC();
  const payload = {
    name, score, level: G.level, served: G.served,
    prestige: G.prestigeLevel || 0, money: G.money || 0, day,
  };

  // Local: write both daily + all-time
  for (const mode of ['daily', 'all']) {
    let rows = loadLB(mode);
    rows = rows.filter(r => r.name !== name);
    rows.push({
      name, score, emoji: '⭐', lv: G.level, served: G.served,
      ts: Date.now(), day, mode,
    });
    const botScores = mode === 'daily'
      ? seedBotScores(score, day)
      : [score*.3, score*.55, score*.7, score*.85, score*.95, score*.6, score*.4].map(Math.round);
    BOTS.forEach((b, i) => {
      if (!rows.find(r => r.name === b.name))
        rows.push({
          name: b.name, score: botScores[i] || 50, emoji: b.emoji,
          lv: Math.max(1, ~~(G.level * .5)), served: ~~(G.served * .5),
          ts: Date.now() - i * 10000, bot: true, day, mode,
        });
    });
    rows.sort((a, b) => b.score - a.score);
    rows = rows.slice(0, 15);
    saveLB(rows, mode);
  }
  save();

  // Online board
  try {
    const net = await import('./net.js');
    await net.connectNet();
    const ok = net.submitScoreOnline(payload);
    toast(ok
      ? (lbMode === 'daily' ? '🌐 บันทึกอันดับวันนี้แล้ว!' : '🌐 บันทึกอันดับออนไลน์แล้ว!')
      : '💾 บันทึกในเครื่องแล้ว (ออฟไลน์)');
    net.requestLeaderboard(lbMode);
  } catch {
    toast('💾 บันทึกในเครื่องแล้ว!');
  }
  renderLB();
}

export async function renderLB() {
  const dayEl = getEl('lbDayKey');
  if (dayEl) dayEl.innerText = lbMode === 'daily' ? `seed ${dayKeyUTC()}` : 'all-time';
  const dBtn = getEl('lbModeDaily');
  const aBtn = getEl('lbModeAll');
  if (dBtn) dBtn.classList.toggle('on', lbMode === 'daily');
  if (aBtn) aBtn.classList.toggle('on', lbMode === 'all');

  let rows = loadLB(lbMode);
  try {
    const net = await import('./net.js');
    await net.connectNet();
    net.requestLeaderboard(lbMode);
    const online = lbMode === 'daily' ? net.getOnlineDailyLB() : net.getOnlineLB();
    if (online && online.length) {
      rows = online.map(r => ({
        name: r.name,
        score: r.score,
        emoji: lbMode === 'daily' ? '📅' : '🌐',
        lv: r.level || r.lv || 1,
        served: r.served || 0,
        ts: r.ts,
        online: true,
      }));
    }
  } catch (_) {}

  const myName = G.playerName || 'คุณ';
  if (!rows.length) {
    getEl('lbList').innerHTML =
      '<div style="text-align:center;color:var(--muted);padding:20px">กด "บันทึก" เพื่อเข้าอันดับ!</div>';
    return;
  }
  getEl('lbList').innerHTML = rows.map((r, i) => {
    const isMe    = r.name === myName && !r.bot;
    const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '' + (i + 1);
    const rankCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return `<div class="lb-row ${isMe ? 'you' : ''}">
      <div class="lb-rank ${rankCls}">${medal}</div>
      <div class="lb-avatar">${r.emoji || '👤'}</div>
      <div class="lb-inf">
        <div class="lb-name">${escapeHtml(r.name)}${isMe ? ' (คุณ)' : ''}</div>
        <div class="lb-sub">Lv.${r.lv} · เสิร์ฟ ${r.served} ครั้ง</div>
      </div>
      <div class="lb-score">${r.score.toLocaleString()}<span>คะแนน</span></div>
    </div>`;
  }).join('');
  if (G.playerName) getEl('playerName').value = G.playerName;
}

// ── Achievements ──────────────────────────────────────────────────────────────

function achTier(reward) {
  const r = Number(reward) || 0;
  if (r >= 2000) return { id: 'gold', label: 'Gold', cls: 'tier-gold' };
  if (r >= 600) return { id: 'silver', label: 'Silver', cls: 'tier-silver' };
  return { id: 'bronze', label: 'Bronze', cls: 'tier-bronze' };
}

export function renderAch() {
  const total = ACHIEVEMENTS.length;
  const unlocked = ACHIEVEMENTS.filter(a => G.ach[a.id]).length;
  const hiddenTotal = ACHIEVEMENTS.filter(a => a.hidden).length;
  const hiddenDone = ACHIEVEMENTS.filter(a => a.hidden && G.ach[a.id]).length;
  const head = getEl('achHead');
  if (head) {
    head.innerText = `ปลดแล้ว ${unlocked}/${total}`
      + (hiddenTotal ? ` · ลับ ${hiddenDone}/${hiddenTotal}` : '');
  }
  getEl('achList').innerHTML = ACHIEVEMENTS.map(a => {
    const done = !!G.ach[a.id];
    const secret = !!a.hidden && !done;
    const tier = achTier(a.reward);
    const ico = secret ? '❓' : a.icon;
    const name = secret ? '???' : a.name;
    const desc = secret ? 'เงื่อนไขลับ — ค้นหาเอาเอง' : a.desc;
    const cls = [
      'ac',
      done ? 'done' : 'pend',
      secret ? 'secret' : '',
      tier.cls,
    ].filter(Boolean).join(' ');
    return `<div class="ac ${cls}">
      <div class="ac-ico">${ico}</div>
      <div class="ac-inf">
        <div class="ac-n">${name}${a.hidden && done ? ' <span class="ac-secret-tag">ลับ</span>' : ''} <span class="ac-tier ${tier.cls}">${tier.label}</span></div>
        <div class="ac-d">${desc}</div>
        ${done ? `<div class="ac-r">+${a.reward}฿ ✓</div>` : (secret ? '<div class="ac-r">🔒 ลับ</div>' : `<div class="ac-r">+${a.reward}฿</div>`)}
      </div>
      <div class="ac-chk">${done ? '✅' : '🔒'}</div>
    </div>`;
  }).join('');
}

/** Showcase achievements on title screen (up to 4, highest tier first). */
export function getShowcaseAch(saveObj) {
  const ach = (saveObj && saveObj.ach) || G.ach || {};
  return ACHIEVEMENTS
    .filter(a => ach[a.id])
    .sort((a, b) => (b.reward || 0) - (a.reward || 0))
    .slice(0, 4);
}
