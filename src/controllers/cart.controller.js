const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Helper function to calculate cart totals
const calculateCartTotals = (items) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.discountPrice || item.product?.price || 0;
    return sum + (price * item.quantity);
  }, 0);
  return { totalItems, subtotal };
};

// Helper function to populate cart items
const populateCart = async (cart) => {
  if (cart && cart.items.length > 0) {
    await cart.populate({
      path: "items.product",
      select: "name price discountPrice images stock category slug platform description",
    });
  }
  return cart;
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    console.log("📦 Getting cart for user:", req.user._id);
    
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
      });
    }

    await populateCart(cart);
    
    const { totalItems, subtotal } = calculateCartTotals(cart.items);

    res.json({
      success: true,
      cart: {
        _id: cart._id,
        items: cart.items.map(item => ({
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
            platform: item.product.platform
          },
          quantity: item.quantity,
          platform: item.platform,
          addedAt: item.addedAt
        })),
        totalItems,
        subtotal,
        finalTotal: subtotal,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount || 0,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res) => {
  console.log("📦 Adding to cart:", req.body);

  try {
    const { productId, quantity = 1, platform = "PS5" } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Check product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available`,
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [],
      });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} more. Only ${product.stock - cart.items[existingItemIndex].quantity} available.`,
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        platform,
      });
    }

    await cart.save();
    await populateCart(cart);
    
    const { totalItems, subtotal } = calculateCartTotals(cart.items);

    res.json({
      success: true,
      message: "Item added to cart",
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems,
        subtotal,
        finalTotal: subtotal
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:itemId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    console.log("🔄 Updating cart item:", { itemId, quantity });

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available`,
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await populateCart(cart);
    
    const { totalItems, subtotal } = calculateCartTotals(cart.items);

    res.json({
      success: true,
      message: "Cart updated",
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems,
        subtotal,
        finalTotal: subtotal
      },
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    console.log("🗑️ Removing from cart:", { itemId });

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item._id.toString() !== itemId
    );

    if (originalLength === cart.items.length) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    await cart.save();
    await populateCart(cart);
    
    const { totalItems, subtotal } = calculateCartTotals(cart.items);

    res.json({
      success: true,
      message: "Item removed from cart",
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems,
        subtotal,
        finalTotal: subtotal
      },
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res) => {
  try {
    console.log("🗑️ Clearing cart for user:", req.user._id);

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: "Cart cleared successfully",
      cart: { _id: cart._id, user: cart.user, items: [], totalItems: 0, subtotal: 0 },
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get cart count
// @route   GET /api/cart/count
// @access  Private
const getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get cart count error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Validate cart items (check stock)
// @route   GET /api/cart/validate
// @access  Private
const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.json({
        success: true,
        valid: false,
        message: "Cart is empty",
        issues: [],
      });
    }

    const issues = [];
    let needsUpdate = false;

    for (const item of cart.items) {
      if (!item.product) {
        issues.push({
          itemId: item._id,
          productId: item.product,
          issue: "Product not found",
        });
        needsUpdate = true;
      } else if (item.product.stock < item.quantity) {
        issues.push({
          itemId: item._id,
          productId: item.product._id,
          productName: item.product.name,
          requested: item.quantity,
          available: item.product.stock,
          issue: "Insufficient stock",
        });
        needsUpdate = true;
      }
    }

    res.json({
      success: true,
      valid: issues.length === 0,
      needsUpdate,
      issues,
    });
  } catch (error) {
    console.error("Validate cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Sync guest cart with user cart after login
// @route   POST /api/cart/sync
// @access  Private
const syncGuestCart = async (req, res) => {
  try {
    const { guestItems } = req.body;
    const userId = req.user._id;

    console.log("🔄 Syncing cart for user:", userId);
    console.log("📦 Guest items to sync:", guestItems?.length || 0);

    // Find or create user cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // If no guest items, just return current cart
    if (!guestItems || !Array.isArray(guestItems) || guestItems.length === 0) {
      await populateCart(cart);
      const { totalItems, subtotal } = calculateCartTotals(cart.items);
      
      return res.json({
        success: true,
        message: "No guest items to sync",
        cart: {
          _id: cart._id,
          items: cart.items,
          totalItems,
          subtotal,
          finalTotal: subtotal
        },
      });
    }

    // Merge guest items with existing cart
    let syncedCount = 0;
    let failedCount = 0;

    for (const guestItem of guestItems) {
      const { productId, quantity, platform = "PS5" } = guestItem;

      // Verify product exists and has stock
      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`⚠️ Product not found: ${productId}, skipping`);
        failedCount++;
        continue;
      }

      // Check if product already in cart
      const existingItemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      const safeQuantity = Math.min(quantity, product.stock);

      if (existingItemIndex > -1) {
        // Update quantity
        const newQuantity = cart.items[existingItemIndex].quantity + safeQuantity;
        cart.items[existingItemIndex].quantity = Math.min(newQuantity, product.stock);
      } else {
        // Add new item
        cart.items.push({
          product: productId,
          quantity: safeQuantity,
          platform,
        });
      }
      syncedCount++;
    }

    await cart.save();
    await populateCart(cart);
    
    const { totalItems, subtotal } = calculateCartTotals(cart.items);

    console.log(`✅ Cart synced: ${syncedCount} items added, ${failedCount} failed`);

    res.json({
      success: true,
      message: `Cart synced successfully. Added ${syncedCount} items.`,
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems,
        subtotal,
        finalTotal: subtotal
      },
      stats: {
        synced: syncedCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error("Sync cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Test cart routes
// @route   GET /api/cart/test
// @access  Public
const testCart = (req, res) => {
  res.json({
    success: true,
    message: "Cart routes are working!",
    endpoints: [
      "GET    /api/cart",
      "GET    /api/cart/count",
      "GET    /api/cart/validate",
      "GET    /api/cart/test",
      "POST   /api/cart/add",
      "PUT    /api/cart/update/:itemId",
      "DELETE /api/cart/remove/:itemId",
      "DELETE /api/cart/clear",
      "POST   /api/cart/sync",
    ],
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  validateCart,
  testCart,
  syncGuestCart,
};