const express = require('express');
const {
    getCategoryShops,
    getCategoryShopById,
    createCategoryShop,
    updateCategoryShop,
    deleteCategoryShop
} = require('../controllers/categoryShopController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoryShop:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         icon:
 *           type: string
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * /api/category-shops:
 *   get:
 *     summary: Get all shop categories
 *     tags: [CategoryShops]
 *     responses:
 *       200:
 *         description: List of shop categories
 */
router.get('/', getCategoryShops);

/**
 * @swagger
 * /api/category-shops/{id}:
 *   get:
 *     summary: Get shop category by ID
 *     tags: [CategoryShops]
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
router.get('/:id', getCategoryShopById);

/**
 * @swagger
 * /api/category-shops:
 *   post:
 *     summary: Create a shop category
 *     tags: [CategoryShops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryShop'
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', protect, authorize('admin'), createCategoryShop);

/**
 * @swagger
 * /api/category-shops/{id}:
 *   put:
 *     summary: Update a shop category
 *     tags: [CategoryShops]
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
 *             $ref: '#/components/schemas/CategoryShop'
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/:id', protect, authorize('admin'), updateCategoryShop);

/**
 * @swagger
 * /api/category-shops/{id}:
 *   delete:
 *     summary: Delete a shop category
 *     tags: [CategoryShops]
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
router.delete('/:id', protect, authorize('admin'), deleteCategoryShop);

module.exports = router;
