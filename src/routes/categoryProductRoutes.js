const express = require('express');
const router = express.Router();
const categoryProductController = require('../controllers/categoryProductController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoryProduct:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         slug:
 *           type: string
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [CategoryProducts]
 *     responses:
 *       200:
 *         description: List of product categories
 */
router.get('/', categoryProductController.getAllCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get product category by ID
 *     tags: [CategoryProducts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category data
 *       404:
 *         description: Category not found
 */
router.get('/:id', categoryProductController.getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a product category
 *     tags: [CategoryProducts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryProduct'
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', protect, authorize('admin'), categoryProductController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a product category
 *     tags: [CategoryProducts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryProduct'
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/:id', protect, authorize('admin'), categoryProductController.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a product category
 *     tags: [CategoryProducts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/:id', protect, authorize('admin'), categoryProductController.deleteCategory);

module.exports = router;
