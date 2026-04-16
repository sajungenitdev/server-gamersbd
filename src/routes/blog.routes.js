const express = require("express");
const router = express.Router();
const {
  createBlog,
  getBlogs,
  getBlogByIdentifier,
  updateBlog,
  deleteBlog,
  toggleLike,
  addComment,
  getComments,
  getFeaturedBlogs,
  getBlogsByCategory,
  getBlogStats,
} = require("../controllers/blog.controller");

// ============= PUBLIC ROUTES =============

// Get blog statistics
router.get("/stats", getBlogStats);

// Get featured blogs
router.get("/featured", getFeaturedBlogs);

// Get blogs by category
router.get("/category/:category", getBlogsByCategory);

// Get all blogs with filters
router.get("/", getBlogs);

// Get single blog by ID or slug
router.get("/:identifier", getBlogByIdentifier);

// Get comments for a blog
router.get("/:id/comments", getComments);

// ============= PUBLIC CRUD OPERATIONS =============

// Create blog
router.post("/", createBlog);

// Update blog
router.put("/:id", updateBlog);

// Delete blog
router.delete("/:id", deleteBlog);

// Like blog
router.post("/:id/like", toggleLike);

// Add comment
router.post("/:id/comments", addComment);

module.exports = router;