const express = require('express');
const { addFavorite, removeFavorite } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/favorites/:product_id', protect, addFavorite);
router.delete('/favorites/:product_id', protect, removeFavorite);

module.exports = router;
