const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    default: null,
  },
  unit: {
    type: String,
    default: '',
  },
  ingredients: {
    type: String,
    default: '',
  },
  badge: {
    type: String,
    default: null,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  images: [
    {
      url: { type: String, required: true },
      publicId: { type: String, default: '' },
      isPrimary: { type: Boolean, default: false },
    }
  ],
  specifications: [
    {
      key: { type: String },
      value: { type: String },
    }
  ],
  tags: [String],
  isPublished: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Product', productSchema);
