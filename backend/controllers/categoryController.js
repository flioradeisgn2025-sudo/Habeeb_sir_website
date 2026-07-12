const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Category = require('../models/Category');

function slugify(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// The client may reference a category by Mongo id or by slug (demo categories
// only have slugs). Never let a non-ObjectId reach findById — it throws.
async function findCategoryByIdOrSlug(id) {
  if (mongoose.isValidObjectId(id)) {
    const byId = await Category.findById(id);
    if (byId) return byId;
  }
  return Category.findOne({ slug: id });
}

// The admin form sends `image` as a plain URL/data-URL string; the schema
// stores { url, publicId }.
function normalizeImage(image) {
  if (image === undefined) return undefined;
  if (typeof image === 'string') return { url: image };
  return image;
}

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort('displayOrder');
  res.status(200).json({ success: true, count: categories.length, data: categories });
});

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Admin
exports.createCategory = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  const base = slugify(req.body.slug || name) || 'category';
  let slug = base;
  let n = 1;
  while (await Category.exists({ slug })) slug = `${base}-${++n}`;

  const category = await Category.create({
    name,
    slug,
    image: normalizeImage(req.body.image) || {},
    displayOrder: req.body.displayOrder !== undefined ? req.body.displayOrder : await Category.countDocuments(),
  });
  res.status(201).json({ success: true, data: category });
});

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Admin
exports.updateCategory = asyncHandler(async (req, res) => {
  let category = await findCategoryByIdOrSlug(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  const updates = { ...req.body };
  if (updates.image !== undefined) updates.image = normalizeImage(updates.image);
  if (updates.slug !== undefined) updates.slug = slugify(updates.slug);
  category = await Category.findByIdAndUpdate(category._id, updates, { new: true, runValidators: true });
  res.status(200).json({ success: true, data: category });
});

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Admin
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await findCategoryByIdOrSlug(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  // Optional: Check if products exist in category before deleting
  await category.deleteOne();
  res.status(200).json({ success: true, data: {} });
});
