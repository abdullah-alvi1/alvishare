const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const config = require('../config');
const logger = require('../utils/logger');
const { generateKey } = require('../services/key.service');
const { networkIdFromIp } = require('../utils/helpers');

const ADJ = ['Swift', 'Calm', 'Brave', 'Lucky', 'Bright', 'Quiet', 'Cosmic', 'Mellow', 'Rapid', 'Sunny'];
const ANI = ['Falcon', 'Otter', 'Panda', 'Tiger', 'Koala', 'Lynx', 'Heron', 'Gecko', 'Whale', 'Fox'];
const pick = (a) => a[crypto.randomInt(a.length)];
const MAX_ROOM = 10;

function clientIp(req) {
  if (config.trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

/**
 * WebSocket signaling server.
 *
 * Client -> server:  hello | signal | room:create | room:join | room:leave | share:notify | ping
 * Server -> client:  welcome | peer:joined | peer:left | peer:updated | signal | room:* | share:received | error | pong
 */
function attachSignaling(server) {
  const wss = new WebSocketServer({ server, path: config.ws.path, maxPayload: config.ws.maxPayload });
  const peers = new Map();   // id -> peer
  const rooms = new Map();   // code -> Set<peerId>
  const perIp = new Map();   // ip -> count

  const send = (peer, msg) => { if (peer.ws.readyState === WebSocket.OPEN) peer.ws.send(JSON.stringify(msg)); };
  const pub = (p) => ({ id: p.id, name: p.name, deviceType: p.deviceType });
  const nearby = (p) => [...peers.values()].filter((o) => o.id !== p.id && o.networkId === p.networkId);
  const err = (peer, code, message) => send(peer, { type: 'error', code, message });
  const canReach = (a, b) => a.networkId === b.networkId || (a.room && a.room === b.room);

  function leaveRoom(peer) {
    if (!peer.room) return;
    const set = rooms.get(peer.room);
    const code = peer.room;
    peer.room = null;
    if (!set) return;
    set.delete(peer.id);
    if (!set.size) rooms.delete(code);
    else set.forEach((id) => send(peers.get(id), { type: 'room:peer-left', code, peerId: peer.id }));
    send(peer, { type: 'room:left', code });
  }

  function joinRoom(peer, code) {
    leaveRoom(peer);
    const set = rooms.get(code);
    set.forEach((id) => send(peers.get(id), { type: 'room:peer-joined', code, peer: pub(peer) }));
    set.add(peer.id);
    peer.room = code;
    send(peer, { type: 'room:joined', code, peers: [...set].filter((id) => id !== peer.id).map((id) => pub(peers.get(id))) });
  }

  const handlers = {
    hello(peer, m) {
      if (typeof m.name === 'string' && m.name.trim()) peer.name = m.name.trim().slice(0, 32);
      if (typeof m.deviceType === 'string') peer.deviceType = m.deviceType.slice(0, 16);
      nearby(peer).forEach((o) => send(o, { type: 'peer:updated', peer: pub(peer) }));
      send(peer, { type: 'hello:ack', peer: pub(peer) });
    },
    signal(peer, m) {
      const target = peers.get(m.to);
      if (!target || !canReach(peer, target)) return err(peer, 'PEER_NOT_FOUND', 'Peer is not reachable');
      if (typeof m.data !== 'object' || m.data === null) return err(peer, 'BAD_MESSAGE', 'signal.data must be an object');
      send(target, { type: 'signal', from: peer.id, data: m.data });
    },
    'room:create'(peer) {
      let code;
      do { code = generateKey(config.keyLength); } while (rooms.has(code));
      rooms.set(code, new Set());
      joinRoom(peer, code);
      send(peer, { type: 'room:created', code });
    },
    'room:join'(peer, m) {
      const code = String(m.code || '').trim().toUpperCase();
      const set = rooms.get(code);
      if (!set) return err(peer, 'ROOM_NOT_FOUND', 'Invalid or expired room code');
      if (set.size >= MAX_ROOM && !set.has(peer.id)) return err(peer, 'ROOM_FULL', 'Room is full');
      joinRoom(peer, code);
    },
    'room:leave': leaveRoom,
    'share:notify'(peer, m) {
      const target = peers.get(m.to);
      if (!target || !canReach(peer, target)) return err(peer, 'PEER_NOT_FOUND', 'Peer is not reachable');
      if (typeof m.key !== 'string' || m.key.length > 16) return err(peer, 'BAD_MESSAGE', 'key is required');
      send(target, { type: 'share:received', from: pub(peer), key: m.key.toUpperCase() });
    },
    ping(peer) { send(peer, { type: 'pong', t: Date.now() }); },
  };

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req);
    const count = perIp.get(ip) || 0;
    if (count >= config.ws.maxPerIp) return ws.close(1013, 'Too many connections');
    perIp.set(ip, count + 1);

    const peer = {
      id: crypto.randomBytes(8).toString('hex'),
      name: `${pick(ADJ)} ${pick(ANI)}`,
      deviceType: 'unknown',
      networkId: networkIdFromIp(ip),
      room: null,
      ws,
      alive: true,
      tokens: 100,
      last: Date.now(),
    };
    peers.set(peer.id, peer);

    send(peer, {
      type: 'welcome',
      id: peer.id,
      name: peer.name,
      peers: nearby(peer).map(pub),
      iceServers: config.iceServers,
    });
    nearby(peer).forEach((o) => send(o, { type: 'peer:joined', peer: pub(peer) }));

    ws.on('pong', () => { peer.alive = true; });
    ws.on('message', (raw) => {
      // token bucket: 100 burst, +30/s
      const now = Date.now();
      peer.tokens = Math.min(100, peer.tokens + ((now - peer.last) / 1000) * 30);
      peer.last = now;
      if (peer.tokens < 1) return err(peer, 'RATE_LIMITED', 'Slow down');
      peer.tokens -= 1;

      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return err(peer, 'BAD_JSON', 'Invalid JSON'); }
      const h = msg && Object.prototype.hasOwnProperty.call(handlers, msg.type) ? handlers[msg.type] : null;
      if (!h) return err(peer, 'UNKNOWN_TYPE', `Unknown message type: ${msg && msg.type}`);
      try { h(peer, msg); } catch (e) { logger.error('ws handler', e); err(peer, 'INTERNAL', 'Internal error'); }
    });
    ws.on('close', () => {
      leaveRoom(peer);
      peers.delete(peer.id);
      perIp.set(ip, Math.max((perIp.get(ip) || 1) - 1, 0));
      if (!perIp.get(ip)) perIp.delete(ip);
      [...peers.values()].filter((o) => o.networkId === peer.networkId).forEach((o) => send(o, { type: 'peer:left', peerId: peer.id }));
    });
    ws.on('error', () => ws.terminate());
  });

  const heartbeat = setInterval(() => {
    for (const p of peers.values()) {
      if (!p.alive) { p.ws.terminate(); continue; }
      p.alive = false;
      p.ws.ping();
    }
  }, 30_000);
  wss.on('close', () => clearInterval(heartbeat));

  return {
    stats: () => ({ connections: peers.size, rooms: rooms.size }),
    close: () => { clearInterval(heartbeat); wss.clients.forEach((c) => c.terminate()); wss.close(); },
  };
}

module.exports = attachSignaling;
