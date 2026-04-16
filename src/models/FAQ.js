const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question is required"],
      trim: true,
      unique: true,
      maxlength: [500, "Question cannot exceed 500 characters"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["orders", "payment", "returns", "account", "games", "technical"],
      default: "orders",
    },
    popular: {
      type: Boolean,
      default: false,
    },
    related: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FAQ",
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    helpful: {
      yes: { type: Number, default: 0 },
      no: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
faqSchema.index({ question: "text", answer: "text" });
faqSchema.index({ category: 1, order: 1 });

module.exports = mongoose.model("FAQ", faqSchema);