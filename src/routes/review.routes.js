// routes/review.routes.js
const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
} = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes (require authentication)
router.use(protect);
router.post('/product/:productId', createReview);
router.put('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);
router.post('/:reviewId/helpful', markHelpful);

module.exports = router;