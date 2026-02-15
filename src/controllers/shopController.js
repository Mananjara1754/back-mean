const Shop = require('../models/Shop');
const User = require('../models/User');
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');

// Helper to calculate stars breakdown
const getStarsBreakdown = (ratings) => {
    const breakdown = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    ratings.forEach(r => {
        if (breakdown[r.rate] !== undefined) {
            breakdown[r.rate]++;
        }
    });
    return breakdown;
};

// Helper to check if user can rate a shop
const checkCanRateShop = async (userId, shopId) => {
    if (!userId) return false;
    const order = await Order.findOne({
        buyer_id: userId,
        payment_status: 'paid',
        shop_id: shopId
    });
    return !!order;
};

// @desc    Get all shops
// @route   GET /api/shops
// @access  Public
const getShops = async (req, res) => {
    try {
        let { category_id } = req.query;
        let query = {};

        if (category_id) {
            query.category_id = category_id;
        }

        const shops = await Shop.find(query)
            .populate('owner_user_id', 'profile.firstname profile.lastname profile.email')
            .populate('category_id')
            .populate('ratings.user_id', 'profile.firstname profile.lastname');

        const shopsData = await Promise.all(shops.map(async (s) => {
            const sObj = s.toObject();
            sObj.stars_breakdown = getStarsBreakdown(s.ratings || []);
            sObj.can_rate = req.user ? await checkCanRateShop(req.user._id, s._id) : false;
            return sObj;
        }));

        res.json(shopsData);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get shop by ID
// @route   GET /api/shops/:id
// @access  Public
const getShopById = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id)
            .populate('owner_user_id', 'profile.firstname profile.lastname profile.email')
            .populate('category_id')
            .populate('ratings.user_id', 'profile.firstname profile.lastname');
        if (shop) {
            const shopData = shop.toObject();
            shopData.stars_breakdown = getStarsBreakdown(shop.ratings || []);
            shopData.can_rate = req.user ? await checkCanRateShop(req.user._id, shop._id) : false;
            res.json(shopData);
        } else {
            res.status(404).json({ message: 'Shop not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create a shop
// @route   POST /api/shops
// @access  Private/Shop/Admin
const createShop = async (req, res) => {
    let { name, description, category_id, location, opening_hours, rent } = req.body;

    // Parse nested objects if they are strings (FormData limitation)
    try {
        if (typeof location === 'string') location = JSON.parse(location);
        if (typeof opening_hours === 'string') opening_hours = JSON.parse(opening_hours);
        if (typeof rent === 'string') rent = JSON.parse(rent);
    } catch (e) {
        console.error('Error parsing JSON fields', e);
    }

    try {
        const shop = new Shop({
            name,
            description,
            logo: req.file ? req.file.path.replace(/\\/g, '/') : null,
            category_id,
            location,
            opening_hours,
            rent,
            owner_user_id: req.user._id,
        });

        const createdShop = await shop.save();

        // Update user shop_id
        req.user.shop_id = createdShop._id;
        await req.user.save();

        res.status(201).json(createdShop);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a shop
// @route   PUT /api/shops/:id
// @access  Private (Owner/Admin)
const updateShop = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);

        if (shop) {
            // Check ownership
            if (shop.owner_user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Not authorized to update this shop' });
            }

            let { name, description, category_id, location, opening_hours, rent } = req.body;

            // Handle Logo
            if (req.file) {
                // Delete old logo if it exists
                if (shop.logo && fs.existsSync(shop.logo)) {
                    try {
                        fs.unlinkSync(shop.logo);
                    } catch (err) {
                        console.error('Error deleting old logo:', err);
                    }
                }
                shop.logo = req.file.path.replace(/\\/g, '/');
            }

            // Parse nested objects
            try {
                if (typeof location === 'string') location = JSON.parse(location);
                if (typeof opening_hours === 'string') opening_hours = JSON.parse(opening_hours);
                if (typeof rent === 'string') rent = JSON.parse(rent);
            } catch (e) {
                console.error('Error parsing JSON fields', e);
            }

            shop.name = name || shop.name;
            shop.description = description || shop.description;
            shop.category_id = category_id || shop.category_id;
            shop.location = location || shop.location;
            shop.opening_hours = opening_hours || shop.opening_hours;
            shop.rent = rent || shop.rent;

            const updatedShop = await shop.save();
            res.json(updatedShop);
        } else {
            res.status(404).json({ message: 'Shop not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a shop
// @route   DELETE /api/shops/:id
// @access  Private (Owner/Admin)
const deleteShop = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);

        if (shop) {
            // Check ownership
            if (shop.owner_user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Not authorized to delete this shop' });
            }

            // Delete logo file if exists
            if (shop.logo && fs.existsSync(shop.logo)) {
                fs.unlinkSync(shop.logo);
            }

            await shop.deleteOne();
            res.json({ message: 'Shop removed' });
        } else {
            res.status(404).json({ message: 'Shop not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create a shop with a new user
// @route   POST /api/shops/with-user
// @access  Private/Admin
const createShopWithUser = async (req, res) => {
    let {
        name, description, category_id, location, opening_hours, rent,
        user_firstname, user_lastname, user_email
    } = req.body;

    // Parse nested objects if they are strings (FormData limitation)
    try {
        if (typeof location === 'string') location = JSON.parse(location);
        if (typeof opening_hours === 'string') opening_hours = JSON.parse(opening_hours);
        if (typeof rent === 'string') rent = JSON.parse(rent);
    } catch (e) {
        console.error('Error parsing JSON fields', e);
    }

    try {
        // 1. Check if user already exists
        const userExists = await User.findOne({ 'profile.email': user_email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // 2. Create User
        const user = new User({
            role: 'shop',
            profile: {
                firstname: user_firstname,
                lastname: user_lastname,
                email: user_email,
                password_hash: 'pass123' // Default password as requested
            }
        });

        const createdUser = await user.save();

        // 3. Create Shop
        const shop = new Shop({
            name,
            description,
            logo: req.file ? req.file.path.replace(/\\/g, '/') : null,
            category_id,
            location,
            opening_hours,
            rent,
            owner_user_id: createdUser._id,
        });

        const createdShop = await shop.save();

        // 4. Update User with shop_id
        createdUser.shop_id = createdShop._id;
        await createdUser.save();

        res.status(201).json({ shop: createdShop, user: createdUser });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Add a rating to a shop
// @route   POST /api/shops/:id/rate
// @access  Private
const rateShop = async (req, res) => {
    const { rate, comment } = req.body;
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        const canRate = await checkCanRateShop(req.user._id, shop._id);
        if (!canRate) {
            return res.status(403).json({ message: 'You must pass an order in this shop before rating it' });
        }

        const existingRating = shop.ratings.find(r => r.user_id.toString() === req.user._id.toString());
        if (existingRating) {
            return res.status(400).json({ message: 'You have already rated this shop. Use PUT to update your rating.' });
        }

        shop.ratings.push({
            user_id: req.user._id,
            rate,
            comment
        });

        shop.count_rating = shop.ratings.length;
        shop.avg_rating = shop.ratings.reduce((acc, item) => item.rate + acc, 0) / shop.ratings.length;
        // Keep stats.rating updated if needed
        shop.stats.rating = shop.avg_rating;

        await shop.save();

        // Return rich data
        const shopData = shop.toObject();
        shopData.stars_breakdown = getStarsBreakdown(shop.ratings);
        shopData.can_rate = await checkCanRateShop(req.user._id, shop._id);

        // Populate user names for ratings AND other required fields for the view
        const populatedShop = await Shop.populate(shopData, [
            { path: 'ratings.user_id', select: 'profile.firstname profile.lastname' },
            { path: 'owner_user_id', select: 'profile.firstname profile.lastname profile.email' },
            { path: 'category_id' }
        ]);

        res.status(201).json(populatedShop);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a rating for a shop
// @route   PUT /api/shops/:id/rate
// @access  Private
const updateShopRate = async (req, res) => {
    const { rate, comment } = req.body;
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        const ratingIndex = shop.ratings.findIndex(r => r.user_id.toString() === req.user._id.toString());
        if (ratingIndex === -1) {
            return res.status(404).json({ message: 'Rating not found' });
        }

        shop.ratings[ratingIndex].rate = rate || shop.ratings[ratingIndex].rate;
        shop.ratings[ratingIndex].comment = comment || shop.ratings[ratingIndex].comment;
        shop.ratings[ratingIndex].created_at = Date.now();

        shop.avg_rating = shop.ratings.reduce((acc, item) => item.rate + acc, 0) / shop.ratings.length;
        shop.stats.rating = shop.avg_rating;

        await shop.save();

        // Return rich data
        const shopData = shop.toObject();
        shopData.stars_breakdown = getStarsBreakdown(shop.ratings);
        shopData.can_rate = await checkCanRateShop(req.user._id, shop._id);

        // Populate user names for ratings AND other required fields
        const populatedShop = await Shop.populate(shopData, [
            { path: 'ratings.user_id', select: 'profile.firstname profile.lastname' },
            { path: 'owner_user_id', select: 'profile.firstname profile.lastname profile.email' },
            { path: 'category_id' }
        ]);

        res.json(populatedShop);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getShops,
    getShopById,
    createShop,
    updateShop,
    deleteShop,
    createShopWithUser,
    rateShop,
    updateShopRate
};
