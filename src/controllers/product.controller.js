const Product = require("../models/Product");
const Category = require("../models/Category");

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validate category exists
    const category = await Category.findById(productData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Validate brand is provided
    if (!productData.brand) {
      return res.status(400).json({
        success: false,
        message: "Brand is required",
      });
    }

    // Validate base64 images
    if (
      productData.mainImage &&
      !productData.mainImage.startsWith("data:image")
    ) {
      return res.status(400).json({
        success: false,
        message: "Main image must be a valid base64 image",
      });
    }

    if (productData.images && Array.isArray(productData.images)) {
      for (let img of productData.images) {
        if (!img.startsWith("data:image")) {
          return res.status(400).json({
            success: false,
            message: "All images must be valid base64 images",
          });
        }
      }
    }

    const product = await Product.create(productData);

    // Update category product count
    await Category.findByIdAndUpdate(productData.category, {
      $inc: { productCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    // Handle duplicate SKU error
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      category,
      type,
      platform,
      genre,
      brand,
      minPrice,
      maxPrice,
      search,
      isFeatured,
      inStock,
      offerType,
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (platform) filter.platform = platform;
    if (genre) filter.genre = genre;
    if (brand) filter.brand = brand;
    if (isFeatured === "true") filter.isFeatured = true;
    if (inStock === "true") filter.stock = { $gt: 0 };
    if (offerType) filter.offerType = offerType;

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Search - handle both text search and regex search
    if (search) {
      // Use $or for regex search on multiple fields
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .populate('brand') // ADD THIS LINE - populate brand data
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    // Get unique brands for filter options
    const brands = await Product.distinct("brand", { isActive: true });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      filters: {
        brands,
      },
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
// In product.controller.js
const getProductById = async (req, res) => {
  try {
    console.log('Fetching product with ID:', req.params.id); // Debug log

    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('brand', 'name logo');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);

    // Check if it's a invalid ObjectId error
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.views;
    delete updates.soldCount;
    delete updates.createdAt;

    // If category is being updated, update product counts
    if (updates.category) {
      const oldProduct = await Product.findById(req.params.id);
      if (oldProduct && oldProduct.category.toString() !== updates.category) {
        // Decrement old category count
        await Category.findByIdAndUpdate(oldProduct.category, {
          $inc: { productCount: -1 },
        });
        // Increment new category count
        await Category.findByIdAndUpdate(updates.category, {
          $inc: { productCount: 1 },
        });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("category", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Decrement category product count
    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: -1 },
    });

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      category: categoryId,
      isActive: true,
    })
      .populate("category", "name slug")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({
      category: categoryId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: products,
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      isFeatured: true,
      isActive: true,
    })
      .populate("category", "name slug")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use text search if available, otherwise fallback to regex
    let products, total;

    try {
      // Try text search first
      products = await Product.find(
        { $text: { $search: q }, isActive: true },
        { score: { $meta: "textScore" } },
      )
        .populate("category", "name slug")
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(parseInt(limit));

      total = await Product.countDocuments({
        $text: { $search: q },
        isActive: true,
      });
    } catch (textSearchError) {
      // Fallback to regex search if text search fails
      const searchFilter = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { brand: { $regex: q, $options: "i" } },
          { sku: { $regex: q, $options: "i" } },
        ],
        isActive: true,
      };

      products = await Product.find(searchFilter)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      total = await Product.countDocuments(searchFilter);
    }

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: products,
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by offer type
// @route   GET /api/products/offers/:type
// @access  Public
const getProductsByOfferType = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const validTypes = [
      "hot-deal",
      "best-deal",
      "special-offer",
      "flash-sale",
      "featured",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid offer type. Must be one of: hot-deal, best-deal, special-offer, flash-sale, featured",
      });
    }

    const products = await Product.find({
      offerType: type,
      isActive: true,
    })
      .sort({ offerPriority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products by offer type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all active offers
// @route   GET /api/products/offers
// @access  Public
const getAllOffers = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const products = await Product.find({
      offerType: { $ne: "none" },
      isActive: true,
    })
      .sort({ offerPriority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get all offers error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get related products (same category, different ID)
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const related = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isActive: true,
    })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: related.length,
      data: related,
    });
  } catch (error) {
    console.error("Get related products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get flash sale products (with limited quantity)
// @route   GET /api/products/flash-sale
// @access  Public
const getFlashSaleProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({
      offerType: "flash-sale",
      isActive: true,
      flashSaleQuantity: { $gt: 0 },
    })
      .sort({ offerPriority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get flash sale products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get latest products
// @route   GET /api/products/latest
// @access  Public
const getLatestProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get latest products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by price range
// @route   GET /api/products/price-range
// @access  Public
const getProductsByPriceRange = async (req, res) => {
  try {
    const { min = 0, max = Infinity, limit = 20 } = req.query;

    const products = await Product.find({
      price: { $gte: Number(min), $lte: Number(max) },
      isActive: true,
    })
      .sort({ price: 1 })
      .limit(parseInt(limit))
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products by price range error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update flash sale sold count
// @route   PATCH /api/products/:id/flash-sale
// @access  Private/Admin
const updateFlashSaleSold = async (req, res) => {
  try {
    const { quantity = 1 } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.offerType !== "flash-sale") {
      return res.status(400).json({
        success: false,
        message: "Product is not a flash sale item",
      });
    }

    if (product.flashSaleSold + quantity > product.flashSaleQuantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough flash sale quantity available",
      });
    }

    product.flashSaleSold += quantity;
    product.stock -= quantity;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Flash sale updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update flash sale error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============= NEW BRAND-SPECIFIC FUNCTIONS =============

// @desc    Get all unique brands
// @route   GET /api/products/brands
// @access  Public
const getAllBrands = async (req, res) => {
  try {
    const brands = await Product.distinct("brand", { isActive: true });

    // Get product count per brand
    const brandsWithCount = await Promise.all(
      brands.map(async (brand) => {
        const count = await Product.countDocuments({ brand, isActive: true });
        // Get a sample product image for the brand (optional)
        const sampleProduct = await Product.findOne({ brand, isActive: true })
          .select("mainImage images")
          .lean();

        return {
          name: brand,
          count,
          image: sampleProduct?.mainImage || sampleProduct?.images?.[0] || null,
        };
      }),
    );

    // Sort by count (most products first)
    brandsWithCount.sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brandsWithCount,
    });
  } catch (error) {
    console.error("Get all brands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by brand
// @route   GET /api/products/brand/:brand
// @access  Public
const getProductsByBrand = async (req, res) => {
  try {
    const { brand } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      minPrice,
      maxPrice,
      category,
    } = req.query;

    // Build filter
    const filter = {
      brand: { $regex: new RegExp(`^${brand}$`, "i") }, // Case-insensitive exact match
      isActive: true,
    };

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    // Get available categories for this brand (for filtering)
    const categories = await Product.distinct("category", {
      brand: { $regex: new RegExp(`^${brand}$`, "i") },
      isActive: true,
    });

    const populatedCategories = await Category.find({
      _id: { $in: categories },
    }).select("name slug");

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      brand: brand,
      filters: {
        categories: populatedCategories,
      },
      data: products,
    });
  } catch (error) {
    console.error("Get products by brand error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get brand details
// @route   GET /api/products/brand/:brand/details
// @access  Public
const getBrandDetails = async (req, res) => {
  try {
    const { brand } = req.params;

    // Get brand info
    const products = await Product.find({
      brand: { $regex: new RegExp(`^${brand}$`, "i") },
      isActive: true,
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .limit(1);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Get statistics
    const totalProducts = await Product.countDocuments({
      brand: { $regex: new RegExp(`^${brand}$`, "i") },
      isActive: true,
    });

    const averagePrice = await Product.aggregate([
      {
        $match: {
          brand: { $regex: new RegExp(`^${brand}$`, "i") },
          isActive: true,
        },
      },
      { $group: { _id: null, avgPrice: { $avg: "$price" } } },
    ]);

    const categoryCount = await Product.distinct("category", {
      brand: { $regex: new RegExp(`^${brand}$`, "i") },
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        name: brand,
        totalProducts,
        averagePrice: averagePrice[0]?.avgPrice || 0,
        totalCategories: categoryCount.length,
        sampleProduct: products[0],
      },
    });
  } catch (error) {
    console.error("Get brand details error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get popular brands (with most products)
// @route   GET /api/products/brands/popular
// @access  Public
const getPopularBrands = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const brands = await Product.aggregate([
      { $match: { isActive: true, brand: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
          averagePrice: { $avg: "$price" },
          // Get a sample image
          image: {
            $first: {
              $ifNull: ["$mainImage", { $arrayElemAt: ["$images", 0] }],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: "$_id",
          _id: 0,
          count: 1,
          averagePrice: 1,
          image: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands,
    });
  } catch (error) {
    console.error("Get popular brands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts,
  getProductsByOfferType,
  getAllOffers,
  getRelatedProducts,
  getFlashSaleProducts,
  getLatestProducts,
  getProductsByPriceRange,
  updateFlashSaleSold,
  // New brand exports
  getAllBrands,
  getProductsByBrand,
  getBrandDetails,
  getPopularBrands,
};
