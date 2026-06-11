const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'admin',
  },
  // Bumped on credential change to invalidate all previously-issued tokens
  tokenVersion: {
    type: Number,
    default: 0,
  },
  lastLoginAt: Date,
}, {
  timestamps: true,
});

module.exports = mongoose.model('Admin', adminSchema);
