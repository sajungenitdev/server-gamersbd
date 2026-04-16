const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    // Validate productId
    if (!isValidObjectId(productId)) {
      console.error('Invalid productId for rating update:', productId);
      return;
    }

    const result = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    const avgRating = result[0]?.avgRating || 0;
    const totalReviews = result[0]?.totalReviews || 0;

    await Product.findByIdAndUpdate(productId, {
      rating: avgRating.toFixed(1),
      reviews: totalReviews,
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

// Get all reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate productId
    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const objectId = new mongoose.Types.ObjectId(productId);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ 
      product: objectId, 
      status: 'approved' 
    })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email avatar');

    const total = await Review.countDocuments({ 
      product: objectId, 
      status: 'approved' 
    });

    // Calculate average rating
    const ratingAggregation = await Review.aggregate([
      { $match: { product: objectId, status: 'approved' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    const averageRating = ratingAggregation[0]?.avgRating || 0;
    const totalReviews = ratingAggregation[0]?.totalReviews || 0;

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { product: objectId, status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats: {
        averageRating: averageRating.toFixed(1),
        totalReviews,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// Create a review
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user._id;

    // Validate productId
    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Review comment must be at least 10 characters',
      });
    }

    // Check if user has purchased the product
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      status: 'delivered',
    });

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    // Create review
    const review = await Review.create({
      product: productId,
      user: userId,
      rating: parseInt(rating),
      title: title?.trim() || undefined,
      comment: comment.trim(),
      images: images || [],
      isVerifiedPurchase: !!hasPurchased,
      status: 'approved', // Auto-approve for now
    });

    // Populate user info
    await review.populate('user', 'name email avatar');

    // Update product rating
    await updateProductRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: error.message,
    });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user._id;

    // Validate reviewId
    if (!reviewId || !isValidObjectId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    const review = await Review.findOne({ _id: reviewId, user: userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update fields
    if (rating) review.rating = parseInt(rating);
    if (title) review.title = title.trim();
    if (comment) review.comment = comment.trim();
    if (images) review.images = images;

    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
    });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Validate reviewId
    if (!reviewId || !isValidObjectId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      ...(isAdmin ? {} : { user: userId }),
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const productId = review.product;
    await review.deleteOne();

    // Update product rating
    await updateProductRating(productId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message,
    });
  }
};

// Mark review as helpful
const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    // Validate reviewId
    if (!reviewId || !isValidObjectId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const alreadyHelped = review.helpful.users.includes(userId);

    if (alreadyHelped) {
      review.helpful.users = review.helpful.users.filter(
        id => id.toString() !== userId.toString()
      );
      review.helpful.count--;
    } else {
      review.helpful.users.push(userId);
      review.helpful.count++;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: alreadyHelped ? 'Removed helpful mark' : 'Marked as helpful',
      helpfulCount: review.helpful.count,
    });
  } catch (error) {
    console.error('Error marking helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark review as helpful',
      error: error.message,
    });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
};