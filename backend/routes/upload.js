const express = require('express');
const upload = require('../middleware/upload');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// @desc    Upload image to Cloudinary
// @route   POST /api/admin/upload
// @access  Admin
router.post('/', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file' });
  }

  // Convert buffer to a base64 data URI for Cloudinary upload
  const b64 = Buffer.from(req.file.buffer).toString('base64');
  const dataURI = `data:${req.file.mimetype};base64,${b64}`;

  // Upload to cloudinary
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'nalamvaazha',
    resource_type: 'image',
  });

  res.status(200).json({
    success: true,
    data: {
      url: result.secure_url,
      publicId: result.public_id,
    },
  });
}));

// @desc    Delete image from Cloudinary
// @route   DELETE /api/admin/upload
// @access  Admin
router.delete('/', asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  
  if (!publicId) {
    return res.status(400).json({ success: false, message: 'Public ID is required' });
  }

  const result = await cloudinary.uploader.destroy(publicId);
  
  res.status(200).json({ success: true, data: result });
}));

module.exports = router;
