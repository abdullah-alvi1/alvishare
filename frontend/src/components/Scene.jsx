// Illustrated sky scene (original artwork): clouds, folders, documents, wifi, servers and city.
const Cloud = ({ x, y, s = 1, o = 0.85, cls = '' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}><g className={`animate-float ${cls}`} fill="#fff">
    <ellipse rx="95" ry="28" /><circle cx="-32" cy="-20" r="32" /><circle cx="26" cy="-30" r="40" />
  </g></g>
);
const Folder = ({ x, y, r = 0, cls = '' }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}><g className={`animate-float ${cls}`}>
    <path d="M0 14a14 14 0 0 1 14-14h50l16 18h92a14 14 0 0 1 14 14v110a14 14 0 0 1-14 14H14A14 14 0 0 1 0 142z" fill="url(#fold)" />
    <rect x="14" y="40" width="158" height="10" rx="5" fill="#fff" opacity=".4" />
  </g></g>
);
const Doc = ({ x, y, r = 0, cls = '' }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}><g className={`animate-float ${cls}`}>
    <rect width="64" height="80" rx="8" fill="#fff" opacity=".95" />
    {[16, 30, 44, 58].map((t) => <rect key={t} x="12" y={t} width={t === 58 ? 24 : 40} height="5" rx="2.5" fill="#bae6fd" />)}
  </g></g>
);
const Wifi = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`} stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none"><path d="M-22-6a32 32 0 0 1 44 0M-13 4a19 19 0 0 1 26 0" /><circle cy="14" r="2" fill="#fff" /></g>
);
const Badge = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}><g fill="#818cf8"><ellipse rx="34" ry="13" cy="6" /><circle cx="-10" cy="-6" r="15" /><circle cx="10" cy="-9" r="19" /></g>
    <path d="M0 14V-6M-8 2 0-6 8 2" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
);
const Spinner = ({ x, y }) => (
  <circle cx={x} cy={y} r="26" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="7" strokeDasharray="5 11" strokeLinecap="round" className="origin-center animate-spin-slow [transform-box:fill-box]" />
);
const Rack = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}><rect width="120" height="170" rx="12" fill="#dbeafe" stroke="#93c5fd" strokeWidth="4" />
    {[16, 66, 116].map((t) => <g key={t}><rect x="14" y={t} width="92" height="38" rx="7" fill="#93c5fd" /><circle cx="28" cy={t + 19} r="4" fill="#fff" /><rect x="44" y={t + 15} width="46" height="8" rx="4" fill="#fff" opacity=".7" /></g>)}</g>
);
const Building = ({ x, y, w, h }) => (
  <g transform={`translate(${x} ${y})`}><rect width={w} height={h} rx="10" fill="#7dd3fc" />
    {Array.from({ length: Math.floor(h / 46) }).flatMap((_, r) => Array.from({ length: Math.floor(w / 40) }).map((__, c) => <rect key={`${r}-${c}`} x={14 + c * 40} y={16 + r * 46} width="22" height="28" rx="5" fill="#fff" opacity=".65" />))}</g>
);

export default function Scene() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-sky-500 via-sky-300 to-sky-100" aria-hidden="true">
      <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <defs><linearGradient id="fold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#0284c7" /></linearGradient></defs>
        <Cloud x={230} y={170} s={1.3} cls="[animation-delay:1s]" /><Cloud x={1130} y={120} o={0.7} cls="[animation-delay:3s]" /><Cloud x={760} y={90} s={0.7} o={0.55} cls="[animation-delay:2s]" /><Cloud x={1330} y={330} s={1.1} o={0.6} />
        <g className="animate-float"><path d="M1180 215 1320 175 1250 265 1235 232z" fill="#fff" opacity=".9" /><path d="M1235 232 1320 175" stroke="#bae6fd" strokeWidth="3" /><path d="M1040 300q60-70 130-85" stroke="#fff" strokeWidth="3" strokeDasharray="6 8" fill="none" /></g>
        <Wifi x={420} y={300} /><Wifi x={1030} y={420} /><Wifi x={170} y={330} />
        <circle cx="720" cy="215" r="14" fill="none" stroke="#fb7185" strokeWidth="8" strokeDasharray="7 6" />
        {/* city */}
        <rect y="800" width="1440" height="100" fill="#bae6fd" />
        <Building x={1250} y={560} w={120} h={300} /><Building x={1140} y={650} w={90} h={210} /><Building x={30} y={640} w={100} h={230} />
        <Rack x={290} y={690} /><Rack x={1000} y={690} />
        <g transform="translate(670 740)"><path d="M0-30 40-14v34q0 28-40 44Q-40 48-40 20v-34z" fill="#38bdf8" /><rect x="-12" y="-4" width="24" height="22" rx="5" fill="#fff" /><path d="M-7-4v-8a7 7 0 0 1 14 0v8" stroke="#fff" strokeWidth="4" fill="none" /></g>
        <Cloud x={130} y={850} s={1.6} o={0.95} /><Cloud x={560} y={880} s={1.8} o={0.95} /><Cloud x={900} y={870} s={1.5} o={0.95} /><Cloud x={1320} y={860} s={1.7} o={0.95} />
        <Folder x={50} y={430} r={-8} cls="[animation-delay:.5s]" /><Folder x={1190} y={410} r={8} cls="[animation-delay:2.5s]" />
        <Doc x={240} y={470} r={-12} cls="[animation-delay:1.5s]" /><Doc x={1100} y={480} r={10} cls="[animation-delay:.8s]" /><Doc x={330} y={250} r={8} /><Doc x={1020} y={230} r={-8} cls="[animation-delay:2s]" />
        <Badge x={150} y={650} /><Badge x={1290} y={620} /><Spinner x={400} y={560} /><Spinner x={1060} y={600} />
      </svg>
    </div>
  );
}
