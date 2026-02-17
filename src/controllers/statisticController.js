const User = require('../models/User');
const Payment = require('../models/Payment');
const Shop = require('../models/Shop');
const Order = require('../models/Order');

// Helper to get array of dates between two dates
const getDatesInRange = (startDate, endDate) => {
    const date = new Date(startDate.getTime());
    const dates = [];
    while (date <= endDate) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return dates;
};

// Helper to format date as YYYY-MM-DD
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

exports.getUsersStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);

        // Validate date difference <= 60 days
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 60) {
            return res.status(400).json({ message: 'Date range cannot exceed 60 days' });
        }

        // 1. Users created per day (role buyer)
        const buyersPerDay = await User.aggregate([
            {
                $match: {
                    role: 'buyer',
                    created_at: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const buyersMap = {};
        buyersPerDay.forEach(item => {
            buyersMap[item._id] = item.count;
        });

        const dailyStats = {};
        const dateRange = getDatesInRange(start, end);

        dateRange.forEach(date => {
            const dateStr = formatDate(date);
            dailyStats[dateStr] = { created: buyersMap[dateStr] || 0 };
        });

        // 2. User distribution by type (excluding admin)
        const userDistribution = await User.aggregate([
            {
                $match: {
                    role: { $ne: 'admin' },
                    created_at: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            }
        ]);

        const distributionMap = {
            buyer: 0,
            shop: 0
        };

        userDistribution.forEach(item => {
            if (distributionMap.hasOwnProperty(item._id)) {
                distributionMap[item._id] = item.count;
            }
        });

        res.status(200).json({
            dailyStats,
            distribution: distributionMap
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getPaymentStats = async (req, res) => {
    try {
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ message: 'Year is required' });
        }

        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

        const monthlyStats = await Payment.aggregate([
            {
                $match: {
                    payment_type: 'rent',
                    status: 'paid',
                    created_at: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { $month: "$created_at" },
                    totalAmount: { $sum: "$amount.value" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsMap = {};
        // Initialize months 1-12
        for (let i = 1; i <= 12; i++) {
            statsMap[i] = { amount: 0, payment: 0 };
        }

        monthlyStats.forEach(item => {
            statsMap[item._id] = {
                amount: item.totalAmount,
                payment: item.count
            };
        });

        res.status(200).json(statsMap);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getGlobalStats = async (req, res) => {
    try {
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ message: 'Year is required' });
        }

        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

        const dateFilter = { $gte: startOfYear, $lte: endOfYear };

        const [paymentStats, shopCount, orderCount, userCount] = await Promise.all([
            // Total payment amount (paid, rent only)
            Payment.aggregate([
                {
                    $match: {
                        payment_type: 'rent',
                        status: 'paid',
                        created_at: dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount.value" }
                    }
                }
            ]),
            // Total shops created
            Shop.countDocuments({ created_at: dateFilter }),
            // Total orders created
            Order.countDocuments({ created_at: dateFilter }),
            // Total users created
            User.countDocuments({ created_at: dateFilter })
        ]);

        const totalPaymentAmount = paymentStats.length > 0 ? paymentStats[0].totalAmount : 0;

        res.status(200).json({
            totalPaymentAmount,
            totalShops: shopCount,
            totalOrders: orderCount,
            totalUsers: userCount
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
