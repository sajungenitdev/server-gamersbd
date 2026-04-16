const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlist
} = require('../controllers/wishlist.controller');

// Test route (optional, for debugging)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Wishlist routes are working!' });
});

// All routes require authentication
router.use(protect);

router.get('/', getWishlist);
router.get('/check/:productId', checkWishlist);
router.post('/add', addToWishlist);
router.delete('/remove/:itemId', removeFromWishlist);
router.delete('/clear', clearWishlist);

module.exports = router;