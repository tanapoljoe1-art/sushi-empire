// ── Kitchen scene (chef / plate / steam) ──────────────────────────────────────
// Isolated on purpose: these are the only visuals the "make it 3D later" goal
// touches (a chef character, a plate, steam). Everything else in the game
// (menu grid, staff cards, quest lists, the cook-progress ring/HUD) stays 2D
// HTML/CSS forever. When a Three.js scene replaces the chef/plate DOM elements,
// only this file changes — every call site elsewhere stays identical.
import { getEl } from '../core/dom.js';

const BRANCH_THEME = {
  main:    { bg: 'radial-gradient(ellipse at 50% 0%, rgba(232,196,106,.12), transparent 55%), linear-gradient(180deg, rgba(20,18,30,.4), transparent)', chef: '👨‍🍳', accent: 'rgba(232,196,106,.2)' },
  mall:    { bg: 'radial-gradient(ellipse at 30% 20%, rgba(167,139,250,.18), transparent 50%), linear-gradient(180deg, rgba(30,20,40,.5), transparent)', chef: '🧑‍🍳', accent: 'rgba(167,139,250,.25)' },
  beach:   { bg: 'radial-gradient(ellipse at 70% 10%, rgba(56,189,248,.22), transparent 55%), linear-gradient(180deg, rgba(10,40,50,.45), transparent)', chef: '🏄‍♂️', accent: 'rgba(56,189,248,.25)' },
  airport: { bg: 'radial-gradient(ellipse at 50% 0%, rgba(148,163,184,.2), transparent 50%), linear-gradient(180deg, rgba(15,20,30,.55), transparent)', chef: '👨‍✈️', accent: 'rgba(148,163,184,.25)' },
  tokyo:   { bg: 'radial-gradient(ellipse at 40% 0%, rgba(244,63,94,.18), transparent 50%), linear-gradient(180deg, rgba(30,10,20,.5), transparent)', chef: '👘', accent: 'rgba(244,63,94,.22)' },
  paris:   { bg: 'radial-gradient(ellipse at 50% 10%, rgba(192,132,252,.2), transparent 55%), linear-gradient(180deg, rgba(25,15,35,.5), transparent)', chef: '🥖', accent: 'rgba(192,132,252,.25)' },
  dubai:   { bg: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,.22), transparent 55%), linear-gradient(180deg, rgba(40,25,5,.5), transparent)', chef: '🤵', accent: 'rgba(251,191,36,.28)' },
  space:   { bg: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,.25), transparent 60%), linear-gradient(180deg, rgba(5,5,20,.7), transparent)', chef: '🧑‍🚀', accent: 'rgba(99,102,241,.3)' },
};

/** Tint resto card + chef by branch / autoChef. Call from updateUI or switchBranch. */
export function updateKitchenTheme(G) {
  const resto = getEl('restoCard');
  const chef  = getEl('chefEmoji');
  if (!resto) return;
  const id = (G && G.activeBranch) || 'main';
  const theme = BRANCH_THEME[id] || BRANCH_THEME.main;
  resto.dataset.branch = id;
  resto.style.setProperty('--kitchen-bg', theme.bg);
  resto.style.setProperty('--kitchen-accent', theme.accent);
  resto.classList.add('kitchen-themed');
  if (chef && !chef.classList.contains('cooking')) {
    if (G && G.autoChef) chef.innerText = '🤖';
    else chef.innerText = theme.chef;
  }
  // Mood: average staff mood tints glow
  let mood = 100;
  if (G && G.staff) {
    const hired = Object.values(G.staff).filter(s => s && s.hired);
    if (hired.length) {
      mood = hired.reduce((a, s) => a + (s.mood ?? 100), 0) / hired.length;
    }
  }
  resto.dataset.mood = mood >= 70 ? 'good' : mood >= 40 ? 'ok' : 'low';
}

export function showCooking() {
  getEl('chefEmoji').classList.add('cooking');
  getEl('chefGlow').className = 'chefglow on';
  getEl('plateEmoji').innerText = '⏳';
  getEl('plateWrap').classList.remove('lit');
}

export function showPlateReady(emoji) {
  getEl('chefEmoji').classList.remove('cooking');
  getEl('chefGlow').className = 'chefglow off';
  getEl('plateEmoji').innerText = emoji;
  getEl('plateWrap').classList.add('lit', 'pop');
  setTimeout(() => getEl('plateWrap').classList.remove('pop'), 500);
  spawnSteam();
}

export function resetPlate() {
  getEl('chefEmoji').classList.remove('cooking');
  getEl('chefGlow').className = 'chefglow off';
  getEl('plateEmoji').innerText = '🍽️';
  getEl('plateWrap').classList.remove('lit');
}

export function spawnSteam() {
  const el = getEl('steamEl');
  el.style.cssText = 'position:absolute;left:50%;top:28px;pointer-events:none;z-index:3;';
  el.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const s  = document.createElement('span');
    const dx = (Math.random() * 18 - 9).toFixed(1);
    s.style.cssText = `--d:${1.5+i*.4}s;--dl:${i*.3}s;--dx:${dx}px;left:${(i-1.5)*7}px;font-size:9px;`;
    s.innerText = '〰';
    s.style.color = 'rgba(255,255,255,0.10)';
    el.appendChild(s);
  }
}
