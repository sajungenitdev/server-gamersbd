const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    default: ''
  }
});

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: {
    type: [wishlistItemSchema],
    default: []
  },
  name: {
    type: String,
    default: 'My Wishlist'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Virtual for total items
wishlistSchema.virtual('totalItems').get(function() {
  return this.items ? this.items.length : 0;
});

// Ensure virtuals are included
wishlistSchema.set('toJSON', { virtuals: true });
wishlistSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);