// ── Staff system ──────────────────────────────────────────────────────────────
import { G, save } from '../core/state.js';
import { STAFF_DATA, CHEMISTRY, RARITY_COLOR } from '../data.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { showConfirm } from './nav.js';

export function getMoodEmoji(m) { return m >= 90 ? '😄' : m >= 70 ? '😊' : m >= 50 ? '😐' : m >= 30 ? '😟' : '🤒'; }
export function getMoodColor(m) { return m >= 70 ? 'var(--green)' : m >= 40 ? 'var(--gold)' : 'var(--red)'; }
export function getMoodMult(m)  { return 0.5 + 0.5 * (m / 100); }

export function applyAllStaffBonuses() {
  // Reset staff-derived fields
  G.staffSpeedBonus   = 0; G.staffPatBonus    = 0; G.staffIncomeBonus = 0;
  G.staffStreakGuard  = false; G.staffOmakaseBonus = false; G.staffDecoBonus = false;
  G.staffRiceDiscount = false; G.staffSpeedBurst   = false; G.staffVipBonus  = false;
  G.staffPremiumBonus = false; G.staffCriticProof  = false; G.staffLeaderBonus = false;
  G.staffEventBonus   = false; G.staffTrainerBonus = false; G.staffPhotoBonus = false;
  G.staffViralBonus   = false; G.staffSecretMenu   = false; G.staffExtraRating = false;
  G.staffDecoMult     = 1;

  const hiredIds = [];
  Object.entries(G.staff || {}).forEach(([id, info]) => {
    if (!info.hired) return;
    hiredIds.push(id);
    const s        = STAFF_DATA.find(x => x.id === id);
    if (!s) return;
    const moodMult = getMoodMult(info.mood ?? 100);

    const prevSpd  = G.staffSpeedBonus;
    const prevPat  = G.staffPatBonus;
    const prevInc  = G.staffIncomeBonus;
    s.fx(G);
    G.staffSpeedBonus   = prevSpd + (G.staffSpeedBonus  - prevSpd) * moodMult;
    G.staffPatBonus     = prevPat + (G.staffPatBonus    - prevPat) * moodMult;
    G.staffIncomeBonus  = prevInc + (G.staffIncomeBonus - prevInc) * moodMult;

    // Skills
    (info.skills || []).forEach(sid => {
      const sk = s.skills.find(x => x.id === sid);
      if (sk) sk.effect(G);
    });
  });

  if (G.staffLeaderBonus) G.staffIncomeBonus += hiredIds.length * 0.03;
  applyChemistry(hiredIds);
}

export function applyChemistry(hiredIds) {
  CHEMISTRY.forEach(c => {
    if (c.pair.every(id => hiredIds.includes(id))) c.fx(G);
  });
}

export function getActiveChemistry() {
  const hiredIds = Object.entries(G.staff || {}).filter(([, i]) => i.hired).map(([id]) => id);
  return CHEMISTRY.filter(c => c.pair.every(id => hiredIds.includes(id)));
}

export function hireStaff(id) {
  const s = STAFF_DATA.find(x => x.id === id);
  if (s.unlockLv > G.level) { toast('✕ ต้องการ Level ' + s.unlockLv); return; }
  if (!G.staff) G.staff = {};
  const cost = s.levels[0].cost;
  if (G.money < cost) { toast('✕ เงินไม่พอ!'); return; }
  G.money -= cost;
  G.staff[id] = { hired: true, level: 1, mood: 100, skills: [] };
  applyAllStaffBonuses();
  toast('✅ จ้าง ' + s.name + ' แล้ว!');
  updateUI(); renderStaff(); save();
}

export function levelUpStaff(id) {
  const s    = STAFF_DATA.find(x => x.id === id);
  const info = G.staff && G.staff[id];
  if (!info) return;
  if (info.level >= s.levels.length) { toast('MAX Level แล้ว!'); return; }
  const baseCost = s.levels[info.level].cost;
  const cost     = G.staffTrainerBonus ? Math.round(baseCost * 0.8) : baseCost;
  if (G.money < cost) { toast('✕ เงินไม่พอ!'); return; }
  G.money -= cost;
  info.level++;
  info.mood = Math.min(100, (info.mood || 80) + 15);
  applyAllStaffBonuses();
  toast('⬆️ ' + s.name + ' Level ' + info.level + '!');
  updateUI(); renderStaff(); save();
}

export function restStaff(id) {
  const info = G.staff && G.staff[id];
  if (!info) return;
  const cost = 100;
  if (G.money < cost) { toast('✕ ต้องใช้ 100฿ เพื่อพักพนักงาน'); return; }
  G.money -= cost;
  info.mood = 100;
  applyAllStaffBonuses();
  toast('😴 ' + STAFF_DATA.find(x => x.id === id).name + ' พักแล้ว! Mood 100%');
  updateUI(); renderStaff(); save();
}

export function fireStaff(id) {
  showConfirm('😢', 'เลิกจ้าง?', 'พนักงานจะออกไปเลย — แน่ใจ?', 'danger', () => {
    delete G.staff[id];
    applyAllStaffBonuses();
    toast('👋 เลิกจ้างแล้ว');
    updateUI(); renderStaff(); save();
  });
}

export function unlockSkill(staffId, skillId) {
  const s    = STAFF_DATA.find(x => x.id === staffId);
  const sk   = s.skills.find(x => x.id === skillId);
  const info = G.staff && G.staff[staffId];
  if (!info || !sk) return;
  if ((info.skills || []).includes(skillId)) { toast('มี Skill นี้แล้ว!'); return; }
  if (G.money < sk.cost) { toast('✕ เงินไม่พอ!'); return; }
  G.money -= sk.cost;
  if (!info.skills) info.skills = [];
  info.skills.push(skillId);
  applyAllStaffBonuses();
  toast('🎯 ' + sk.name + '!');
  updateUI(); renderStaff(); save();
}

export function tickStaffMood() {
  Object.entries(G.staff || {}).forEach(([id, info]) => {
    if (!info.hired) return;
    if (G.served % 5 === 0) info.mood = Math.max(10, (info.mood || 100) - 1);
    if (id === 'waiter_a' && G.staff.artist && G.staff.artist.hired)
      info.mood = Math.min(100, (info.mood || 100) + 0.5);
  });
}

export function renderStaff() {
  const chems     = getActiveChemistry();
  const chemPanel = getEl('chemPanel');
  const chemList  = getEl('chemList');

  if (chems.length > 0) {
    chemPanel.style.display = 'block';
    chemList.innerHTML = chems.map(c =>
      `<div class="chem-pair"><span>${c.emoji}</span><span style="font-weight:700">${c.name}</span><span class="chem-bonus">${c.desc}</span></div>`
    ).join('');
  } else {
    chemPanel.style.display = 'none';
  }

  // Bonus summary
  const bonuses = [];
  if (G.staffSpeedBonus  > 0) bonuses.push(`⚡ ความเร็ว +${(G.staffSpeedBonus * 100).toFixed(0)}%`);
  if (G.staffPatBonus    > 0) bonuses.push(`😊 ความอดทน +${(G.staffPatBonus * 100).toFixed(0)}%`);
  if (G.staffIncomeBonus > 0) bonuses.push(`💰 รายได้ +${(G.staffIncomeBonus * 100).toFixed(0)}%`);
  if (G.staffStreakGuard)     bonuses.push('🛡️ Streak Guard');
  if (G.staffOmakaseBonus)   bonuses.push('🍮 Omakase Bonus');
  if (G.staffExtraRating)    bonuses.push('⭐ +1 Rating/เสิร์ฟ');
  if (G.staffRiceDiscount)   bonuses.push('🍚 ข้าวลด 1/จาน');
  if (G.staffSpeedBurst)     bonuses.push('⚡ Speed Burst ทุก 5 เสิร์ฟ');
  if (G.staffPremiumBonus)   bonuses.push('🌟 Premium +30%');
  if (G.staffVipBonus)       bonuses.push('👑 VIP +50%');
  if (G.staffSecretMenu)     bonuses.push('✨ Secret Menu');

  const hiredCnt = Object.values(G.staff || {}).filter(i => i.hired).length;
  getEl('staffBonusSummary').innerHTML = bonuses.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${bonuses.map(b => `<div class="staff-bonus-tag">${b}</div>`).join('')}</div>
       <div style="font-size:10px;color:var(--muted);margin-top:7px">ทีม ${hiredCnt} คน · Chemistry ${chems.length} คู่</div>`
    : '<span style="opacity:.5;font-size:12px">ยังไม่มีทีมงาน → จ้างคนแรกเพื่อเริ่มต้น</span>';

  getEl('staffRoster').innerHTML = STAFF_DATA.map(s => {
    const info    = (G.staff || {})[s.id];
    const hired   = info && info.hired;
    const lv      = (info && info.level) || 0;
    const mood    = (info && info.mood  != null ? info.mood : 100);
    const locked  = s.unlockLv > G.level && !hired;
    const maxed   = lv >= s.levels.length;
    const baseCost = s.levels[0].cost;
    const lvCost  = !maxed ? (G.staffTrainerBonus ? Math.round(s.levels[lv]?.cost * 0.8) : s.levels[lv]?.cost) : 0;
    const moodColor = getMoodColor(mood);
    const moodEmoji = getMoodEmoji(mood);
    const rarityColor = RARITY_COLOR[s.rarity] || 'var(--muted)';
    const hiredChems  = getActiveChemistry().filter(c => c.pair.includes(s.id));

    const skillsHtml = (s.skills || []).map(sk => {
      const owned = ((info && info.skills) || []).includes(sk.id);
      return `<div class="skill-node" onclick="${hired && !owned ? `unlockSkill('${s.id}','${sk.id}')` : ''}" title="${sk.desc}">
        <div class="skill-icon ${owned ? 'unlocked' : hired ? '' : 'locked-sk'}">${sk.emoji}</div>
        <div class="skill-name">${sk.name}</div>
        <div class="skill-cost">${owned ? '✓' : sk.cost + '฿'}</div>
      </div>`;
    }).join('');

    return `<div class="staff-card ${hired?'hired':''} ${locked?'locked':''}">
      <div class="staff-top">
        <div class="staff-avatar">${s.emoji}<div class="staff-mood">${hired ? moodEmoji : ''}</div></div>
        <div class="staff-meta">
          <div class="staff-name" style="color:${rarityColor}">${s.name}${info && info.softKept ? ' <span style="font-size:10px;color:var(--teal)">🔄 prestige</span>' : ''}</div>
          <div class="staff-role">${s.role} <span style="font-size:9px;color:${rarityColor}">[${s.rarity}]</span></div>
          ${hired ? `<div class="staff-lv-badge ${maxed?'maxed':''}">Lv.${lv} ${maxed?'✨MAX':''}</div>` : ''}
          ${hiredChems.length ? `<div style="font-size:10px;color:var(--purple);margin-top:3px">✨ ${hiredChems[0].name}</div>` : ''}
        </div>
      </div>
      <div class="staff-stats-row">
        <div class="sstat"><div class="sstat-icon">⚡</div><div class="sstat-val" style="color:var(--gold)">${s.stats.speed}</div><div class="sstat-lbl">Speed</div></div>
        <div class="sstat"><div class="sstat-icon">😊</div><div class="sstat-val" style="color:var(--teal)">${s.stats.patience}</div><div class="sstat-lbl">Patience</div></div>
        <div class="sstat"><div class="sstat-icon">💰</div><div class="sstat-val" style="color:var(--green)">${s.stats.income}</div><div class="sstat-lbl">Income</div></div>
        ${hired ? `<div class="sstat"><div class="sstat-icon">${moodEmoji}</div><div class="sstat-val" style="color:${moodColor}">${mood}</div><div class="sstat-lbl">Mood</div></div>` : ''}
      </div>
      ${hired ? `<div class="mood-wrap"><div class="mood-lbl"><span>Mood</span><span style="color:${moodColor}">${mood}%</span></div><div class="mood-track"><div class="mood-fill" style="width:${mood}%;background:${moodColor}"></div></div></div>` : ''}
      <div style="margin-bottom:6px"><span class="staff-bonus-tag">${s.baseBonusDesc}</span></div>
      ${hired ? `<div class="skill-tree">${skillsHtml}</div>` : ''}
      <div class="staff-actions">
        ${locked
          ? `<button class="staff-btn dis">🔒 ต้องการ Lv.${s.unlockLv}</button>`
          : !hired
            ? `<button class="staff-btn hire" onclick="hireStaff('${s.id}')">จ้าง ${baseCost.toLocaleString()}฿</button>`
            : maxed
              ? `<button class="staff-btn lvup dis">MAX Level</button>`
              : `<button class="staff-btn lvup" onclick="levelUpStaff('${s.id}')">⬆️ Lv.Up ${lvCost?.toLocaleString()}฿</button>`}
        ${hired && mood < 80 ? `<button class="staff-btn rest" onclick="restStaff('${s.id}')">😴 พัก 100฿</button>` : ''}
        ${hired ? `<button class="staff-btn fire" onclick="fireStaff('${s.id}')">👋</button>` : ''}
      </div>
    </div>`;
  }).join('');

  updateSceneStaff();
}

export function updateSceneStaff() {
  let el    = getEl('sceneStaff');
  const resto = getEl('restoCard');
  if (!resto) return;
  if (!el) {
    el = document.createElement('div');
    el.id        = 'sceneStaff';
    el.className = 'scene-staff';
    resto.appendChild(el);
  }
  const hired = STAFF_DATA.filter(s => (G.staff || {})[s.id] && (G.staff || {})[s.id].hired);
  if (!hired.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = hired.map(s => {
    const m = (G.staff[s.id] && G.staff[s.id].mood) || 100;
    return `<div class="ss-chip" title="${s.name}">${s.emoji}${getMoodEmoji(m)}</div>`;
  }).join('');
}
