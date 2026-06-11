const crypto = require('crypto');

// scrypt-based password hashing — no external dependency.
// Stored format: scrypt$<saltHex>$<hashHex>

const KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = crypto.scryptSync(String(password), salt, KEYLEN);
  // Constant-time comparison to avoid timing attacks
  if (hashBuf.length !== testBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, testBuf);
}

module.exports = { hashPassword, verifyPassword };
