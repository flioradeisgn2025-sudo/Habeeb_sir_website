const asyncHandler = require('../middleware/asyncHandler');
const Admin = require('../models/Admin');
const { hashPassword, verifyPassword } = require('../utils/password');
const { sign } = require('../utils/token');

const crypto = require('crypto');

// In production, refuse to seed a guessable default. Locally fall back to a
// known dev default for convenience.
function defaultPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production') {
    const random = crypto.randomBytes(12).toString('base64url');
    console.warn(`[auth] ADMIN_PASSWORD not set — generated a random one: ${random}`);
    return random;
  }
  return 'admin123';
}

const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_PASSWORD = defaultPassword();
const TOKEN_TTL = 60 * 60 * 8; // 8 hours

// Ensure a default admin exists (first-run bootstrap). Safe to call repeatedly.
async function ensureDefaultAdmin() {
  const count = await Admin.estimatedDocumentCount();
  if (count === 0) {
    await Admin.create({
      username: DEFAULT_USERNAME.toLowerCase(),
      passwordHash: hashPassword(DEFAULT_PASSWORD),
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded default admin "${DEFAULT_USERNAME}".`);
  }
}

// @desc    Admin login -> issue JWT
// @route   POST /api/admin/auth/login
// @access  Public (rate-limited)
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  await ensureDefaultAdmin();

  const admin = await Admin.findOne({ username: String(username).toLowerCase().trim() });

  // Always run a hash comparison to keep timing uniform whether or not the
  // user exists (mitigates username enumeration).
  const ok = admin
    ? verifyPassword(password, admin.passwordHash)
    : verifyPassword(password, hashPassword('decoy-not-a-real-password'));

  if (!admin || !ok) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = sign({ sub: String(admin._id), username: admin.username, role: 'admin', tv: admin.tokenVersion || 0 }, TOKEN_TTL);

  res.status(200).json({
    success: true,
    data: { token, username: admin.username, expiresIn: TOKEN_TTL },
  });
});

// @desc    Current admin (token check)
// @route   GET /api/admin/auth/me
// @access  Admin
exports.me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { username: req.admin.username } });
});

// @desc    Change admin credentials
// @route   POST /api/admin/auth/change-password
// @access  Admin
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body || {};

  const admin = await Admin.findById(req.admin.id);
  if (!admin) {
    return res.status(404).json({ success: false, message: 'Admin account not found' });
  }

  if (!currentPassword || !verifyPassword(currentPassword, admin.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  if (newPassword && String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  if (newUsername) admin.username = String(newUsername).toLowerCase().trim();
  if (newPassword) admin.passwordHash = hashPassword(newPassword);
  // Invalidate every previously-issued token (other sessions are logged out)
  admin.tokenVersion = (admin.tokenVersion || 0) + 1;
  await admin.save();

  // Issue a fresh token so the admin who made the change stays logged in
  const token = sign({ sub: String(admin._id), username: admin.username, role: 'admin', tv: admin.tokenVersion }, TOKEN_TTL);

  res.status(200).json({ success: true, data: { username: admin.username, token } });
});

exports.ensureDefaultAdmin = ensureDefaultAdmin;
