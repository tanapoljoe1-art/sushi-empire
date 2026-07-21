// ── Settings & Sound FX ───────────────────────────────────────────────────────
export const settings = { sound: true, anim: true, autosave: true };

let _actx = null;
function getACtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  return _actx;
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

export function sfxCook()    { playTone(320,'sine',0.06,0.12); setTimeout(()=>playTone(440,'sine',0.06,0.10),60); }
export function sfxServe()   { [523,659,784].forEach((f,i) => setTimeout(()=>playTone(f,'triangle',0.14,0.14),i*70)); }
export function sfxLevelUp() { [392,494,587,784].forEach((f,i) => setTimeout(()=>playTone(f,'triangle',0.18,0.18),i*90)); }
export function sfxCoin()    { playTone(880,'sine',0.08,0.13); setTimeout(()=>playTone(1046,'sine',0.07,0.10),50); }
export function sfxError()   { playTone(180,'sawtooth',0.12,0.12); }
export function sfxStreak()  { [440,550,660,880].forEach((f,i) => setTimeout(()=>playTone(f,'square',0.08,0.09),i*50)); }
export function sfxNewDisc() { [523,784,1047,1319].forEach((f,i) => setTimeout(()=>playTone(f,'triangle',0.16,0.13),i*80)); }
export function sfxAngry()   { playTone(220,'sawtooth',0.15,0.15); }
