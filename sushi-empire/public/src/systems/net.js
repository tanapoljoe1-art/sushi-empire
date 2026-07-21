// ── Online leaderboard via Socket.IO (same-origin Render/server.js) ───────────
// Falls back silently to localStorage if the socket can't connect.
import { getEl } from '../core/dom.js';

let socket = null;
let onlineLB = null;
let connected = false;
let connectPromise = null;

export function isNetConnected() { return connected; }
export function getOnlineLB() { return onlineLB; }
export function getSocket() { return socket; }

export async function connectNet() {
  if (socket && connected) return socket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      const { io } = await import('socket.io-client');
      if (!socket) {
        socket = io({
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          timeout: 8000,
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
          import('./progress.js').then(m => m.renderLB()).catch(() => {});
        });
      }
      // Wait briefly for first connection
      if (!socket.connected) {
        await new Promise((resolve) => {
          const t = setTimeout(resolve, 2500);
          socket.once('connect', () => { clearTimeout(t); resolve(); });
        });
      }
      connected = !!socket.connected;
      setLbStatus(connected);
      return socket;
    } catch (e) {
      console.warn('socket.io-client unavailable', e);
      connected = false;
      setLbStatus(false);
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

function setLbStatus(on) {
  const el = getEl('lbNetStatus');
  if (!el) return;
  el.innerText = on ? '🟢 ออนไลน์' : '🟡 ออฟไลน์ · ใช้คะแนนเครื่อง';
  el.style.color = on ? 'var(--green)' : 'var(--gold)';
}

export function submitScoreOnline({ name, score, level, served, prestige }) {
  if (!socket || !socket.connected) return false;
  socket.emit('submitScore', { name, score, level, served, prestige: prestige || 0 });
  return true;
}

export function requestLeaderboard() {
  if (socket && socket.connected) socket.emit('getLeaderboard');
}
