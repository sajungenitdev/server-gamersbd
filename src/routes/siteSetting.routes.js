const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadFavicon,
  toggleMaintenance,
  resetSettings,
} = require("../controllers/siteSetting.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// Public route
router.get("/", getSettings);

// Admin only routes
router.put("/", protect, authorize("admin"), updateSettings);
router.post("/upload-logo", protect, authorize("admin"), uploadLogo);
router.post("/upload-favicon", protect, authorize("admin"), uploadFavicon);
router.patch("/maintenance", protect, authorize("admin"), toggleMaintenance);
router.post("/reset", protect, authorize("admin"), resetSettings);

module.exports = router;