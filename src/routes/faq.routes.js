const express = require("express");
const router = express.Router();
const {
  createFAQ,
  getAllFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  bulkDeleteFAQs,
  markHelpful,
  getFAQStats,
} = require("../controllers/faq.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// ============= PUBLIC ROUTES =============
router.get("/", getAllFAQs);
router.get("/:id", getFAQById);
router.post("/:id/helpful", markHelpful);

// ============= ADMIN ROUTES =============
router.post("/", protect, authorize("admin"), createFAQ);
router.put("/:id", protect, authorize("admin"), updateFAQ);
router.delete("/:id", protect, authorize("admin"), deleteFAQ);
router.delete("/bulk", protect, authorize("admin"), bulkDeleteFAQs);
router.get("/stats/admin", protect, authorize("admin"), getFAQStats);

module.exports = router;