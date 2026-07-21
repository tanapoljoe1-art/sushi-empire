// ── Quests ────────────────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { DAILY_POOL, WEEKLY_POOL, ACHIEVEMENTS } from '../data.js';
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

export function claimQuest(id, isWeekly) {
  const pool   = isWeekly ? WEEKLY_POOL : DAILY_POOL;
  const q      = pool.find(x => x.id === id);
  if (!q) return;
  const qstate = isWeekly ? G.quests.weekly : G.quests.daily;
  if (qstate[id] === 'claimed') { toast('รับแล้ว!'); return; }
  G.money += q.reward;
  qstate[id] = 'claimed';
  toast('🎉 Quest สำเร็จ! +' + q.reward + '฿');
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
        <div class="quest-info"><div class="quest-name">${q.name}</div><div class="quest-reward">รางวัล +${q.reward}฿</div></div>
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
        <div class="quest-info"><div class="quest-name">${q.name}</div><div class="quest-reward">รางวัล +${q.reward}฿</div></div>
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

export function calcScore() {
  return G.served * 10 + G.level * 50 + G.prestigeLevel * 500
    + (G.money > 0 ? Math.floor(Math.log10(G.money) * 20) : 0);
}

export function loadLB()       { try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); } catch { return []; } }
export function saveLB(rows)   { localStorage.setItem(LB_KEY, JSON.stringify(rows)); }

export function savePlayerName() {
  G.playerName = getEl('playerName').value || 'คุณ';
  save();
}

export function submitScore() {
  const name  = getEl('playerName').value || 'คุณ';
  G.playerName = name;
  const score = calcScore(); G.totalScore = score;
  let rows = loadLB();
  rows = rows.filter(r => r.name !== name);
  rows.push({ name, score, emoji:'⭐', lv:G.level, served:G.served, ts:Date.now() });
  const botScores = [score*.3, score*.55, score*.7, score*.85, score*.95, score*.6, score*.4];
  BOTS.forEach((b, i) => {
    if (!rows.find(r => r.name === b.name))
      rows.push({ name:b.name, score:Math.round(botScores[i] || 50), emoji:b.emoji,
                  lv:Math.max(1, ~~(G.level*.5)), served:~~(G.served*.5),
                  ts:Date.now() - i*10000, bot:true });
  });
  rows.sort((a, b) => b.score - a.score);
  rows = rows.slice(0, 15);
  saveLB(rows); save(); renderLB();
  toast('💾 บันทึกคะแนนแล้ว!');
}

export function renderLB() {
  const rows   = loadLB();
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
