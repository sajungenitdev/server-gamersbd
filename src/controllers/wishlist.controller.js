const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    console.log('Fetching wishlist for user:', req.user._id);
    
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice images stock category brand platform rating slug'
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: []
      });
    }

    // Filter out any null products and format response
    const validItems = (wishlist.items || []).filter(item => item.product !== null);
    
    const formattedItems = validItems.map(item => ({
      _id: item._id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        discountPrice: item.product.discountPrice,
        finalPrice: item.product.discountPrice || item.product.price,
        images: item.product.images || [],
        stock: item.product.stock,
        slug: item.product.slug,
        rating: item.product.rating,
        brand: item.product.brand,
        platform: item.product.platform
      },
      addedAt: item.addedAt,
      note: item.note || ''
    }));

    res.json({
      success: true,
      wishlist: {
        _id: wishlist._id,
        name: wishlist.name,
        isPublic: wishlist.isPublic || false,
        shareId: wishlist.shareId,
        totalItems: formattedItems.length,
        items: formattedItems,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add item to wishlist
// @route   POST /api/wishlist/add
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    
    console.log('Adding to wishlist:', { userId: req.user._id, productId });

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      wishlist = new Wishlist({ 
        user: req.user._id, 
        items: [] 
      });
    }

    // Check if already in wishlist
    const alreadyExists = wishlist.items.some(
      item => item.product.toString() === productId
    );
    
    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    wishlist.items.push({ product: productId });
    await wishlist.save();

    // Get the newly added item
    const newItem = wishlist.items[wishlist.items.length - 1];
    
    await wishlist.populate({
      path: 'items.product',
      select: 'name price discountPrice images stock slug'
    });

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        itemId: newItem._id,
        wishlist
      }
    });
    
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/remove/:itemId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;

    console.log('Removing from wishlist:', { userId: req.user._id, itemId });

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const originalLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      item => item._id.toString() !== itemId
    );

    if (originalLength === wishlist.items.length) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }
    
    await wishlist.save();

    res.json({
      success: true,
      message: 'Item removed from wishlist'
    });
    
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Clear wishlist
// @route   DELETE /api/wishlist/clear
// @access  Private
const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({
      success: true,
      message: 'Wishlist cleared successfully'
    });
    
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    console.log('Checking wishlist:', { userId: req.user._id, productId });

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      return res.json({ 
        success: true, 
        inWishlist: false, 
        itemId: null 
      });
    }

    const item = wishlist.items.find(
      item => item.product.toString() === productId
    );

    res.json({
      success: true,
      inWishlist: !!item,
      itemId: item ? item._id : null
    });
    
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlist
};