const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile with stats
// @access  Private
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    let stats = {};

    if (user.role === "farmer") {
      const productCount = await Product.countDocuments({
        farmer: user._id,
        isActive: true,
      });

      const approvedProducts = await Product.countDocuments({
        farmer: user._id,
        isActive: true,
        isApproved: true,
      });

      const totalOrders = await Order.countDocuments({
        "items.farmer": user._id,
        isActive: true,
      });

      const totalSales = await Order.aggregate([
        {
          $match: {
            "items.farmer": user._id,
            isActive: true,
            paymentStatus: "paid",
          },
        },
        {
          $unwind: "$items",
        },
        {
          $match: {
            "items.farmer": user._id,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
      ]);

      stats = {
        productCount,
        approvedProducts,
        pendingApproval: productCount - approvedProducts,
        totalOrders,
        totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
      };
    } else if (user.role === "buyer") {
      const totalOrders = await Order.countDocuments({
        buyer: user._id,
        isActive: true,
      });

      const totalSpent = await Order.aggregate([
        {
          $match: {
            buyer: user._id,
            isActive: true,
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]);

      stats = {
        totalOrders,
        totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
      };
    }

    res.json({
      user,
      stats,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      message: "Server error while fetching profile",
    });
  }
});

// @route   GET /api/users/farmers
// @desc    Get all farmers (public)
// @access  Public
router.get("/farmers", async (req, res) => {
  try {
    const { page = 1, limit = 12, county, subCounty } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      role: "farmer",
      isActive: true,
      isApproved: true,
    };

    if (county) filter["location.county"] = new RegExp(county, "i");
    if (subCounty) filter["location.subCounty"] = new RegExp(subCounty, "i");

    const farmers = await User.find(filter)
      .select("firstName lastName phone location profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalFarmers = await User.countDocuments(filter);

    // Get product counts for each farmer
    const farmersWithStats = await Promise.all(
      farmers.map(async (farmer) => {
        const productCount = await Product.countDocuments({
          farmer: farmer._id,
          isActive: true,
          isApproved: true,
        });

        return {
          ...farmer,
          productCount,
        };
      })
    );

    res.json({
      farmers: farmersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFarmers / parseInt(limit)),
        totalFarmers,
      },
    });
  } catch (error) {
    console.error("Get farmers error:", error);
    res.status(500).json({
      message: "Server error while fetching farmers",
    });
  }
});

// @route   GET /api/users/farmers/:id
// @desc    Get farmer profile
// @access  Public
router.get("/farmers/:id", async (req, res) => {
  try {
    const farmer = await User.findOne({
      _id: req.params.id,
      role: "farmer",
      isActive: true,
      isApproved: true,
    }).select("-password");

    if (!farmer) {
      return res.status(404).json({
        message: "Farmer not found",
      });
    }

    // Get farmer's products
    const products = await Product.find({
      farmer: farmer._id,
      isActive: true,
      isApproved: true,
    })
      .select("name images category price unit quantity rating views")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    // Get farmer stats
    const productCount = await Product.countDocuments({
      farmer: farmer._id,
      isActive: true,
      isApproved: true,
    });

    const totalOrders = await Order.countDocuments({
      "items.farmer": farmer._id,
      isActive: true,
    });

    res.json({
      farmer,
      products,
      stats: {
        productCount,
        totalOrders,
      },
    });
  } catch (error) {
    console.error("Get farmer profile error:", error);
    res.status(500).json({
      message: "Server error while fetching farmer profile",
    });
  }
});

// @route   GET /api/users/pending-farmers
// @desc    Get pending farmer approvals
// @access  Private (Admin only)
router.get(
  "/pending-farmers",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const farmers = await User.find({
        role: "farmer",
        isApproved: false,
        isActive: true,
      })
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const totalFarmers = await User.countDocuments({
        role: "farmer",
        isApproved: false,
        isActive: true,
      });

      res.json({
        farmers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFarmers / parseInt(limit)),
          totalFarmers,
        },
      });
    } catch (error) {
      console.error("Get pending farmers error:", error);
      res.status(500).json({
        message: "Server error while fetching pending farmers",
      });
    }
  }
);

// @route   PUT /api/users/approve-farmer/:id
// @desc    Approve farmer
// @access  Private (Admin only)
router.put(
  "/approve-farmer/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const farmer = await User.findOne({
        _id: req.params.id,
        role: "farmer",
        isActive: true,
      });

      if (!farmer) {
        return res.status(404).json({
          message: "Farmer not found",
        });
      }

      farmer.isApproved = true;
      farmer.approvedBy = req.user._id;
      farmer.approvedAt = new Date();

      await farmer.save();

      res.json({
        message: "Farmer approved successfully",
        farmer: {
          id: farmer._id,
          name: farmer.fullName,
          email: farmer.email,
          location: farmer.location,
          approvedAt: farmer.approvedAt,
        },
      });
    } catch (error) {
      console.error("Approve farmer error:", error);
      res.status(500).json({
        message: "Server error while approving farmer",
      });
    }
  }
);

// @route   PUT /api/users/deactivate/:id
// @desc    Deactivate user
// @access  Private (Admin only)
router.put(
  "/deactivate/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      user.isActive = false;
      await user.save();

      res.json({
        message: "User deactivated successfully",
      });
    } catch (error) {
      console.error("Deactivate user error:", error);
      res.status(500).json({
        message: "Server error while deactivating user",
      });
    }
  }
);

module.exports = router;
