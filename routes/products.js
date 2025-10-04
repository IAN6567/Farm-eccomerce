const express = require("express");
const { body, validationResult, query } = require("express-validator");
const Product = require("../models/Product");
const User = require("../models/User");
const {
  authenticateToken,
  requireApprovedFarmer,
  optionalAuth,
} = require("../middleware/auth");
const { uploadMultiple, handleUploadError } = require("../middleware/upload");

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get(
  "/",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("category")
      .optional()
      .isIn([
        "livestock",
        "poultry",
        "dairy",
        "vegetables",
        "fruits",
        "cereals",
        "legumes",
        "herbs",
        "seeds",
        "other",
      ]),
    query("county").optional().trim().notEmpty(),
    query("subCounty").optional().trim().notEmpty(),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
    query("search").optional().trim().notEmpty(),
  ],
  optionalAuth,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        page = 1,
        limit = 12,
        category,
        county,
        subCounty,
        minPrice,
        maxPrice,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build filter object
      const filter = {
        isActive: true,
        isApproved: true,
        isAvailable: true,
      };

      if (category) filter.category = category;
      if (county) filter["location.county"] = new RegExp(county, "i");
      if (subCounty) filter["location.subCounty"] = new RegExp(subCounty, "i");

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      if (search) {
        filter.$text = { $search: search };
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute query with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await Product.find(filter)
        .populate("farmer", "firstName lastName phone location")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / parseInt(limit));

      // Get categories for filter
      const categories = await Product.distinct("category", {
        isActive: true,
        isApproved: true,
      });

      res.json({
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
        filters: {
          categories,
          availableCounties: await Product.distinct("location.county", {
            isActive: true,
            isApproved: true,
          }),
        },
      });
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({
        message: "Server error while fetching products",
      });
    }
  }
);

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("farmer", "firstName lastName phone location")
      .populate({
        path: "reviews",
        populate: {
          path: "buyer",
          select: "firstName lastName",
        },
      });

    if (!product || !product.isActive || !product.isApproved) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Increment view count
    await product.incrementViews();

    res.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      message: "Server error while fetching product",
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Approved Farmers only)
router.post(
  "/",
  authenticateToken,
  requireApprovedFarmer,
  uploadMultiple,
  handleUploadError,
  [
    body("name")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Product name must be 3-100 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be 10-1000 characters"),
    body("category")
      .isIn([
        "livestock",
        "poultry",
        "dairy",
        "vegetables",
        "fruits",
        "cereals",
        "legumes",
        "herbs",
        "seeds",
        "other",
      ])
      .withMessage("Invalid category"),
    body("subcategory")
      .trim()
      .notEmpty()
      .withMessage("Subcategory is required"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("unit")
      .isIn(["kg", "piece", "dozen", "litre", "bag", "bunch", "head", "other"])
      .withMessage("Invalid unit"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
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

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: "At least one product image is required",
        });
      }

      const {
        name,
        description,
        category,
        subcategory,
        price,
        unit,
        quantity,
        tags,
        specifications,
      } = req.body;

      // Process uploaded images
      const images = req.files.map((file) => `/uploads/${file.filename}`);

      // Parse tags and specifications if they're strings
      const parsedTags =
        typeof tags === "string" ? JSON.parse(tags) : tags || [];
      const parsedSpecs =
        typeof specifications === "string"
          ? JSON.parse(specifications)
          : specifications || {};

      const product = new Product({
        name,
        description,
        category,
        subcategory,
        price: parseFloat(price),
        unit,
        quantity: parseInt(quantity),
        images,
        farmer: req.user._id,
        location: {
          county: req.user.location.county,
          subCounty: req.user.location.subCounty,
          ward: req.user.location.ward,
        },
        tags: parsedTags,
        specifications: parsedSpecs,
      });

      await product.save();

      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({
        message: "Server error while creating product",
      });
    }
  }
);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Product owner only)
router.put(
  "/:id",
  authenticateToken,
  requireApprovedFarmer,
  uploadMultiple,
  handleUploadError,
  [
    body("name").optional().trim().isLength({ min: 3, max: 100 }),
    body("description").optional().trim().isLength({ min: 10, max: 1000 }),
    body("price").optional().isFloat({ min: 0 }),
    body("quantity").optional().isInt({ min: 0 }),
    body("isAvailable").optional().isBoolean(),
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

      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // Check if user owns the product
      if (product.farmer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "Access denied. You can only update your own products.",
        });
      }

      const updateData = {};
      const {
        name,
        description,
        price,
        quantity,
        isAvailable,
        tags,
        specifications,
      } = req.body;

      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (quantity !== undefined) updateData.quantity = parseInt(quantity);
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
      if (tags)
        updateData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      if (specifications)
        updateData.specifications =
          typeof specifications === "string"
            ? JSON.parse(specifications)
            : specifications;

      // Handle new images if uploaded
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => `/uploads/${file.filename}`);
        updateData.images = [...product.images, ...newImages];
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate("farmer", "firstName lastName phone location");

      res.json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        message: "Server error while updating product",
      });
    }
  }
);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Product owner only)
router.delete(
  "/:id",
  authenticateToken,
  requireApprovedFarmer,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // Check if user owns the product
      if (product.farmer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "Access denied. You can only delete your own products.",
        });
      }

      // Soft delete
      product.isActive = false;
      await product.save();

      res.json({
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        message: "Server error while deleting product",
      });
    }
  }
);

// @route   GET /api/products/farmer/:farmerId
// @desc    Get products by farmer
// @access  Public
router.get("/farmer/:farmerId", async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      farmer: req.params.farmerId,
      isActive: true,
      isApproved: true,
    })
      .populate("farmer", "firstName lastName phone location")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalProducts = await Product.countDocuments({
      farmer: req.params.farmerId,
      isActive: true,
      isApproved: true,
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
    console.error("Get farmer products error:", error);
    res.status(500).json({
      message: "Server error while fetching farmer products",
    });
  }
});

module.exports = router;
