import { useEffect, useRef, useState } from 'react';
import { Laptop, Wifi, WifiOff, Send, FileDown } from 'lucide-react';
import { fmt } from '../api';

const CHUNK = 16 * 1024;

export default function Nearby() {
  const [peers, setPeers] = useState([]);
  const [me, setMe] = useState('');
  const [online, setOnline] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [note, setNote] = useState('');
  const ws = useRef(null), ice = useRef([]), pcs = useRef({}), target = useRef(null), pick = useRef();
  const send = (o) => ws.current?.readyState === 1 && ws.current.send(JSON.stringify(o));

  const makePc = (id) => {
    const pc = new RTCPeerConnection({ iceServers: ice.current });
    pc.onicecandidate = (e) => e.candidate && send({ type: 'signal', to: id, data: { candidate: e.candidate } });
    pcs.current[id] = pc;
    return pc;
  };

  const receive = (dc) => {
    dc.binaryType = 'arraybuffer';
    const parts = []; let meta = null, got = 0; const id = Math.random();
    dc.onmessage = (e) => {
      if (typeof e.data === 'string') {
        const j = JSON.parse(e.data);
        if (j.done) { const url = URL.createObjectURL(new Blob(parts, { type: meta.type })); setInbox((l) => l.map((x) => (x.id === id ? { ...x, url, pct: 100 } : x))); }
        else { meta = j; setInbox((l) => [{ id, name: j.name, size: j.size, pct: 0 }, ...l]); }
      } else { parts.push(e.data); got += e.data.byteLength; setInbox((l) => l.map((x) => (x.id === id ? { ...x, pct: Math.round((got / meta.size) * 100) } : x))); }
    };
  };

  const onSignal = async (from, d) => {
    let pc = pcs.current[from];
    if (d.sdp?.type === 'offer') {
      pc = makePc(from); pc.ondatachannel = (e) => receive(e.channel);
      await pc.setRemoteDescription(d.sdp); await pc.setLocalDescription(await pc.createAnswer());
      send({ type: 'signal', to: from, data: { sdp: pc.localDescription } });
    } else if (d.sdp && pc) await pc.setRemoteDescription(d.sdp);
    else if (d.candidate && pc) await pc.addIceCandidate(d.candidate).catch(() => {});
  };

  useEffect(() => {
    let closed = false, timer;
    const connect = () => {
      const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.current = s;
      s.onopen = () => setOnline(true);
      s.onclose = () => { setOnline(false); if (!closed) timer = setTimeout(connect, 2000); };
      s.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === 'welcome') { ice.current = m.iceServers; setMe(m.name); setPeers(m.peers); }
        else if (m.type === 'peer:joined' || m.type === 'peer:updated') setPeers((l) => [...l.filter((p) => p.id !== m.peer.id), m.peer]);
        else if (m.type === 'peer:left') setPeers((l) => l.filter((p) => p.id !== m.peerId));
        else if (m.type === 'signal') onSignal(m.from, m.data);
      };
    };
    connect();
    const ping = setInterval(() => send({ type: 'ping' }), 25000);
    return () => { closed = true; clearTimeout(timer); clearInterval(ping); ws.current?.close(); };
  }, []); // eslint-disable-line

  const sendFile = async (file) => {
    const to = target.current, name = peers.find((p) => p.id === to)?.name;
    if (!file || !to) return;
    const pc = makePc(to), dc = pc.createDataChannel('file');
    dc.binaryType = 'arraybuffer'; dc.bufferedAmountLowThreshold = 1 << 20;
    setNote(`Connecting to ${name}…`);
    dc.onopen = async () => {
      dc.send(JSON.stringify({ name: file.name, size: file.size, type: file.type }));
      for (let off = 0; off < file.size; off += CHUNK) {
        if (dc.bufferedAmount > 4 << 20) await new Promise((r) => dc.addEventListener('bufferedamountlow', r, { once: true }));
        dc.send(await file.slice(off, off + CHUNK).arrayBuffer());
        if (off % (CHUNK * 64) === 0) setNote(`Sending ${file.name} to ${name}… ${Math.round((off / file.size) * 100)}%`);
      }
      dc.send(JSON.stringify({ done: true })); setNote(`Sent ${file.name} to ${name} ✓`);
      setTimeout(() => pc.close(), 3000);
    };
    await pc.setLocalDescription(await pc.createOffer());
    send({ type: 'signal', to, data: { sdp: pc.localDescription } });
  };

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-center text-4xl font-black text-white">Nearby devices</h1>
      <p className="mt-2 text-center text-sky-50">Open Alvishare on another device on the same WiFi. Files go straight between devices (WebRTC) - never through the server.</p>
      <div className="card mt-6">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className={`inline-flex items-center gap-2 font-semibold ${online ? 'text-emerald-600' : 'text-rose-500'}`}>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Online' : 'Reconnecting…'}</span>
          <span className="text-slate-500">You are <b className="text-sky-700">{me || '…'}</b></span>
        </div>
        <input ref={pick} type="file" hidden onChange={(e) => { sendFile(e.target.files[0]); e.target.value = ''; }} />
        {!peers.length ? (
          <div className="py-10 text-center text-slate-500"><div className="mx-auto mb-3 grid h-16 w-16 animate-float place-items-center rounded-full bg-sky-100 text-sky-500"><Laptop /></div>Looking for devices…</div>
        ) : (
          <ul className="space-y-2">{peers.map((p) => (
            <li key={p.id}><button onClick={() => { target.current = p.id; pick.current.click(); }} className="flex w-full items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-left font-semibold transition hover:-translate-y-0.5 hover:bg-sky-100"><Laptop className="text-sky-500" />{p.name}<Send size={16} className="ml-auto text-sky-500" /></button></li>
          ))}</ul>
        )}
        {note && <p className="mt-4 rounded-xl bg-sky-50 p-3 text-center text-sm text-sky-700">{note}</p>}
        {inbox.length > 0 && <ul className="mt-4 space-y-2">{inbox.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm"><FileDown size={16} className="text-emerald-600" /><span className="truncate">{f.name}</span><span className="text-xs text-slate-500">{fmt(f.size)}</span>
            {f.url ? <a href={f.url} download={f.name} className="ml-auto font-bold text-emerald-700 hover:underline">Save</a> : <span className="ml-auto text-xs">{f.pct}%</span>}</li>))}</ul>}
      </div>
    </section>
  );
}
