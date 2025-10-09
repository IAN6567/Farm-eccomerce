const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
//addition
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "script-src-attr 'unsafe-inline' 'unsafe-hashes'",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://images.unsplash.com http://localhost:3000 http://localhost:5173",
      "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.gstatic.com",
      "form-action 'self' http://localhost:3000",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  next();
});
// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());

// Rate limiting for API protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Database connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/farm_ecommerce",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));

// Serve static files for production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
