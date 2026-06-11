const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Helper to generate ORD-YYYYMMDD-XXXX
const generateOrderId = async () => {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Find the last order of today
  const lastOrder = await Order.findOne({ orderId: new RegExp(`^ORD-${dateString}`) })
    .sort({ createdAt: -1 });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderId.split('-')[2]);
    seq = lastSeq + 1;
  }
  
  return `ORD-${dateString}-${seq.toString().padStart(4, '0')}`;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Public
// Trim + length-cap a string field to neutralise oversized/abusive input
const clean = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Clamp money to a finite, non-negative, sane range (rejects Infinity/NaN/abuse)
const MAX_MONEY = 1_000_000;
const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_MONEY);
};

exports.createOrder = asyncHandler(async (req, res) => {
  const { customer = {}, items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'No items in order' });
  }
  if (items.length > 200) {
    return res.status(400).json({ success: false, message: 'Too many items in order' });
  }

  // Whitelist customer fields — never trust the raw object
  const safeCustomer = {
    name: clean(customer.name, 120),
    phone: clean(customer.phone, 20),
    address: clean(customer.address, 500),
    notes: clean(customer.notes, 500),
  };
  if (!safeCustomer.name || !safeCustomer.phone || !safeCustomer.address) {
    return res.status(400).json({ success: false, message: 'Name, phone and address are required' });
  }

  // Look up authoritative prices from the DB so a tampered client can't fake
  // totals. Items with a valid product id use the DB price; for static/seed
  // products (no Mongo id) we fall back to the client price as a clamped value.
  const ids = items
    .map((it) => it.product)
    .filter((id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id));
  const dbProducts = ids.length ? await Product.find({ _id: { $in: ids } }) : [];
  const priceById = new Map(dbProducts.map((p) => [String(p._id), p]));

  const safeItems = items.map((it) => {
    const dbProduct = typeof it.product === 'string' ? priceById.get(it.product) : null;
    const isMongoId = typeof it.product === 'string' && /^[a-f\d]{24}$/i.test(it.product);
    // If the client claims a Mongo id, it MUST resolve to a real product —
    // otherwise fall back to a clamped client price (static seed catalog).
    const price = dbProduct ? money(dbProduct.price) : (isMongoId ? null : money(it.price));
    const quantity = Math.max(1, Math.min(9999, Math.floor(Number(it.quantity) || 1)));
    return {
      product: dbProduct ? dbProduct._id : undefined,
      name: dbProduct ? dbProduct.name : clean(it.name, 200),
      price,
      quantity,
      lineTotal: price === null ? null : Math.min(price * quantity, MAX_MONEY),
    };
  });

  if (safeItems.some((it) => it.price === null)) {
    return res.status(400).json({ success: false, message: 'One or more items are no longer available' });
  }

  const subtotal = Math.min(safeItems.reduce((s, it) => s + it.lineTotal, 0), MAX_MONEY);

  // Delivery charge is authoritative from store settings, not the client
  const Setting = require('../models/Setting');
  const settings = await Setting.findOne();
  const delivery = money(settings?.deliveryCharge);
  const grandTotal = Math.min(subtotal + delivery, MAX_MONEY);

  const orderId = await generateOrderId();

  const order = await Order.create({
    orderId,
    customer: safeCustomer,
    items: safeItems,
    subtotal,
    deliveryCharge: delivery,
    grandTotal,
  });

  res.status(201).json({ success: true, data: order });
});

// --- ADMIN ROUTES ---

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Admin
exports.getOrders = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const query = {};

  const ALLOWED_STATUS = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
  if (status && ALLOWED_STATUS.includes(status)) query.status = status;

  if (search) {
    // Escape regex metacharacters so user input can't craft a malicious /
    // catastrophic-backtracking pattern, and cap the length.
    const safe = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { orderId: { $regex: safe, $options: 'i' } },
      { 'customer.name': { $regex: safe, $options: 'i' } },
      { 'customer.phone': { $regex: safe, $options: 'i' } }
    ];
  }

  const orders = await Order.find(query).sort('-createdAt');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Get single order
// @route   GET /api/admin/orders/:id
// @access  Admin
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.status(200).json({ success: true, data: order });
});

// @desc    Update order status
// @route   PATCH /api/admin/orders/:id
// @access  Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  res.status(200).json({ success: true, data: order });
});
