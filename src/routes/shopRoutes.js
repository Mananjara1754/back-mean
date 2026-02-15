const express = require('express');
const { getShops, getShopById, createShop, updateShop, deleteShop, createShopWithUser, rateShop, updateShopRate } = require('../controllers/shopController');
const { protect, authorize, optionalProtect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Shop:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         location:
 *           type: object
 *           properties:
 *             floor:
 *               type: number
 *             zone:
 *               type: string
 *             map_position:
 *               type: object
 *               properties:
 *                  x:
 *                      type: number
 *                  y:
 *                      type: number
 *         opening_hours:
 *           type: object
 *         rent:
 *           type: object
 *           properties:
 *              amount:
 *                  type: number
 *              currency:
 *                  type: string
 *              billing_cycle:
 *                  type: string
 */

/**
 * @swagger
 * /api/shops:
 *   get:
 *     summary: Get all shops
 *     tags: [Shops]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Filter shops by category ID
 *     responses:
 *       200:
 *         description: List of shops
 */
router.get('/', optionalProtect, getShops);

/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     summary: Get shop by ID
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shop data
 *       404:
 *         description: Shop not found
 */
router.get('/:id', optionalProtect, getShopById);

/**
 * @swagger
 * /api/shops:
 *   post:
 *     summary: Create a shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Shop'
 *     responses:
 *       201:
 *         description: Shop created
 */
router.post('/', protect, authorize('shop', 'admin'), upload.single('logo'), createShop);

/**
 * @swagger
 * /api/shops/{id}:
 *   put:
 *     summary: Update a shop
 *     tags: [Shops]
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
 *             $ref: '#/components/schemas/Shop'
 *     responses:
 *       200:
 *         description: Shop updated
 */
router.put('/:id', protect, authorize('shop', 'admin'), upload.single('logo'), updateShop);

/**
 * @swagger
 * /api/shops/{id}:
 *   delete:
 *     summary: Delete a shop
 *     tags: [Shops]
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
 *         description: Shop deleted
 */
router.delete('/:id', protect, authorize('shop', 'admin'), deleteShop);

/**
 * @swagger
 * /api/shops/with-user:
 *   post:
 *     summary: Create a shop with a new user
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Shop and User created
 */
router.post('/with-user', protect, authorize('admin'), upload.single('logo'), createShopWithUser);

// Rating routes
router.post('/:id/rate', protect, rateShop);
router.put('/:id/rate', protect, updateShopRate);

module.exports = router;
