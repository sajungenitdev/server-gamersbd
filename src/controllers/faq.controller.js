const FAQ = require("../models/FAQ");
const mongoose = require("mongoose");

// @desc    Create new FAQ
// @route   POST /api/faqs
// @access  Private/Admin
const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, popular, related, order } = req.body;

    // Check if FAQ already exists
    const existingFAQ = await FAQ.findOne({
      question: { $regex: new RegExp(`^${question}$`, "i") },
    });

    if (existingFAQ) {
      return res.status(400).json({
        success: false,
        message: "FAQ with this question already exists",
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category,
      popular: popular || false,
      related: related || [],
      order: order || 0,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Create FAQ error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all FAQs
// @route   GET /api/faqs
// @access  Public
const getAllFAQs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      search,
      popular,
      sortBy = "order",
      sortOrder = "asc",
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (popular === "true") {
      filter.popular = true;
    }

    // Search
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const faqs = await FAQ.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("related", "question")
      .lean();

    const total = await FAQ.countDocuments(filter);

    // Get categories with counts
    const categories = await FAQ.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: faqs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      categories,
      data: faqs,
    });
  } catch (error) {
    console.error("Get FAQs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single FAQ by ID
// @route   GET /api/faqs/:id
// @access  Public
const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const faq = await FAQ.findById(id).populate("related", "question");

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    // Increment views
    faq.views += 1;
    await faq.save();

    res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Get FAQ error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private/Admin
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.createdAt;
    delete updates.views;
    delete updates.helpful;

    const faq = await FAQ.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Update FAQ error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private/Admin
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await faq.deleteOne();

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk delete FAQs
// @route   DELETE /api/faqs/bulk
// @access  Private/Admin
const bulkDeleteFAQs = async (req, res) => {
  try {
    const { faqIds } = req.body;

    if (!faqIds || !Array.isArray(faqIds) || faqIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide FAQ IDs array",
      });
    }

    const result = await FAQ.deleteMany({ _id: { $in: faqIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} FAQs deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("Bulk delete FAQs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark FAQ as helpful/unhelpful
// @route   POST /api/faqs/:id/helpful
// @access  Public
const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body; // true for yes, false for no

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const updateField = helpful ? "helpful.yes" : "helpful.no";
    const faq = await FAQ.findByIdAndUpdate(
      id,
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Thank you for your feedback",
      data: { helpful: faq.helpful },
    });
  } catch (error) {
    console.error("Mark helpful error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get FAQ statistics
// @route   GET /api/faqs/stats
// @access  Private/Admin
const getFAQStats = async (req, res) => {
  try {
    const total = await FAQ.countDocuments();
    const popular = await FAQ.countDocuments({ popular: true });
    const totalViews = await FAQ.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);
    const helpfulStats = await FAQ.aggregate([
      {
        $group: {
          _id: null,
          totalYes: { $sum: "$helpful.yes" },
          totalNo: { $sum: "$helpful.no" },
        },
      },
    ]);

    const categoryStats = await FAQ.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        popular,
        totalViews: totalViews[0]?.total || 0,
        helpfulRate: helpfulStats[0]
          ? (helpfulStats[0].totalYes / (helpfulStats[0].totalYes + helpfulStats[0].totalNo)) * 100
          : 0,
        categories: categoryStats,
      },
    });
  } catch (error) {
    console.error("Get FAQ stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFAQ,
  getAllFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  bulkDeleteFAQs,
  markHelpful,
  getFAQStats,
};