// ── Settings, SFX, and soft generative BGM ────────────────────────────────────
const _defaultSettings = { sound: true, music: true, anim: true, autosave: true, bigTap: false };
function loadSettings() {
  try {
    const raw = localStorage.getItem('SE5_settings');
    if (!raw) return { ..._defaultSettings };
    return { ..._defaultSettings, ...JSON.parse(raw) };
  } catch { return { ..._defaultSettings }; }
}
export const settings = loadSettings();
export function persistSettings() {
  try { localStorage.setItem('SE5_settings', JSON.stringify(settings)); } catch (_) {}
}

export function applyA11yClasses() {
  try {
    document.documentElement.classList.toggle('reduce-motion', !settings.anim);
    document.documentElement.classList.toggle('big-tap', !!settings.bigTap);
  } catch (_) {}
}


let _actx = null;
let _bgmNodes = null;
let _bgmMode = 'idle'; // idle | rush | night
let _bgmTimer = null;

function getACtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  return _actx;
}

export function unlockAudio() {
  try {
    const ctx = getACtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) {}
}

function playTone(freq, type = 'sine', dur = 0.12, vol = 0.18, attack = 0.005) {
  if (!settings.sound) return;
  try {
    const ctx  = getACtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.02);
  } catch (e) {}
}

// Knife / cook layering
export function sfxCook() {
  playTone(220, 'triangle', 0.04, 0.08);
  playTone(320, 'sine', 0.06, 0.11);
  setTimeout(() => playTone(480, 'sine', 0.05, 0.09), 50);
  setTimeout(() => playTone(180, 'square', 0.03, 0.04), 30); // soft chop
}
export function sfxServe() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.14, 0.13), i * 70));
  setTimeout(() => playTone(1046, 'sine', 0.08, 0.08), 220); // plate clink
}
export function sfxLevelUp() {
  [392, 494, 587, 784, 988].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.18, 0.16), i * 85));
}
export function sfxCoin() {
  playTone(880, 'sine', 0.08, 0.12);
  setTimeout(() => playTone(1174, 'sine', 0.07, 0.09), 45);
}
export function sfxError()  { playTone(180, 'sawtooth', 0.12, 0.11); }
export function sfxStreak() {
  [440, 550, 660, 880, 1100].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.07, 0.07), i * 45));
}
export function sfxNewDisc() {
  [523, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.16, 0.12), i * 80));
}
export function sfxAngry()  { playTone(200, 'sawtooth', 0.16, 0.12); playTone(140, 'sawtooth', 0.2, 0.08); }
export function sfxPerfect() {
  [659, 880, 1174].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.1, 0.11), i * 40));
}

// ── BGM (very light generative pad + pluck) ───────────────────────────────────

const BGM = {
  idle:  { root: 196, fifth: 294, interval: 2200, vol: 0.028 },
  rush:  { root: 246, fifth: 370, interval: 900,  vol: 0.034 },
  night: { root: 164, fifth: 246, interval: 2800, vol: 0.024 },
};

function stopBgmInternal() {
  if (_bgmTimer) { clearInterval(_bgmTimer); _bgmTimer = null; }
  if (_bgmNodes) {
    try {
      _bgmNodes.gain.gain.exponentialRampToValueAtTime(0.001, getACtx().currentTime + 0.3);
      setTimeout(() => {
        try { _bgmNodes.osc1.stop(); _bgmNodes.osc2.stop(); } catch (_) {}
        _bgmNodes = null;
      }, 350);
    } catch (_) { _bgmNodes = null; }
  }
}

export function stopBgm() { stopBgmInternal(); }

export function startBgm(mode = 'idle') {
  if (!settings.music) return;
  unlockAudio();
  _bgmMode = mode || 'idle';
  const cfg = BGM[_bgmMode] || BGM.idle;
  try {
    const ctx = getACtx();
    if (_bgmNodes) {
      // retune existing pad
      _bgmNodes.osc1.frequency.setTargetAtTime(cfg.root, ctx.currentTime, 0.4);
      _bgmNodes.osc2.frequency.setTargetAtTime(cfg.fifth, ctx.currentTime, 0.4);
      _bgmNodes.gain.gain.setTargetAtTime(cfg.vol, ctx.currentTime, 0.5);
    } else {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.value = cfg.root;
      osc2.frequency.value = cfg.fifth;
      gain.gain.value = 0.0001;
      osc1.connect(filter); osc2.connect(filter);
      filter.connect(gain); gain.connect(ctx.destination);
      osc1.start(); osc2.start();
      gain.gain.linearRampToValueAtTime(cfg.vol, ctx.currentTime + 1.2);
      _bgmNodes = { osc1, osc2, gain, filter };
    }
    if (_bgmTimer) clearInterval(_bgmTimer);
    _bgmTimer = setInterval(() => {
      if (!settings.music || !settings.sound) return;
      // soft pentatonic pluck
      const scale = [0, 2, 4, 7, 9];
      const n = scale[~~(Math.random() * scale.length)];
      const base = (BGM[_bgmMode] || BGM.idle).root * 2;
      playTone(base * Math.pow(2, n / 12), 'sine', 0.35, 0.03, 0.02);
    }, cfg.interval);
  } catch (_) {}
}

export function setBgmMode(mode) {
  if (_bgmMode === mode && _bgmNodes) return;
  if (settings.music) startBgm(mode);
  else _bgmMode = mode;
}

export function syncBgmToGame(G) {
  if (!settings.music) return;
  if (G.activeEvent === 'rush' || G.activeEvent === 'festival') setBgmMode('rush');
  else if (G.prestigeLevel >= 3 && G.level < 8) setBgmMode('night');
  else setBgmMode('idle');
}
