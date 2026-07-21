// ── Fusion Lab ────────────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { MENUS, INGREDIENTS, FUSION_RECIPES, RARITY_STYLE } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI, renderMenu, renderIngredients, spawnFE } from '../ui/render.js';
import { checkAch } from './game.js';
import { sfxNewDisc } from './audio.js';
import { storyState } from './story.js';
import { setBDot } from './nav.js';

let fusionSlots = [null, null, null];

export function initFusion() {
  if (!G.fusion) G.fusion = { discovered: [], newDisc: [] };
}

export function renderFusionLab() {
  initFusion();
  G.fusion.newDisc = [];
  setBDot('play', (G.storyData && G.storyData.pendingChapters && G.storyData.pendingChapters.length) > 0);
  renderFusionSlots();
  renderFusionIngGrid();
  renderDiscoveredGrid();
  updateFusionPreview();
}

export function renderFusionSlots() {
  fusionSlots.forEach((key, i) => {
    const el      = getEl('fslot' + i);
    const emojiEl = getEl('fslot' + i + '_emoji');
    if (key) {
      el.classList.add('filled');
      emojiEl.innerText = INGREDIENTS[key].emoji;
    } else {
      el.classList.remove('filled');
      emojiEl.innerText = '?';
    }
  });
}

export function renderFusionIngGrid() {
  const grid = getEl('fusionIngGrid');
  grid.innerHTML = Object.entries(INGREDIENTS).map(([id, ing]) => {
    const qty        = G.ing[id] || 0;
    const isSelected = fusionSlots.includes(id);
    return `<div class="fing ${qty === 0 ? 'empty' : ''} ${isSelected ? 'selected' : ''}"
      onclick="pickFusionIng('${id}')">
      <span>${ing.emoji}</span>
      <span>${ing.name}</span>
      <span class="fing-count">×${qty}</span>
    </div>`;
  }).join('');
}

export function pickFusionIng(id) {
  const qty = G.ing[id] || 0;
  if (qty === 0) { toast('✕ ไม่มี' + INGREDIENTS[id].name + 'เลย! ซื้อก่อนนะ'); return; }

  const existIdx = fusionSlots.indexOf(id);
  if (existIdx !== -1) {
    fusionSlots[existIdx] = null;
    renderFusionSlots(); renderFusionIngGrid(); updateFusionPreview();
    return;
  }

  const emptyIdx = fusionSlots.indexOf(null);
  if (emptyIdx === -1) { toast('กด ✕ บนวัตถุดิบเพื่อเปลี่ยน'); return; }
  fusionSlots[emptyIdx] = id;
  renderFusionSlots(); renderFusionIngGrid(); updateFusionPreview();

  const cld = getEl('cauldronEmoji');
  cld.classList.remove('bubble'); void cld.offsetWidth; cld.classList.add('bubble');
}

export function clearFusionSlot(i) {
  if (!fusionSlots[i]) return;
  fusionSlots[i] = null;
  renderFusionSlots(); renderFusionIngGrid(); updateFusionPreview();
}

export function updateFusionPreview() {
  const filled   = fusionSlots.filter(Boolean);
  const btn      = getEl('fusionBtn');
  const resultEl = getEl('fusionResult');

  if (filled.length < 2) {
    resultEl.className = 'fusion-result';
    resultEl.innerHTML = `<span style="font-size:20px">✨</span><span>เลือกวัตถุดิบ 2–3 อย่าง</span>`;
    btn.disabled = true;
    return;
  }

  btn.disabled = false;
  const match = findFusionMatch(filled);
  if (match) {
    const already = (G.fusion.discovered || []).includes(match.id);
    const rs      = RARITY_STYLE[match.rarity];
    resultEl.className = 'fusion-result hit';
    resultEl.innerHTML = `
      <span class="fusion-result-emoji">${match.emoji}</span>
      <div class="fusion-result-info">
        <div class="fusion-result-name">${already ? match.name : '???'}</div>
        <div class="fusion-result-sub" style="color:${rs.color}">${rs.label}${already ? ' · +' + match.price + '฿/เสิร์ฟ' : ' · ค้นพบใหม่!'}</div>
      </div>`;
  } else {
    resultEl.className = 'fusion-result miss';
    resultEl.innerHTML = `<span style="font-size:20px">🤔</span><span style="color:var(--muted)">ส่วนผสมนี้ยังไม่มีสูตร... ลองผสมอื่นดู!</span>`;
  }
}

export function findFusionMatch(ingKeys) {
  const sorted = [...ingKeys].sort();
  return FUSION_RECIPES.find(r => {
    const rc = [...r.combo].sort();
    return rc.length === sorted.length && rc.every((v, i) => v === sorted[i]);
  }) || null;
}

export function doFusion() {
  initFusion();
  const filled = fusionSlots.filter(Boolean);
  if (filled.length < 2) return;

  const costMap = {};
  filled.forEach(id => costMap[id] = (costMap[id] || 0) + 1);
  for (const [id, amt] of Object.entries(costMap)) {
    if ((G.ing[id] || 0) < amt) { toast('✕ ' + INGREDIENTS[id].name + ' ไม่พอ!'); return; }
  }

  Object.entries(costMap).forEach(([id, amt]) => G.ing[id] -= amt);
  renderIngredients();

  const match = findFusionMatch(filled);
  const cld   = getEl('cauldronEmoji');

  if (match) {
    const isNew = !G.fusion.discovered.includes(match.id);
    if (isNew) {
      G.fusion.discovered.push(match.id);
      sfxNewDisc();
      if (!MENUS.find(m => m.id === match.id)) {
        const fusionIng = {};
        filled.forEach(k => fusionIng[k] = (fusionIng[k] || 0) + 1);
        MENUS.push({ id:match.id, name:match.name, emoji:match.emoji,
                     price:match.price, time:match.time, unlockLv:1,
                     ing:fusionIng, isFusion:true });
      }
      setTimeout(() => showFusionDiscovery(match), 400);
      checkAch();
    } else {
      toast('🍱 ' + match.name + ' — ทำได้อีกครั้ง! ตอนนี้อยู่ในเมนูแล้ว');
    }
    spawnFusionSparkles();
    cld.innerText = match.emoji;
    cld.classList.remove('bubble'); void cld.offsetWidth; cld.classList.add('bubble');
    const bonus = Math.round(match.price * 0.5);
    G.money += bonus;
    spawnFE('+' + bonus + '฿ (fusion!)');
  } else {
    cld.innerText = '💨';
    cld.classList.remove('bubble'); void cld.offsetWidth; cld.classList.add('bubble');
    setTimeout(() => { cld.innerText = '🫕'; }, 1000);
    toast('🤔 ไม่มีสูตรสำหรับส่วนผสมนี้ ลองอีกแบบ!');
  }

  setTimeout(() => {
    fusionSlots = [null, null, null];
    renderFusionSlots(); renderFusionIngGrid(); updateFusionPreview(); renderDiscoveredGrid();
  }, 800);

  updateUI(); renderMenu(); save();
}

export function showFusionDiscovery(recipe) {
  const rs   = RARITY_STYLE[recipe.rarity];
  const ping = getEl('storyPing');
  getEl('storyPingAvatar').innerText = recipe.emoji;
  getEl('storyPingName').innerText   = '🆕 ค้นพบเมนูใหม่!';
  getEl('storyPingDesc').innerText   = recipe.name + ' · ' + rs.label;
  ping.style.display = 'flex';
  clearTimeout(storyState.pingTimeout);
  storyState.pingTimeout = setTimeout(() => ping.style.display = 'none', 5000);
}

export function spawnFusionSparkles() {
  const lab   = getEl('fusionLab');
  const sparks = ['✨','⭐','🌟','💫','🔮'];
  for (let i = 0; i < 8; i++) {
    const el  = document.createElement('div');
    el.className = 'fusion-sparkle';
    const dx  = (Math.random() - 0.5) * 100;
    const dy  = -(30 + Math.random() * 60);
    el.style.cssText = `left:${30 + Math.random() * 40}%;top:40%;--dx:${dx}px;--dy:${dy}px;animation-delay:${i * 0.06}s;`;
    el.innerText = sparks[~~(Math.random() * sparks.length)];
    lab.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

export function renderDiscoveredGrid() {
  initFusion();
  const grid  = getEl('discoveredGrid');
  const total = FUSION_RECIPES.length;
  const found = (G.fusion.discovered || []).length;
  getEl('discCount').innerText = found;
  getEl('discTotal').innerText = total;

  grid.innerHTML = FUSION_RECIPES.map(r => {
    const disc  = (G.fusion.discovered || []).includes(r.id);
    const rs    = RARITY_STYLE[r.rarity];
    if (!disc) {
      return `<div class="disc-card locked-rec">
        <div class="disc-emoji">🔮</div>
        <div class="disc-name" style="color:var(--muted)">???</div>
        <div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:4px">${r.hint}</div>
        <div class="disc-tags"><div class="disc-tag">${rs.label}</div></div>
      </div>`;
    }
    return `<div class="disc-card">
      <div class="disc-emoji">${r.emoji}</div>
      <div class="disc-name">${r.name}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px;line-height:1.4">${r.desc}</div>
      <div class="disc-tags">
        ${r.tags.map(t => `<div class="disc-tag ${r.rarity === 'legendary' || r.rarity === 'epic' ? 'gold' : ''}">${t}</div>`).join('')}
      </div>
      <div class="disc-price">+${r.price}฿/เสิร์ฟ</div>
    </div>`;
  }).join('');
}
