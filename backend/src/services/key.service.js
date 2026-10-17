const crypto = require('crypto');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

const generateKey = (length = 6) =>
  Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
const generateToken = () => crypto.randomBytes(24).toString('hex');
const normalizeKey = (k) => String(k || '').trim().toUpperCase();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  const test = crypto.scryptSync(String(password), salt, 32);
  const real = Buffer.from(hash, 'hex');
  return test.length === real.length && crypto.timingSafeEqual(test, real);
}

module.exports = { generateKey, generateToken, normalizeKey, hashPassword, verifyPassword };
