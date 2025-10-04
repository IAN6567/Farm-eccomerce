-- FarmConnect Kenya Database Schema
-- University Capstone Project - ART Program
-- Author: Ian - Kapsabet, Nandi County, Kenya
-- Date: September 2024

-- This schema is designed for MongoDB (NoSQL) but converted to SQL for documentation purposes
-- The actual implementation uses MongoDB with Mongoose ODM

-- Users Collection (MongoDB Document)
-- Stores user information including farmers, buyers, and admins
CREATE TABLE users (
    _id VARCHAR(24) PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('farmer', 'buyer', 'admin') DEFAULT 'buyer',
    isApproved BOOLEAN DEFAULT FALSE,
    location JSON, -- {county, subCounty, ward}
    profileImage VARCHAR(255) DEFAULT '',
    isActive BOOLEAN DEFAULT TRUE,
    lastLogin TIMESTAMP NULL,
    resetPasswordToken VARCHAR(255) NULL,
    resetPasswordExpires TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products Collection (MongoDB Document)
-- Stores product listings from farmers
CREATE TABLE products (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category ENUM('livestock', 'poultry', 'dairy', 'vegetables', 'fruits', 'cereals', 'legumes', 'herbs', 'seeds', 'other') NOT NULL,
    subcategory VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit ENUM('kg', 'piece', 'dozen', 'litre', 'bag', 'bunch', 'head', 'other') NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    images JSON, -- Array of image URLs
    farmer VARCHAR(24) NOT NULL, -- References users._id
    location JSON, -- {county, subCounty, ward}
    isAvailable BOOLEAN DEFAULT TRUE,
    isApproved BOOLEAN DEFAULT FALSE,
    approvedBy VARCHAR(24) NULL, -- References users._id
    approvedAt TIMESTAMP NULL,
    tags JSON, -- Array of strings
    specifications JSON, -- Flexible object for product specs
    rating JSON, -- {average: Number, count: Number}
    views INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer) REFERENCES users(_id),
    FOREIGN KEY (approvedBy) REFERENCES users(_id)
);

-- Orders Collection (MongoDB Document)
-- Stores customer orders
CREATE TABLE orders (
    _id VARCHAR(24) PRIMARY KEY,
    orderNumber VARCHAR(20) UNIQUE NOT NULL,
    buyer VARCHAR(24) NOT NULL, -- References users._id
    items JSON, -- Array of {product, quantity, price, farmer}
    totalAmount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    paymentStatus ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    paymentMethod ENUM('mpesa', 'cash', 'bank_transfer', 'other') NOT NULL,
    paymentReference VARCHAR(100) DEFAULT '',
    shippingAddress JSON, -- {county, subCounty, ward, specificLocation, contactPhone, additionalNotes}
    deliveryDate TIMESTAMP NULL,
    deliveryNotes TEXT,
    farmerNotes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer) REFERENCES users(_id)
);

-- Reviews Collection (MongoDB Document)
-- Stores product reviews and ratings
CREATE TABLE reviews (
    _id VARCHAR(24) PRIMARY KEY,
    product VARCHAR(24) NOT NULL, -- References products._id
    buyer VARCHAR(24) NOT NULL, -- References users._id
    order VARCHAR(24) NOT NULL, -- References orders._id
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    isVerified BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product) REFERENCES products(_id),
    FOREIGN KEY (buyer) REFERENCES users(_id),
    FOREIGN KEY (order) REFERENCES orders(_id),
    UNIQUE KEY unique_review (product, buyer)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_isApproved ON users(isApproved);
CREATE INDEX idx_users_location ON users((CAST(location->'$.county' AS CHAR(50))));

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_farmer ON products(farmer);
CREATE INDEX idx_products_isApproved ON products(isApproved);
CREATE INDEX idx_products_isAvailable ON products(isAvailable);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products((CAST(rating->'$.average' AS DECIMAL(3,1))));
CREATE INDEX idx_products_text ON products(name, description, subcategory, tags);

CREATE INDEX idx_orders_buyer ON orders(buyer);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_paymentStatus ON orders(paymentStatus);
CREATE INDEX idx_orders_createdAt ON orders(createdAt);
CREATE INDEX idx_orders_orderNumber ON orders(orderNumber);

CREATE INDEX idx_reviews_product ON reviews(product);
CREATE INDEX idx_reviews_buyer ON reviews(buyer);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Sample data for testing
INSERT INTO users (firstName, lastName, email, phone, password, role, isApproved, location) VALUES
('John', 'Kamau', 'john.kamau@example.com', '+254700123456', '$2a$12$hashedpassword', 'farmer', TRUE, '{"county": "Nandi", "subCounty": "Kapsabet", "ward": "Kapsabet Central"}'),
('Mary', 'Wanjiku', 'mary.wanjiku@example.com', '+254700123457', '$2a$12$hashedpassword', 'buyer', TRUE, '{"county": "Nairobi", "subCounty": "Westlands", "ward": "Parklands"}'),
('Admin', 'User', 'admin@farmconnectkenya.co.ke', '+254700123458', '$2a$12$hashedpassword', 'admin', TRUE, '{"county": "Nandi", "subCounty": "Kapsabet", "ward": "Kapsabet Central"}');

INSERT INTO products (name, description, category, subcategory, price, unit, quantity, farmer, location, isApproved, specifications) VALUES
('Fresh Milk', 'Fresh cow milk from local dairy farm', 'dairy', 'milk', 80.00, 'litre', 50, (SELECT _id FROM users WHERE email = 'john.kamau@example.com'), '{"county": "Nandi", "subCounty": "Kapsabet", "ward": "Kapsabet Central"}', TRUE, '{"organic": true, "grade": "A", "harvestDate": "2024-09-01"}'),
('Maize', 'High quality maize grains', 'cereals', 'maize', 45.00, 'kg', 100, (SELECT _id FROM users WHERE email = 'john.kamau@example.com'), '{"county": "Nandi", "subCounty": "Kapsabet", "ward": "Kapsabet Central"}', TRUE, '{"organic": false, "grade": "Grade 1", "harvestDate": "2024-08-15"}'),
('Chicken', 'Free range chicken', 'poultry', 'chicken', 800.00, 'piece', 20, (SELECT _id FROM users WHERE email = 'john.kamau@example.com'), '{"county": "Nandi", "subCounty": "Kapsabet", "ward": "Kapsabet Central"}', TRUE, '{"breed": "Kienyeji", "age": "6 months", "weight": 2.5}');

-- Views for common queries
CREATE VIEW farmer_products AS
SELECT 
    p._id,
    p.name,
    p.category,
    p.price,
    p.quantity,
    p.isApproved,
    u.firstName,
    u.lastName,
    u.location
FROM products p
JOIN users u ON p.farmer = u._id
WHERE p.isActive = TRUE;

CREATE VIEW order_summary AS
SELECT 
    o._id,
    o.orderNumber,
    o.totalAmount,
    o.status,
    o.paymentStatus,
    u.firstName,
    u.lastName,
    o.createdAt
FROM orders o
JOIN users u ON o.buyer = u._id
WHERE o.isActive = TRUE;

-- Stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetFarmerStats(IN farmer_id VARCHAR(24))
BEGIN
    SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN isApproved = TRUE THEN 1 ELSE 0 END) as approved_products,
        AVG(CAST(rating->'$.average' AS DECIMAL(3,1))) as average_rating,
        SUM(views) as total_views
    FROM products 
    WHERE farmer = farmer_id AND isActive = TRUE;
END //

CREATE PROCEDURE GetProductReviews(IN product_id VARCHAR(24))
BEGIN
    SELECT 
        r.rating,
        r.comment,
        r.createdAt,
        u.firstName,
        u.lastName
    FROM reviews r
    JOIN users u ON r.buyer = u._id
    WHERE r.product = product_id AND r.isActive = TRUE
    ORDER BY r.createdAt DESC;
END //

DELIMITER ;

-- Comments explaining the schema design
-- This schema is optimized for:
-- 1. Fast product searches with text indexing
-- 2. Efficient farmer and buyer management
-- 3. Scalable order processing
-- 4. Flexible product specifications using JSON
-- 5. Mobile-first design considerations
-- 6. Rural connectivity optimization
