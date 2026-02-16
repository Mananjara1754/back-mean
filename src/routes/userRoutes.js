const express = require('express');
const { addFavorite, removeFavorite, getFavorites } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and favorites
 */

/**
 * @swagger
 * /api/users/favorites:
 *   get:
 *     summary: Get current user's favorite products
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Not authorized
 */
router.get('/favorites', protect, getFavorites);

/**
 * @swagger
 * /api/users/favorites/{product_id}:
 *   post:
 *     summary: Add a product to favorites
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to add
 *     responses:
 *       200:
 *         description: Product added to favorites
 *       400:
 *         description: Product already in favorites or error
 *       401:
 *         description: Not authorized
 */
router.post('/favorites/:product_id', protect, addFavorite);

/**
 * @swagger
 * /api/users/favorites/{product_id}:
 *   delete:
 *     summary: Remove a product from favorites
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to remove
 *     responses:
 *       200:
 *         description: Product removed from favorites
 *       401:
 *         description: Not authorized
 */
router.delete('/favorites/:product_id', protect, removeFavorite);

module.exports = router;
