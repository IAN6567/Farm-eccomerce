const express = require("express");
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post(
  "/",
  authenticateToken,
  [
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required"),
    body("items.*.productId")
      .isMongoId()
      .withMessage("Valid product ID is required"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("paymentMethod")
      .isIn(["mpesa", "cash", "bank_transfer", "other"])
      .withMessage("Invalid payment method"),
    body("shippingAddress.county")
      .trim()
      .notEmpty()
      .withMessage("County is required"),
    body("shippingAddress.subCounty")
      .trim()
      .notEmpty()
      .withMessage("Sub-county is required"),
    body("shippingAddress.ward")
      .trim()
      .notEmpty()
      .withMessage("Ward is required"),
    body("shippingAddress.specificLocation")
      .trim()
      .notEmpty()
      .withMessage("Specific location is required"),
    body("shippingAddress.contactPhone")
      .matches(/^(\+254|0)[0-9]{9}$/)
      .withMessage("Valid phone number is required"),
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

      const { items, paymentMethod, shippingAddress, deliveryNotes } = req.body;

      // Validate products and calculate totals
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId);

        if (
          !product ||
          !product.isActive ||
          !product.isApproved ||
          !product.isAvailable
        ) {
          return res.status(400).json({
            message: `Product ${item.productId} is not available`,
          });
        }

        if (product.quantity < item.quantity) {
          return res.status(400).json({
            message: `Insufficient quantity for product: ${product.name}`,
          });
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          price: product.price,
          farmer: product.farmer,
        });
      }

      // Create order
      const order = new Order({
        buyer: req.user._id,
        items: orderItems,
        totalAmount,
        paymentMethod,
        shippingAddress,
        deliveryNotes,
      });

      await order.save();

      // Update product quantities
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: -item.quantity },
        });
      }

      // Populate order details
      const populatedOrder = await Order.findById(order._id)
        .populate("buyer", "firstName lastName phone email")
        .populate("items.product", "name images category")
        .populate("items.farmer", "firstName lastName phone location");

      res.status(201).json({
        message: "Order created successfully",
        order: populatedOrder,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        message: "Server error while creating order",
      });
    }
  }
);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { buyer: req.user._id, isActive: true };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("items.product", "name images category")
      .populate("items.farmer", "firstName lastName phone location")
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
    console.error("Get orders error:", error);
    res.status(500).json({
      message: "Server error while fetching orders",
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      buyer: req.user._id,
      isActive: true,
    })
      .populate("buyer", "firstName lastName phone email location")
      .populate("items.product", "name images category description")
      .populate("items.farmer", "firstName lastName phone location");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      message: "Server error while fetching order",
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Buyer or Farmer)
router.put(
  "/:id/status",
  authenticateToken,
  [
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ])
      .withMessage("Invalid status"),
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

      const { status, notes } = req.body;

      const order = await Order.findById(req.params.id).populate(
        "items.farmer"
      );

      if (!order || !order.isActive) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      // Check if user is buyer or farmer involved in the order
      const isBuyer = order.buyer.toString() === req.user._id.toString();
      const isFarmer = order.items.some(
        (item) => item.farmer._id.toString() === req.user._id.toString()
      );

      if (!isBuyer && !isFarmer) {
        return res.status(403).json({
          message:
            "Access denied. You can only update orders you are involved in.",
        });
      }

      // Validate status transitions
      const validTransitions = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };

      if (!validTransitions[order.status].includes(status)) {
        return res.status(400).json({
          message: `Cannot change status from ${order.status} to ${status}`,
        });
      }

      // Update order
      order.status = status;
      if (notes) {
        if (isFarmer) {
          order.farmerNotes = notes;
        } else {
          order.deliveryNotes = notes;
        }
      }

      await order.save();

      res.json({
        message: "Order status updated successfully",
        order,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        message: "Server error while updating order status",
      });
    }
  }
);

// @route   GET /api/orders/farmer/orders
// @desc    Get orders for farmer's products
// @access  Private (Farmers only)
router.get("/farmer/orders", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      "items.farmer": req.user._id,
      isActive: true,
    };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("buyer", "firstName lastName phone email location")
      .populate("items.product", "name images category")
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
    console.error("Get farmer orders error:", error);
    res.status(500).json({
      message: "Server error while fetching farmer orders",
    });
  }
});

// @route   POST /api/orders/:id/payment
// @desc    Update payment status
// @access  Private
router.post(
  "/:id/payment",
  authenticateToken,
  [
    body("paymentStatus")
      .isIn(["pending", "paid", "failed", "refunded"])
      .withMessage("Invalid payment status"),
    body("paymentReference").optional().trim().notEmpty(),
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

      const { paymentStatus, paymentReference } = req.body;

      const order = await Order.findOne({
        _id: req.params.id,
        buyer: req.user._id,
        isActive: true,
      });

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      order.paymentStatus = paymentStatus;
      if (paymentReference) {
        order.paymentReference = paymentReference;
      }

      await order.save();

      res.json({
        message: "Payment status updated successfully",
        order,
      });
    } catch (error) {
      console.error("Update payment status error:", error);
      res.status(500).json({
        message: "Server error while updating payment status",
      });
    }
  }
);

module.exports = router;
