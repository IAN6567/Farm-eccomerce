# FarmConnect Kenya 🌾

A comprehensive farm e-commerce platform designed specifically for rural Kenya, connecting farmers with buyers through a mobile-first, low-bandwidth optimized web application.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

FarmConnect Kenya is a project that bridges the gap between rural farmers and urban buyers. The platform empowers farmers to reach a wider market while providing buyers with access to fresh, locally-sourced products directly from verified farmers across Kenya.

### Key Objectives

- **Digital Inclusion**: Bring rural farmers online with mobile-first design
- **Economic Empowerment**: Increase farmer income through direct sales
- **Food Security**: Improve access to fresh, local produce
- **Technology Integration**: Leverage mobile technology for agricultural development

## ✨ Features

### For Farmers

- **Easy Registration**: Simple signup process with location-based verification
- **Product Management**: Upload and manage product listings with photos
- **Order Management**: Track and fulfill customer orders
- **Analytics Dashboard**: View sales statistics and performance metrics
- **Mobile Optimization**: Works seamlessly on basic smartphones

### For Buyers

- **Product Discovery**: Browse products by category, location, and price
- **Advanced Search**: Find specific products with intelligent search
- **Shopping Cart**: Add multiple items and manage quantities
- **Order Tracking**: Monitor order status from purchase to delivery
- **Farmer Profiles**: Learn about the farmers behind your food

### For Administrators

- **Farmer Verification**: Approve farmer registrations and product listings
- **Platform Analytics**: Monitor platform usage and performance
- **Content Management**: Manage categories, featured products, and content
- **User Management**: Handle user accounts and resolve issues

### Technical Features

- **Mobile-First Design**: Optimized for smartphones with limited data
- **Offline Capability**: Basic functionality works without internet
- **M-Pesa Integration**: Secure payments through Kenya's mobile money system
- **Progressive Web App**: Installable on mobile devices
- **Responsive Design**: Works on all screen sizes
- **Low Bandwidth Optimization**: Compressed images and efficient loading

## 🛠 Technology Stack

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Input validation

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Styling with custom properties
- **JavaScript (ES6+)** - Modern JavaScript features
- **Bootstrap 5** - Responsive UI framework
- **Font Awesome** - Icons
- **Progressive Web App** - Mobile app-like experience

### Development Tools

- **Nodemon** - Development server
- **Git** - Version control
- **VS Code** - Recommended IDE

## Project Structure

```
farm-ecommerce-kenya/
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── env.example              # Environment variables template
├── README.md                # Project documentation
├── schema.sql               # Database schema documentation
├── erd.png                  # Entity Relationship Diagram
├── models/                  # MongoDB models
│   ├── User.js              # User model (farmers, buyers, admins)
│   ├── Product.js           # Product model
│   ├── Order.js             # Order model
│   └── Review.js            # Review model
├── routes/                  # API routes
│   ├── auth.js              # Authentication routes
│   ├── products.js          # Product management routes
│   ├── orders.js            # Order processing routes
│   ├── users.js             # User management routes
│   └── admin.js             # Admin panel routes
├── middleware/              # Custom middleware
│   ├── auth.js              # Authentication middleware
│   └── upload.js            # File upload middleware
├── public/                  # Static files
│   ├── index.html           # Main HTML file
│   ├── css/
│   │   └── style.css        # Custom styles
│   ├── js/
│   │   └── app.js           # Frontend JavaScript
│   ├── images/              # Static images
│   └── uploads/             # User uploaded files
└── docs/                    # Additional documentation
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/farm-ecommerce-kenya.git
cd farm-ecommerce-kenya
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

```bash
# Copy the environment template
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

Required environment variables:

```env
MONGODB_URI=mongodb://localhost:27017/farm_ecommerce
JWT_SECRET=your_super_secret_jwt_key_here
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Step 4: Database Setup

```bash
# Start MongoDB (if running locally)
mongod

# The application will create the database and collections automatically
```

### Step 5: Run the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### Step 6: Access the Application

Open your browser and navigate to:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register

Register a new user (farmer or buyer)

```json
{
  "firstName": "John",
  "lastName": "Kamau",
  "email": "john@example.com",
  "phone": "+254700123456",
  "password": "password123",
  "role": "farmer",
  "county": "Nandi",
  "subCounty": "Kapsabet",
  "ward": "Kapsabet Central"
}
```

#### POST /api/auth/login

Login with email and password

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me

Get current user profile (requires authentication)

### Product Endpoints

#### GET /api/products

Get all products with filtering and pagination
Query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12)
- `category` - Filter by category
- `search` - Search term
- `county` - Filter by county
- `minPrice` / `maxPrice` - Price range

#### POST /api/products

Create new product (requires farmer authentication)

```json
{
  "name": "Fresh Milk",
  "description": "Fresh cow milk from local dairy",
  "category": "dairy",
  "subcategory": "milk",
  "price": 80.0,
  "unit": "litre",
  "quantity": 50,
  "tags": ["organic", "fresh"],
  "specifications": {
    "organic": true,
    "grade": "A"
  }
}
```

### Order Endpoints

#### POST /api/orders

Create new order (requires authentication)

```json
{
  "items": [
    {
      "productId": "product_id_here",
      "quantity": 2
    }
  ],
  "paymentMethod": "mpesa",
  "shippingAddress": {
    "county": "Nairobi",
    "subCounty": "Westlands",
    "ward": "Parklands",
    "specificLocation": "123 Main Street",
    "contactPhone": "+254700123456"
  }
}
```

## 🗄 Database Schema

The application uses MongoDB with the following main collections:

### Users Collection

- Stores farmer, buyer, and admin information
- Includes location data and verification status
- Supports role-based access control

### Products Collection

- Product listings with images and specifications
- Category and subcategory classification
- Rating and review aggregation
- Location-based filtering

### Orders Collection

- Order management with itemized breakdown
- Payment status tracking
- Shipping address management
- Order status workflow

### Reviews Collection

- Product reviews and ratings
- Verified purchase validation
- Review moderation system

See `schema.sql` for detailed schema documentation.

## Deployment

### Local Development

```bash
npm run dev
```

### Production Deployment

#### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name farmconnect

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Using Docker

```bash
# Build Docker image
docker build -t farmconnect-kenya .

# Run container
docker run -p 3000:3000 farmconnect-kenya
```

#### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/farm_ecommerce
JWT_SECRET=your_production_jwt_secret
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

## Testing

### Manual Testing

1. **User Registration**: Test farmer and buyer registration
2. **Product Management**: Create, edit, and delete products
3. **Order Processing**: Complete order workflow
4. **Admin Functions**: Test farmer approval and product moderation
5. **Mobile Testing**: Test on various mobile devices

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Test product listing
curl http://localhost:3000/api/products

# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","phone":"+254700123456","password":"password123","role":"buyer","county":"Nairobi","subCounty":"Westlands","ward":"Parklands"}'
```

## 🔧 Configuration

### M-Pesa Integration

The platform includes placeholder integration for M-Pesa payments. To enable:

1. Register with Safaricom M-Pesa API
2. Update environment variables:
   ```env
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_SHORTCODE=your_shortcode
   MPESA_PASSKEY=your_passkey
   ```

### File Upload Configuration

- Maximum file size: 5MB
- Allowed formats: JPEG, PNG, GIF, WebP
- Upload directory: `./public/uploads`

### Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js security headers

## Mobile Optimization

### Progressive Web App (PWA)

- Installable on mobile devices
- Offline functionality
- App-like experience
- Push notifications (future feature)

### Low Bandwidth Optimization

- Compressed images
- Lazy loading
- Minimal external dependencies
- Efficient caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ES6+ JavaScript standards
- Use meaningful commit messages
- Add comments for complex logic
- Test thoroughly before submitting
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Ian** - _Initial work_ - Kapsabet, Nandi County, Kenya
- Project - Program

## 🙏 Acknowledgments

- Local farmers in Nandi County for insights
- Open source community for tools and libraries
- Bootstrap and Font Awesome for UI components

## 📞 Support

For support and questions:

- Email: info@farmconnectkenya.co.ke
- Phone: +254 752307099
- Location: Kapsabet, Nandi County, Kenya

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Multi-language support (Swahili, local languages)
- [ ] Advanced analytics dashboard
- [ ] Weather integration for farmers
- [ ] Supply chain tracking
- [ ] Farmer education resources
- [ ] Government integration for subsidies

---

**FarmConnect Kenya** - Empowering rural communities through technology 🌾📱

# farme-e-commerce-platform
