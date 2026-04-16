const express = require("express");
const router = express.Router();
const {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  replyToContact,
  deleteContact,
  bulkDeleteContacts,
  getContactStats,
} = require("../controllers/contact.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// ============= PUBLIC ROUTES =============
// Create new contact message (Public)
router.post("/", createContact);

// ============= PROTECTED ROUTES (ADMIN ONLY) =============
// Get all contacts with filters
router.get("/", protect, authorize("admin"), getAllContacts);

// Get contact statistics
router.get("/stats", protect, authorize("admin"), getContactStats);

// Bulk delete contacts
router.delete("/bulk", protect, authorize("admin"), bulkDeleteContacts);

// Get single contact
router.get("/:id", protect, authorize("admin"), getContactById);

// Update contact status
router.patch("/:id/status", protect, authorize("admin"), updateContactStatus);

// Reply to contact
router.post("/:id/reply", protect, authorize("admin"), replyToContact);

// Delete contact
router.delete("/:id", protect, authorize("admin"), deleteContact);

module.exports = router;