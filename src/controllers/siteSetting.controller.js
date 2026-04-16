const SiteSetting = require("../models/SiteSetting");

// @desc    Get site settings
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
  try {
    const settings = await SiteSetting.getSettings();
    
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user?._id;
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    // Add updatedBy
    if (userId) {
      updates.updatedBy = userId;
    }
    
    let settings = await SiteSetting.findOne();
    
    if (!settings) {
      // Create new if doesn't exist
      settings = new SiteSetting(updates);
    } else {
      // Update existing
      Object.assign(settings, updates);
    }
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: "Site settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload site logo
// @route   POST /api/settings/upload-logo
// @access  Private/Admin
const uploadLogo = async (req, res) => {
  try {
    const { logo } = req.body;
    
    if (!logo) {
      return res.status(400).json({
        success: false,
        message: "Logo image is required",
      });
    }
    
    let settings = await SiteSetting.findOne();
    
    if (!settings) {
      settings = new SiteSetting();
    }
    
    settings.siteLogo = logo;
    settings.updatedBy = req.user?._id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: "Logo uploaded successfully",
      data: { siteLogo: settings.siteLogo },
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload favicon
// @route   POST /api/settings/upload-favicon
// @access  Private/Admin
const uploadFavicon = async (req, res) => {
  try {
    const { favicon } = req.body;
    
    if (!favicon) {
      return res.status(400).json({
        success: false,
        message: "Favicon image is required",
      });
    }
    
    let settings = await SiteSetting.findOne();
    
    if (!settings) {
      settings = new SiteSetting();
    }
    
    settings.siteFavicon = favicon;
    settings.updatedBy = req.user?._id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: "Favicon uploaded successfully",
      data: { siteFavicon: settings.siteFavicon },
    });
  } catch (error) {
    console.error("Upload favicon error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle maintenance mode
// @route   PATCH /api/settings/maintenance
// @access  Private/Admin
const toggleMaintenance = async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    
    let settings = await SiteSetting.findOne();
    
    if (!settings) {
      settings = new SiteSetting();
    }
    
    if (maintenanceMode !== undefined) {
      settings.maintenanceMode = maintenanceMode;
    }
    if (maintenanceMessage) {
      settings.maintenanceMessage = maintenanceMessage;
    }
    
    settings.updatedBy = req.user?._id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: maintenanceMode ? "Maintenance mode enabled" : "Maintenance mode disabled",
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
    });
  } catch (error) {
    console.error("Toggle maintenance error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset to default settings
// @route   POST /api/settings/reset
// @access  Private/Admin
const resetSettings = async (req, res) => {
  try {
    // Create new default settings
    const defaultSettings = new SiteSetting({});
    await defaultSettings.save();
    
    // Delete old and replace with default
    await SiteSetting.deleteMany({ _id: { $ne: defaultSettings._id } });
    
    res.status(200).json({
      success: true,
      message: "Settings reset to default",
      data: defaultSettings,
    });
  } catch (error) {
    console.error("Reset settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadFavicon,
  toggleMaintenance,
  resetSettings,
};