const CategoryShop = require('../models/CategoryShop');

// @desc    Get all shop categories
// @route   GET /api/category-shops
// @access  Public
const getCategoryShops = async (req, res) => {
    try {
        const categories = await CategoryShop.find({ is_active: true }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get shop category by ID
// @route   GET /api/category-shops/:id
// @access  Public
const getCategoryShopById = async (req, res) => {
    try {
        const category = await CategoryShop.findById(req.params.id);
        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create a shop category
// @route   POST /api/category-shops
// @access  Private/Admin
const createCategoryShop = async (req, res) => {
    const { name, description, icon } = req.body;

    try {
        const categoryExists = await CategoryShop.findOne({ name });
        if (categoryExists) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }

        const category = new CategoryShop({
            name,
            description,
            icon
        });

        const createdCategory = await category.save();
        res.status(201).json(createdCategory);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a shop category
// @route   PUT /api/category-shops/:id
// @access  Private/Admin
const updateCategoryShop = async (req, res) => {
    try {
        const category = await CategoryShop.findById(req.params.id);

        if (category) {
            const { name, description, icon, is_active } = req.body;

            // Check if name is being changed and if it already exists
            if (name && name !== category.name) {
                const nameExists = await CategoryShop.findOne({ name });
                if (nameExists) {
                    return res.status(400).json({ message: 'Category with this name already exists' });
                }
            }

            category.name = name || category.name;
            category.description = description !== undefined ? description : category.description;
            category.icon = icon !== undefined ? icon : category.icon;
            category.is_active = is_active !== undefined ? is_active : category.is_active;

            const updatedCategory = await category.save();
            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a shop category
// @route   DELETE /api/category-shops/:id
// @access  Private/Admin
const deleteCategoryShop = async (req, res) => {
    try {
        const category = await CategoryShop.findById(req.params.id);

        if (category) {
            await category.deleteOne();
            res.json({ message: 'Category removed' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getCategoryShops,
    getCategoryShopById,
    createCategoryShop,
    updateCategoryShop,
    deleteCategoryShop
};
