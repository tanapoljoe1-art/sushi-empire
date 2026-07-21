// ── Kitchen scene (chef / plate / steam) ──────────────────────────────────────
// Isolated on purpose: these are the only visuals the "make it 3D later" goal
// touches (a chef character, a plate, steam). Everything else in the game
// (menu grid, staff cards, quest lists, the cook-progress ring/HUD) stays 2D
// HTML/CSS forever. When a Three.js scene replaces the chef/plate DOM elements,
// only this file changes — every call site elsewhere stays identical.
import { getEl } from '../core/dom.js';

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
