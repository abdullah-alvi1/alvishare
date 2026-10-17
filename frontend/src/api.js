export const API = '/api/v1';
export const EMAIL = 'abdullahalvi.tech@gmail.com';
export const fmt = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

export async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

export function upload(files, opts, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    Object.entries(opts).forEach(([k, v]) => v !== '' && v != null && fd.append(k, v));
    const x = new XMLHttpRequest();
    x.open('POST', API + '/shares');
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      let j = {};
      try { j = JSON.parse(x.responseText); } catch { /* ignore */ }
      x.status === 201 ? resolve(j) : reject(new Error(j.error || 'Upload failed'));
    };
    x.onerror = () => reject(new Error('Network error - is the server running?'));
    x.send(fd);
  });
}

// clipboard API needs https; fall back for plain-http LAN use
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return; } catch { /* fall through */ }
  const t = Object.assign(document.createElement('textarea'), { value: text });
  document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
}
