const express = require('express');
const {
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

// Mount at /api/admin/categories
router.post('/', createCategory);
router.route('/:id')
  .put(updateCategory)
  .patch(updateCategory)
  .delete(deleteCategory);

module.exports = router;
