import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Download, UploadCloud, Copy, Check, Trash2, X, Lock, Clock, FileText, Search, Loader2, Plus, FilePlus, FolderPlus } from 'lucide-react';
import { API, fmt, getJSON, upload, copyText } from '../api';

function Ring({ p = 0, busy, children }) {
  const C = 2 * Math.PI * 90;
  return (
    <div className="relative mx-auto h-64 w-64 sm:h-72 sm:w-72">
      {!busy && <><span className="absolute inset-0 animate-ring rounded-full border-2 border-white/70" /><span className="absolute inset-0 animate-ring rounded-full border-2 border-white/70 [animation-delay:1.2s]" /></>}
      <svg viewBox="0 0 200 200" className={`absolute inset-0 -rotate-90 ${busy ? '' : 'animate-spin-slow'}`}>
        <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#fcd34d" /></linearGradient></defs>
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="10" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={busy ? C : `${C * 0.28} ${C}`} strokeDashoffset={busy ? C * (1 - p) : 0} />
      </svg>
      <div className="absolute inset-5 grid place-items-center rounded-full bg-white shadow-xl shadow-sky-200/70">{children}</div>
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [ok, setOk] = useState(false);
  return <button className="btn-ghost !px-3 !py-2 text-sm" onClick={async () => { await copyText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? <Check size={16} /> : <Copy size={16} />}{ok ? 'Copied' : label}</button>;
}

function SendPanel({ cfg }) {
  const [files, setFiles] = useState([]);
  const [stage, setStage] = useState('idle');
  const [p, setP] = useState(0);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [drag, setDrag] = useState(false);
  const [o, setO] = useState(() => { try { const p = ['all', 'prefs'].includes(localStorage.getItem('alvishare-consent')) && JSON.parse(localStorage.getItem('alvishare-prefs')); return { expiryMinutes: 30, maxDownloads: 0, ...p, password: '' }; } catch { return { expiryMinutes: 30, maxDownloads: 0, password: '' }; } });
  const inp = useRef();
  const dir = useRef();
  const consent = () => { try { return localStorage.getItem('alvishare-consent'); } catch { return null; } };

  const add = (list) => {
    const arr = [...list];
    const big = arr.find((f) => cfg && f.size > cfg.maxFileSizeBytes);
    if (big) return setErr(`"${big.name}" is larger than the ${cfg.maxFileSizeMB} MB limit`);
    setErr(''); setFiles((f) => [...f, ...arr].slice(0, cfg?.maxFilesPerShare || 10)); setStage('ready');
  };
  const go = async () => {
    setStage('uploading'); setP(0); setErr('');
    try { if (['all', 'prefs'].includes(consent())) localStorage.setItem('alvishare-prefs', JSON.stringify({ expiryMinutes: o.expiryMinutes, maxDownloads: o.maxDownloads })); } catch { /* ignore */ }
    try { setRes(await upload(files, o, setP)); setStage('done'); } catch (e) { setErr(e.message); setStage('ready'); }
  };
  const reset = () => { setFiles([]); setRes(null); setStage('idle'); setP(0); setO((x) => ({ ...x, password: '' })); };
  const remove = async () => {
    await fetch(`${API}/shares/${res.key}`, { method: 'DELETE', headers: { 'x-delete-token': res.deleteToken } }).catch(() => {});
    reset();
  };

  if (stage === 'done') return (
    <div className="card mx-auto max-w-md text-center">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check /></div>
      <p className="text-sm text-slate-500">Share this key with the receiver</p>
      <div className="my-2 select-all font-mono text-5xl font-black tracking-[.25em] text-sky-600">{res.key}</div>
      <img src={`${API}/shares/${res.key}/qr?size=420`} alt="QR code" className="mx-auto my-3 h-48 w-48 rounded-2xl ring-4 ring-sky-100" />
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Clock size={14} />Expires {new Date(res.expiresAt).toLocaleTimeString()}</span>
        <span>{res.files.length} file{res.files.length > 1 ? 's' : ''} · {fmt(res.totalSize)}</span>
        {res.passwordProtected && <span className="inline-flex items-center gap-1"><Lock size={14} />Password</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <CopyBtn text={res.key} label="Copy key" /><CopyBtn text={res.urls.receive} label="Copy link" />
        <button className="btn-ghost !px-3 !py-2 text-sm text-rose-600" onClick={remove}><Trash2 size={16} />Delete</button>
      </div>
      <button className="btn-primary mt-5 w-full" onClick={reset}><Plus size={18} />Send more files</button>
    </div>
  );

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
      className={`rounded-[2.5rem] p-4 transition ${drag ? 'bg-sky-200/60 ring-4 ring-sky-400' : ''}`}>
      <input ref={inp} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <input ref={dir} type="file" webkitdirectory="" hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <Ring busy={stage === 'uploading'} p={p}>
        {stage === 'uploading' ? <div className="text-center"><div className="text-4xl font-black text-sky-600">{Math.round(p * 100)}%</div><div className="text-xs text-slate-500">Uploading…</div></div>
          : <button onClick={() => inp.current.click()} className="group flex h-full w-full flex-col items-center justify-center rounded-full transition hover:scale-95">
              <UploadCloud size={40} className="text-sky-500 transition group-hover:-translate-y-1" />
              <span className="mt-1 text-3xl font-black text-sky-600">{stage === 'ready' ? 'Add more' : 'Start'}</span>
              <span className="mt-1 px-6 text-center text-xs text-slate-500">Click or drop files here</span>
            </button>}
      </Ring>
      {stage === 'idle' && (
        <div className="relative mx-auto mt-6 w-64 animate-pop rounded-2xl bg-white p-4 text-center shadow-xl shadow-sky-700/20">
          <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
          <p className="text-sm text-slate-600">Click or drag-and-drop<br />your files here</p>
          <div className="my-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
          <div className="flex justify-center gap-8 text-sky-600">
            <button onClick={() => inp.current.click()} aria-label="Choose files" className="rounded-xl p-2 transition hover:-translate-y-1 hover:bg-sky-50"><FilePlus size={28} /></button>
            <button onClick={() => dir.current.click()} aria-label="Choose a folder" className="rounded-xl p-2 transition hover:-translate-y-1 hover:bg-sky-50"><FolderPlus size={28} /></button>
          </div>
        </div>
      )}
      {err && <p className="mx-auto mt-4 max-w-md rounded-xl bg-rose-50 p-3 text-center text-sm text-rose-600">{err}</p>}
      {stage === 'ready' && (
        <div className="card mx-auto mt-6 max-w-md space-y-3">
          <ul className="max-h-40 space-y-1 overflow-auto">
            {files.map((f, i) => <li key={i} className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm"><FileText size={16} className="shrink-0 text-sky-500" /><span className="truncate">{f.name}</span><span className="ml-auto shrink-0 text-xs text-slate-500">{fmt(f.size)}</span><button onClick={() => setFiles(files.filter((_, j) => j !== i)) || (files.length === 1 && setStage('idle'))} className="text-slate-400 hover:text-rose-500"><X size={16} /></button></li>)}
          </ul>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
            <label>Expires after<select className="field mt-1 !py-2" value={o.expiryMinutes} onChange={(e) => setO({ ...o, expiryMinutes: e.target.value })}>{[[10, '10 minutes'], [30, '30 minutes'], [60, '1 hour'], [360, '6 hours'], [1440, '24 hours']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label>Downloads<select className="field mt-1 !py-2" value={o.maxDownloads} onChange={(e) => setO({ ...o, maxDownloads: e.target.value })}>{[[0, 'Unlimited'], [1, 'One time'], [5, '5 times'], [10, '10 times']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          </div>
          <input className="field" type="password" placeholder="Password (optional)" value={o.password} onChange={(e) => setO({ ...o, password: e.target.value })} />
          <button className="btn-primary w-full" onClick={go}><Send size={18} />Create key &amp; share</button>
        </div>
      )}
    </div>
  );
}

function ReceivePanel({ initKey }) {
  const [key, setKey] = useState(initKey || '');
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const find = async (k = key) => {
    k = k.trim(); if (!k) return;
    setBusy(true); setErr(''); setInfo(null);
    try { setInfo(await getJSON(`${API}/shares/${encodeURIComponent(k)}`)); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  useEffect(() => { if (initKey) find(initKey); }, []); // eslint-disable-line
  const dl = (id) => { const q = new URLSearchParams(); if (id) q.set('file', id); if (pw) q.set('password', pw); const s = q.toString(); return `${API}/shares/${info.key}/download${s ? '?' + s : ''}`; };

  return (
    <div className="card mx-auto max-w-md">
      <label className="text-sm font-semibold text-slate-500">Enter the key you received</label>
      <div className="mt-2 flex gap-2">
        <input className="field text-center font-mono text-2xl font-bold uppercase tracking-[.3em]" value={key} maxLength={12} placeholder="••••••" onChange={(e) => setKey(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && find()} />
        <button className="btn-primary !px-4" onClick={() => find()} disabled={busy} aria-label="Find files">{busy ? <Loader2 className="animate-spin" /> : <Search />}</button>
      </div>
      {err && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-center text-sm text-rose-600">{err}</p>}
      {info && (
        <div className="mt-4 animate-pop space-y-3">
          <ul className="space-y-1">
            {info.files.map((f) => <li key={f.id} className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm"><FileText size={16} className="shrink-0 text-sky-500" /><span className="truncate">{f.name}</span><span className="ml-auto shrink-0 text-xs text-slate-500">{fmt(f.size)}</span>{info.files.length > 1 && <a href={dl(f.id)} className="text-sky-600 hover:text-sky-800" aria-label={`Download ${f.name}`}><Download size={16} /></a>}</li>)}
          </ul>
          <p className="flex items-center justify-center gap-1 text-xs text-slate-500"><Clock size={14} />Expires {new Date(info.expiresAt).toLocaleTimeString()}{info.remainingDownloads !== null && ` · ${info.remainingDownloads} download(s) left`}</p>
          {info.passwordProtected && <input className="field" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />}
          <a href={dl()} className="btn-primary w-full"><Download size={18} />Download {info.files.length > 1 ? 'all (zip)' : 'file'}</a>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { key } = useParams();
  const [mode, setMode] = useState(key ? 'receive' : 'send');
  const [cfg, setCfg] = useState(null);
  useEffect(() => { getJSON(API + '/config').then(setCfg).catch(() => {}); }, []);
  const facts = cfg ? [['0', 'sign-ups needed'], [`${cfg.maxFileSizeMB} MB`, 'max per file'], [`${Math.round(cfg.maxExpiryMinutes / 60)} h`, 'longest expiry'], ['P2P', 'nearby mode']] : [];
  return (
    <section className="pb-28">
      <div className="mx-auto mb-6 max-w-2xl pt-4 text-center text-white [text-shadow:0_2px_14px_rgba(3,105,161,.5)]">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Send it. Share the key. Done.</h1>
        <p className="mt-3 text-lg text-sky-50">Alvishare is a simple, private way to move files and folders between your devices.</p>
      </div>
      {mode === 'send' ? <SendPanel cfg={cfg} /> : <ReceivePanel initKey={key} />}
      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 text-center text-white [text-shadow:0_1px_8px_rgba(3,105,161,.5)] sm:grid-cols-4">
        {facts.map(([n, l]) => <div key={l}><div className="text-2xl font-extrabold text-amber-200">{n}</div><div className="text-xs">{l}</div></div>)}
      </div>
      <div className="fixed bottom-5 right-5 z-30 inline-flex rounded-full bg-white p-1.5 shadow-2xl shadow-sky-800/30">
        {[['send', 'Send'], ['receive', 'Receive']].map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-full px-7 py-3 text-lg font-extrabold transition hover:scale-105 ${mode === m ? 'bg-gradient-to-r from-amber-300 to-yellow-300 text-slate-900 shadow' : 'text-slate-700'}`}>{l}</button>
        ))}
      </div>
    </section>
  );
}
