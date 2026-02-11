const Shop = require('../models/Shop');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Get all shops
// @route   GET /api/shops
// @access  Public
const getShops = async (req, res) => {
    try {
        const shops = await Shop.find({})
            .populate('owner_user_id', 'profile.firstname profile.lastname profile.email')
            .populate('category_id');
        res.json(shops);
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
            .populate('category_id');
        if (shop) {
            res.json(shop);
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

module.exports = { getShops, getShopById, createShop, updateShop, deleteShop, createShopWithUser };
