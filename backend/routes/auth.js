const express = require('express');
const { login, me, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimit');

const router = express.Router();

// Strict limiter on login to slow brute-force attempts
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in a few minutes.',
});

router.post('/login', loginLimiter, login);
router.get('/me', protect, me);
router.post('/change-password', protect, changePassword);

module.exports = router;
