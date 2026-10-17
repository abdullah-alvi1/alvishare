const os = require('os');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out.sort((a, b) => Number(b.startsWith('192.168.')) - Number(a.startsWith('192.168.')));
}

const subnetOf = (ip) => ip.split('.').slice(0, 3).join('.');

/** Devices on the same WiFi share a LAN /24 (or the same public IP when remote). */
function networkIdFromIp(rawIp) {
  const ip = (rawIp || '').replace(/^::ffff:/, '');
  if (ip === '::1' || ip === '127.0.0.1' || ip === '') {
    const lan = lanAddresses()[0];
    return lan ? `lan:${subnetOf(lan)}` : 'local';
  }
  if (PRIVATE.test(ip)) return `lan:${subnetOf(ip)}`;
  return `ip:${ip}`;
}

function getBaseUrl(req) {
  if (config.publicUrl) return config.publicUrl;
  const host = req.get('host') || `localhost:${config.port}`;
  const hostname = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    const lan = lanAddresses()[0];
    if (lan) return `${req.protocol}://${lan}:${config.port}`; // phones can't reach "localhost"
  }
  return `${req.protocol}://${host}`;
}

function sanitizeFilename(name) {
  let n = path.basename(String(name || 'file'));
  // multer decodes multipart names as latin1; repair UTF-8 names
  if (/[\u0080-\u00ff]/.test(n) && !/[^\u0000-\u00ff]/.test(n)) {
    const fixed = Buffer.from(n, 'latin1').toString('utf8');
    if (!fixed.includes('\ufffd')) n = fixed;
  }
  n = n.replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').trim().slice(0, 200);
  return n || 'file';
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = { lanAddresses, networkIdFromIp, getBaseUrl, sanitizeFilename, safeEqual };
