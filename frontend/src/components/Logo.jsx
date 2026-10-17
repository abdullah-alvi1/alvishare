// Alvishare mark: three connected nodes forming an "A" - a tiny network, a file hopping between devices.
export default function Logo({ size = 40, text = true, light = false }) {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 48 48" className="transition duration-300 group-hover:rotate-6 group-hover:scale-110" aria-hidden="true">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
        <rect width="48" height="48" rx="14" fill="url(#lg)" />
        <g stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M24 11 13 35M24 11l11 24" /><path d="M17.5 27h13" strokeDasharray="2 4" className="animate-pulse" /></g>
        <g fill="#fff"><circle cx="24" cy="11" r="4.5" /><circle cx="13" cy="35" r="4.5" /><circle cx="35" cy="35" r="4.5" /></g>
      </svg>
      {text && <span className={`text-2xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-800'}`}>Alvi<span className={light ? 'text-amber-300' : 'text-sky-500'}>share</span></span>}
    </span>
  );
}
