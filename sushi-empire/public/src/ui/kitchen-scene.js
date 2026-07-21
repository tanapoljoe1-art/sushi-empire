// ── Kitchen scene (2D theme + optional Three.js layer) ────────────────────────
// Public API is stable: showCooking / showPlateReady / resetPlate / spawnSteam /
// updateKitchenTheme. Three.js only lives in this file.
import { getEl } from '../core/dom.js';

const BRANCH_THEME = {
  main:    { bg: 'radial-gradient(ellipse at 50% 0%, rgba(232,196,106,.12), transparent 55%), linear-gradient(180deg, rgba(20,18,30,.4), transparent)', chef: '👨‍🍳', accent: 'rgba(232,196,106,.2)', color: 0xc8962a },
  mall:    { bg: 'radial-gradient(ellipse at 30% 20%, rgba(167,139,250,.18), transparent 50%), linear-gradient(180deg, rgba(30,20,40,.5), transparent)', chef: '🧑‍🍳', accent: 'rgba(167,139,250,.25)', color: 0xa78bfa },
  beach:   { bg: 'radial-gradient(ellipse at 70% 10%, rgba(56,189,248,.22), transparent 55%), linear-gradient(180deg, rgba(10,40,50,.45), transparent)', chef: '🏄‍♂️', accent: 'rgba(56,189,248,.25)', color: 0x38bdf8 },
  airport: { bg: 'radial-gradient(ellipse at 50% 0%, rgba(148,163,184,.2), transparent 50%), linear-gradient(180deg, rgba(15,20,30,.55), transparent)', chef: '👨‍✈️', accent: 'rgba(148,163,184,.25)', color: 0x94a3b8 },
  tokyo:   { bg: 'radial-gradient(ellipse at 40% 0%, rgba(244,63,94,.18), transparent 50%), linear-gradient(180deg, rgba(30,10,20,.5), transparent)', chef: '👘', accent: 'rgba(244,63,94,.22)', color: 0xf43f5e },
  paris:   { bg: 'radial-gradient(ellipse at 50% 10%, rgba(192,132,252,.2), transparent 55%), linear-gradient(180deg, rgba(25,15,35,.5), transparent)', chef: '🥖', accent: 'rgba(192,132,252,.25)', color: 0xc084fc },
  dubai:   { bg: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,.22), transparent 55%), linear-gradient(180deg, rgba(40,25,5,.5), transparent)', chef: '🤵', accent: 'rgba(251,191,36,.28)', color: 0xfbbf24 },
  space:   { bg: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,.25), transparent 60%), linear-gradient(180deg, rgba(5,5,20,.7), transparent)', chef: '🧑‍🚀', accent: 'rgba(99,102,241,.3)', color: 0x6366f1 },
};

// ── Three.js state ────────────────────────────────────────────────────────────
let THREE = null;
let thr = null; // { scene, camera, renderer, chef, plate, steam, counter, light, clock, anim }
let thrReady = false;
let thrCooking = false;
let thrPlateEmoji = '🍽️';
let thrBranchColor = 0xc8962a;

async function ensureThree() {
  if (thrReady) return true;
  if (thr === 'failed') return false;
  try {
    THREE = await import('three');
    const host = getEl('kitchen3d');
    if (!host) { thr = 'failed'; return false; }

    const w = host.clientWidth || 120;
    const h = host.clientHeight || 100;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
    camera.position.set(0, 1.35, 3.2);
    camera.lookAt(0, 0.55, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    host.innerHTML = '';
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Counter
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.18, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.7, metalness: 0.15 })
    );
    counter.position.set(0, 0.05, 0.15);
    scene.add(counter);

    // Counter top edge gold
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 0.04, 1.15),
      new THREE.MeshStandardMaterial({ color: thrBranchColor, roughness: 0.4, metalness: 0.5 })
    );
    trim.position.set(0, 0.16, 0.15);
    scene.add(trim);

    // Chef body (capsule-like)
    const chefGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.45, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.55 })
    );
    body.position.y = 0.85;
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    hat.position.y = 1.35;
    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.05, 8, 16),
      new THREE.MeshStandardMaterial({ color: thrBranchColor, roughness: 0.5 })
    );
    scarf.position.y = 1.05;
    scarf.rotation.x = Math.PI / 2;
    chefGroup.add(body, hat, scarf);
    chefGroup.position.set(-0.55, 0.1, 0.1);
    scene.add(chefGroup);

    // Plate
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.35, metalness: 0.1 })
    );
    plate.position.set(0.55, 0.22, 0.25);
    scene.add(plate);

    // Sushi blob on plate (hidden until ready)
    const sushi = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.45 })
    );
    sushi.position.set(0.55, 0.38, 0.25);
    sushi.scale.set(1, 0.55, 1);
    sushi.visible = false;
    scene.add(sushi);

    // Steam particles
    const steamGeo = new THREE.BufferGeometry();
    const N = 24;
    const positions = new Float32Array(N * 3);
    const phases = [];
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      phases.push(Math.random() * Math.PI * 2);
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.25, depthAttenuation: true,
    });
    const steam = new THREE.Points(steamGeo, steamMat);
    steam.position.set(0.55, 0.45, 0.25);
    steam.visible = false;
    scene.add(steam);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.PointLight(thrBranchColor, 1.2, 8);
    key.position.set(1.2, 2.2, 1.5);
    const fill = new THREE.DirectionalLight(0xffe6c0, 0.45);
    fill.position.set(-2, 3, 2);
    scene.add(amb, key, fill);

    // Back wall glow
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x0e0e1a, transparent: true, opacity: 0.35 })
    );
    wall.position.set(0, 1.0, -0.6);
    scene.add(wall);

    thr = {
      scene, camera, renderer, chef: chefGroup, plate, sushi, steam, steamPhases: phases,
      trim, key, clock: new THREE.Clock(), host, cooking: false,
      baseFov: 42, baseZ: 3.2, punchUntil: 0, punchDur: 280,
    };
    thrReady = true;
    host.classList.add('on');
    // Hide 2D chef emoji when 3D is live (plate text still used as label)
    const emoji = getEl('chefEmoji');
    if (emoji) emoji.style.opacity = '0.15';

    const loop = () => {
      if (!thrReady || !thr || thr === 'failed') return;
      thr.anim = requestAnimationFrame(loop);
      const t = thr.clock.getElapsedTime();
      // Chef idle rock / cook shake
      if (thr.cooking) {
        thr.chef.rotation.z = Math.sin(t * 12) * 0.12;
        thr.chef.position.y = 0.1 + Math.abs(Math.sin(t * 14)) * 0.04;
      } else {
        thr.chef.rotation.z = Math.sin(t * 1.6) * 0.04;
        thr.chef.position.y = 0.1 + Math.sin(t * 2) * 0.02;
      }
      // Steam rise
      if (thr.steam.visible) {
        const pos = thr.steam.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + 0.008 + (i % 3) * 0.001;
          if (y > 0.9) y = 0;
          pos.setY(i, y);
          pos.setX(i, Math.sin(t * 2 + thr.steamPhases[i]) * 0.12);
        }
        pos.needsUpdate = true;
      }
      // Plate bob when lit
      if (thr.sushi.visible) {
        thr.sushi.position.y = 0.38 + Math.sin(t * 4) * 0.02;
        thr.sushi.rotation.y = t * 0.8;
      }
      // Perfect camera punch / FOV ease-back
      if (thr.punchUntil && thr.camera) {
        const left = thr.punchUntil - performance.now();
        if (left <= 0) {
          thr.camera.fov = thr.baseFov || 42;
          thr.camera.position.z = thr.baseZ ?? 3.2;
          thr.punchUntil = 0;
        } else {
          const k = left / (thr.punchDur || 280);
          thr.camera.fov = (thr.baseFov || 42) - 4 * k;
          thr.camera.position.z = (thr.baseZ ?? 3.2) - 0.18 * k;
        }
        thr.camera.updateProjectionMatrix();
      }
      thr.renderer.render(thr.scene, thr.camera);
    };
    loop();

    // Resize
    const ro = new ResizeObserver(() => {
      if (!thr || thr === 'failed') return;
      const nw = thr.host.clientWidth || 120;
      const nh = thr.host.clientHeight || 100;
      thr.camera.aspect = nw / Math.max(1, nh);
      thr.camera.updateProjectionMatrix();
      thr.renderer.setSize(nw, nh, false);
    });
    ro.observe(host);
    return true;
  } catch (e) {
    console.warn('Three.js kitchen unavailable', e);
    thr = 'failed';
    thrReady = false;
    return false;
  }
}

function setBranchColor(hex) {
  thrBranchColor = hex;
  if (thr && thr !== 'failed') {
    if (thr.trim?.material) thr.trim.material.color.setHex(hex);
    if (thr.key) thr.key.color.setHex(hex);
    const scarf = thr.chef?.children?.find?.(c => c.geometry?.type === 'TorusGeometry');
    if (scarf?.material) scarf.material.color.setHex(hex);
  }
}

/** Tint resto card + chef by branch / autoChef. Also boots Three.js once. */
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
  if (chef && !chef.classList.contains('cooking') && !thrReady) {
    if (G && G.autoChef) chef.innerText = '🤖';
    else chef.innerText = theme.chef;
  }
  let mood = 100;
  if (G && G.staff) {
    const hired = Object.values(G.staff).filter(s => s && s.hired);
    if (hired.length) mood = hired.reduce((a, s) => a + (s.mood ?? 100), 0) / hired.length;
  }
  resto.dataset.mood = mood >= 70 ? 'good' : mood >= 40 ? 'ok' : 'low';

  // Decoration → kitchen visual (emoji strip + tint)
  const slots = (G && G.deco && G.deco.slots) || {};
  const eq = ['wall', 'counter', 'light', 'floor'].map(s => slots[s]).filter(Boolean);
  let decoStrip = getEl('kitchenDecoStrip');
  if (!decoStrip && resto) {
    decoStrip = document.createElement('div');
    decoStrip.id = 'kitchenDecoStrip';
    decoStrip.className = 'kitchen-deco-strip';
    resto.appendChild(decoStrip);
  }
  if (decoStrip) {
    // Resolve emoji from equipped ids if DECO_DATA available via data attributes
    const emojiMap = {
      lantern:'🏮', bamboo:'🎋', koi:'🐠', bonsai:'🌿', noren:'🎏', taiko:'🥁',
      sakura:'🌸', moon:'🌕', fountain:'⛲', statue:'🐉', garden:'🏞️', crystal:'💠',
    };
    decoStrip.innerHTML = eq.map(id => `<span title="${id}">${emojiMap[id] || '✨'}</span>`).join('')
      || '<span style="opacity:.35">🏚️</span>';
  }
  // Set-based tint overrides
  let color = theme.color || 0xc8962a;
  if (eq.includes('sakura') || eq.includes('noren')) {
    resto.style.setProperty('--kitchen-accent', 'rgba(244,114,182,.28)');
    color = 0xf472b6;
  } else if (eq.includes('moon') || eq.includes('crystal')) {
    resto.style.setProperty('--kitchen-accent', 'rgba(125,211,252,.28)');
    color = 0x7dd3fc;
  } else if (eq.includes('garden') || eq.includes('bamboo')) {
    resto.style.setProperty('--kitchen-accent', 'rgba(74,222,128,.25)');
    color = 0x4ade80;
  }
  setBranchColor(color);
  // Lazy-init 3D after first theme paint
  ensureThree();
}

export function showCooking() {
  thrCooking = true;
  getEl('chefEmoji')?.classList.add('cooking');
  const glow = getEl('chefGlow');
  if (glow) glow.className = 'chefglow on';
  const pe = getEl('plateEmoji');
  if (pe) pe.innerText = '⏳';
  getEl('plateWrap')?.classList.remove('lit');
  if (thr && thr !== 'failed') {
    thr.cooking = true;
    thr.sushi.visible = false;
    thr.steam.visible = true;
  }
}

export function showPlateReady(emoji) {
  thrCooking = false;
  thrPlateEmoji = emoji || '🍣';
  getEl('chefEmoji')?.classList.remove('cooking');
  const glow = getEl('chefGlow');
  if (glow) glow.className = 'chefglow off';
  const pe = getEl('plateEmoji');
  if (pe) pe.innerText = emoji;
  const pw = getEl('plateWrap');
  if (pw) {
    pw.classList.add('lit', 'pop');
    setTimeout(() => pw.classList.remove('pop'), 500);
  }
  spawnSteam();
  if (thr && thr !== 'failed') {
    thr.cooking = false;
    thr.sushi.visible = true;
    thr.steam.visible = true;
    // Menu-tinted sushi blob (known emojis → color; else hash)
    const MENU_COLORS = {
      '🍣': 0xff6b6b, '🐟': 0xf97316, '🦐': 0xfb7185, '🥚': 0xfde68a,
      '🦑': 0xa78bfa, '🌊': 0x38bdf8, '⭐': 0xfbbf24, '👑': 0xeab308,
      '🌸': 0xf9a8d4, '🔥': 0xef4444, '💎': 0x67e8f9, '🍽️': 0xe5e7eb,
    };
    const known = MENU_COLORS[emoji];
    if (known != null) thr.sushi.material.color.setHex(known);
    else {
      const hue = ((emoji || '').codePointAt(0) || 0) % 360;
      thr.sushi.material.color.setHSL(hue / 360, 0.55, 0.55);
    }
  }
}

export function resetPlate() {
  thrCooking = false;
  getEl('chefEmoji')?.classList.remove('cooking');
  const glow = getEl('chefGlow');
  if (glow) glow.className = 'chefglow off';
  const pe = getEl('plateEmoji');
  if (pe) pe.innerText = '🍽️';
  getEl('plateWrap')?.classList.remove('lit');
  if (thr && thr !== 'failed') {
    thr.cooking = false;
    thr.sushi.visible = false;
    thr.steam.visible = false;
  }
}

/** Brief FOV punch on Perfect serve (3D layer only). */
export function cameraPunchPerfect() {
  if (!thr || thr === 'failed' || !thr.camera) return;
  thr.baseFov = thr.baseFov || thr.camera.fov || 42;
  thr.baseZ = thr.baseZ ?? thr.camera.position.z;
  thr.punchDur = 320;
  thr.punchUntil = performance.now() + thr.punchDur;
  // Flash light
  if (thr.key) thr.key.intensity = 2.2;
  setTimeout(() => { if (thr && thr !== 'failed' && thr.key) thr.key.intensity = 1.2; }, 200);
}

export function spawnSteam() {
  const el = getEl('steamEl');
  if (!el) return;
  // Prefer 3D steam when ready
  if (thrReady) {
    el.innerHTML = '';
    return;
  }
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
