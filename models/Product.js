const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'livestock', 'poultry', 'dairy', 'vegetables', 'fruits', 
      'cereals', 'legumes', 'herbs', 'seeds', 'other'
    ]
  },
  subcategory: {
    type: String,
    required: [true, 'Product subcategory is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'piece', 'dozen', 'litre', 'bag', 'bunch', 'head', 'other']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  images: [{
    type: String,
    required: true
  }],
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    county: String,
    subCounty: String,
    ward: String
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  tags: [String],
  specifications: {
    breed: String, // For livestock
    age: String,   // For livestock
    weight: Number, // For livestock
    color: String,  // For various products
    size: String,   // For various products
    origin: String, // Where it was grown/raised
    organic: {
      type: Boolean,
      default: false
    },
    grade: String,  // Quality grade
    harvestDate: Date, // For crops
    expiryDate: Date   // For perishables
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  category: 'text',
  subcategory: 'text',
  tags: 'text'
});

// Index for filtering
productSchema.index({ category: 1, isAvailable: 1, isApproved: 1 });
productSchema.index({ farmer: 1, isActive: 1 });
productSchema.index({ 'location.county': 1, 'location.subCounty': 1 });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `KSh ${this.price.toLocaleString()}`;
});

// Method to increment views
productSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
