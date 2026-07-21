// ── Host / Spectate rooms (Socket.IO) ─────────────────────────────────────────
import { G, save } from '../core/state.js';
import { getEl } from '../core/dom.js';
import { toast, updateUI } from '../ui/render.js';
import { connectNet, getSocket } from './net.js';

let mode = 'none'; // none | host | spectator
let roomCode = null;
let snapTimer = null;
let lastSnapshot = null;

export function getSpectateMode() { return mode; }
export function getRoomCode() { return roomCode; }

function setHud() {
  const el = getEl('spectateHud');
  if (!el) return;
  if (mode === 'none') {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  if (mode === 'host') {
    el.innerHTML = `<span>📡 โฮสต์ · รหัส <b id="spCode">${roomCode || '—'}</b></span>
      <span id="spViewers">ผู้ชม 0</span>
      <button class="sp-btn" onclick="leaveSpectateRoom()">ปิดห้อง</button>`;
  } else {
    const s = lastSnapshot || {};
    el.innerHTML = `<span>👁 ชม · ${s.playerName || 'เชฟ'} · ห้อง <b>${roomCode || ''}</b></span>
      <span>💰 ${(s.money || 0).toLocaleString()} · Lv.${s.level || 1} · 🔥${s.streak || 0}</span>
      <div class="sp-react">
        <button class="sp-btn" onclick="sendReaction('👏')">👏</button>
        <button class="sp-btn" onclick="sendReaction('🔥')">🔥</button>
        <button class="sp-btn" onclick="sendReaction('🍣')">🍣</button>
        <button class="sp-btn" onclick="leaveSpectateRoom()">ออก</button>
      </div>`;
  }
}

function buildSnapshot() {
  return {
    playerName: G.playerName || 'เชฟ',
    money: G.money,
    level: G.level,
    rating: G.rating,
    streak: G.streak,
    served: G.served,
    menu: G.menu,
    prestigeLevel: G.prestigeLevel,
    activeBranch: G.activeBranch,
    queueLen: (G.queue || []).length,
    cooking: G.cooking,
    plateReady: G.plateReady,
    activeEvent: G.activeEvent,
    ts: Date.now(),
  };
}

export async function hostSpectateRoom() {
  const sock = await connectNet();
  if (!sock || !sock.connected) {
    toast('✕ ต่อเซิร์ฟเวอร์ไม่ได้');
    return;
  }
  const name = G.playerName || getEl('playerName')?.value || 'เชฟ';
  G.playerName = name;
  save();
  sock.emit('createRoom', { playerName: name });
}

export async function joinSpectateRoom(code) {
  const sock = await connectNet();
  if (!sock || !sock.connected) {
    toast('✕ ต่อเซิร์ฟเวอร์ไม่ได้');
    return;
  }
  const c = (code || getEl('joinRoomCode')?.value || '').trim().toUpperCase();
  if (c.length < 4) { toast('ใส่รหัสห้อง'); return; }
  const name = getEl('viewerName')?.value || 'ผู้ชม';
  sock.emit('joinRoom', { code: c, viewerName: name });
}

export function leaveSpectateRoom() {
  // Full reconnect is heavy — just clear local mode; disconnect socket room on reload is fine
  // Emit leave by disconnecting room membership: re-connect path
  mode = 'none';
  roomCode = null;
  lastSnapshot = null;
  if (snapTimer) { clearInterval(snapTimer); snapTimer = null; }
  setHud();
  const ov = getEl('spectateOverlay');
  if (ov) ov.style.display = 'none';
  toast('ออกจากห้องแล้ว');
}

export function sendReaction(emoji) {
  const sock = getSocket();
  if (!sock || mode !== 'spectator') return;
  sock.emit('reaction', { emoji: emoji || '👏' });
}

export function sendChat(msg) {
  const sock = getSocket();
  if (!sock || mode === 'none') return;
  sock.emit('chat', { msg });
}

function startHostSnapshots(sock) {
  if (snapTimer) clearInterval(snapTimer);
  snapTimer = setInterval(() => {
    if (mode !== 'host' || !sock?.connected) return;
    sock.emit('gameSnapshot', buildSnapshot());
  }, 1200);
}

function showReactionFloat(name, emoji) {
  const host = getEl('spectateReactions');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'sp-float';
  el.innerText = `${emoji} ${name}`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function applySpectatorView(snapshot) {
  lastSnapshot = snapshot;
  setHud();
  const panel = getEl('spectatePanel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="sp-big">${snapshot.playerName || 'เชฟ'}</div>
    <div class="sp-stats">
      <div><span>เงิน</span><b>${(snapshot.money || 0).toLocaleString()}฿</b></div>
      <div><span>Level</span><b>${snapshot.level || 1}</b></div>
      <div><span>Streak</span><b>${snapshot.streak || 0}</b></div>
      <div><span>เสิร์ฟ</span><b>${snapshot.served || 0}</b></div>
      <div><span>คิว</span><b>${snapshot.queueLen || 0}</b></div>
      <div><span>เมนู</span><b>${snapshot.menu || '—'}</b></div>
    </div>
    <div class="sp-state">${snapshot.cooking ? '⏳ กำลังทำ...' : snapshot.plateReady ? '✨ พร้อมเสิร์ฟ' : 'ร้านเปิด'}${snapshot.activeEvent ? ' · ⚡ ' + snapshot.activeEvent : ''}</div>
    <div id="spectateChat" class="sp-chat"></div>
    <div class="sp-chat-row">
      <input id="spChatInput" maxlength="60" placeholder="แชท..." />
      <button class="sp-btn" onclick="sendSpectateChat()">ส่ง</button>
    </div>
  `;
}

export function sendSpectateChat() {
  const input = getEl('spChatInput');
  if (!input?.value?.trim()) return;
  sendChat(input.value.trim());
  input.value = '';
}

export async function initSpectate() {
  const sock = await connectNet();
  if (!sock) return;

  sock.on('roomCreated', ({ code }) => {
    mode = 'host';
    roomCode = code;
    toast('📡 เปิดห้อง ' + code);
    startHostSnapshots(sock);
    setHud();
    closeSpectateModal();
  });

  sock.on('joinedRoom', ({ code, hostName, snapshot }) => {
    mode = 'spectator';
    roomCode = code;
    toast('👁 เข้าชมห้อง ' + code);
    const ov = getEl('spectateOverlay');
    if (ov) ov.style.display = 'flex';
    if (snapshot) applySpectatorView(snapshot);
    else applySpectatorView({ playerName: hostName, money: 0, level: 1 });
    setHud();
    closeSpectateModal();
  });

  sock.on('joinError', (msg) => toast('✕ ' + msg));

  sock.on('snapshot', (snapshot) => {
    if (mode === 'spectator') applySpectatorView(snapshot);
  });

  sock.on('spectatorJoined', ({ name, count }) => {
    toast('👁 ' + name + ' เข้าชม');
    const v = getEl('spViewers');
    if (v) v.innerText = 'ผู้ชม ' + count;
  });

  sock.on('spectatorLeft', ({ count }) => {
    const v = getEl('spViewers');
    if (v) v.innerText = 'ผู้ชม ' + count;
  });

  sock.on('spectatorList', (list) => {
    const v = getEl('spViewers');
    if (v) v.innerText = 'ผู้ชม ' + (list?.length || 0);
  });

  sock.on('reaction', ({ name, emoji }) => showReactionFloat(name, emoji));

  sock.on('chat', ({ name, msg, isHost }) => {
    const box = getEl('spectateChat');
    if (!box) return;
    const line = document.createElement('div');
    line.innerHTML = `<b style="color:${isHost ? 'var(--gold)' : 'var(--teal)'}">${name}</b>: ${msg}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  });

  sock.on('hostLeft', () => {
    toast('โฮสต์ออกจากห้อง');
    leaveSpectateRoom();
  });
}

export function openSpectateModal() {
  getEl('spectateModal')?.classList.add('vis');
  getEl('hostRoomName') && (getEl('hostRoomName').value = G.playerName || '');
}

export function closeSpectateModal() {
  getEl('spectateModal')?.classList.remove('vis');
}

export function hostFromModal() {
  const n = getEl('hostRoomName')?.value?.trim();
  if (n) { G.playerName = n; save(); }
  hostSpectateRoom();
}

export function joinFromModal() {
  joinSpectateRoom(getEl('joinRoomCode')?.value);
}
