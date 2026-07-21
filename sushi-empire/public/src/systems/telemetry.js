// ── Light local telemetry (no network) ───────────────────────────────────────
// Tracks session + lifetime playstyle stats for debug / future balance.
import { G, save } from '../core/state.js';
import { dayKeyUTC } from '../core/state.js';

const TEL_KEY = 'SE5_tel';

function blankSession() {
  return {
    startedAt: Date.now(),
    serves: 0,
    perfects: 0,
    misses: 0,
    moneyEarned: 0,
    events: 0,
    levelUps: 0,
    toasts: 0,
  };
}

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(TEL_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return defaultStore();
    return {
      ...defaultStore(),
      ...raw,
      lifetime: { ...defaultStore().lifetime, ...(raw.lifetime || {}) },
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    };
  } catch {
    return defaultStore();
  }
}

function defaultStore() {
  return {
    firstPlayAt: Date.now(),
    lastPlayAt: Date.now(),
    totalPlayMs: 0,
    lifetime: {
      serves: 0,
      perfects: 0,
      levelUps: 0,
      prestiges: 0,
      timeToLv5Ms: null,
      timeToLv15Ms: null,
      timeToPrestige1Ms: null,
    },
    sessions: [],
  };
}

let store = loadStore();
let session = blankSession();
let lastTick = Date.now();
let levelAtStart = null;

export function initTelemetry() {
  store = loadStore();
  session = blankSession();
  lastTick = Date.now();
  levelAtStart = G.level || 1;
  store.lastPlayAt = Date.now();
  if (!store.firstPlayAt) store.firstPlayAt = Date.now();
  persist();
  // heartbeat every 15s
  if (!globalThis._telHb) {
    globalThis._telHb = setInterval(tickPlaytime, 15000);
  }
  // flush on hide
  if (typeof document !== 'undefined' && !document._telVis) {
    document._telVis = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        tickPlaytime();
        endSessionPartial();
      }
    });
  }
}

function persist() {
  try {
    localStorage.setItem(TEL_KEY, JSON.stringify(store));
  } catch (_) {}
}

function tickPlaytime() {
  const now = Date.now();
  const dt = Math.max(0, Math.min(60000, now - lastTick));
  lastTick = now;
  store.totalPlayMs = (store.totalPlayMs || 0) + dt;
  store.lastPlayAt = now;
  persist();
}

function endSessionPartial() {
  // Keep rolling session; just snapshot once per day max in sessions log
  const day = dayKeyUTC();
  const last = store.sessions[store.sessions.length - 1];
  const snap = {
    day,
    at: Date.now(),
    serves: session.serves,
    perfects: session.perfects,
    moneyEarned: session.moneyEarned,
    level: G.level,
    prestige: G.prestigeLevel || 0,
  };
  if (last && last.day === day) store.sessions[store.sessions.length - 1] = snap;
  else store.sessions.push(snap);
  if (store.sessions.length > 14) store.sessions = store.sessions.slice(-14);
  persist();
}

/** Record a named game event (serve, perfect, miss, levelup, prestige, event, toast). */
export function tel(event, meta = {}) {
  if (!session) session = blankSession();
  if (event === 'serve') {
    session.serves++;
    store.lifetime.serves = (store.lifetime.serves || 0) + 1;
  } else if (event === 'perfect') {
    session.perfects++;
    store.lifetime.perfects = (store.lifetime.perfects || 0) + 1;
  } else if (event === 'miss') {
    session.misses++;
  } else if (event === 'earn') {
    session.moneyEarned += Number(meta.amount) || 0;
  } else if (event === 'event') {
    session.events++;
  } else if (event === 'levelup') {
    session.levelUps++;
    store.lifetime.levelUps = (store.lifetime.levelUps || 0) + 1;
    const elapsed = Date.now() - (store.firstPlayAt || Date.now());
    if ((G.level || 1) >= 5 && store.lifetime.timeToLv5Ms == null) {
      store.lifetime.timeToLv5Ms = elapsed;
    }
    if ((G.level || 1) >= 15 && store.lifetime.timeToLv15Ms == null) {
      store.lifetime.timeToLv15Ms = elapsed;
    }
  } else if (event === 'prestige') {
    store.lifetime.prestiges = (store.lifetime.prestiges || 0) + 1;
    if (store.lifetime.timeToPrestige1Ms == null) {
      store.lifetime.timeToPrestige1Ms = Date.now() - (store.firstPlayAt || Date.now());
    }
  } else if (event === 'toast') {
    session.toasts++;
  }
  // throttle disk writes
  if (!tel._t) {
    tel._t = setTimeout(() => { tel._t = null; persist(); }, 2000);
  }
}

export function getTelemetrySummary() {
  tickPlaytime();
  const lt = store.lifetime || {};
  const fmt = (ms) => {
    if (ms == null) return '—';
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m}น.`;
    return `${(m / 60).toFixed(1)}ชม.`;
  };
  return {
    sessionMin: Math.round((Date.now() - session.startedAt) / 60000),
    sessionServes: session.serves,
    sessionPerfects: session.perfects,
    sessionEarn: session.moneyEarned,
    totalPlayMin: Math.round((store.totalPlayMs || 0) / 60000),
    lifeServes: lt.serves || 0,
    lifePerfects: lt.perfects || 0,
    lifeLevelUps: lt.levelUps || 0,
    lifePrestiges: lt.prestiges || 0,
    timeToLv5: fmt(lt.timeToLv5Ms),
    timeToLv15: fmt(lt.timeToLv15Ms),
    timeToP1: fmt(lt.timeToPrestige1Ms),
    levelAtStart,
  };
}

export function formatTelemetryDebug() {
  const s = getTelemetrySummary();
  return [
    `เซสชัน ${s.sessionMin}น · เสิร์ฟ ${s.sessionServes} · Perfect ${s.sessionPerfects}`,
    `หาเงินเซสชัน ${Math.round(s.sessionEarn).toLocaleString()}฿`,
    `เล่นรวม ~${s.totalPlayMin}น · เสิร์ฟชีวิต ${s.lifeServes}`,
    `→Lv5 ${s.timeToLv5} · →Lv15 ${s.timeToLv15} · →P1 ${s.timeToP1}`,
  ].join('\n');
}
