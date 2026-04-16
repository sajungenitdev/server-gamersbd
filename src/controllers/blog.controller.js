const Blog = require("../models/Blog");

// Generate slug helper
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// @desc    Create new blog post
// @route   POST /api/blogs
// @access  Public (or Private if you add auth)
const createBlog = async (req, res) => {
  try {
    const blogData = req.body;

    // Check if blog already exists
    const existingBlog = await Blog.findOne({
      title: { $regex: new RegExp(`^${blogData.title}$`, "i") },
    });

    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: "Blog with this title already exists",
      });
    }

    // Generate slug if not provided
    if (!blogData.slug && blogData.title) {
      blogData.slug = generateSlug(blogData.title);
    }

    // Validate image
    if (
      blogData.image &&
      !blogData.image.startsWith("data:image") &&
      !blogData.image.startsWith("http")
    ) {
      return res.status(400).json({
        success: false,
        message: "Image must be a valid base64 image or URL",
      });
    }

    const blog = await Blog.create(blogData);

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Create blog error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Blog with this title already exists",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sortBy = "publishedAt",
      sortOrder = "desc",
      category,
      tag,
      featured,
      search,
      isPublished = "true",
    } = req.query;

    // Build filter
    const filter = {};

    if (isPublished === "true") {
      filter.isPublished = true;
    }

    if (category && category !== "All Posts") {
      filter.category = category;
    }

    if (featured === "true") {
      filter.featured = true;
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    // Search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const blogs = await Blog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Blog.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: blogs,
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single blog by ID or slug
// @route   GET /api/blogs/:identifier
// @access  Public
const getBlogByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is MongoDB ID or slug
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(identifier);

    let query = {};
    if (isMongoId) {
      query = { _id: identifier };
    } else {
      query = { slug: identifier };
    }

    const blog = await Blog.findOne(query);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    // Get related blogs (same category)
    const relatedBlogs = await Blog.find({
      category: blog.category,
      _id: { $ne: blog._id },
      isPublished: true,
    })
      .select("title slug excerpt image publishedAt views")
      .limit(3)
      .sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...blog.toObject(),
        relatedBlogs,
      },
    });
  } catch (error) {
    console.error("Get blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Public (or Private with auth)
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.views;
    delete updates.commentCount;

    // Check if title is being updated
    if (updates.title) {
      const existingBlog = await Blog.findOne({
        title: { $regex: new RegExp(`^${updates.title}$`, "i") },
        _id: { $ne: id },
      });

      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "Blog with this title already exists",
        });
      }

      // Update slug
      updates.slug = generateSlug(updates.title);
    }

    const blog = await Blog.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Public (or Private with auth)
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Like/Unlike blog
// @route   POST /api/blogs/:id/like
// @access  Public
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.likes += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog liked successfully",
      data: { likes: blog.likes },
    });
  } catch (error) {
    console.error("Like blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add comment to blog
// @route   POST /api/blogs/:id/comments
// @access  Public
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, text, avatar } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const comment = {
      user: {
        name: name || "Anonymous",
        email: email || "",
        avatar: avatar || null,
      },
      text,
      createdAt: new Date(),
    };

    blog.comments.push(comment);
    blog.commentCount = blog.comments.length;
    await blog.save();

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get comments for a blog
// @route   GET /api/blogs/:id/comments
// @access  Public
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const blog = await Blog.findById(id).select("comments");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const comments = blog.comments.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      count: comments.length,
      total: blog.comments.length,
      data: comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get featured blogs
// @route   GET /api/blogs/featured
// @access  Public
const getFeaturedBlogs = async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    const blogs = await Blog.find({
      featured: true,
      isPublished: true,
    })
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    console.error("Get featured blogs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get blogs by category
// @route   GET /api/blogs/category/:category
// @access  Public
const getBlogsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find({
      category,
      isPublished: true,
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Blog.countDocuments({ category, isPublished: true });

    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: blogs,
    });
  } catch (error) {
    console.error("Get blogs by category error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get blog statistics
// @route   GET /api/blogs/stats
// @access  Public
const getBlogStats = async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments({ isPublished: true });
    const totalViews = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);
    const totalLikes = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: "$likes" } } },
    ]);
    const categories = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBlogs,
        totalViews: totalViews[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0,
        categories,
      },
    });
  } catch (error) {
    console.error("Get blog stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
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
};