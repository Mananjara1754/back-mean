const User = require('../models/User');

// @desc    Add product to favorites
// @route   POST /api/users/favorites/:product_id
// @access  Private
const addFavorite = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.favorite_products.includes(req.params.product_id)) {
            return res.status(400).json({ message: 'Product already in favorites' });
        }

        user.favorite_products.push(req.params.product_id);
        await user.save();

        res.json({ message: 'Product added to favorites', favorite_products: user.favorite_products });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Remove product from favorites
// @route   DELETE /api/users/favorites/:product_id
// @access  Private
const removeFavorite = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.favorite_products = user.favorite_products.filter(
            (id) => id.toString() !== req.params.product_id
        );
        await user.save();

        res.json({ message: 'Product removed from favorites', favorite_products: user.favorite_products });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    addFavorite,
    removeFavorite
};
