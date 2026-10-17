const qr = require('../services/qr.service');
const { asyncHandler } = require('../utils/errors');
const { getBaseUrl, lanAddresses } = require('../utils/helpers');
const config = require('../config');
const { requireShare } = require('./shares.controller');

function send(res, out) {
  res.set('Cache-Control', 'no-store');
  if (out.json) return res.json(out.json);
  res.type(out.contentType).send(out.body);
}
const styleOpts = (q) => ({ format: q.format, size: q.size, dark: q.dark && `#${q.dark.replace('#', '')}`, light: q.light && `#${q.light.replace('#', '')}` });

/** GET /shares/:key/qr?target=receive|download&format=png|svg|dataurl&size=320 */
exports.forShare = asyncHandler(async (req, res) => {
  const share = requireShare(req);
  const base = getBaseUrl(req);
  const target = req.query.target === 'download'
    ? `${base}/api/v1/shares/${share.key}/download`
    : `${base}/r/${share.key}`;
  const out = await qr.render(target, styleOpts(req.query));
  if (out.json) out.json.url = target;
  send(res, out);
});

/** GET /qr?text=...  generic QR generator */
exports.generic = asyncHandler(async (req, res) => send(res, await qr.render(String(req.query.text || ''), styleOpts(req.query))));

/** GET /qr/connect  QR that opens Alvishare on a phone (uses your LAN address) */
exports.connect = asyncHandler(async (req, res) => {
  const url = getBaseUrl(req);
  const out = await qr.render(url, styleOpts(req.query));
  if (out.json) { out.json.url = url; out.json.lanAddresses = lanAddresses().map((ip) => `http://${ip}:${config.port}`); }
  send(res, out);
});
