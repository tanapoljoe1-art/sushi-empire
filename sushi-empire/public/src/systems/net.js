// ── Online leaderboard via Socket.IO (same-origin Render/server.js) ───────────
// Falls back silently to localStorage if the socket can't connect.
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';
import { toast } from '../ui/render.js';

let socket = null;
let onlineLB = null; // last server payload
let connected = false;

export function isNetConnected() { return connected; }
export function getOnlineLB() { return onlineLB; }

export async function connectNet() {
  if (socket) return socket;
  try {
    const { io } = await import('socket.io-client');
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      timeout: 6000,
    });
    socket.on('connect', () => {
      connected = true;
      socket.emit('getLeaderboard');
      setLbStatus(true);
    });
    socket.on('disconnect', () => {
      connected = false;
      setLbStatus(false);
    });
    socket.on('connect_error', () => {
      connected = false;
      setLbStatus(false);
    });
    socket.on('leaderboard', (rows) => {
      onlineLB = Array.isArray(rows) ? rows : [];
      // Re-render if LB page is open
      import('./progress.js').then(m => m.renderLB()).catch(() => {});
    });
    return socket;
  } catch (e) {
    console.warn('socket.io-client unavailable', e);
    connected = false;
    setLbStatus(false);
    return null;
  }
}

function setLbStatus(on) {
  const el = getEl('lbNetStatus');
  if (!el) return;
  el.innerText = on ? '🟢 ออนไลน์' : '🟡 ออฟไลน์ · ใช้คะแนนเครื่อง';
  el.style.color = on ? 'var(--green)' : 'var(--gold)';
}

export function submitScoreOnline({ name, score, level, served, prestige }) {
  if (!socket || !connected) return false;
  socket.emit('submitScore', { name, score, level, served, prestige: prestige || 0 });
  return true;
}

export function requestLeaderboard() {
  if (socket && connected) socket.emit('getLeaderboard');
}
