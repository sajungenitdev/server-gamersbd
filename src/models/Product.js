const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },

    // Pricing
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (value) {
          // Only validate when product is on sale and value is provided
          if (
            this.isOnSale === true &&
            value !== undefined &&
            value !== null &&
            value > 0
          ) {
            if (value >= this.price) {
              return false;
            }
          }
          return true;
        },
        message: "Discount price must be less than regular price",
      },
    },

    currency: {
      type: String,
      default: "BDT",
      uppercase: true,
      trim: true,
    },

    // Category
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    // Brand (SINGLE INSTANCE - KEEP THIS ONE)
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Images - Base64 strings
    mainImage: {
      type: String,
      required: [true, "Main image is required"],
    },

    images: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(v);
          },
          message: "Invalid image format. Must be base64 encoded image",
        },
      },
    ],

    // Inventory
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },

    availability: {
      type: String,
      enum: ["in-stock", "out-of-stock", "pre-order", "coming-soon"],
      default: "in-stock",
    },

    // Product Type
    type: {
      type: String,
      enum: ["game", "toy", "accessory", "console", "board-game", "card-game"],
      required: [true, "Product type is required"],
    },

    // Gaming Specific Fields
    platform: [
      {
        type: String,
        enum: [
          "PS5",
          "PS4",
          "Xbox Series X",
          "Xbox Series S",
          "Xbox One",
          "Nintendo Switch",
          "PC",
          "Mobile",
          "VR",
        ],
      },
    ],

    genre: [
      {
        type: String,
        enum: [
          "Action",
          "Adventure",
          "RPG",
          "Strategy",
          "Racing",
          "Sports",
          "Shooter",
          "Fighting",
          "Puzzle",
          "Simulation",
          "Horror",
          "Open World",
        ],
      },
    ],

    // Age and Players
    ageRange: {
      min: { type: Number, default: 3, min: 0, max: 18 },
      max: { type: Number, default: 99, min: 3, max: 99 },
    },

    players: {
      min: { type: Number, default: 1, min: 1 },
      max: { type: Number, default: 1, min: 1 },
    },

    // Publishing
    publisher: {
      type: String,
      trim: true,
    },

    releaseDate: {
      type: Date,
    },

    // Features and Specifications
    features: [
      {
        type: String,
        trim: true,
      },
    ],

    specifications: {
      type: Map,
      of: String,
    },

    // Physical Details
    weight: {
      type: Number,
      min: 0,
    },

    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, default: "cm", enum: ["cm", "inch", "mm"] },
    },

    // ====================================
    // OFFER FIELDS - ONE PRODUCT, ONE OFFER
    // ====================================
    offerType: {
      type: String,
      enum: [
        "hot-deal",
        "best-deal",
        "special-offer",
        "flash-sale",
        "featured",
        "none",
      ],
      default: "none",
    },

    offerBadge: {
      type: String,
      enum: ["Hot", "Best Deal", "Special", "Sale", "Limited", "New", "none"],
      default: "none",
    },

    offerBadgeColor: {
      type: String,
      enum: ["red", "blue", "green", "orange", "purple", "yellow"],
      default: "red",
    },

    offerPriority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },

    // Sale Information (only if on sale)
    isOnSale: {
      type: Boolean,
      default: false,
    },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    saleStartDate: {
      type: Date,
    },

    saleEndDate: {
      type: Date,
    },

    // For flash sales only
    flashSaleQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    flashSaleSold: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Product Identifiers
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    rating: {
      type: String,
      trim: true,
    },

    storageRequired: {
      type: String,
      trim: true,
    },

    // Status Flags
    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Search and SEO
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, "Meta title should be under 60 characters"],
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description should be under 160 characters"],
    },

    metaKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Analytics
    views: {
      type: Number,
      default: 0,
    },

    soldCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual to check if deal is active
productSchema.virtual("isDealActive").get(function () {
  if (!this.isOnSale || this.offerType === "none") return false;

  const now = new Date();
  if (this.saleStartDate && this.saleEndDate) {
    return now >= this.saleStartDate && now <= this.saleEndDate;
  }

  return this.isOnSale;
});

// Virtual for final price after discount
productSchema.virtual("finalPrice").get(function () {
  if (this.discountPrice) {
    return this.discountPrice;
  }
  if (this.discountPercentage && this.discountPercentage > 0) {
    return this.price * (1 - this.discountPercentage / 100);
  }
  return this.price;
});

// Virtual for offer badge display
productSchema.virtual("offerDisplay").get(function () {
  if (this.offerType === "none") return null;
  return {
    type: this.offerType,
    badge: this.offerBadge,
    color: this.offerBadgeColor,
    priority: this.offerPriority,
  };
});

// Index for search
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1, createdAt: -1 });
productSchema.index({ offerType: 1, offerPriority: -1 });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });

// Pre-save middleware to generate SKU if not provided
productSchema.pre("save", function (next) {
  if (!this.sku) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.sku = `${prefix}-${timestamp}-${random}`;
  }
  // next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
