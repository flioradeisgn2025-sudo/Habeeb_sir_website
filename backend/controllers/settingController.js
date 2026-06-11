const asyncHandler = require('../middleware/asyncHandler');
const Setting = require('../models/Setting');

// @desc    Get store settings
// @route   GET /api/settings
// @access  Public
exports.getSettings = asyncHandler(async (req, res) => {
  let settings = await Setting.findOne();
  
  if (!settings) {
    // Return default settings if none exist
    settings = {
      businessName: 'Nalam Vaazha',
      whatsappNumber: '918778836682',
      deliveryCharge: 0,
      currencySymbol: '₹',
    };
  }

  res.status(200).json({ success: true, data: settings });
});

// --- ADMIN ROUTES ---

// @desc    Update store settings
// @route   PUT /api/admin/settings
// @access  Admin
exports.updateSettings = asyncHandler(async (req, res) => {
  let settings = await Setting.findOne();

  if (settings) {
    // Update existing
    settings = await Setting.findOneAndUpdate({}, req.body, {
      new: true,
      runValidators: true,
    });
  } else {
    // Create new
    settings = await Setting.create(req.body);
  }

  res.status(200).json({ success: true, data: settings });
});
