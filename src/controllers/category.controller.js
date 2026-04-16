// controllers/category.controller.js
const Category = require("../models/Category");

// Helper function to validate and process Base64 image
const processBase64Image = (base64String) => {
  if (!base64String) return null;
  
  // Check if it's a Base64 string
  const base64Regex = /^data:image\/(jpeg|jpg|png|webp|gif|bmp);base64,/;
  
  if (base64Regex.test(base64String)) {
    // Validate size (max 2MB for Base64)
    const base64Data = base64String.split(',')[1];
    const base64Size = Buffer.from(base64Data, 'base64').length;
    if (base64Size > 2 * 1024 * 1024) {
      throw new Error('Image size must be less than 2MB');
    }
    return base64String;
  }
  
  // If it's a URL, return as is
  if (base64String && (base64String.startsWith('http') || base64String.startsWith('/uploads'))) {
    return base64String;
  }
  
  return null;
};

// Helper function to validate image
const isValidImage = (imageData) => {
  if (!imageData) return true;
  
  // Check if it's a valid URL or Base64
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i;
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp|gif|bmp);base64,/;
  
  return urlPattern.test(imageData) || base64Pattern.test(imageData);
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("parent", "name slug image")
      .sort("order name");

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "parent",
      "name slug image",
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // First try to find by slug
    let category = await Category.findOne({ slug }).populate(
      "parent",
      "name slug image",
    );

    // If not found by slug, try to find by name (for backward compatibility)
    if (!category) {
      const decodedSlug = decodeURIComponent(slug).replace(/-/g, " ");
      category = await Category.findOne({
        name: { $regex: new RegExp(`^${decodedSlug}$`, "i") },
      }).populate("parent", "name slug image");
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get subcategories
    const subcategories = await Category.find({ parent: category._id })
      .select(
        "_id name slug description image imageAlt icon level order featured",
      )
      .sort("order name");

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subcategories of a category
const getSubcategories = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Getting subcategories for category ID:", id);

    // Find category by ID
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get subcategories (categories that have this category as parent)
    const subcategories = await Category.find({
      parent: id,
    }).select("_id name slug description image level");

    console.log(`Found ${subcategories.length} subcategories`);

    res.json({
      success: true,
      data: subcategories,
      count: subcategories.length,
      parentCategory: {
        id: category._id,
        name: category.name,
        slug: category.slug,
      },
    });
  } catch (error) {
    console.error("Error in getSubcategories:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subcategory by slugs
const getSubcategoryBySlug = async (req, res) => {
  try {
    const { categorySlug, subcategorySlug } = req.params;

    console.log("Looking for subcategory:", { categorySlug, subcategorySlug });

    // First find the parent category
    let parentCategory = await Category.findOne({ slug: categorySlug });
    if (!parentCategory) {
      const decodedSlug = decodeURIComponent(categorySlug).replace(/-/g, " ");
      parentCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${decodedSlug}$`, "i") },
      });
    }

    if (!parentCategory) {
      console.log("Parent category not found:", categorySlug);
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Find subcategory by slug that has parent = parentCategory._id
    let subcategory = await Category.findOne({
      slug: subcategorySlug,
      parent: parentCategory._id,
    }).populate("parent", "name slug");

    if (!subcategory) {
      // Try to find by name
      const decodedSlug = decodeURIComponent(subcategorySlug).replace(
        /-/g,
        " ",
      );
      subcategory = await Category.findOne({
        name: { $regex: new RegExp(`^${decodedSlug}$`, "i") },
        parent: parentCategory._id,
      }).populate("parent", "name slug");
    }

    if (!subcategory) {
      console.log("Subcategory not found:", subcategorySlug);
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    console.log("Found subcategory:", subcategory.name);

    // Get products for this subcategory
    const Product = require("../models/Product");
    const products = await Product.find({
      category: subcategory._id,
      isActive: true,
    }).select(
      "_id name price discountPrice originalPrice images mainImage rating inStock stock slug",
    );

    res.status(200).json({
      success: true,
      data: {
        ...subcategory.toObject(),
        parentCategory: {
          _id: parentCategory._id,
          name: parentCategory.name,
          slug: parentCategory.slug,
        },
        products,
      },
    });
  } catch (error) {
    console.error("Error in getSubcategoryBySlug:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get products by category ID (for categories without subcategories)
const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Getting products for category:", id);

    // Check if category exists
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Import Product model
    const Product = require("../models/Product");

    // Find products that belong to this category
    const products = await Product.find({
      category: id,
      isActive: true,
    }).select(
      "_id name price discountPrice originalPrice images mainImage rating inStock stock slug",
    );

    console.log(
      `Found ${products.length} products for category ${category.name}`,
    );

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
      },
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      imageAlt,
      bannerImage,
      icon,
      parent,
      metaTitle,
      metaDescription,
      order,
      featured,
    } = req.body;

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Calculate level based on parent
    let level = 0;
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (parentCategory) {
        level = parentCategory.level + 1;
      }
    }

    // Process Base64 images
    let processedImage = null;
    let processedBannerImage = null;
    
    try {
      processedImage = processBase64Image(image);
      processedBannerImage = processBase64Image(bannerImage);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const category = await Category.create({
      name,
      slug,
      description: description || "",
      image: processedImage,
      imageAlt: imageAlt || "",
      bannerImage: processedBannerImage,
      icon: icon || null,
      parent: parent || null,
      level,
      metaTitle: metaTitle || name,
      metaDescription: metaDescription || description || "",
      order: order || 0,
      featured: featured || false,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      imageAlt,
      bannerImage,
      icon,
      parent,
      metaTitle,
      metaDescription,
      order,
      featured,
      isActive,
    } = req.body;

    const updateData = {
      description: description || "",
      imageAlt: imageAlt || "",
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
    };

    // Process Base64 images if provided
    if (image !== undefined) {
      try {
        updateData.image = processBase64Image(image);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    if (bannerImage !== undefined) {
      try {
        updateData.bannerImage = processBase64Image(bannerImage);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    if (icon !== undefined) {
      updateData.icon = icon || null;
    }

    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (parent !== undefined) {
      if (parent && parent !== "") {
        const parentCategory = await Category.findById(parent);
        if (parentCategory) {
          updateData.level = parentCategory.level + 1;
          updateData.parent = parent;
        } else if (parent === null || parent === "") {
          updateData.level = 0;
          updateData.parent = null;
        }
      } else {
        updateData.level = 0;
        updateData.parent = null;
      }
    }

    if (order !== undefined) updateData.order = order;
    if (featured !== undefined) updateData.featured = featured;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).populate("parent", "name slug image");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const hasChildren = await Category.findOne({ parent: req.params.id });

    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with subcategories",
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get category tree (all categories with their subcategories)
const getCategoryTree = async (req, res) => {
  try {
    // Get all top-level categories (parent = null)
    const topLevelCategories = await Category.find({
      parent: null,
      isActive: true,
    })
      .select(
        "_id name slug description image imageAlt icon level order featured",
      )
      .sort("order name");

    // For each top-level category, get its subcategories
    const categoryTree = await Promise.all(
      topLevelCategories.map(async (category) => {
        const subcategories = await Category.find({
          parent: category._id,
          isActive: true,
        })
          .select(
            "_id name slug description image imageAlt icon level order featured",
          )
          .sort("order name");
        return {
          ...category.toObject(),
          subcategories,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: categoryTree,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  getSubcategoryBySlug,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
};