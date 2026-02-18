const Promotion = require('../models/Promotion');
const Shop = require('../models/Shop');

/**
 * @desc    Create a promotion
 * @route   POST /api/promotions
 * @access  Private (Shop/Admin)
 */
const createPromotion = async (req, res) => {
    const { shop_id, type, title, description, image, product_ids, budget, start_date, end_date } = req.body;

    try {
        const shop = await Shop.findById(shop_id);
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        if (shop.owner_user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const promotion = new Promotion({
            shop_id,
            type,
            title,
            description,
            image,
            product_ids,
            discount_percent: req.body.discount_percent || 0,
            budget,
            start_date,
            end_date
        });

        const savedPromotion = await promotion.save();

        // Sync with Products
        if (product_ids && product_ids.length > 0) {
            const Product = require('../models/Product');
            await Product.updateMany(
                { _id: { $in: product_ids } },
                {
                    $set: {
                        promotion: {
                            is_active: true,
                            discount_percent: savedPromotion.discount_percent,
                            start_date: savedPromotion.start_date,
                            end_date: savedPromotion.end_date
                        }
                    }
                }
            );
        }

        res.status(201).json(savedPromotion);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all active promotions
 * @route   GET /api/promotions
 * @access  Public
 */
const getPromotions = async (req, res) => {
    try {
        const currentDate = new Date();
        // If shop_id query param exists, filter by it (and maybe ignore date/active checks for shop owner dashboard?)
        // For now, let's keep it public-facing (active only) unless we add a specific admin route.
        // Actually, for the Shop Admin to see *their* promotions (active or not), we need a different query or logic.

        let query = {
            is_active: true,
            start_date: { $lte: currentDate },
            end_date: { $gte: currentDate }
        };

        if (req.query.shop_id) {
            // If requesting specific shop, maybe we want to see all? 
            // Let's assume this endpoint is for PUBLIC display. 
            // We might need another one for "My Promotions".
            // OR: we relax the date check if it's the owner?
            // For simplicity, let's add a "all" query param for admins/owners
            query = { shop_id: req.query.shop_id };
            if (!req.query.all) {
                query.is_active = true;
                query.start_date = { $lte: currentDate };
                query.end_date = { $gte: currentDate };
            }
        }

        const promotions = await Promotion.find(query)
            .populate('shop_id', 'name location')
            .populate('product_ids', 'name price image');

        res.json(promotions);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get promotion details
 * @route   GET /api/promotions/:id
 * @access  Public
 */
const getPromotionById = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id)
            .populate('shop_id', 'name')
            .populate('product_ids');

        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        // Increment view count
        promotion.stats.views += 1;
        await promotion.save();

        res.json(promotion);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Update a promotion
 * @route   PUT /api/promotions/:id
 * @access  Private (Shop/Admin)
 */
const updatePromotion = async (req, res) => {
    try {
        let promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const shop = await Shop.findById(promotion.shop_id);
        if (shop.owner_user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const oldProductIds = promotion.product_ids.map(id => id.toString());
        // Handle explicit update of product_ids if provided, else keep old
        const newProductIds = req.body.product_ids ? req.body.product_ids.map(id => id.toString()) : oldProductIds;

        // Update fields
        Object.assign(promotion, req.body);

        // If discount changed, we must update all kept products too

        await promotion.save();

        const Product = require('../models/Product');

        // 1. Products removed -> Deactivate promotion
        const removedIds = oldProductIds.filter(id => !newProductIds.includes(id));
        if (removedIds.length > 0) {
            await Product.updateMany(
                { _id: { $in: removedIds } },
                { $set: { 'promotion.is_active': false } }
            );
        }

        // 2. Products added or kept -> Update/Activate promotion
        // We update ALL current product_ids to ensure latest discount/dates are applied
        if (newProductIds.length > 0) {
            await Product.updateMany(
                { _id: { $in: newProductIds } },
                {
                    $set: {
                        promotion: {
                            is_active: promotion.is_active,
                            discount_percent: promotion.discount_percent,
                            start_date: promotion.start_date,
                            end_date: promotion.end_date
                        }
                    }
                }
            );
        }

        res.json(promotion);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete a promotion
 * @route   DELETE /api/promotions/:id
 * @access  Private (Shop/Admin)
 */
const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const shop = await Shop.findById(promotion.shop_id);
        if (shop.owner_user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Deactivate promotion on all linked products
        if (promotion.product_ids && promotion.product_ids.length > 0) {
            const Product = require('../models/Product');
            await Product.updateMany(
                { _id: { $in: promotion.product_ids } },
                { $set: { 'promotion.is_active': false } }
            );
        }

        await promotion.deleteOne();
        res.json({ message: 'Promotion removed' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Track click/interaction
 * @route   PATCH /api/promotions/:id/click
 * @access  Public
 */
const trackClick = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(
            req.params.id,
            { $inc: { 'stats.clicks': 1 } },
            { new: true }
        );
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }
        res.json(promotion);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    createPromotion,
    getPromotions,
    getPromotionById,
    updatePromotion,
    deletePromotion,
    trackClick
};
