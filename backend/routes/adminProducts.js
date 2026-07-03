const express = require('express');
const {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  togglePublishStatus
} = require('../controllers/productController');

const router = express.Router();

// Map admin routes to standard HTTP verbs
// These will be mounted at /api/admin/products
router.route('/')
  .get(getAdminProducts)
  .post(createProduct);

router.route('/:id')
  .put(updateProduct)
  .patch(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/toggle', togglePublishStatus);

module.exports = router;
