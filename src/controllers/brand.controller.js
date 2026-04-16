const Brand = require("../models/Brand");
const Product = require("../models/Product");

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private/Admin
// @desc    Create new brand
// @route   POST /api/brands
// @access  Private/Admin
const createBrand = async (req, res) => {
  try {
    const brandData = req.body;

    // Check if brand already exists (case insensitive)
    const existingBrand = await Brand.findOne({
      name: { $regex: new RegExp(`^${brandData.name}$`, "i") },
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: "Brand with this name already exists",
      });
    }

    // Generate slug manually if needed
    if (!brandData.slug && brandData.name) {
      brandData.slug = brandData.name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // Validate images if provided
    if (
      brandData.logo &&
      !brandData.logo.startsWith("data:image") &&
      !brandData.logo.startsWith("http")
    ) {
      return res.status(400).json({
        success: false,
        message: "Logo must be a valid base64 image or URL",
      });
    }

    if (
      brandData.coverImage &&
      !brandData.coverImage.startsWith("data:image") &&
      !brandData.coverImage.startsWith("http")
    ) {
      return res.status(400).json({
        success: false,
        message: "Cover image must be a valid base64 image or URL",
      });
    }

    // Remove createdBy if you don't want to track who created it
    // Or make it optional
    if (req.user) {
      brandData.createdBy = req.user._id;
    }

    const brand = await Brand.create(brandData);

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Create brand error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Brand with this ${field} already exists`,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "name",
      sortOrder = "asc",
      isActive,
      isPopular,
      search,
      withProductCount = "true",
    } = req.query;

    // Build filter
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (isPopular !== undefined) {
      filter.isPopular = isPopular === "true";
    }

    // Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    let brands = await Brand.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    // Update product counts if requested
    if (withProductCount === "true") {
      await Promise.all(
        brands.map(async (brand) => {
          const count = await Product.countDocuments({
            brand: brand.name,
            isActive: true,
          });
          brand.productCount = count;
        }),
      );
    }

    const total = await Brand.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: brands.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: brands,
    });
  } catch (error) {
    console.error("Get brands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single brand by ID or slug
// @route   GET /api/brands/:identifier
// @access  Public
const getBrandByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is MongoDB ID or slug
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(identifier);

    let query = {};
    if (isMongoId) {
      query = { _id: identifier };
    } else {
      query = { slug: identifier };
    }

    const brand = await Brand.findOne(query).lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({
      brand: brand.name,
      isActive: true,
    });

    // Get sample products for this brand
    const sampleProducts = await Product.find({
      brand: brand.name,
      isActive: true,
    })
      .select("name price mainImage images slug")
      .limit(8)
      .sort({ createdAt: -1 });

    brand.productCount = productCount;
    brand.sampleProducts = sampleProducts;

    res.status(200).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error("Get brand error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
const updateBrand = async (req, res) => {
  try {
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.productCount;

    // Check if name is being updated and if it already exists
    if (updates.name) {
      const existingBrand = await Brand.findOne({
        name: { $regex: new RegExp(`^${updates.name}$`, "i") },
        _id: { $ne: req.params.id },
      });

      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: "Brand with this name already exists",
        });
      }
    }

    // Validate images if provided
    if (
      updates.logo &&
      !updates.logo.startsWith("data:image") &&
      !updates.logo.startsWith("http")
    ) {
      return res.status(400).json({
        success: false,
        message: "Logo must be a valid base64 image or URL",
      });
    }

    if (
      updates.coverImage &&
      !updates.coverImage.startsWith("data:image") &&
      !updates.coverImage.startsWith("http")
    ) {
      return res.status(400).json({
        success: false,
        message: "Cover image must be a valid base64 image or URL",
      });
    }

    // Remove updatedBy if no user (optional)
    if (req.user) {
      updates.updatedBy = req.user._id;
    }

    const brand = await Brand.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Update brand error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Brand with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if brand has products
    const productCount = await Product.countDocuments({ brand: brand.name });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand because it has ${productCount} products. Update or delete the products first.`,
      });
    }

    await brand.deleteOne();

    res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    console.error("Delete brand error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle brand status (active/inactive)
// @route   PATCH /api/brands/:id/toggle-status
// @access  Private/Admin
const toggleBrandStatus = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.isActive = !brand.isActive;
    
    // Remove updatedBy if no user (optional)
    if (req.user) {
      brand.updatedBy = req.user._id;
    }
    
    await brand.save();

    res.status(200).json({
      success: true,
      message: `Brand ${brand.isActive ? "activated" : "deactivated"} successfully`,
      data: brand,
    });
  } catch (error) {
    console.error("Toggle brand status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle popular status
// @route   PATCH /api/brands/:id/toggle-popular
// @access  Private/Admin
const togglePopularStatus = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.isPopular = !brand.isPopular;
    
    // Remove updatedBy if no user (optional)
    if (req.user) {
      brand.updatedBy = req.user._id;
    }
    
    await brand.save();

    res.status(200).json({
      success: true,
      message: `Brand ${brand.isPopular ? "marked as popular" : "removed from popular"} successfully`,
      data: brand,
    });
  } catch (error) {
    console.error("Toggle popular status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get popular brands
// @route   GET /api/brands/popular
// @access  Public
const getPopularBrands = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const brands = await Brand.find({
      isActive: true,
      isPopular: true,
    })
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .lean();

    // Get product counts
    await Promise.all(
      brands.map(async (brand) => {
        const count = await Product.countDocuments({
          brand: brand.name,
          isActive: true,
        });
        brand.productCount = count;
      }),
    );

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

// @desc    Bulk update brands
// @route   PATCH /api/brands/bulk
// @access  Private/Admin
const bulkUpdateBrands = async (req, res) => {
  try {
    const { brandIds, updates } = req.body;

    if (!brandIds || !Array.isArray(brandIds) || brandIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide brand IDs array",
      });
    }

    // Remove fields that shouldn't be bulk updated
    delete updates._id;
    delete updates.createdBy;
    delete updates.name; // Don't allow bulk name updates

    updates.updatedBy = req.user._id;

    const result = await Brand.updateMany(
      { _id: { $in: brandIds } },
      { $set: updates },
      { runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} brands successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Bulk update brands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update product counts for all brands
// @route   POST /api/brands/update-counts
// @access  Private/Admin
const updateAllProductCounts = async (req, res) => {
  try {
    const brands = await Brand.find({});

    await Promise.all(
      brands.map(async (brand) => {
        const count = await Product.countDocuments({
          brand: brand.name,
          isActive: true,
        });

        if (brand.productCount !== count) {
          brand.productCount = count;
          await brand.save();
        }
      }),
    );

    res.status(200).json({
      success: true,
      message: "Product counts updated successfully",
    });
  } catch (error) {
    console.error("Update product counts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createBrand,
  getBrands,
  getBrandByIdentifier,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
  togglePopularStatus,
  getPopularBrands,
  bulkUpdateBrands,
  updateAllProductCounts,
};
