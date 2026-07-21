// ── Quests ────────────────────────────────────────────────────────────────────
import { G, save, dayKeyUTC } from '../core/state.js';
import { DAILY_POOL, WEEKLY_POOL, ACHIEVEMENTS, INGREDIENTS } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';

export function initQuests() {
  if (!G.quests) G.quests = { daily:{}, weekly:{}, lastDailyReset:0, lastWeeklyReset:0, activeDailyIds:[], activeWeeklyIds:[] };
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
    if (!G.qDaily) G.qDaily = { served:0, streak:0, moneyEarned:0, servedNomiss:0, mgWinsToday:0 };
    else Object.keys(G.qDaily).forEach(k => G.qDaily[k] = 0);
    G.qDailyExtra = { specialServed: 0 };
  }

  if (now - G.quests.lastWeeklyReset > weekMs || !G.quests.activeWeeklyIds.length) {
    G.quests.lastWeeklyReset = now; G.quests.weekly = {};
    const pool = [...WEEKLY_POOL]; G.quests.activeWeeklyIds = [];
    for (let i = 0; i < 2 && pool.length; i++) {
      const idx = ~~(Math.random() * pool.length);
      G.quests.activeWeeklyIds.push(pool[idx].id); pool.splice(idx, 1);
    }
    if (!G.qWeekly) G.qWeekly = { servedWeek:0, upgradesWeek:0, eventsWeek:0, mgWinsWeek:0 };
    else Object.keys(G.qWeekly).forEach(k => G.qWeekly[k] = 0);
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
  applyQuestRewards(q);
  qstate[id] = 'claimed';
  toast('🎉 Quest สำเร็จ! ' + formatQuestReward(q));
  const cv = getEl('money');
  cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop');
  updateUI(); renderQuests(); save();
}

export function renderQuests() {
  initQuests();
  const msLeft = 86400000 - (Date.now() - G.quests.lastDailyReset);
  const h = Math.floor(msLeft / 3600000), m = Math.floor((msLeft % 3600000) / 60000);
  getEl('questReset').innerText = `รีเซ็ตใน ${h}ชม ${m}น.`;

  getEl('dailyQuests').innerHTML = G.quests.activeDailyIds.map(id => {
    const q = DAILY_POOL.find(x => x.id === id); if (!q) return '';
    const cur     = Math.min(getQuestVal(q.field), q.target);
    const pct     = Math.round(cur / q.target * 100);
    const done    = cur >= q.target;
    const claimed = G.quests.daily[id] === 'claimed';
    return `<div class="quest-card ${claimed ? 'done' : ''}">
      <div class="quest-head">
        <div class="quest-icon">${q.emoji}</div>
        <div class="quest-info"><div class="quest-name">${q.name}</div><div class="quest-reward">${formatQuestReward(q)}</div></div>
        ${claimed ? '<div style="font-size:20px">✅</div>' : ''}
      </div>
      <div class="quest-prog"><div class="quest-fill" style="width:${pct}%"></div></div>
      <div class="quest-progtext">${cur}/${q.target}</div>
      ${done && !claimed ? `<button class="quest-claim" onclick="claimQuest('${id}',false)" style="margin-top:8px">รับรางวัล!</button>` : ''}
    </div>`;
  }).join('');

  getEl('weeklyQuests').innerHTML = G.quests.activeWeeklyIds.map(id => {
    const q = WEEKLY_POOL.find(x => x.id === id); if (!q) return '';
    const cur     = Math.min(getQuestVal(q.field), q.target);
    const pct     = Math.round(cur / q.target * 100);
    const done    = cur >= q.target;
    const claimed = G.quests.weekly[id] === 'claimed';
    return `<div class="quest-card ${claimed ? 'done' : ''}">
      <div class="weekly-badge">📅 Weekly</div>
      <div class="quest-head">
        <div class="quest-icon">${q.emoji}</div>
        <div class="quest-info"><div class="quest-name">${q.name}</div><div class="quest-reward">${formatQuestReward(q)}</div></div>
        ${claimed ? '<div style="font-size:20px">✅</div>' : ''}
      </div>
      <div class="quest-prog"><div class="quest-fill" style="width:${pct}%"></div></div>
      <div class="quest-progtext">${cur}/${q.target}</div>
      ${done && !claimed ? `<button class="quest-claim" onclick="claimQuest('${id}',true)" style="margin-top:8px">รับรางวัล!</button>` : ''}
    </div>`;
  }).join('');
}

export function getQuestVal(field) {
  const map = {
    served:       G.qDaily.served        || 0,
    streak:       G.streak,
    moneyEarned:  G.qDaily.moneyEarned   || 0,
    servedNomiss: G.qDaily.servedNomiss  || 0,
    mgWinsToday:  G.qDaily.mgWinsToday   || 0,
    specialServed:(G.qDailyExtra && G.qDailyExtra.specialServed) || 0,
    servedWeek:   G.qWeekly.servedWeek   || 0,
    upgradesWeek: G.qWeekly.upgradesWeek || 0,
    eventsWeek:   G.qWeekly.eventsWeek   || 0,
    mgWinsWeek:   G.qWeekly.mgWinsWeek   || 0,
  };
  return map[field] || 0;
}

// Quest state is stored as 'claimed' or undefined — never as {done, claimed}
export function hasUnclaimedQuests() {
  if (!G.quests) return false;
  const dailyReady  = G.quests.activeDailyIds.some(id => {
    const q = DAILY_POOL.find(x => x.id === id);
    return q && getQuestVal(q.field) >= q.target && G.quests.daily[id] !== 'claimed';
  });
  const weeklyReady = G.quests.activeWeeklyIds.some(id => {
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

export function calcScore() {
  return G.served * 10 + G.level * 50 + G.prestigeLevel * 500
    + (G.money > 0 ? Math.floor(Math.log10(G.money) * 20) : 0);
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
    const ok = net.submitScoreOnline({
      name, score, level: G.level, served: G.served, prestige: G.prestigeLevel, day,
    });
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
        <div class="lb-name">${r.name}${isMe ? ' (คุณ)' : ''}</div>
        <div class="lb-sub">Lv.${r.lv} · เสิร์ฟ ${r.served} ครั้ง</div>
      </div>
      <div class="lb-score">${r.score.toLocaleString()}<span>คะแนน</span></div>
    </div>`;
  }).join('');
  if (G.playerName) getEl('playerName').value = G.playerName;
}

// ── Achievements ──────────────────────────────────────────────────────────────

export function renderAch() {
  getEl('achList').innerHTML = ACHIEVEMENTS.map(a => {
    const done = G.ach[a.id];
    return `<div class="ac ${done ? 'done' : 'pend'}">
      <div class="ac-ico">${a.icon}</div>
      <div class="ac-inf">
        <div class="ac-n">${a.name}</div>
        <div class="ac-d">${a.desc}</div>
        ${done ? `<div class="ac-r">+${a.reward}฿ ✓</div>` : ''}
      </div>
      <div class="ac-chk">${done ? '✅' : '🔒'}</div>
    </div>`;
  }).join('');
}
