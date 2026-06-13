const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/db');
const { protect } = require('./middleware/auth');
const createRateLimiter = require('./middleware/rateLimit');

// Load env vars
dotenv.config();

const app = express();

// Trust the first proxy (needed for correct req.ip behind hosts like Vercel/NGINX)
app.set('trust proxy', 1);

// Body parser with a size limit to reject oversized payloads
app.use(express.json({ limit: '1mb' }));

// CORS — restrict to known origins instead of a wildcard
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin / server-to-server / curl (no Origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel deployment domain (previews + production)
    try {
      if (new URL(origin).hostname.endsWith('.vercel.app')) return callback(null, true);
    } catch {}
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Security headers
app.use(helmet());

// Logging
app.use(morgan('dev'));

// Compression
app.use(compression());

// Global, lenient rate limiter for the whole API
app.use('/api', createRateLimiter({ windowMs: 60 * 1000, max: 200 }));

// Ensure the database is connected before handling any API request. On
// serverless the connection is cached across invocations, so this only pays
// the connect cost on a cold start.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({ success: false, message: 'Database unavailable. Please try again shortly.' });
  }
});

// ── Public routers ──
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));

// ── Admin auth (login is public + rate-limited inside the router) ──
app.use('/api/admin/auth', require('./routes/auth'));

// ── Protected admin routers — every route below requires a valid admin token ──
app.use('/api/admin/products', protect, require('./routes/adminProducts'));
app.use('/api/admin/categories', protect, require('./routes/adminCategories'));
app.use('/api/admin/banners', protect, require('./routes/adminBanners'));
app.use('/api/admin/orders', protect, require('./routes/adminOrders'));
app.use('/api/admin/settings', protect, require('./routes/adminSettings'));
app.use('/api/admin/upload', protect, require('./routes/upload'));

// Root route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Nalam Vaazha API' });
});

app.use((err, req, res, next) => {
  // CORS rejections and other errors
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5001;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
}

module.exports = app;
