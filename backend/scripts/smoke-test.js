// End-to-end check: node scripts/smoke-test.js  (server must be running)
const WebSocket = require('ws');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let failed = 0;
const ok = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) failed++; };

const wsClient = () => new Promise((res) => {
  const ws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
  const queue = [], waiters = [];
  ws.on('message', (d) => { const m = JSON.parse(d); const w = waiters.findIndex((x) => x.t === m.type); if (w >= 0) waiters.splice(w, 1)[0].r(m); else queue.push(m); });
  const wait = (t) => new Promise((r) => { const i = queue.findIndex((m) => m.type === t); if (i >= 0) r(queue.splice(i, 1)[0]); else waiters.push({ t, r }); });
  wait('welcome').then((w) => res({ ws, wait, welcome: w }));
});

(async () => {
  console.log('HTTP');
  ok((await (await fetch(`${BASE}/api/v1/health`)).json()).status === 'ok', 'health');

  const fd = new FormData();
  const content = Buffer.from('hello alvishare ' + Date.now());
  fd.append('files', new Blob([content]), 'héllo.txt');
  fd.append('files', new Blob(['second']), 'two.txt');
  fd.append('maxDownloads', '2');
  const up = await (await fetch(`${BASE}/api/v1/shares`, { method: 'POST', body: fd })).json();
  ok(up.key && up.key.length === 6 && up.deleteToken, `upload -> key ${up.key}`);
  ok(up.files[0].name === 'héllo.txt', 'utf-8 filename preserved');

  const info = await (await fetch(`${BASE}/api/v1/shares/${up.key.toLowerCase()}`)).json();
  ok(info.files.length === 2 && info.remainingDownloads === 2, 'info (case-insensitive key)');

  const qr = await fetch(`${BASE}/api/v1/shares/${up.key}/qr`);
  const buf = Buffer.from(await qr.arrayBuffer());
  ok(qr.headers.get('content-type') === 'image/png' && buf[1] === 0x50, 'QR png');
  const qj = await (await fetch(`${BASE}/api/v1/shares/${up.key}/qr?format=dataurl&target=download`)).json();
  ok(qj.dataUrl.startsWith('data:image/png') && qj.url.endsWith('/download'), 'QR dataurl');
  ok((await (await fetch(`${BASE}/api/v1/shares/${up.key}/qr?format=svg`)).text()).includes('<svg'), 'QR svg');

  const one = await fetch(`${BASE}/api/v1/shares/${up.key}/download?file=${up.files[0].id}`);
  ok(Buffer.from(await one.arrayBuffer()).equals(content), 'single-file download matches');
  const zip = await fetch(`${BASE}/api/v1/shares/${up.key}/download`);
  const zb = Buffer.from(await zip.arrayBuffer());
  ok(zip.headers.get('content-type').includes('zip') && zb[0] === 0x50 && zb[1] === 0x4b, 'multi-file zip');
  ok((await fetch(`${BASE}/api/v1/shares/${up.key}`)).status === 404, 'share removed after download limit');

  const pf = new FormData();
  pf.append('files', new Blob(['secret']), 's.txt'); pf.append('password', 'hunter22');
  const p = await (await fetch(`${BASE}/api/v1/shares`, { method: 'POST', body: pf })).json();
  ok((await fetch(`${BASE}/api/v1/shares/${p.key}/download`)).status === 401, 'password required');
  ok((await fetch(`${BASE}/api/v1/shares/${p.key}/download`, { headers: { 'x-share-password': 'nope' } })).status === 403, 'wrong password');
  ok((await (await fetch(`${BASE}/api/v1/shares/${p.key}/download?password=hunter22`)).text()) === 'secret', 'correct password');
  ok((await fetch(`${BASE}/api/v1/shares/${p.key}`, { method: 'DELETE', headers: { 'x-delete-token': 'bad' } })).status === 403, 'bad delete token');
  ok((await fetch(`${BASE}/api/v1/shares/${p.key}`, { method: 'DELETE', headers: { 'x-delete-token': p.deleteToken } })).status === 200, 'delete');
  ok((await fetch(`${BASE}/api/v1/shares/ZZZZZZ`)).status === 404, 'unknown key -> 404');
  ok((await fetch(`${BASE}/api/v1/shares`, { method: 'POST', body: new FormData() })).status === 400, 'empty upload -> 400');

  console.log('WebSocket');
  const a = await wsClient(), b = await wsClient();
  const joined = await a.wait('peer:joined');
  ok(joined.peer.id === b.welcome.id, 'peer discovery on same network');
  b.ws.send(JSON.stringify({ type: 'signal', to: a.welcome.id, data: { sdp: 'fake-offer' } }));
  const sig = await a.wait('signal');
  ok(sig.from === b.welcome.id && sig.data.sdp === 'fake-offer', 'signal relay');
  a.ws.send(JSON.stringify({ type: 'share:notify', to: b.welcome.id, key: 'abc123' }));
  ok((await b.wait('share:received')).key === 'ABC123', 'share:notify');
  a.ws.send(JSON.stringify({ type: 'room:create' }));
  const created = await a.wait('room:created');
  b.ws.send(JSON.stringify({ type: 'room:join', code: created.code }));
  ok((await b.wait('room:joined')).code === created.code, 'room create/join');
  b.ws.send(JSON.stringify({ type: 'nonsense' }));
  ok((await b.wait('error')).code === 'UNKNOWN_TYPE', 'unknown message -> error');
  a.ws.close(); b.ws.close();

  console.log(failed ? `\n${failed} FAILED` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
