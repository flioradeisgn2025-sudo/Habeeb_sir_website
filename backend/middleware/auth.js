const { verify } = require('../utils/token');
const Admin = require('../models/Admin');

// Require a valid admin Bearer token on protected routes. Also checks the
// token's version against the DB so a credential change revokes old tokens.
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const payload = verify(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }

  let admin;
  try {
    admin = await Admin.findById(payload.sub).select('tokenVersion username');
  } catch {
    return res.status(500).json({ success: false, message: 'Auth check failed' });
  }

  if (!admin || (admin.tokenVersion || 0) !== (payload.tv || 0)) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }

  req.admin = { id: String(admin._id), username: admin.username };
  next();
}

module.exports = { protect };
