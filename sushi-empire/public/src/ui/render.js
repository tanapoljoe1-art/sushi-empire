// ── Core UI rendering ─────────────────────────────────────────────────────────
import { G, save, BAL } from '../core/state.js';
import { MENUS, INGREDIENTS, UPGRADES, BRANCHES, UPGRADE_TREES } from '../data.js';
import { getEl } from '../core/dom.js';
import { hasIngredients, ingredientCost, calcServeEarn, effectiveIng } from '../systems/game.js';
import { updateNavDots } from '../systems/nav.js';
import { refreshUnlockUI } from '../systems/unlocks.js';
import { renderDailySpecialBanner, isDailySpecial, ensureDailySpecial } from '../systems/daily.js';
import { ensureFishMarket, marketTag, renderMarketBanner } from '../systems/market.js';
import { renderSeasonBanner } from '../systems/season.js';
import { updateKitchenTheme } from './kitchen-scene.js';

/** Dot indicator for the Daily Special / Season / Market swipeable strip. */
export function initInfoCarousel() {
  const el = getEl('infoCarousel');
  const dots = getEl('infoDots');
  if (!el || !dots) return;
  dots.innerHTML = Array.from(el.children, () => '<span class="info-dot"></span>').join('');
  const dotEls = [...dots.children];
  const update = () => {
    const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    dotEls.forEach((d, i) => d.classList.toggle('on', i === idx));
  };
  update();
  el.addEventListener('scroll', () => {
    clearTimeout(el._dotTimer);
    el._dotTimer = setTimeout(update, 80);
  }, { passive: true });
}

/** Toast with dedupe + short queue so event spam doesn't flash unreadable. */
const _toastQ = [];
let _toastBusy = false;
let _lastToastMsg = '';
let _lastToastAt = 0;

export function toast(msg) {
  if (!msg) return;
  const now = Date.now();
  // Dedupe identical toast within 1.2s
  if (msg === _lastToastMsg && now - _lastToastAt < 1200) return;
  // Drop if queue is already stacked (keep newest 2)
  if (_toastQ.length >= 2) _toastQ.shift();
  _toastQ.push(String(msg));
  try { import('../systems/telemetry.js').then(m => m.tel('toast')).catch(() => {}); } catch (_) {}
  if (!_toastBusy) _drainToast();
}

function _drainToast() {
  const t = getEl('toast');
  if (!t || !_toastQ.length) {
    _toastBusy = false;
    return;
  }
  _toastBusy = true;
  const msg = _toastQ.shift();
  _lastToastMsg = msg;
  _lastToastAt = Date.now();
  t.innerText = msg;
  t.classList.add('vis');
  clearTimeout(t._t);
  const hold = msg.length > 28 ? 2800 : 2000;
  t._t = setTimeout(() => {
    t.classList.remove('vis');
    // brief gap before next
    setTimeout(_drainToast, 180);
  }, hold);
}

/** Light haptic (mobile) — no-op if unsupported or reduce-motion. */
export function haptic(ms = 12) {
  try {
    if (document.documentElement.classList.contains('reduce-motion')) return;
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (_) {}
}

export function spawnFE(txt, bad = false) {
  const p  = getEl('restoCard');
  if (!p) return;
  // Cap concurrent floaters so rush/serve spam doesn't bury the kitchen
  const existing = p.querySelectorAll('.fe');
  if (existing.length >= 6) existing[0].remove();
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
  const rh = getEl('rhRwd');
  if (rh) rh.innerText = 'รางวัล: +' + (200 + G.level * 25) + '฿';

  updateBpmHud();
  ensureDailySpecial();
  renderDailySpecialBanner();
  ensureFishMarket();
  renderMarketBanner();
  renderSeasonBanner();
  updateKitchenTheme(G);
  renderMenu();
  updateNavDots();
  refreshUnlockUI();
}

/** Estimated ฿/min: branch idle + theoretical cook rate on current menu. */
export function calcBahtPerMin() {
  let idlePerMin = 0;
  let idleM = (G.idleMult || 1) * (G.goldenBonus || 1);
  if (G.decoIdleBonus) idleM *= 2;
  (G.branches || []).forEach(b => {
    if (b.owned && b.id !== G.activeBranch) {
      const bd = BRANCHES.find(x => x.id === b.id);
      if (bd) idlePerMin += bd.idleRate * idleM;
    }
  });

  const m = MENUS.find(x => x.id === G.menu);
  if (!m) return Math.round(idlePerMin);

  const front = (G.queue || []).find(c => c.state !== 'gone');
  const orderMatch = front?.wantedMenuId ? front.wantedMenuId === G.menu : null;
  const { earn } = calcServeEarn(G.menu, {
    orderMatch,
    isVipServe: front?.state === 'vip',
    custEarnMult: front?.earnMult || 1,
  });
  const spd = (G.speedMult || 1) + (G.prestigeSpeedBonus || 0) + (G.staffSpeedBonus || 0) + (G.shopSpeedBonus || 0);
  const cookSec = (m.time / 1000) / Math.max(0.1, spd);
  const serveGap = (G.autoServe || G.autoChef) ? 0.7 : 1.4;
  const cycleSec = cookSec + serveGap;
  const activePerMin = cycleSec > 0 ? (earn / cycleSec) * 60 : 0;
  // If not auto, assume player is active ~70% of the time for estimate
  const activeFactor = G.autoChef ? 1 : 0.7;
  return Math.round(idlePerMin + activePerMin * activeFactor);
}

export function updateBpmHud() {
  const el = getEl('bpmTxt');
  if (!el) return;
  const bpm = calcBahtPerMin();
  el.innerText = bpm >= 1000 ? (bpm / 1000).toFixed(1) + 'k' : String(bpm);
}

export function renderMenu() {
  getEl('menuGrid').innerHTML = MENUS.map(m => {
    // Secret menus (Omakase EX) only show when skill unlocked
    if (m.secret && !G.staffSecretMenu) return '';
    const locked  = m.unlockLv > G.level;
    const sel     = m.id === G.menu;
    const { earn } = calcServeEarn(m.id, {});
    const hasIng  = hasIngredients(m.id);
    const need    = effectiveIng(m.id);
    const ingList = Object.entries(need).map(([k,v]) => `${INGREDIENTS[k]?.emoji || '?'}×${v}`).join(' ');
    const secretTag = m.secret ? ' <span style="font-size:9px;color:var(--gold)">SECRET</span>' : '';
    const special = !locked && isDailySpecial(m.id);
    return `<div class="mi ${locked?'lck':''} ${sel?'sel':''} ${special?'daily-sp':''}" onclick="${locked ? '' : `selMenu('${m.id}')`}">
      ${sel ? '<div class="mi-sb">✓</div>' : ''}
      ${special ? '<div class="mi-sp">⭐</div>' : ''}
      <div class="mi-e">${m.emoji}</div>
      <div class="mi-n">${m.name}${secretTag}${special ? ' ·SP' : ''}</div>
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
  const filter = G.upgTreeFilter || 'all';
  const tabs = getEl('upgTreeTabs');
  if (tabs) {
    const allOn = filter === 'all' ? 'on' : '';
    tabs.innerHTML = `
      <button type="button" class="upg-tab ${allOn}" onclick="setUpgTreeFilter('all')">ทั้งหมด</button>
      ${Object.entries(UPGRADE_TREES).map(([id, t]) =>
        `<button type="button" class="upg-tab ${filter === id ? 'on' : ''}" onclick="setUpgTreeFilter('${id}')">${t.emoji} ${t.name}</button>`
      ).join('')}
      <button type="button" class="upg-tab respec" onclick="respecUpgrades()">🔄 Respec</button>
    `;
  }
  const list = UPGRADES.filter(u => filter === 'all' || u.tree === filter);
  getEl('upgList').innerHTML = list.map(u => {
    if (G.up[u.id] == null) G.up[u.id] = 0;
    const lv     = G.up[u.id];
    const mx     = lv >= u.max;
    const cost   = mx ? 0 : BAL.upgradeCost(u.base, lv);
    const afford = G.money >= cost;
    const reqOk  = !u.require || (G.up[u.require.id] || 0) >= (u.require.min || 1);
    const tree   = UPGRADE_TREES[u.tree];
    const dots   = Array.from({length: u.max}, (_, i) =>
      `<div class="ud ${i < lv ? 'on' : ''}"></div>`).join('');
    const pct = mx ? 100 : Math.min(100, Math.round(G.money / Math.max(1, cost) * 100));
    const reqTxt = u.require && !reqOk
      ? `🔒 ต้อง ${u.require.id} Lv.${u.require.min}`
      : '';
    return `<div class="uc ${mx?'mx':''} ${(!afford||!reqOk)&&!mx?'locked-uc':''}" onclick="buyUpgrade('${u.id}')">
      <div class="uc-ico">${u.emoji}</div>
      <div class="uc-inf">
        <div class="uc-nm">${u.name} <span style="font-size:10px;opacity:.5">Lv.${lv}/${u.max}</span>
          ${tree ? `<span class="uc-tree">${tree.emoji}</span>` : ''}</div>
        <div class="uc-dc">${u.desc}${reqTxt ? ' · ' + reqTxt : ''}</div>
        <div class="uc-dots">${dots}</div>
        ${!mx ? `<div style="height:2px;background:rgba(255,255,255,.06);border-radius:1px;margin-top:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${afford&&reqOk?'var(--gold)':'rgba(255,77,109,.5)'};border-radius:1px;transition:width .4s"></div>
        </div>` : ''}
      </div>
      <div class="uc-r">
        ${mx
          ? `<div class="uc-cost" style="color:var(--gold)">✨ MAX</div>`
          : `<div class="uc-cost" style="color:${afford&&reqOk?'var(--gold)':'var(--muted)'}">${cost.toLocaleString()}฿</div>
             <div class="uc-lbl" style="color:${afford&&reqOk?'var(--teal)':'var(--muted)'}">${!reqOk?'ล็อก':afford?'ซื้อ!':'ยังขาด'}</div>`}
      </div>
    </div>`;
  }).join('');
}

export function renderIngredients() {
  ensureFishMarket();
  const m       = MENUS.find(x => x.id === G.menu);
  const needed  = m ? effectiveIng(m.id) : {};
  getEl('ingRow').innerHTML = Object.entries(INGREDIENTS).map(([id, ing]) => {
    const have   = G.ing[id] || 0;
    const need   = needed[id] || 0;
    const enough = need > 0 ? have >= need : true;
    const tag    = marketTag(id);
    const cls    = (need > 0 ? (enough ? 'enough' : 'low') : '') + (tag.cls ? ' mk-' + tag.cls : '');
    const price  = ingredientCost(id);
    const tagHtml = tag.label ? `<span class="mk-pill ${tag.cls}">${tag.label}</span>` : '';
    return `<div class="ing-chip ${cls}" onclick="buyIngredient('${id}')">
      ${ing.emoji} <span>${have}</span>
      <span style="opacity:.5;font-size:9px">+${ing.buyAmt} / ${price}฿</span>
      ${tagHtml}
    </div>`;
  }).join('');
}

export function updateEarnPreview() {
  const el = getEl('earnPreview');
  const bd = getEl('earnBreakdown');
  if (!el) return;
  const m  = MENUS.find(x => x.id === G.menu);
  if (!m) { el.innerText = ''; if (bd) bd.innerText = ''; return; }
  const front = (G.queue || []).find(c => c.state !== 'gone');
  const orderMatch = front?.wantedMenuId ? front.wantedMenuId === G.menu : null;
  const { earn } = calcServeEarn(G.menu, {
    orderMatch,
    isVipServe: front?.state === 'vip',
    custEarnMult: front?.earnMult || 1,
  });
  const streakTag = G.streak >= 5 ? ' 🔥' : '';
  const orderTag  = orderMatch === true ? ' ✓' : orderMatch === false ? ' ✗' : '';
  const goldTag   = (G.goldenBonus || 1) > 1 ? ' 🏆' : '';
  el.innerText = `+${earn.toLocaleString()}฿${streakTag}${orderTag}${goldTag}`;

  if (bd) {
    const parts = [];
    parts.push(`ฐาน ${m.price}`);
    parts.push(`×Lv${G.level}`);
    if ((G.goldenBonus || 1) > 1) parts.push(`🏆x${(G.goldenBonus || 1).toFixed(1)}`);
    if ((G.staffIncomeBonus || 0) > 0) parts.push(`ทีม+${Math.round(G.staffIncomeBonus * 100)}%`);
    if ((G.decoIncomeBonus || 0) > 0) parts.push(`ตกแต่ง+${Math.round(G.decoIncomeBonus * 100)}%`);
    if (orderMatch === true) parts.push('ออเดอร์✓');
    if (orderMatch === false) parts.push('ออเดอร์✗');
    if (front?.ctype && front.ctype !== 'regular') parts.push(front.typeBadge || front.ctype);
    if (G.streak >= 5) parts.push(`streak${G.streak}`);
    if (isDailySpecial(G.menu)) parts.push('⭐Special');
    const br = BRANCHES.find(b => b.id === G.activeBranch);
    if (br?.spec?.label) parts.push(br.spec.label);
    bd.innerText = parts.join(' · ');
  }
  updateBpmHud();
}
