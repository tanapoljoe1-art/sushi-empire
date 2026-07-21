// ── Core UI rendering ─────────────────────────────────────────────────────────
import { G, save, BAL } from '../core/state.js';
import { MENUS, INGREDIENTS, UPGRADES, BRANCHES, EVENTS } from '../data.js';
import { activeEvent } from '../core/effects.js';
import { getEl } from '../core/dom.js';
import { hasIngredients, ingredientCost } from '../systems/game.js';
import { updateNavDots } from '../systems/nav.js';

export function toast(msg) {
  const t = getEl('toast');
  t.innerText = msg;
  t.classList.add('vis');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('vis'), 2400);
}

export function spawnFE(txt, bad = false) {
  const p  = getEl('restoCard');
  const el = document.createElement('div');
  el.className  = 'fe';
  el.innerText  = txt;
  el.style.color = bad ? 'var(--red)' : 'var(--gold)';
  el.style.left  = (28 + Math.random() * 44) + '%';
  el.style.top   = (20 + Math.random() * 32) + '%';
  el.style.textShadow = bad
    ? '0 2px 7px rgba(255,77,109,.5)'
    : '0 2px 7px rgba(232,196,106,.5)';
  p.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

export function updateUI() {
  getEl('money').innerText   = G.money.toLocaleString();
  getEl('rating').innerText  = G.rating;
  getEl('prestige').innerText= G.prestigeLevel;
  getEl('rval').innerText    = G.rating;
  getEl('lvlDisplay').innerText = G.level;
  getEl('bfill').style.width = G.rating + '%';
  getEl('sbadge').innerText  = G.streak >= 5 ? '🔥 Streak x' + G.streak : '';
  getEl('prestbadge').style.display = G.prestigeLevel > 0 ? '' : 'none';
  getEl('idleBadge').style.display  = G.autoChef ? 'flex' : 'none';

  const br = BRANCHES.find(b => b.id === G.activeBranch);
  getEl('branchName').innerText = br ? br.name : 'หลัก';
  getEl('rhRwd').innerText = 'รางวัล: +' + (200 + G.level * 25) + '฿';

  renderMenu();
  updateNavDots();
}

export function renderMenu() {
  const br = BRANCHES.find(b => b.id === G.activeBranch);
  getEl('menuGrid').innerHTML = MENUS.map(m => {
    const locked  = m.unlockLv > G.level;
    const sel     = m.id === G.menu;
    const earn    = Math.round(m.price * G.level * (br ? br.mult : 1) * G.prestigeIncomeMult);
    const hasIng  = hasIngredients(m.id);
    const ingList = Object.entries(m.ing).map(([k,v]) => `${INGREDIENTS[k].emoji}×${v}`).join(' ');
    return `<div class="mi ${locked?'lck':''} ${sel?'sel':''}" onclick="${locked ? '' : `selMenu('${m.id}')`}">
      ${sel ? '<div class="mi-sb">✓</div>' : ''}
      <div class="mi-e">${m.emoji}</div>
      <div class="mi-n">${m.name}</div>
      ${locked
        ? `<div class="mi-u">🔒 Lv.${m.unlockLv}</div>`
        : `<div class="mi-p">+${earn}฿</div>
           <div class="mi-ing ${!hasIng && sel ? 'low' : ''}">${ingList}</div>`}
    </div>`;
  }).join('');
}

export function selMenu(id) {
  G.menu = id;
  G.streak = 0;
  renderMenu();
  renderIngredients();
  updateEarnPreview();
  save();
}

export function renderUpgrades() {
  getEl('upgList').innerHTML = UPGRADES.map(u => {
    const lv     = G.up[u.id];
    const mx     = lv >= u.max;
    const cost   = mx ? 0 : BAL.upgradeCost(u.base, lv);
    const afford = G.money >= cost;
    const dots   = Array.from({length: u.max}, (_, i) =>
      `<div class="ud ${i < lv ? 'on' : ''}"></div>`).join('');
    const pct = mx ? 100 : Math.min(100, Math.round(G.money / cost * 100));
    return `<div class="uc ${mx?'mx':''} ${!afford&&!mx?'locked-uc':''}" onclick="buyUpgrade('${u.id}')">
      <div class="uc-ico">${u.emoji}</div>
      <div class="uc-inf">
        <div class="uc-nm">${u.name} <span style="font-size:10px;opacity:.5">Lv.${lv}/${u.max}</span></div>
        <div class="uc-dc">${u.desc}</div>
        <div class="uc-dots">${dots}</div>
        ${!mx ? `<div style="height:2px;background:rgba(255,255,255,.06);border-radius:1px;margin-top:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${afford?'var(--gold)':'rgba(255,77,109,.5)'};border-radius:1px;transition:width .4s"></div>
        </div>` : ''}
      </div>
      <div class="uc-r">
        ${mx
          ? `<div class="uc-cost" style="color:var(--gold)">✨ MAX</div>`
          : `<div class="uc-cost" style="color:${afford?'var(--gold)':'var(--muted)'}">${cost.toLocaleString()}฿</div>
             <div class="uc-lbl" style="color:${afford?'var(--teal)':'var(--muted)'}">${afford?'ซื้อ!':'ยังขาด'}</div>`}
      </div>
    </div>`;
  }).join('');
}

export function renderIngredients() {
  const m       = MENUS.find(x => x.id === G.menu);
  const needed  = m ? m.ing : {};
  getEl('ingRow').innerHTML = Object.entries(INGREDIENTS).map(([id, ing]) => {
    const have   = G.ing[id] || 0;
    const need   = needed[id] || 0;
    const enough = need > 0 ? have >= need : true;
    const cls    = need > 0 ? (enough ? 'enough' : 'low') : '';
    const price  = ingredientCost(id);
    return `<div class="ing-chip ${cls}" onclick="buyIngredient('${id}')">
      ${ing.emoji} <span>${have}</span>
      <span style="opacity:.5;font-size:9px">+${ing.buyAmt} / ${price}฿</span>
    </div>`;
  }).join('');
}

export function updateEarnPreview() {
  const el = getEl('earnPreview');
  if (!el) return;
  const m  = MENUS.find(x => x.id === G.menu);
  if (!m) { el.innerText = ''; return; }
  const br = BRANCHES.find(b => b.id === G.activeBranch);
  const ev = activeEvent(G, EVENTS);
  let earn = Math.round(
    m.price * G.level * (br ? br.mult : 1) * G.prestigeIncomeMult
    * (1 + (G.staffIncomeBonus || 0)) * (1 + (G.decoIncomeBonus || 0))
    * BAL.incomeLvMult(G.level)
  );
  if (G.staffOmakaseBonus && m.id === 'omakase') earn = Math.round(earn * 1.5);
  if (ev?.earnMult) earn = Math.round(earn * ev.earnMult);
  const streakTag = G.streak >= 5 ? ' 🔥' : '';
  el.innerText = `+${earn.toLocaleString()}฿${streakTag}`;
}
