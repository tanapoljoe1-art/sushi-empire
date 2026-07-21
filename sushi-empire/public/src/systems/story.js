// ── Story Engine ──────────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { STORY_CHAPTERS } from '../data.js';
import { getEl } from '../core/dom.js';
import { spawnFE, updateUI, toast } from '../ui/render.js';
import { setBDot } from './nav.js';

export let storyState = {
  currentChapter:  null,
  currentScene:    0,
  pendingChapters: [],
  seenChapters:    {},
  pingTimeout:     null,
  typewriterTimer: null,
};

export function initStory() {
  if (!G.storyData) G.storyData = { seenChapters: {}, pendingChapters: [] };
  if (!G.storyFlags) G.storyFlags = {};
}

export function checkStoryTriggers() {
  initStory();
  STORY_CHAPTERS.forEach(ch => {
    const seen = G.storyData.seenChapters[ch.id];
    if (ch.triggerOnce && seen) return;
    if (!ch.triggerOnce && seen) {
      const cooldownMs = (ch.cooldown || 30) * 1000;
      if (Date.now() - seen < cooldownMs) return;
    }
    if (ch.triggerLv   && G.level  < ch.triggerLv)   return;
    if (ch.triggerServed && G.served < ch.triggerServed) return;
    if (G.storyData.pendingChapters.includes(ch.id))  return;
    G.storyData.pendingChapters.push(ch.id);
  });
  if (G.storyData.pendingChapters.length > 0 && !storyState.currentChapter) {
    showStoryPing(G.storyData.pendingChapters[0]);
    setBDot('play', true);
  }
}

export function showStoryPing(chapterId) {
  const ch = STORY_CHAPTERS.find(c => c.id === chapterId);
  if (!ch) return;
  const sc   = ch.scenes[0];
  const ping = getEl('storyPing');
  getEl('storyPingAvatar').innerText = sc.avatar;
  getEl('storyPingName').innerText   = sc.speaker + ' มีเรื่องจะเล่า!';
  getEl('storyPingDesc').innerText   = ch.title;
  ping.style.display = 'flex';
  clearTimeout(storyState.pingTimeout);
  storyState.pingTimeout = setTimeout(() => { ping.style.display = 'none'; }, 6000);
}

export function openStoryPing() {
  getEl('storyPing').style.display = 'none';
  clearTimeout(storyState.pingTimeout);
  setBDot('play', false);
  if (G.storyData.pendingChapters.length > 0) {
    openStory(G.storyData.pendingChapters[0]);
  }
}

export function openStory(chapterId) {
  const ch = STORY_CHAPTERS.find(c => c.id === chapterId);
  if (!ch) return;
  storyState.currentChapter = chapterId;
  storyState.currentScene   = 0;
  renderStoryScene(ch, 0);
  getEl('storyOverlay').style.display = 'flex';
}

export function renderStoryScene(ch, idx) {
  const sc = ch.scenes[idx];
  if (!sc) return;
  storyState.currentScene = idx;

  getEl('storyAvatar').innerText    = sc.avatar;
  getEl('storySpeaker').innerText   = sc.speaker;
  getEl('storyRole').innerText      = sc.role;
  getEl('storyChBadge').innerText   = ch.chapter;

  const av = getEl('storyAvatar');
  av.style.animation = 'none'; void av.offsetWidth;
  av.style.animation = 'avatarPop .35s cubic-bezier(.34,1.56,.64,1)';

  typewriteText('storyText', sc.text, () => renderChoices(ch, sc));

  const dots = getEl('storyDots');
  dots.innerHTML = ch.scenes.map((_, i) =>
    `<div style="width:6px;height:6px;border-radius:50%;background:${i === idx ? 'rgba(232,196,106,.8)' : 'rgba(255,255,255,.15)'};transition:background .3s;"></div>`
  ).join('');

  getEl('storyChoices').innerHTML = '';
}

export function typewriteText(elId, text, onDone) {
  clearInterval(storyState.typewriterTimer);
  const el     = getEl(elId);
  el.innerHTML = '';
  let i        = 0;
  const cursor = '<span class="cursor"></span>';
  storyState.typewriterTimer = setInterval(() => {
    if (i < text.length) {
      el.innerHTML = text.slice(0, ++i) + cursor;
    } else {
      clearInterval(storyState.typewriterTimer);
      el.innerHTML = text;
      if (onDone) onDone();
    }
  }, 28);
  el.onclick = () => {
    if (i < text.length) {
      clearInterval(storyState.typewriterTimer);
      el.innerHTML = text;
      el.onclick   = null;
      if (onDone) onDone();
    }
  };
}

export function renderChoices(ch, sc) {
  const box = getEl('storyChoices');
  if (!sc.choices) { closeStory(); return; }
  box.innerHTML = sc.choices.map((c, ci) =>
    `<button class="story-choice ${ci === 0 ? 'primary' : ''}" onclick="storyChoose(${ci})">${c.label}</button>`
  ).join('');
  box.querySelectorAll('.story-choice').forEach((btn, i) => {
    btn.style.animation = 'none'; void btn.offsetWidth;
    btn.style.animation = `storyIn .3s cubic-bezier(.34,1.56,.64,1) ${i * 0.07}s both`;
  });
}

export function storyChoose(choiceIdx) {
  const ch     = STORY_CHAPTERS.find(c => c.id === storyState.currentChapter);
  if (!ch) return;
  const sc     = ch.scenes[storyState.currentScene];
  const choice = sc.choices[choiceIdx];
  if (!choice) return;

  if (choice.reward) applyStoryReward(choice.reward);
  if (choice.flag) {
    G.storyFlags = G.storyFlags || {};
    G.storyFlags[choice.flag] = true;
    const FLAG_TOAST = {
      criticFriend: '📰 นักวิจารณ์เป็นมิตร — เสีย rating น้อยลงเมื่อพลาด',
      rivalHate: '⚔️ Tsunami จ้องตา — แข่งรายสัปดาห์ดุขึ้น',
      rivalPride: '💪 ไม่กลัวคู่แข่ง — เป้า rival ง่ายลง + รางวัลโบนัส',
      brave: '🔥 ใจกล้า — โบนัสเล็ก ๆ ถาวร',
      staffAffinity: '🌸 ทีมสนิท — ขวัญกำลังใจดี',
    };
    if (FLAG_TOAST[choice.flag]) toast(FLAG_TOAST[choice.flag]);
  }
  if (choice.flags && Array.isArray(choice.flags)) {
    G.storyFlags = G.storyFlags || {};
    choice.flags.forEach(f => { G.storyFlags[f] = true; });
  }
  if (choice.flag || (choice.flags && choice.flags.length)) {
    try { import('./game.js').then(m => m.checkAch()).catch(() => {}); } catch (_) {}
  }

  if (choice.close || choice.next === null) {
    closeStory();
  } else if (choice.next !== undefined && choice.next !== null) {
    const box = getEl('storyBox');
    box.style.animation = 'none'; void box.offsetWidth;
    box.style.animation = 'storyIn .3s cubic-bezier(.34,1.56,.64,1)';
    renderStoryScene(ch, choice.next);
  }
}

export function applyStoryReward(reward) {
  if (reward.money) {
    G.money += reward.money;
    spawnFE('+' + reward.money + '฿ (เรื่องราว)');
    const cv = getEl('money');
    if (cv) { cv.classList.remove('pop'); void cv.offsetWidth; cv.classList.add('pop'); }
  }
  if (reward.rating) G.rating = Math.min(100, G.rating + reward.rating);
  if (reward.ing)    G.ing[reward.ing] = (G.ing[reward.ing] || 0) + 5;
  if (reward.incomeBonus) {
    G.storyFlags = G.storyFlags || {};
    G.storyFlags.storyIncome = (G.storyFlags.storyIncome || 0) + reward.incomeBonus;
  }
  if (reward.prestige) toast('✨ ถึงเวลา Prestige แล้ว! ลองดูที่ Shop Tab ✨');
  updateUI();
}

export function closeStory() {
  clearInterval(storyState.typewriterTimer);
  const overlay        = getEl('storyOverlay');
  overlay.style.opacity    = '0';
  overlay.style.transition = 'opacity .3s';
  setTimeout(() => {
    overlay.style.display    = 'none';
    overlay.style.opacity    = '';
    overlay.style.transition = '';
  }, 300);

  if (storyState.currentChapter) {
    initStory();
    G.storyData.seenChapters[storyState.currentChapter] = Date.now();
    G.storyData.pendingChapters = G.storyData.pendingChapters.filter(
      id => id !== storyState.currentChapter
    );
  }
  storyState.currentChapter = null;
  save();

  if (G.storyData.pendingChapters.length > 0) {
    setTimeout(() => showStoryPing(G.storyData.pendingChapters[0]), 1500);
  }
}

export function storyTapOutside(e) {
  if (e.target === getEl('storyOverlay')) {
    const choicesExist = getEl('storyChoices').children.length > 0;
    if (choicesExist) {
      closeStory();
    } else {
      clearInterval(storyState.typewriterTimer);
      const ch = STORY_CHAPTERS.find(c => c.id === storyState.currentChapter);
      if (ch) {
        const sc = ch.scenes[storyState.currentScene];
        getEl('storyText').innerText = sc.text;
        renderChoices(ch, sc);
      }
    }
  }
}
