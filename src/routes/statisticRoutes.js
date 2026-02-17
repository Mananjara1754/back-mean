const express = require('express');
const router = express.Router();
const { getUsersStats, getPaymentStats, getGlobalStats } = require('../controllers/statisticController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Admin statistic routes
 */

/**
 * @swagger
 * /api/admin/statistics/users:
 *   get:
 *     summary: Get user statistics (daily creation and distribution)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dailyStats:
 *                   type: object
 *                 distribution:
 *                   type: object
 *       400:
 *         description: Invalid parameters or date range > 60 days
 */
router.get('/users', protect, authorize('admin'), getUsersStats);

/**
 * @swagger
 * /api/admin/statistics/payment:
 *   get:
 *     summary: Get payment statistics (monthly totals)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: Year (YYYY)
 *     responses:
 *       200:
 *         description: Payment statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   payment:
 *                     type: number
 */
router.get('/payment', protect, authorize('admin'), getPaymentStats);

/**
 * @swagger
 * /api/admin/statistics/global:
 *   get:
 *     summary: Get global statistics (totals mostly for year)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: Year (YYYY)
 *     responses:
 *       200:
 *         description: Global statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPaymentAmount:
 *                   type: number
 *                 totalShops:
 *                   type: number
 *                 totalOrders:
 *                   type: number
 *                 totalUsers:
 *                   type: number
 */
router.get('/global', protect, authorize('admin'), getGlobalStats);

module.exports = router;
