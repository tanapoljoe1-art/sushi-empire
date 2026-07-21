// ── Prestige title / shell skins ──────────────────────────────────────────────
import { getEl } from '../core/dom.js';

/** Visual tiers unlock with prestigeLevel */
export const PRESTIGE_SKINS = [
  { min: 0, id: 'fresh',   emoji: '🍣', title: 'SUSHI EMPIRE',     sub: 'すし帝国', tag: 'จากร้านเล็ก สู่อาณาจักรซูชิ', cls: 'skin-fresh' },
  { min: 1, id: 'bronze',  emoji: '🥉', title: 'SUSHI EMPIRE',     sub: 'すし帝国 · I', tag: 'รอบแรกของตำนาน', cls: 'skin-bronze' },
  { min: 2, id: 'silver',  emoji: '🥈', title: 'SUSHI DYNASTY',    sub: '王朝', tag: 'ราชวงศ์ซูชิ', cls: 'skin-silver' },
  { min: 3, id: 'gold',    emoji: '🥇', title: 'GOLDEN SUSHI',     sub: '黄金の寿司', tag: 'ครัวทองคำ', cls: 'skin-gold' },
  { min: 5, id: 'jade',    emoji: '🏯', title: 'IMPERIAL SUSHI',   sub: '帝国', tag: 'จักรพรรดิแห่งซูชิ', cls: 'skin-jade' },
  { min: 8, id: 'void',    emoji: '🌌', title: 'VOID OMAKASE',     sub: '虚空', tag: 'อวกาศแห่งรสชาติ', cls: 'skin-void' },
];

export function getPrestigeSkin(prestigeLevel = 0) {
  let skin = PRESTIGE_SKINS[0];
  for (const s of PRESTIGE_SKINS) {
    if (prestigeLevel >= s.min) skin = s;
  }
  return skin;
}

/** Apply skin classes to title screen + optional in-game shell */
export function applyPrestigeSkin(prestigeLevel = 0) {
  const skin = getPrestigeSkin(prestigeLevel);
  const ts = getEl('titleScreen');
  if (ts) {
    PRESTIGE_SKINS.forEach(s => ts.classList.remove(s.cls));
    ts.classList.add(skin.cls);
    const emoji = ts.querySelector('.ts-emoji');
    const title = ts.querySelector('.ts-title');
    const sub = ts.querySelector('.ts-sub');
    const tag = ts.querySelector('.ts-tagline');
    if (emoji) emoji.innerText = skin.emoji;
    if (title) title.innerText = skin.title;
    if (sub) sub.innerText = skin.sub;
    if (tag) tag.innerText = skin.tag;
  }
  // Shell accent for in-game
  const shell = document.querySelector('.shell');
  if (shell) {
    PRESTIGE_SKINS.forEach(s => shell.classList.remove(s.cls));
    shell.classList.add(skin.cls);
  }
  const logo = document.querySelector('.logo, #logoText');
  if (logo && prestigeLevel > 0) {
    logo.dataset.skin = skin.id;
  }
  return skin;
}
