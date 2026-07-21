// ── Mini-games ────────────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';
import { updateUI, spawnFE } from '../ui/render.js';
import { trackQuestProgress, checkAch } from './game.js';

let currentMG = 0;

export function selectMG(n) {
  currentMG = n;
  [0, 1, 2].forEach(i => {
    getEl('mgs' + i).classList.toggle('active', i === n);
    getEl('mg_panel' + i).style.display = i === n ? '' : 'none';
  });
  if (n !== 0) { cancelAnimationFrame(rhRAF); rhActive = false; }
  if (n !== 1) { clearInterval(sliceInt); sliceActive = false; }
  if (n !== 2) { clearInterval(mmTimerInt); mmRunning = false; }
  updateMGHighScores();
}

export function updateMGHighScores() {
  const hs = G.mgHighScores || {};
  getEl('hs_rhythm').innerText = hs.rhythm != null ? 'x' + hs.rhythm  : '-';
  getEl('hs_fish').innerText   = hs.fish   != null ? hs.fish + 'ตัว' : '-';
  getEl('hs_memory').innerText = hs.memory != null ? hs.memory + 'พลิก' : '-';
}

// ── RHYTHM ────────────────────────────────────────────────────────────────────

let rhActive = false, rhScore = 0, rhCombo = 0, rhLives = 3, rhSpeed = 1;
let rhY = 10, rhDir = 1, rhRAF = null, rhNote = null;
const RH_ITEMS = ['🍣','🐡','🍤','🌯','🦔'];

export function initRhythm() {
  const lane = getEl('rhLane');
  lane.querySelectorAll('.rhnote').forEach(n => n.remove());
  rhNote = document.createElement('div');
  rhNote.className = 'rhnote';
  rhNote.innerText = RH_ITEMS[~~(Math.random() * RH_ITEMS.length)];
  lane.appendChild(rhNote);
  rhY = 10; rhDir = 1;
  animRhythm();
}

export function animRhythm() {
  if (!rhActive) return;
  const h     = getEl('rhLane').clientHeight;
  const speed = 2.8 + rhSpeed * 0.6;
  rhY += rhDir * speed;
  if (rhY > h - 52) rhDir = -1;
  if (rhY < 4)      rhDir =  1;
  rhNote.style.top = rhY + 'px';
  const pct = Math.min(100, 30 + rhSpeed * 14);
  const col = pct < 50 ? 'var(--green)' : pct < 75 ? 'var(--gold)' : 'var(--red)';
  getEl('rhSpeedFill').style.width      = pct + '%';
  getEl('rhSpeedFill').style.background = col;
  rhRAF = requestAnimationFrame(animRhythm);
}

export function rhTap() {
  if (!rhActive) {
    rhActive = true; rhScore = 0; rhCombo = 0; rhLives = 3; rhSpeed = 1;
    getEl('rhRes').innerText  = '';
    getEl('rhSc').innerText   = '0';
    getEl('rhMax').innerText  = '5';
    getEl('rh_combo').innerText = '';
    getEl('rh_lives').innerText = '❤️❤️❤️';
    getEl('rhBtn').innerText  = '✂️ ตัด!';
    initRhythm();
    return;
  }

  const lane = getEl('rhLane');
  const h    = lane.clientHeight;
  const tY   = h - 12 - 52;
  const diff = Math.abs(rhY - tY);

  let res, pts = 0;
  if      (diff < 14) { res = '✨ PERFECT!'; pts = 1; rhCombo++; }
  else if (diff < 30) { res = '👍 GOOD';    pts = 1; rhCombo++; }
  else {
    res = '❌ Miss'; rhCombo = 0; rhLives--;
    const hearts = ['','❤️','❤️❤️','❤️❤️❤️'];
    getEl('rh_lives').innerText = hearts[Math.max(0, rhLives)];
  }

  rhScore += pts;
  getEl('rhRes').innerText = res;
  getEl('rhSc').innerText  = rhScore;

  if (rhCombo >= 3) {
    const cv = getEl('rh_combo');
    cv.innerText = rhCombo + 'x Combo! 🔥';
    cv.style.animation = 'none'; void cv.offsetWidth;
    cv.style.animation = 'comboFlash .3s ease-out';
  } else {
    getEl('rh_combo').innerText = '';
  }

  lane.style.animation = 'none'; void lane.offsetWidth;
  lane.style.animation = pts ? 'laneFlash .2s ease-out' : '';

  if (rhScore > 0 && rhScore % 2 === 0) rhSpeed = Math.min(5, rhSpeed + 0.3);
  if (rhNote) rhNote.innerText = RH_ITEMS[~~(Math.random() * RH_ITEMS.length)];

  if (rhLives <= 0) {
    cancelAnimationFrame(rhRAF); rhActive = false;
    getEl('rhRes').innerText = '💀 หมดชีวิต! ได้ ' + rhScore + ' คะแนน';
    getEl('rhBtn').innerText = '🔄 เล่นอีก';
    return;
  }

  if (rhScore >= 5) {
    cancelAnimationFrame(rhRAF); rhActive = false;
    const bonus = rhCombo >= 3 ? 1.5 : 1;
    const rwd   = Math.round((200 + G.level * 25) * bonus);
    G.money += rwd; G.mgWins++;
    if (!G.mgHighScores) G.mgHighScores = {};
    G.mgHighScores.rhythm = Math.max(G.mgHighScores.rhythm || 0, rhCombo);
    trackQuestProgress('mg');
    getEl('rhRes').innerText = `🎉 ชนะ! +${rwd}฿${bonus > 1 ? ' (Combo bonus!)' : ''}`;
    getEl('rhBtn').innerText = '🔄 เล่นอีก';
    getEl('rhRwd').innerText = `รางวัล: +${200 + G.level * 25}฿ (x${bonus} Combo bonus)`;
    checkAch(); updateUI(); updateMGHighScores(); save();
  }
}

// ── FISH CATCH ────────────────────────────────────────────────────────────────

let sliceActive = false, sliceCnt = 0, sliceLeft = 10, sliceInt = null;
const FISH_NORMAL = ['🐟','🐠','🐡','🦐','🦑','🐙'];
const FISH_STAR   = '⭐';
const FISH_BOMB   = '💣';

export function startSlice() {
  if (sliceActive) return;
  sliceActive = true; sliceCnt = 0; sliceLeft = 10;
  const area = getEl('sliceArea');
  area.innerHTML = '';
  getEl('sliceSc').innerText     = '🐟 × 0';
  getEl('sliceBtn').disabled     = true;
  getEl('sl_timer').innerText    = '10s';
  for (let i = 0; i < 3; i++) setTimeout(() => addFish(), i * 200);
  sliceInt = setInterval(() => {
    sliceLeft--;
    getEl('sl_timer').innerText = sliceLeft + 's';
    getEl('sl_timer').style.color = sliceLeft <= 3 ? 'var(--red)' : 'var(--gold)';
    if (sliceLeft <= 0) { clearInterval(sliceInt); endSlice(); }
  }, 1000);
}

export function addFish() {
  if (!sliceActive) return;
  const area   = getEl('sliceArea');
  const f      = document.createElement('div');
  const r      = Math.random();
  const isStar = r < 0.10;
  const isBomb = !isStar && r < 0.18;
  f.style.cssText = `position:absolute;font-size:${isStar ? 28 : isBomb ? 26 : 24}px;cursor:pointer;user-select:none;
    left:${5 + Math.random() * 80}%;top:${5 + Math.random() * 70}%;
    animation:fishSpawn .3s cubic-bezier(.34,1.56,.64,1);
    filter:drop-shadow(0 2px 5px rgba(0,0,0,.5));
    transition:transform .15s,opacity .15s;`;
  f.innerText = isStar ? FISH_STAR : isBomb ? FISH_BOMB : FISH_NORMAL[~~(Math.random() * FISH_NORMAL.length)];
  f.addEventListener('click', e => {
    e.stopPropagation();
    if (!sliceActive) return;
    if (isBomb) {
      sliceCnt = Math.max(0, sliceCnt - 2);
      f.style.transform = 'scale(2)'; f.style.opacity = '0';
      area.style.animation = 'none'; void area.offsetWidth;
      area.style.animation = 'laneFlash .3s ease-out';
      setTimeout(() => f.remove(), 200);
      getEl('sliceSc').innerText = '🐟 × ' + sliceCnt;
      return;
    }
    const pts = isStar ? 2 : 1;
    sliceCnt += pts;
    f.style.transform = 'scale(1.8)'; f.style.opacity = '0';
    if (isStar) spawnFE('×2 ⭐');
    setTimeout(() => f.remove(), 180);
    getEl('sliceSc').innerText = '🐟 × ' + sliceCnt;
    setTimeout(() => addFish(), 300);
  });
  area.appendChild(f);
  setTimeout(() => {
    if (f.parentNode && sliceActive) {
      f.style.opacity = '0';
      setTimeout(() => f.remove(), 300);
      setTimeout(() => addFish(), 400);
    }
  }, 2500);
}

export function endSlice() {
  sliceActive = false;
  getEl('sliceArea').innerHTML = '';
  const rwd = sliceCnt * 25;
  if (sliceCnt > 0) {
    G.money += rwd; G.mgWins++;
    if (!G.mgHighScores) G.mgHighScores = {};
    G.mgHighScores.fish = Math.max(G.mgHighScores.fish || 0, sliceCnt);
    trackQuestProgress('mg');
    checkAch(); updateUI(); save();
  }
  getEl('sl_best').innerText = (G.mgHighScores && G.mgHighScores.fish) || 0;
  getEl('sliceSc').innerText  = sliceCnt > 0 ? '🎉 ' + sliceCnt + ' ตัว = +' + rwd + '฿' : '😔 ไม่ได้ปลาเลย!';
  getEl('sliceBtn').innerText  = '🎣 เริ่มอีก!';
  getEl('sliceBtn').disabled   = false;
  getEl('sl_timer').innerText  = '10s';
  updateMGHighScores();
}

// ── MEMORY MATCH ──────────────────────────────────────────────────────────────

const MM_EMOJIS = ['🍣','🐡','🍤','🌯','🦔','🎌','🏮','🌸'];
let mmCards = [], mmFlipped = [], mmPairs = 0, mmFlipCount = 0;
let mmRunning = false, mmTimerInt = null, mmTime = 60;

export function startMemory() {
  const btn = getEl('mmBtn');
  mmPairs = 0; mmFlipCount = 0; mmTime = 60; mmFlipped = []; mmRunning = true;
  getEl('mm_pairs').innerText = '0';
  getEl('mm_flips').innerText = '0';
  getEl('mm_timer').innerText = '60s';
  getEl('mm_timer').style.color = 'var(--gold)';
  btn.innerText = '🔄 เริ่มใหม่';

  const deck = [...MM_EMOJIS, ...MM_EMOJIS].sort(() => Math.random() - .5);
  const grid = getEl('mm_grid');
  grid.innerHTML = ''; mmCards = [];

  deck.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'mm-card';
    card.innerHTML = `<div class="mm-front">?</div><div class="mm-back">${emoji}</div>`;
    card.dataset.emoji = emoji; card.dataset.idx = i;
    card.addEventListener('click', () => flipCard(card));
    grid.appendChild(card); mmCards.push(card);
  });

  mmCards.forEach(c => c.classList.add('flipped'));
  setTimeout(() => { mmCards.forEach(c => c.classList.remove('flipped')); startMMTimer(); }, 1200);
}

export function startMMTimer() {
  clearInterval(mmTimerInt);
  mmTimerInt = setInterval(() => {
    mmTime--;
    getEl('mm_timer').innerText = mmTime + 's';
    getEl('mm_timer').style.color = mmTime <= 10 ? 'var(--red)' : 'var(--gold)';
    if (mmTime <= 0) { clearInterval(mmTimerInt); endMemory(false); }
  }, 1000);
}

export function flipCard(card) {
  if (!mmRunning) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (mmFlipped.length >= 2) return;
  card.classList.add('flipped');
  mmFlipped.push(card);
  mmFlipCount++;
  getEl('mm_flips').innerText = mmFlipCount;
  if (mmFlipped.length === 2) setTimeout(() => checkMatch(), 600);
}

export function checkMatch() {
  const [a, b] = mmFlipped;
  if (a.dataset.emoji === b.dataset.emoji) {
    a.classList.add('matched'); b.classList.add('matched');
    mmPairs++;
    getEl('mm_pairs').innerText = mmPairs;
    mmFlipped = [];
    if (mmPairs === 8) endMemory(true);
  } else {
    a.classList.remove('flipped'); b.classList.remove('flipped');
    mmFlipped = [];
  }
}

export function endMemory(won) {
  clearInterval(mmTimerInt); mmRunning = false;
  const btn = getEl('mmBtn');
  if (won) {
    const rwd  = Math.max(100, 600 - mmFlipCount * 10) + G.level * 20;
    G.money += rwd; G.mgWins++;
    if (!G.mgHighScores) G.mgHighScores = {};
    const prev = G.mgHighScores.memory != null ? G.mgHighScores.memory : 999;
    G.mgHighScores.memory = Math.min(prev, mmFlipCount);
    trackQuestProgress('mg');
    getEl('mm_timer').innerText = '🎉';
    btn.innerText = `🎊 ชนะ! +${rwd}฿ (${mmFlipCount} พลิก)`;
    spawnFE('+' + rwd + '฿ (จับคู่!)');
    checkAch(); updateUI(); updateMGHighScores(); save();
  } else {
    getEl('mm_timer').innerText = '⏰';
    btn.innerText = `💀 หมดเวลา! จับได้ ${mmPairs}/8 คู่`;
  }
  setTimeout(() => btn.innerText = '🍱 เริ่มเกม!', 3000);
}
