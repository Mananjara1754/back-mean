const express = require('express');
const router = express.Router();
const categoryProductController = require('../controllers/categoryProductController');

// Create a new category
router.post('/', categoryProductController.createCategory);

// Get all categories
router.get('/', categoryProductController.getAllCategories);

// Get a single category by ID
router.get('/:id', categoryProductController.getCategoryById);

// Update a category
router.put('/:id', categoryProductController.updateCategory);

// Delete a category
router.delete('/:id', categoryProductController.deleteCategory);

module.exports = router;
