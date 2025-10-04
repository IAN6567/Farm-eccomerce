const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get("/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalFarmers = await User.countDocuments({
      role: "farmer",
      isActive: true,
    });
    const totalBuyers = await User.countDocuments({
      role: "buyer",
      isActive: true,
    });
    const pendingFarmers = await User.countDocuments({
      role: "farmer",
      isApproved: false,
      isActive: true,
    });
    const totalProducts = await Product.countDocuments({
      isActive: true,
    });
    const approvedProducts = await Product.countDocuments({
      isActive: true,
      isApproved: true,
    });
    const pendingProducts = await Product.countDocuments({
      isActive: true,
      isApproved: false,
    });
    const totalOrders = await Order.countDocuments({
      isActive: true,
    });

    // Get revenue stats
    const revenueStats = await Order.aggregate([
      {
        $match: {
          isActive: true,
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    // Get recent activity
    const recentUsers = await User.find({ isActive: true })
      .select("firstName lastName email role createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentProducts = await Product.find({ isActive: true })
      .populate("farmer", "firstName lastName")
      .select("name category price farmer createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentOrders = await Order.find({ isActive: true })
      .populate("buyer", "firstName lastName")
      .select("orderNumber totalAmount status buyer createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get category distribution
    const categoryStats = await Product.aggregate([
      {
        $match: { isActive: true, isApproved: true },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get county distribution
    const countyStats = await User.aggregate([
      {
        $match: {
          role: "farmer",
          isActive: true,
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$location.county",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          farmers: totalFarmers,
          buyers: totalBuyers,
          pendingFarmers,
        },
        products: {
          total: totalProducts,
          approved: approvedProducts,
          pending: pendingProducts,
        },
        orders: {
          total: totalOrders,
        },
        revenue:
          revenueStats.length > 0
            ? {
                total: revenueStats[0].totalRevenue,
                average: revenueStats[0].averageOrderValue,
              }
            : {
                total: 0,
                average: 0,
              },
      },
      recentActivity: {
        users: recentUsers,
        products: recentProducts,
        orders: recentOrders,
      },
      distributions: {
        categories: categoryStats,
        counties: countyStats,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      message: "Server error while fetching dashboard data",
    });
  }
});

// @route   GET /api/admin/products/pending
// @desc    Get pending product approvals
// @access  Private (Admin only)
router.get(
  "/products/pending",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await Product.find({
        isActive: true,
        isApproved: false,
      })
        .populate("farmer", "firstName lastName email phone location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const totalProducts = await Product.countDocuments({
        isActive: true,
        isApproved: false,
      });

      res.json({
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / parseInt(limit)),
          totalProducts,
        },
      });
    } catch (error) {
      console.error("Get pending products error:", error);
      res.status(500).json({
        message: "Server error while fetching pending products",
      });
    }
  }
);

// @route   PUT /api/admin/products/:id/approve
// @desc    Approve product
// @access  Private (Admin only)
router.put(
  "/products/:id/approve",
  authenticateToken,
  requireAdmin,
  [
    body("action")
      .isIn(["approve", "reject"])
      .withMessage("Action must be approve or reject"),
    body("notes").optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { action, notes } = req.body;

      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (action === "approve") {
        product.isApproved = true;
        product.approvedBy = req.user._id;
        product.approvedAt = new Date();

        if (notes) {
          product.adminNotes = notes;
        }
      } else {
        product.isActive = false;
        if (notes) {
          product.rejectionReason = notes;
        }
      }

      await product.save();

      res.json({
        message: `Product ${action}d successfully`,
        product: {
          id: product._id,
          name: product.name,
          farmer: product.farmer,
          status: action === "approve" ? "approved" : "rejected",
        },
      });
    } catch (error) {
      console.error("Approve product error:", error);
      res.status(500).json({
        message: "Server error while processing product approval",
      });
    }
  }
);

// @route   GET /api/admin/orders
// @desc    Get all orders for admin
// @access  Private (Admin only)
router.get("/orders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isActive: true };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const orders = await Order.find(filter)
      .populate("buyer", "firstName lastName email phone")
      .populate("items.product", "name category")
      .populate("items.farmer", "firstName lastName phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
      },
    });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({
      message: "Server error while fetching orders",
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users for admin
// @access  Private (Admin only)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isApproved } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isActive: true };
    if (role) filter.role = role;
    if (isApproved !== undefined) filter.isApproved = isApproved === "true";

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalUsers = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({
      message: "Server error while fetching users",
    });
  }
});

module.exports = router;
