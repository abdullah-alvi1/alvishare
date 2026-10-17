import { Link } from 'react-router-dom';
import { Upload, KeyRound, Download, QrCode, Radio, ShieldCheck, Timer, Zap, Mail, Ghost } from 'lucide-react';
import { EMAIL } from '../api';

const Page = ({ title, sub, children }) => (
  <article className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-6 shadow-2xl shadow-sky-700/20 backdrop-blur sm:p-8">
    <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
    {sub && <p className="mt-2 text-slate-600">{sub}</p>}
    <div className="mt-6 space-y-4 text-slate-700">{children}</div>
  </article>
);
const Tile = ({ icon: Icon, title, children }) => (
  <div className="card transition hover:-translate-y-1 hover:shadow-2xl">
    <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-600"><Icon size={22} /></div>
    <h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-slate-600">{children}</p>
  </div>
);

export const About = ({ notFound }) => (
  <Page title={notFound ? 'Page not found' : 'About Alvishare'} sub={notFound ? 'That page does not exist - but your files can still travel.' : 'File sharing that feels like handing someone a note.'}>
    {notFound ? <Link to="/" className="btn-primary w-fit">Back to sharing</Link> : <>
      <p>Alvishare lets you send files to any device on the same WiFi using a short key or a QR code. No accounts, no apps to install, no ads. Upload, share the key, done.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Tile icon={Ghost} title="No sign-up">There is nothing to register. Open the page and share.</Tile>
        <Tile icon={Timer} title="Self-destructing">Every share expires, and can be limited to one download.</Tile>
        <Tile icon={Radio} title="Peer-to-peer">Nearby mode sends files directly between devices with WebRTC.</Tile>
        <Tile icon={ShieldCheck} title="Private by design">Optional passwords and random, hard-to-guess keys.</Tile>
      </div>
      <p>Built and maintained by Abdullah Alvi. Questions or ideas? <Link to="/contact" className="text-sky-600 underline">Get in touch</Link>.</p>
    </>}
  </Page>
);

export const Usage = () => (
  <Page title="How to use Alvishare" sub="Four steps, no learning curve.">
    <div className="grid gap-4 sm:grid-cols-2">
      <Tile icon={Upload} title="1. Send">On the Share page, click Start (or drop files), choose expiry and options, then press Create key.</Tile>
      <Tile icon={KeyRound} title="2. Share the key">Give the receiver the 6-character key, or the link. Tap Copy key to paste it into a chat.</Tile>
      <Tile icon={QrCode} title="3. Or scan">The receiver can scan the QR code with their phone camera to open the download directly.</Tile>
      <Tile icon={Download} title="4. Receive">On the Receive tab, type the key and download. Multiple files arrive as a zip.</Tile>
    </div>
    <div className="card"><h3 className="flex items-center gap-2 font-bold"><Zap size={18} className="text-sky-500" />Tips</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>Both devices must open the same address (e.g. the Network URL shown when the server starts), not "localhost".</li>
        <li>Choose "One time" so the file is deleted right after the first download.</li>
        <li>Use <Link to="/nearby" className="text-sky-600 underline">Nearby</Link> to send straight to a device without uploading.</li>
        <li>Keys are not case-sensitive.</li>
      </ul></div>
  </Page>
);

export const Privacy = () => (
  <Page title="Privacy &amp; cookies" sub="Short version: we keep as little as possible.">
    <p><b>Files.</b> Uploaded files are stored only until the share expires or reaches its download limit, then deleted automatically. Nearby transfers never touch the server.</p>
    <p><b>Cookies.</b> Alvishare sets no tracking, analytics or advertising cookies. Your cookie choice is saved in your browser's local storage so we don't ask again.</p>
    <p><b>Technical data.</b> The server briefly processes your IP address for rate limiting and for finding nearby devices on your network. Passwords are stored only as salted hashes.</p>
    <p><b>Questions.</b> Email <a className="text-sky-600 underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
  </Page>
);

export const Terms = () => (
  <Page title="Terms of use" sub="Please share responsibly.">
    <p>Use Alvishare only for files you have the right to share. Do not upload illegal, harmful or malicious content.</p>
    <p>Files are temporary and may be removed at any time. Alvishare is provided "as is" without warranty; keep your own copy of anything important.</p>
    <p>Anyone with the key (and password, if set) can download a share, so send keys only to the intended person.</p>
  </Page>
);

export const Contact = () => (
  <Page title="Contact" sub="Feedback, bugs or ideas - we'd love to hear them.">
    <a href={`mailto:${EMAIL}?subject=Alvishare%20feedback`} className="card block transition hover:-translate-y-1">
      <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-sky-600"><Mail /></div>
        <div><div className="font-bold">Email Abdullah Alvi</div><div className="text-sky-600">{EMAIL}</div></div></div>
    </a>
  </Page>
);
