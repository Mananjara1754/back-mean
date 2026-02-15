const Product = require('../models/Product');
const Order = require('../models/Order');

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

// Helper to check if user can rate a product
const checkCanRateProduct = async (userId, productId) => {
    if (!userId) return false;
    const order = await Order.findOne({
        buyer_id: userId,
        payment_status: 'paid',
        'items.product_id': productId
    });
    return !!order;
};

// @desc    Get all products (with filters)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    let { shop_id, category_id, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (shop_id) query.shop_id = shop_id;
    if (category_id) query.category_id = category_id;
    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }
    // Only active products unless admin/shop owner asks? For now public sees all or active?
    query.is_active = true;

    try {
        // Convert to numbers
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate('shop_id', 'name')
            .populate('ratings.user_id', 'profile.firstname profile.lastname')
            .skip(skip)
            .limit(limit)
            .sort({ created_at: -1 }); // Newest products first

        const productsData = await Promise.all(products.map(async (p) => {
            const pObj = p.toObject();
            pObj.stars_breakdown = getStarsBreakdown(p.ratings || []);
            pObj.can_rate = req.user ? await checkCanRateProduct(req.user._id, p._id) : false;
            return pObj;
        }));

        res.json({
            products: productsData,
            page,
            pages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('shop_id', 'name')
            .populate('category_id', 'name')
            .populate('ratings.user_id', 'profile.firstname profile.lastname');
        if (product) {
            const productData = product.toObject();
            productData.stars_breakdown = getStarsBreakdown(product.ratings || []);
            productData.can_rate = req.user ? await checkCanRateProduct(req.user._id, product._id) : false;
            res.json(productData);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Shop/Admin)
const createProduct = async (req, res) => {
    let { name, description, category_id, price, stock, promotion, is_active, shop_id } = req.body;

    // Handle Shop ID
    if (req.user.role === 'shop') {
        shop_id = req.user.shop_id;
    }

    // Handle Images
    let images = [];
    if (req.files && req.files.length > 0) {
        images = req.files.map(file => file.path);
    } else if (req.body.images) {
        // If images are passed as string/array (e.g. existing images)
        images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Parse nested objects if they are strings (FormData limitation)
    try {
        if (typeof price === 'string') price = JSON.parse(price);
        if (typeof stock === 'string') stock = JSON.parse(stock);
        if (typeof promotion === 'string') promotion = JSON.parse(promotion);
    } catch (e) {
        console.error('Error parsing JSON fields', e);
    }

    try {
        const product = new Product({
            shop_id,
            name,
            description,
            category_id,
            images,
            price,
            stock,
            promotion,
            is_active
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Shop/Admin)
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // Check ownership if shop
            //  console.log("product.shop_id",product.shop_id);
            //  console.log("req.user.shop_id",req.user.shop_id);
            if (product.shop_id.toString() !== req.user.shop_id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }

            let { name, description, category_id, price, stock, promotion, is_active } = req.body;

            // Handle Images
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => file.path);
                product.images = [...product.images, ...newImages]; // Append new images
            }
            // If images field is sent (to remove/reorder), logic would be needed. 
            // For now, let's assume images append or explicit replace if needed.
            // But if we want to replace:
            // product.images = req.body.images || product.images; 
            // The logic above appends. If we want full control, we need more logic.

            // Parse nested objects
            try {
                if (typeof price === 'string') price = JSON.parse(price);
                if (typeof stock === 'string') stock = JSON.parse(stock);
                if (typeof promotion === 'string') promotion = JSON.parse(promotion);
            } catch (e) {
                console.error('Error parsing JSON fields', e);
            }

            product.name = name || product.name;
            product.description = description || product.description;

            if (category_id) {
                // If category_id is an object (populated), extract _id
                product.category_id = typeof category_id === 'object' && category_id._id ? category_id._id : category_id;
            }

            if (price) product.price = price;
            if (stock) product.stock = stock;
            if (promotion) product.promotion = promotion;
            if (is_active !== undefined) product.is_active = is_active;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Shop/Admin)
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // Check ownership if shop
            if (product.shop_id.toString() !== req.user.shop_id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }

            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Add a rating to a product
// @route   POST /api/products/:id/rate
// @access  Private
const rateProduct = async (req, res) => {
    const { rate, comment } = req.body;
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const canRate = await checkCanRateProduct(req.user._id, product._id);
        if (!canRate) {
            return res.status(403).json({ message: 'You must buy this product before rating it' });
        }

        const existingRating = product.ratings.find(r => r.user_id.toString() === req.user._id.toString());
        if (existingRating) {
            return res.status(400).json({ message: 'You have already rated this product. Use PUT to update your rating.' });
        }

        product.ratings.push({
            user_id: req.user._id,
            rate,
            comment
        });

        product.count_rating = product.ratings.length;
        product.avg_rating = product.ratings.reduce((acc, item) => item.rate + acc, 0) / product.ratings.length;

        await product.save();

        // Return rich data
        const productData = product.toObject();
        productData.stars_breakdown = getStarsBreakdown(product.ratings);
        productData.can_rate = await checkCanRateProduct(req.user._id, product._id);

        // Populate user for ratings and shop/category for completeness
        const populatedProduct = await Product.populate(productData, [
            { path: 'ratings.user_id', select: 'profile.firstname profile.lastname' },
            { path: 'shop_id', select: 'name' },
            { path: 'category_id', select: 'name' }
        ]);

        res.status(201).json(populatedProduct);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a rating for a product
// @route   PUT /api/products/:id/rate
// @access  Private
const updateProductRate = async (req, res) => {
    const { rate, comment } = req.body;
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const ratingIndex = product.ratings.findIndex(r => r.user_id.toString() === req.user._id.toString());
        if (ratingIndex === -1) {
            return res.status(404).json({ message: 'Rating not found' });
        }

        product.ratings[ratingIndex].rate = rate || product.ratings[ratingIndex].rate;
        product.ratings[ratingIndex].comment = comment || product.ratings[ratingIndex].comment;
        product.ratings[ratingIndex].created_at = Date.now();

        product.avg_rating = product.ratings.reduce((acc, item) => item.rate + acc, 0) / product.ratings.length;

        await product.save();

        // Return rich data
        const productData = product.toObject();
        productData.stars_breakdown = getStarsBreakdown(product.ratings);
        productData.can_rate = await checkCanRateProduct(req.user._id, product._id);

        // Populate user for ratings and shop/category for completeness
        const populatedProduct = await Product.populate(productData, [
            { path: 'ratings.user_id', select: 'profile.firstname profile.lastname' },
            { path: 'shop_id', select: 'name' },
            { path: 'category_id', select: 'name' }
        ]);

        res.json(populatedProduct);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    rateProduct,
    updateProductRate
};
