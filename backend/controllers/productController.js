const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Accept a category as either a Mongo ObjectId or a slug (the frontend may
// hold either depending on where its category list came from).
async function resolveCategoryId(value) {
  if (!value) return null;
  const raw = typeof value === 'object' ? (value._id || value.slug) : value;
  if (mongoose.isValidObjectId(raw)) {
    const byId = await Category.findById(raw).select('_id');
    if (byId) return byId._id;
  }
  const bySlug = await Category.findOne({ slug: raw }).select('_id');
  return bySlug ? bySlug._id : null;
}

function slugify(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function uniqueProductSlug(name, excludeId) {
  const base = slugify(name) || 'product';
  let slug = base;
  let n = 1;
  const clash = async (s) => Product.exists(excludeId ? { slug: s, _id: { $ne: excludeId } } : { slug: s });
  while (await clash(slug)) slug = `${base}-${++n}`;
  return slug;
}

// Normalize whatever image shapes the client sends into the schema's shape.
function normalizeImages(images) {
  if (!Array.isArray(images)) return undefined;
  return images
    .map((img, i) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (!url) return null;
      return {
        url,
        publicId: (typeof img === 'object' && img.publicId) || '',
        isPrimary: typeof img === 'object' && img.isPrimary !== undefined ? img.isPrimary : i === 0,
      };
    })
    .filter(Boolean);
}

// @desc    Get all published products
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, search, sort } = req.query;
  const query = { isPublished: true, isDeleted: false };
  
  if (category) query.category = category;
  if (search) query.name = { $regex: search, $options: 'i' };
  
  let sortQuery = { createdAt: -1 }; // newest
  if (sort === 'price_asc') sortQuery = { price: 1 };
  if (sort === 'price_desc') sortQuery = { price: -1 };
  if (sort === 'name_asc') sortQuery = { name: 1 };

  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort(sortQuery);
    
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product || product.isDeleted || !product.isPublished) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.status(200).json({ success: true, data: product });
});

// --- ADMIN ROUTES ---

// @desc    Get all products (including drafts & deleted)
// @route   GET /api/admin/products
// @access  Admin
exports.getAdminProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isDeleted: false }).populate('category', 'name slug').sort('-createdAt');
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Create new product
// @route   POST /api/admin/products
// @access  Admin
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, salePrice, stock, unit, ingredients, badge, tags, isPublished, isFeatured } = req.body;

  if (!name || !description || price === undefined) {
    return res.status(400).json({ success: false, message: 'Name, description and price are required' });
  }

  const categoryId = await resolveCategoryId(req.body.category);
  if (!categoryId) {
    return res.status(400).json({ success: false, message: 'Unknown category — create the category first' });
  }

  const images = normalizeImages(req.body.images) || [];
  if (!images.length) {
    return res.status(400).json({ success: false, message: 'At least one product image is required' });
  }

  const product = await Product.create({
    name,
    slug: await uniqueProductSlug(name),
    description,
    category: categoryId,
    price: Number(price),
    salePrice: salePrice !== undefined && salePrice !== '' && salePrice !== null ? Number(salePrice) : null,
    stock: stock !== undefined && stock !== '' ? Number(stock) : 0,
    unit: unit || '',
    ingredients: ingredients || '',
    badge: badge || null,
    tags,
    isPublished: isPublished !== undefined ? isPublished : true,
    isFeatured: isFeatured !== undefined ? isFeatured : false,
    images,
  });
  await product.populate('category', 'name slug');
  res.status(201).json({ success: true, data: product });
});

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const updates = {};
  const { name, description, price, salePrice, stock, unit, ingredients, badge, tags, isPublished, isFeatured } = req.body;

  if (name !== undefined && name !== '') {
    updates.name = name;
    if (name !== product.name) updates.slug = await uniqueProductSlug(name, product._id);
  }
  if (description !== undefined && description !== '') updates.description = description;
  if (price !== undefined && price !== '' && !Number.isNaN(Number(price))) updates.price = Number(price);
  if (salePrice !== undefined) updates.salePrice = salePrice === '' || salePrice === null ? null : Number(salePrice);
  if (stock !== undefined && stock !== '' && !Number.isNaN(Number(stock))) updates.stock = Number(stock);
  if (unit !== undefined) updates.unit = unit;
  if (ingredients !== undefined) updates.ingredients = ingredients;
  if (badge !== undefined) updates.badge = badge || null;
  if (tags !== undefined) updates.tags = tags;
  if (isPublished !== undefined) updates.isPublished = isPublished;
  if (isFeatured !== undefined) updates.isFeatured = isFeatured;

  if (req.body.category !== undefined) {
    const categoryId = await resolveCategoryId(req.body.category);
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Unknown category' });
    }
    updates.category = categoryId;
  }

  const images = normalizeImages(req.body.images);
  if (images && images.length) updates.images = images;

  product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('category', 'name slug');
  res.status(200).json({ success: true, data: product });
});

// @desc    Delete product (soft delete)
// @route   DELETE /api/admin/products/:id
// @access  Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  product.isDeleted = true;
  await product.save();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Toggle publish status
// @route   PATCH /api/admin/products/:id/toggle
// @access  Admin
exports.togglePublishStatus = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  product.isPublished = !product.isPublished;
  await product.save();
  await product.populate('category', 'name slug');
  res.status(200).json({ success: true, data: product });
});
