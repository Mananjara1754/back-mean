const mongoose = require('mongoose');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const Product = require('../models/Product');

// ── Helper ────────────────────────────────────────────────────
const calculatePercentageDiff = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return parseFloat(((current - previous) / previous * 100).toFixed(2));
};

// ═══════════════════════════════════════════════════════════════
// 1. Order summary between two dates
//    - total order count, total amount
//    - count of pending orders, count of confirmed (validated) orders
// ═══════════════════════════════════════════════════════════════
exports.getShopOrderSummary = async (req, res) => {
    try {
        const shopId = req.user.shop_id;
        const { startDate, endDate } = req.query;

        if (!shopId) return res.status(400).json({ message: 'No shop linked to this account' });
        if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const [summary, statusBreakdown] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        shop_id: shopObjectId,
                        created_at: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalAmount: { $sum: "$amounts.total" }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        shop_id: shopObjectId,
                        created_at: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const statusMap = {};
        statusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

        res.status(200).json({
            totalOrders: summary.length > 0 ? summary[0].totalOrders : 0,
            totalAmount: summary.length > 0 ? summary[0].totalAmount : 0,
            pendingOrders: statusMap['pending'] || 0,
            confirmedOrders: statusMap['confirmed'] || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// 2. Top 5 clients (by number of validated orders + by amount)
//    between two dates
// ═══════════════════════════════════════════════════════════════
exports.getShopTopClients = async (req, res) => {
    try {
        const shopId = req.user.shop_id;
        const { startDate, endDate } = req.query;

        if (!shopId) return res.status(400).json({ message: 'No shop linked to this account' });
        if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const shopObjectId = new mongoose.Types.ObjectId(shopId);
        const matchStage = {
            $match: {
                shop_id: shopObjectId,
                status: { $in: ['confirmed', 'shipped', 'delivered'] },
                created_at: { $gte: start, $lte: end }
            }
        };

        const [topByCount, topByAmount] = await Promise.all([
            // Top 5 by order count
            Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: "$buyer_id",
                        orderCount: { $sum: 1 },
                        totalAmount: { $sum: "$amounts.total" }
                    }
                },
                { $sort: { orderCount: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: "$user" },
                {
                    $project: {
                        _id: 1,
                        orderCount: 1,
                        totalAmount: 1,
                        firstname: "$user.profile.firstname",
                        lastname: "$user.profile.lastname",
                        email: "$user.profile.email"
                    }
                }
            ]),
            // Top 5 by total amount
            Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: "$buyer_id",
                        orderCount: { $sum: 1 },
                        totalAmount: { $sum: "$amounts.total" }
                    }
                },
                { $sort: { totalAmount: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: "$user" },
                {
                    $project: {
                        _id: 1,
                        orderCount: 1,
                        totalAmount: 1,
                        firstname: "$user.profile.firstname",
                        lastname: "$user.profile.lastname",
                        email: "$user.profile.email"
                    }
                }
            ])
        ]);

        res.status(200).json({
            topByCount,
            topByAmount
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// 3. Stats per product for a given year
//    - for each product: order count + total amount
// ═══════════════════════════════════════════════════════════════
exports.getShopProductStats = async (req, res) => {
    try {
        const shopId = req.user.shop_id;
        const { year } = req.query;

        if (!shopId) return res.status(400).json({ message: 'No shop linked to this account' });
        if (!year) return res.status(400).json({ message: 'Year is required' });

        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const productStats = await Order.aggregate([
            {
                $match: {
                    shop_id: shopObjectId,
                    created_at: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product_id",
                    productName: { $first: "$items.name" },
                    orderCount: { $sum: 1 },
                    totalAmount: { $sum: "$items.total_price_ttc" }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json(productStats);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// 4. Stats per category for a given year
//    - for each product category: order count + total amount
// ═══════════════════════════════════════════════════════════════
exports.getShopCategoryStats = async (req, res) => {
    try {
        const shopId = req.user.shop_id;
        const { year } = req.query;

        if (!shopId) return res.status(400).json({ message: 'No shop linked to this account' });
        if (!year) return res.status(400).json({ message: 'Year is required' });

        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const categoryStats = await Order.aggregate([
            {
                $match: {
                    shop_id: shopObjectId,
                    created_at: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: 'categoryproducts',
                    localField: 'product.category_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$product.category_id",
                    categoryName: { $first: { $ifNull: ["$category.name", "Sans catégorie"] } },
                    orderCount: { $sum: 1 },
                    totalAmount: { $sum: "$items.total_price_ttc" }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json(categoryStats);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// 5. Shop global stats for a given year
//    - total orders + diff vs previous year
//    - total order amount + diff vs previous year
//    - shop average rating
//    - unique customers count
// ═══════════════════════════════════════════════════════════════
exports.getShopGlobalStats = async (req, res) => {
    try {
        const shopId = req.user.shop_id;
        const { year } = req.query;

        if (!shopId) return res.status(400).json({ message: 'No shop linked to this account' });
        if (!year) return res.status(400).json({ message: 'Year is required' });

        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
        const dateFilter = { $gte: startOfYear, $lte: endOfYear };

        const prevYear = parseInt(year) - 1;
        const startOfPrevYear = new Date(`${prevYear}-01-01`);
        const endOfPrevYear = new Date(`${prevYear}-12-31T23:59:59.999Z`);
        const dateFilterPrev = { $gte: startOfPrevYear, $lte: endOfPrevYear };

        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const [
            currentStats, prevStats,
            currentCustomers, prevCustomers,
            shopData
        ] = await Promise.all([
            // Current year — orders count + total amount
            Order.aggregate([
                {
                    $match: {
                        shop_id: shopObjectId,
                        created_at: dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalAmount: { $sum: "$amounts.total" }
                    }
                }
            ]),
            // Previous year — orders count + total amount
            Order.aggregate([
                {
                    $match: {
                        shop_id: shopObjectId,
                        created_at: dateFilterPrev
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalAmount: { $sum: "$amounts.total" }
                    }
                }
            ]),
            // Current year — distinct buyers
            Order.distinct('buyer_id', {
                shop_id: shopObjectId,
                created_at: dateFilter
            }),
            // Previous year — distinct buyers
            Order.distinct('buyer_id', {
                shop_id: shopObjectId,
                created_at: dateFilterPrev
            }),
            // Shop rating
            Shop.findById(shopId).select('avg_rating count_rating')
        ]);

        const totalOrders = currentStats.length > 0 ? currentStats[0].totalOrders : 0;
        const totalAmount = currentStats.length > 0 ? currentStats[0].totalAmount : 0;
        const totalOrdersPrev = prevStats.length > 0 ? prevStats[0].totalOrders : 0;
        const totalAmountPrev = prevStats.length > 0 ? prevStats[0].totalAmount : 0;

        const totalCustomers = currentCustomers.length;
        const totalCustomersPrev = prevCustomers.length;

        res.status(200).json({
            totalOrders,
            ordersDiff: calculatePercentageDiff(totalOrders, totalOrdersPrev),
            totalAmount,
            amountDiff: calculatePercentageDiff(totalAmount, totalAmountPrev),
            avgRating: shopData?.avg_rating || 0,
            countRating: shopData?.count_rating || 0,
            totalCustomers,
            customersDiff: calculatePercentageDiff(totalCustomers, totalCustomersPrev)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
