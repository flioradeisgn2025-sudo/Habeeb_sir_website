const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
// Configure properly for production
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Security headers
app.use(helmet());

// Logging
app.use(morgan('dev'));

// Compression
app.use(compression());

// Mount routers
app.use('/api/products', require('./routes/products'));
app.use('/api/admin/products', require('./routes/adminProducts'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin/categories', require('./routes/adminCategories'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/admin/banners', require('./routes/adminBanners'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin/orders', require('./routes/adminOrders'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin/settings', require('./routes/adminSettings'));
app.use('/api/admin/upload', require('./routes/upload'));

// Root route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Nalam Vaazha API' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
