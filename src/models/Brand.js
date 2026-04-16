const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String, // Base64 string or URL
      default: null,
    },
    coverImage: {
      type: String, // Base64 string or URL
      default: null,
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    foundedYear: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear(),
    },
    headquarters: {
      country: { type: String, default: "" },
      city: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    contact: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      supportEmail: { type: String, default: "" },
    },
    social: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: [{ type: String }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    productCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Create slug from name before saving
brandSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-") // Replace special chars with hyphen
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }
  // next();
});

// Index for search
brandSchema.index({ name: "text", description: "text" });
brandSchema.index({ slug: 1 });
brandSchema.index({ isActive: 1, isPopular: -1 });

module.exports = mongoose.model("Brand", brandSchema);
