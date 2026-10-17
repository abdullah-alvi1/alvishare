const QRCode = require('qrcode');
const { AppError } = require('../utils/errors');

const FORMATS = ['png', 'svg', 'dataurl'];

/**
 * Render a QR code.
 * @returns {{contentType:string, body:Buffer|string, json?:object}}
 */
async function render(text, { format = 'png', size = 320, dark = '#111827', light = '#ffffff' } = {}) {
  if (!text || text.length > 1000) throw new AppError(400, 'QR text is required (max 1000 chars)', 'INVALID_QR_TEXT');
  if (!FORMATS.includes(format)) throw new AppError(400, `format must be one of: ${FORMATS.join(', ')}`, 'INVALID_FORMAT');
  size = Math.min(Math.max(parseInt(size, 10) || 320, 128), 1024);
  const color = { dark, light };
  const opts = { width: size, margin: 2, errorCorrectionLevel: 'M', color };

  if (format === 'svg') return { contentType: 'image/svg+xml', body: await QRCode.toString(text, { ...opts, type: 'svg' }) };
  if (format === 'dataurl') return { contentType: 'application/json', json: { text, size, dataUrl: await QRCode.toDataURL(text, opts) } };
  return { contentType: 'image/png', body: await QRCode.toBuffer(text, { ...opts, type: 'png' }) };
}

module.exports = { render, FORMATS };
