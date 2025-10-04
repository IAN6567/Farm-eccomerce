#!/usr/bin/env node

/**
 * FarmConnect Kenya Setup Script
 * Creates initial admin user and sample data
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Product = require("./models/Product");

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/farm_ecommerce",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

async function setupDatabase() {
  try {
    console.log("🌱 Setting up FarmConnect Kenya database...");

    // Create admin user
    const adminExists = await User.findOne({
      email: "admin@farmconnectkenya.co.ke",
    });
    if (!adminExists) {
      const admin = new User({
        firstName: "Admin",
        lastName: "User",
        email: "admin@farmconnectkenya.co.ke",
        phone: "+254700123458",
        password: "admin123", // Will be hashed by pre-save middleware
        role: "admin",
        isApproved: true,
        location: {
          county: "Nandi",
          subCounty: "Kapsabet",
          ward: "Kapsabet Central",
        },
      });
      await admin.save();
      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // Create sample farmer
    const farmerExists = await User.findOne({
      email: "john.kamau@example.com",
    });
    if (!farmerExists) {
      const farmer = new User({
        firstName: "John",
        lastName: "Kamau",
        email: "john.kamau@example.com",
        phone: "+254700123456",
        password: "farmer123",
        role: "farmer",
        isApproved: true,
        location: {
          county: "Nandi",
          subCounty: "Kapsabet",
          ward: "Kapsabet Central",
        },
      });
      await farmer.save();
      console.log("✅ Sample farmer created");
    } else {
      console.log("ℹ️  Sample farmer already exists");
    }

    // Create sample buyer
    const buyerExists = await User.findOne({
      email: "mary.wanjiku@example.com",
    });
    if (!buyerExists) {
      const buyer = new User({
        firstName: "Mary",
        lastName: "Wanjiku",
        email: "mary.wanjiku@example.com",
        phone: "+254700123457",
        password: "buyer123",
        role: "buyer",
        isApproved: true,
        location: {
          county: "Nairobi",
          subCounty: "Westlands",
          ward: "Parklands",
        },
      });
      await buyer.save();
      console.log("✅ Sample buyer created");
    } else {
      console.log("ℹ️  Sample buyer already exists");
    }

    // Create sample products
    const farmer = await User.findOne({ email: "john.kamau@example.com" });
    if (farmer) {
      const productsExist = await Product.findOne({ farmer: farmer._id });
      if (!productsExist) {
        const sampleProducts = [
          {
            name: "Fresh Milk",
            description:
              "Fresh cow milk from local dairy farm, collected daily",
            category: "dairy",
            subcategory: "milk",
            price: 80,
            unit: "litre",
            quantity: 50,
            images: ["/images/milk-placeholder.jpg"],
            farmer: farmer._id,
            location: farmer.location,
            isApproved: true,
            tags: ["organic", "fresh", "daily"],
            specifications: {
              organic: true,
              grade: "A",
              harvestDate: new Date(),
              origin: "Kapsabet Dairy Farm",
            },
          },
          {
            name: "Maize Grains",
            description:
              "High quality maize grains, perfect for consumption and planting",
            category: "cereals",
            subcategory: "maize",
            price: 45,
            unit: "kg",
            quantity: 100,
            images: ["/images/maize-placeholder.jpg"],
            farmer: farmer._id,
            location: farmer.location,
            isApproved: true,
            tags: ["grain", "high-quality", "planting"],
            specifications: {
              organic: false,
              grade: "Grade 1",
              harvestDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              origin: "Kapsabet Farm",
            },
          },
          {
            name: "Free Range Chicken",
            description:
              "Healthy free range chicken, raised naturally without chemicals",
            category: "poultry",
            subcategory: "chicken",
            price: 800,
            unit: "piece",
            quantity: 20,
            images: ["/images/chicken-placeholder.jpg"],
            farmer: farmer._id,
            location: farmer.location,
            isApproved: true,
            tags: ["free-range", "healthy", "natural"],
            specifications: {
              breed: "Kienyeji",
              age: "6 months",
              weight: 2.5,
              color: "Brown",
              origin: "Kapsabet Poultry Farm",
            },
          },
        ];

        await Product.insertMany(sampleProducts);
        console.log("✅ Sample products created");
      } else {
        console.log("ℹ️  Sample products already exist");
      }
    }

    console.log("🎉 Database setup completed successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("Admin: admin@farmconnectkenya.co.ke / admin123");
    console.log("Farmer: john.kamau@example.com / farmer123");
    console.log("Buyer: mary.wanjiku@example.com / buyer123");
    console.log("\n🚀 Start the server with: npm start");
  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
