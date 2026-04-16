const express = require("express");
const router = express.Router();
const {
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
  getAllBrands,
  getProductsByBrand,
  getBrandDetails,
  getPopularBrands,
  updateFlashSaleSold,
} = require("../controllers/product.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// ============= PUBLIC ROUTES =============

// Brand routes (most specific first)
router.get("/brands/popular", getPopularBrands);
router.get("/brands", getAllBrands);
router.get("/brand/:brand/details", getBrandDetails);
router.get("/brand/:brand", getProductsByBrand);

// Search and filter routes
router.get("/search", searchProducts);
router.get("/featured", getFeaturedProducts);
router.get("/flash-sale", getFlashSaleProducts);
router.get("/offers", getAllOffers);
router.get("/offers/:type", getProductsByOfferType);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/latest", getLatestProducts);
router.get("/price-range", getProductsByPriceRange);

// Related products route
router.get("/:id/related", getRelatedProducts);

// ============= IMPORTANT: Move this to the END =============
// Product detail route (MUST BE LAST - catches single product by ID)
router.get("/:id", getProductById);

// Main product listing
router.get("/", getProducts);

// ============= PROTECTED ROUTES (ADMIN ONLY) =============

// Create product
router.post("/", protect, authorize("admin"), createProduct);

// Update product
router.put("/:id", protect, authorize("admin"), updateProduct);

// Update flash sale
router.patch(
  "/:id/flash-sale",
  protect,
  authorize("admin"),
  updateFlashSaleSold,
);

// Delete product
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;