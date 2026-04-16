const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/brand.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// ============= PUBLIC ROUTES =============

// Get popular brands (most specific first)
router.get("/popular", getPopularBrands);

// Get all brands with filters
router.get("/", getBrands);

// Get single brand by ID or slug (catch-all for identifiers)
router.get("/:identifier", getBrandByIdentifier);

// ============= PUBLIC ROUTES (NO AUTH REQUIRED) =============

// Create brand - PUBLIC
router.post("/", createBrand);

// Update brand - PUBLIC (removed authentication)
router.put("/:id", updateBrand);

// Delete brand - PUBLIC (removed authentication)
router.delete("/:id", deleteBrand);

// Toggle status - PUBLIC (removed authentication)
router.patch("/:id/toggle-status", toggleBrandStatus);

// Toggle popular - PUBLIC (removed authentication)
router.patch("/:id/toggle-popular", togglePopularStatus);

// ============= PROTECTED ROUTES (ADMIN ONLY) - Keep these if needed =============

// Bulk operations
router.patch("/bulk", protect, authorize("admin"), bulkUpdateBrands);

// Update product counts for all brands
router.post(
  "/update-counts",
  protect,
  authorize("admin"),
  updateAllProductCounts,
);

module.exports = router;