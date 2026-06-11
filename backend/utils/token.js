const crypto = require('crypto');

// Minimal JWT (HS256) implementation using Node crypto — no external dependency.

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is not configured (min 16 chars). Set it in backend/.env');
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJSON(obj) {
  return base64url(JSON.stringify(obj));
}

function sign(payload, expiresInSeconds = 60 * 60 * 8) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const headerB64 = base64urlJSON(header);
  const bodyB64 = base64urlJSON(body);
  const data = `${headerB64}.${bodyB64}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${signature}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, signature] = parts;
  const data = `${headerB64}.${bodyB64}`;
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  // Constant-time signature comparison
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(bodyB64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    return null; // expired
  }
  return payload;
}

module.exports = { sign, verify };
