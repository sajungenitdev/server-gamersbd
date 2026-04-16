const Contact = require("../models/Contact");

// @desc    Create new contact message
// @route   POST /api/contacts
// @access  Public
const createContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Get IP address and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
      ipAddress,
      userAgent,
    });

    // TODO: Send email notification to admin
    // await sendEmailNotification(contact);

    res.status(201).json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
      data: {
        _id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    console.error("Create contact error:", error);

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
      message: error.message || "Failed to send message",
    });
  }
};

// @desc    Get all contact messages (Admin only)
// @route   GET /api/contacts
// @access  Private/Admin
const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const contacts = await Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Contact.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: contacts,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single contact message
// @route   GET /api/contacts/:id
// @access  Private/Admin
const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    // Mark as read if it was pending
    if (contact.status === "pending") {
      contact.status = "read";
      await contact.save();
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update contact status
// @route   PATCH /api/contacts/:id/status
// @access  Private/Admin
const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ["pending", "read", "replied", "archived"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Update contact status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reply to contact message
// @route   POST /api/contacts/:id/reply
// @access  Private/Admin
const replyToContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;
    const userId = req.user?._id;

    if (!replyMessage || replyMessage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      {
        status: "replied",
        replyMessage,
        repliedBy: userId,
        repliedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    // TODO: Send email reply to user
    // await sendReplyEmail(contact.email, replyMessage);

    res.status(200).json({
      success: true,
      message: "Reply sent successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Reply to contact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contacts/:id
// @access  Private/Admin
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: "Contact message deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk delete contact messages
// @route   DELETE /api/contacts/bulk
// @access  Private/Admin
const bulkDeleteContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide contact IDs array",
      });
    }

    const result = await Contact.deleteMany({ _id: { $in: contactIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} contact messages deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("Bulk delete contacts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get contact statistics
// @route   GET /api/contacts/stats
// @access  Private/Admin
const getContactStats = async (req, res) => {
  try {
    const total = await Contact.countDocuments();
    const pending = await Contact.countDocuments({ status: "pending" });
    const read = await Contact.countDocuments({ status: "read" });
    const replied = await Contact.countDocuments({ status: "replied" });
    const archived = await Contact.countDocuments({ status: "archived" });

    // Get last 30 days data for chart
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30Days = await Contact.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        read,
        replied,
        archived,
        last30Days,
      },
    });
  } catch (error) {
    console.error("Get contact stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  replyToContact,
  deleteContact,
  bulkDeleteContacts,
  getContactStats,
};