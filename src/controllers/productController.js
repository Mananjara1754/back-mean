const Product = require('../models/Product');

// @desc    Get all products (with filters)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    const { shop_id, category, search } = req.query;
    let query = {};

    if (shop_id) query.shop_id = shop_id;
    if (category) query.category = category;
    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }
    // Only active products unless admin/shop owner asks? For now public sees all or active?
    // User design has is_active. Usually public gets active only.
    query.is_active = true;

    try {
        const products = await Product.find(query).populate('shop_id', 'name');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('shop_id', 'name');
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Shop/Admin)
const createProduct = async (req, res) => {
    let { name, description, category, price, stock, promotion, is_active, shop_id } = req.body;
    
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
            category,
            images,
            price,
            stock,
            promotion,
            is_active
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
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
             if (req.user.role === 'shop' && product.shop_id.toString() !== req.user.shop_id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
             }

            let { name, description, category, price, stock, promotion, is_active } = req.body;

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
            product.category = category || product.category;
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
             if (req.user.role === 'shop' && product.shop_id.toString() !== req.user.shop_id.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
             }

            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
