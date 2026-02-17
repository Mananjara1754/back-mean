const express = require('express');
const router = express.Router();
const {
    createPromotion,
    getPromotions,
    getPromotionById,
    updatePromotion,
    deletePromotion,
    trackClick
} = require('../controllers/promotionController');
const { protect, authorize } = require('../controllers/authController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Promotion:
 *       type: object
 *       required:
 *         - shop_id
 *         - type
 *         - title
 *         - budget
 *         - start_date
 *         - end_date
 *       properties:
 *         shop_id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [homepage, carousel, featured, discount]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         discount_percent:
 *           type: number
 *         budget:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     summary: Get active promotions
 *     tags: [Promotions]
 *     responses:
 *       200:
 *         description: List of promotions
 */
router.get('/', getPromotions);

/**
 * @swagger
 * /api/promotions/{id}:
 *   get:
 *     summary: Get promotion details
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion details
 */
router.get('/:id', getPromotionById);

/**
 * @swagger
 * /api/promotions:
 *   post:
 *     summary: Create a promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Promotion'
 *     responses:
 *       201:
 *         description: Promotion created
 */
router.post('/', protect, authorize('shop', 'admin'), createPromotion);

/**
 * @swagger
 * /api/promotions:
 *   put:
 *     summary: Update a promotion
 *     tags: [Promotions]
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
 *             $ref: '#/components/schemas/Promotion'
 *     responses:
 *       200:
 *         description: Promotion updated
 */
router.put('/:id', protect, authorize('shop', 'admin'), updatePromotion);

/**
 * @swagger
 * /api/promotions:
 *   delete:
 *     summary: Delete a promotion
 *     tags: [Promotions]
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
 *         description: Promotion deleted
 */
router.delete('/:id', protect, authorize('shop', 'admin'), deletePromotion);

/**
 * @swagger
 * /api/promotions/{id}/click:
 *   patch:
 *     summary: Track click on promotion
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Click tracked
 */
router.patch('/:id/click', trackClick);

module.exports = router;
