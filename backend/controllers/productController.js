const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Accept a category as either a Mongo ObjectId or a slug (the frontend may
// hold either depending on where its category list came from). If the
// category isn't in the database yet but the client sent its details
// (categoryData), create it — this covers the built-in demo categories that
// exist in the UI before anything was ever saved to the database.
async function resolveCategoryId(value, categoryData) {
  const raw = value && typeof value === 'object' ? (value._id || value.slug) : value;
  if (raw) {
    if (mongoose.isValidObjectId(raw)) {
      const byId = await Category.findById(raw).select('_id');
      if (byId) return byId._id;
    }
    const bySlug = await Category.findOne({ slug: raw }).select('_id');
    if (bySlug) return bySlug._id;
  }

  if (categoryData && categoryData.name) {
    const slug = slugify(categoryData.slug || categoryData.name);
    if (!slug) return null;
    const existing = await Category.findOne({ $or: [{ slug }, { name: categoryData.name }] }).select('_id');
    if (existing) return existing._id;
    const created = await Category.create({
      name: categoryData.name,
      slug,
      image: typeof categoryData.image === 'string' ? { url: categoryData.image } : (categoryData.image || {}),
      displayOrder: await Category.countDocuments(),
    });
    return created._id;
  }
  return null;
}

function slugify(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Look up a product by Mongo id without throwing a CastError when the client
// sends a non-database id (e.g. a demo-catalog id like "ap-001").
async function findProductById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Product.findById(id);
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
  const product = mongoose.isValidObjectId(req.params.id)
    ? await Product.findById(req.params.id).populate('category', 'name slug')
    : null;
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

  const categoryId = await resolveCategoryId(req.body.category, req.body.categoryData);
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

// @desc    Import the starter catalog into a never-used database
// @route   POST /api/admin/products/import
// @access  Admin
exports.importProducts = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.products) ? req.body.products : [];

  // Only seed a database that has never held a product. Deletes are soft
  // (isDeleted flag), so even a fully emptied catalog leaves documents behind
  // — which is exactly what stops deleted demo products from coming back.
  const everHadProducts = await Product.countDocuments({});
  if (everHadProducts > 0) {
    return res.status(200).json({ success: true, data: { imported: 0 } });
  }

  let imported = 0;
  for (const item of items) {
    if (!item || !item.name || !item.description || item.price === undefined) continue;
    const categoryId = await resolveCategoryId(item.category, item.categoryData);
    if (!categoryId) continue;
    const images = normalizeImages(item.images) || [];
    if (!images.length) continue;
    if (await Product.exists({ name: item.name })) continue;

    await Product.create({
      name: item.name,
      slug: await uniqueProductSlug(item.name),
      description: item.description,
      category: categoryId,
      price: Number(item.price),
      salePrice: item.salePrice !== undefined && item.salePrice !== '' && item.salePrice !== null ? Number(item.salePrice) : null,
      stock: item.stock !== undefined && item.stock !== '' ? Number(item.stock) : 100,
      unit: item.unit || '',
      ingredients: item.ingredients || '',
      badge: item.badge || null,
      tags: item.tags,
      isPublished: true,
      images,
    });
    imported++;
  }

  res.status(200).json({ success: true, data: { imported } });
});

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  let product = await findProductById(req.params.id);
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
    const categoryId = await resolveCategoryId(req.body.category, req.body.categoryData);
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
  const product = await findProductById(req.params.id);
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
  const product = await findProductById(req.params.id);
  if (!product || product.isDeleted) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  product.isPublished = !product.isPublished;
  await product.save();
  await product.populate('category', 'name slug');
  res.status(200).json({ success: true, data: product });
});
