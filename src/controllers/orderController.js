const Order = require('../models/Order');
const Product = require('../models/Product');

const generateOrderNumber = () => {
    return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Buyer)
const createOrder = async (req, res) => {
    const { shop_id, items, delivery } = req.body;

    if (items && items.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    try {
        let subtotal = 0;
        let totalVal = 0;
        const finalItems = [];

        // Check stock and calculate prices
        for (const item of items) {
            const product = await Product.findById(item.product_id);
            if (!product) {
                return res.status(400).json({ message: `Product not found: ${item.product_id}` });
            }
            if (product.stock.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for product: ${product.name}` });
            }

            let unit_price = product.price.current; // HT
            let unit_price_ttc = product.price.ttc || (unit_price * 1.2); // TTC or fallback

            let is_promo = false;
            let original_unit_price_ttc = unit_price_ttc;

            // Apply Discount if promotion is active and date is valid
            if (product.promotion && product.promotion.is_active && product.promotion.discount_percent > 0) {
                const now = new Date();
                const start = product.promotion.start_date ? new Date(product.promotion.start_date) : null;
                const end = product.promotion.end_date ? new Date(product.promotion.end_date) : null;

                const isDateValid = (!start || now >= start) && (!end || now <= end);

                if (isDateValid) {
                    const discountFactor = (100 - product.promotion.discount_percent) / 100;
                    unit_price = unit_price * discountFactor;
                    unit_price_ttc = unit_price_ttc * discountFactor;
                    is_promo = true;
                }
            }

            const line_ht = unit_price * item.quantity;
            const line_ttc = unit_price_ttc * item.quantity;

            subtotal += line_ht;
            totalVal += line_ttc;

            finalItems.push({
                product_id: product._id,
                name: product.name,
                quantity: item.quantity,
                unit_price: unit_price,
                unit_price_ttc: unit_price_ttc,
                original_unit_price_ttc: original_unit_price_ttc,
                is_promo: is_promo,
                total_price: line_ht,
                total_price_ttc: line_ttc
            });
        }

        const tax = totalVal - subtotal;
        const total = totalVal;

        const order = new Order({
            order_number: generateOrderNumber(),
            buyer_id: req.user._id,
            shop_id,
            items: finalItems,
            amounts: {
                subtotal,
                tax,
                total,
                currency: 'MGA'
            },
            delivery
        });

        const createdOrder = await order.save();

        // STOCK REDUCTION REMOVED FROM HERE - It should happen on payment confirmation
        // as per user request: "payement confirme = stock reduits"

        res.status(201).json(createdOrder);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all orders (Shop/Admin)
// @route   GET /api/orders
// @access  Private (Shop/Admin)
const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, sort = '-created_at' } = req.query;

        let query = {};
        if (req.user.role === 'shop') {
            query.shop_id = req.user.shop_id;
        } else if (req.user.role === 'admin') {
            // Admin sees all
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Apply status filter if provided
        if (status) {
            query.status = status;
        }

        // Search by customer name (requires aggregation or finding user IDs first)
        if (search) {
            const User = require('../models/User');
            const users = await User.find({
                $or: [
                    { 'profile.firstname': { $regex: search, $options: 'i' } },
                    { 'profile.lastname': { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = users.map(u => u._id);
            query.buyer_id = { $in: userIds };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(query)
            .populate('buyer_id', 'profile.firstname profile.lastname profile.email')
            .populate('shop_id', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get order statistics (Total per status)
// @route   GET /api/orders/stats/total-by-status/:shop_id
// @access  Private (Shop/Admin)
const getOrderStats = async (req, res) => {
    try {
        const { shop_id } = req.params;

        // Check authorization
        if (req.user.role === 'shop' && req.user.shop_id.toString() !== shop_id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const stats = await Order.aggregate([
            { $match: { shop_id: new (require('mongoose').Types.ObjectId)(shop_id) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amounts.total' }
                }
            }
        ]);

        // Ensure all possible statuses are included in the response
        const possibleStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

        const completeStats = possibleStatuses.map(status => {
            const found = stats.find(s => s._id === status);
            return found || {
                _id: status,
                count: 0,
                totalAmount: 0
            };
        });

        res.json(completeStats);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};


// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('buyer_id', 'profile.firstname profile.lastname profile.email')
            .populate('shop_id', 'name')
            .populate('items.product_id', 'name price');

        if (order) {
            // Check authorization
            if (req.user.role === 'buyer' && order.buyer_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            if (req.user.role === 'shop' && order.shop_id.toString() !== req.user.shop_id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }

            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Shop/Admin)
const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            // Check auth
            if (req.user.role === 'shop' && order.shop_id.toString() !== req.user.shop_id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }

            order.status = req.body.status || order.status;
            order.payment_status = req.body.payment_status || order.payment_status;

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private (Buyer)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyer_id: req.user._id }).sort({ created_at: -1 });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get logged in user orders by date
// @route   GET /api/orders/myorders/by-date
// @access  Private (Buyer)
const getMyOrdersByDate = async (req, res) => {
    try {
        const { date } = req.query;
        let query = { buyer_id: req.user._id };

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            query.created_at = {
                $gte: start,
                $lte: end
            };
        }

        const orders = await Order.find(query).sort({ created_at: -1 });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};


module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus, getMyOrders, getOrderStats, getMyOrdersByDate };
