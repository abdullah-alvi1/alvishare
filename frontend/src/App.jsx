import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Cookie, Mail, Menu, X } from 'lucide-react';
import Logo from './components/Logo';
import Scene from './components/Scene';
import Home from './pages/Home';
import Nearby from './pages/Nearby';
import { About, Usage, Privacy, Terms, Contact } from './pages/Pages';
import { EMAIL } from './api';

const links = [['/', 'Share'], ['/nearby', 'Nearby'], ['/usage', 'How to use'], ['/about', 'About'], ['/contact', 'Contact']];

function CookieBanner() {
  const [show, setShow] = useState(false);
  const [more, setMore] = useState(false);
  const [prefs, setPrefs] = useState(true);
  useEffect(() => { try { setShow(!localStorage.getItem('alvishare-consent')); } catch { setShow(true); } }, []);
  const choose = (v) => { try { localStorage.setItem('alvishare-consent', v); } catch { /* ignore */ } setShow(false); };
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[calc(100%-2rem)] max-w-sm animate-pop rounded-3xl bg-white p-6 shadow-2xl shadow-sky-900/30">
      <h2 className="text-2xl font-extrabold">Welcome to Alvishare</h2>
      <p className="mt-1 text-slate-600">Share files with a key. No sign-up.</p>
      <div className="mt-3 rounded-2xl bg-sky-50 p-4 text-sm text-slate-600"><Cookie size={18} className="mb-1 text-sky-500" />We set no tracking cookies. This choice is kept on your device, and with your OK we also remember your last sending options. <Link to="/privacy" className="text-sky-600 underline">Privacy</Link></div>
      {more && <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-sky-500" checked={prefs} onChange={(e) => setPrefs(e.target.checked)} />Remember my sending options</label>}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button className="btn-ghost !px-2 !py-2.5" onClick={() => choose('essential')}>Reject</button>
        <button className="btn-ghost !px-2 !py-2.5" onClick={() => (more ? choose(prefs ? 'prefs' : 'essential') : setMore(true))}>{more ? 'Save' : 'I choose'}</button>
        <button className="btn-primary !px-2 !py-2.5" onClick={() => choose('all')}>Fine with me</button>
      </div>
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Scene />
      <header className="sticky top-0 z-40 bg-sky-600/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/"><Logo light /></Link>
          <nav className="hidden gap-1 md:flex">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/25 ${isActive ? 'bg-white text-sky-700' : 'text-white'}`}>{label}</NavLink>
            ))}
          </nav>
          <button className="rounded-lg p-2 text-white hover:bg-white/25 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
        {open && <nav className="flex animate-pop flex-col border-t border-sky-100 bg-white p-2 md:hidden">{links.map(([to, label]) => <Link key={to} to={to} className="rounded-lg px-4 py-3 font-semibold hover:bg-sky-100">{label}</Link>)}</nav>}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:key" element={<Home />} />
          <Route path="/nearby" element={<Nearby />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<About notFound />} />
        </Routes>
      </main>

      <footer className="border-t border-sky-100 bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
          <div><Logo size={32} /><p className="mt-3 text-sm text-slate-500">Fast, private file sharing. No sign-up, just a key.</p></div>
          <div className="text-sm"><div className="mb-2 font-bold">Explore</div><div className="flex flex-col gap-1 text-slate-600">{[...links, ['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([to, l]) => <Link key={to} to={to} className="w-fit hover:text-sky-600">{l}</Link>)}</div></div>
          <div className="text-sm"><div className="mb-2 font-bold">Made by Abdullah Alvi</div><a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-sky-600"><Mail size={16} />{EMAIL}</a></div>
        </div>
        <div className="border-t border-sky-100 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Alvishare. All rights reserved.</div>
      </footer>
      <CookieBanner />
    </div>
  );
}
