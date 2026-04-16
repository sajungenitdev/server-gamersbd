const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  validateCart,
  testCart,
  syncGuestCart,
} = require('../controllers/cart.controller');

// Public test route
router.get('/test', testCart);

// Protected routes (require authentication)
router.use(protect);

router.get('/', getCart);
router.get('/count', getCartCount);
router.get('/validate', validateCart);
router.post('/add', addToCart);
router.post('/sync', syncGuestCart);
router.put('/update/:itemId', updateCartItem);
router.delete('/remove/:itemId', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;