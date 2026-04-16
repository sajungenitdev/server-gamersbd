const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema(
  {
    // Basic Info
    siteName: {
      type: String,
      default: "GamersBD",
      trim: true,
    },
    siteTagline: {
      type: String,
      default: "Your Ultimate Gaming Destination",
      trim: true,
    },
    siteDescription: {
      type: String,
      default: "Welcome to GamersBD - The best place for gaming products, news, and community.",
      trim: true,
    },
    
    // Images
    siteLogo: {
      type: String,
      default: null,
    },
    siteFavicon: {
      type: String,
      default: null,
    },
    siteBanner: {
      type: String,
      default: null,
    },
    
    // Contact Info
    contactEmail: {
      type: String,
      default: "support@gamersbd.com",
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: "+8801234567890",
      trim: true,
    },
    contactAddress: {
      type: String,
      default: "Dhaka, Bangladesh",
      trim: true,
    },
    
    // Social Links
    socialLinks: {
      facebook: { type: String, default: "https://facebook.com/gamersbd" },
      twitter: { type: String, default: "https://twitter.com/gamersbd" },
      instagram: { type: String, default: "https://instagram.com/gamersbd" },
      youtube: { type: String, default: "https://youtube.com/gamersbd" },
      linkedin: { type: String, default: "https://linkedin.com/company/gamersbd" },
      discord: { type: String, default: "https://discord.gg/gamersbd" },
      twitch: { type: String, default: "https://twitch.tv/gamersbd" },
    },
    
    // SEO & Meta
    metaTitle: {
      type: String,
      default: "GamersBD - Best Gaming Store in Bangladesh",
      trim: true,
    },
    metaDescription: {
      type: String,
      default: "Shop the latest gaming products, read news, and join our gaming community at GamersBD.",
      trim: true,
    },
    metaKeywords: {
      type: [String],
      default: ["gaming", "games", "gaming store", "bangladesh", "gamersbd"],
    },
    metaAuthor: {
      type: String,
      default: "GamersBD",
      trim: true,
    },
    
    // Footer Settings
    footerCopyright: {
      type: String,
      default: `© ${new Date().getFullYear()} GamersBD. All rights reserved.`,
      trim: true,
    },
    footerAboutText: {
      type: String,
      default: "GamersBD is your one-stop destination for all gaming needs. We provide the best gaming products, news, and community experience.",
      trim: true,
    },
    
    // Payment & Shipping
    currency: {
      type: String,
      default: "BDT",
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: "৳",
      trim: true,
    },
    shippingInfo: {
      type: String,
      default: "Free shipping on orders over 5000 BDT. Delivery within 3-5 business days.",
      trim: true,
    },
    
    // Features
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: "We'll be back soon! Site is under maintenance.",
      trim: true,
    },
    
    // Analytics & Scripts
    googleAnalyticsId: {
      type: String,
      default: "",
      trim: true,
    },
    facebookPixelId: {
      type: String,
      default: "",
      trim: true,
    },
    customHeaderScript: {
      type: String,
      default: "",
    },
    customFooterScript: {
      type: String,
      default: "",
    },
    
    // Updated by
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one document exists (singleton pattern)
siteSettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("SiteSetting", siteSettingSchema);