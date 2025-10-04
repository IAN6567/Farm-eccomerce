const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one review per buyer per product
reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });

// Index for product reviews
reviewSchema.index({ product: 1, isActive: 1, rating: 1 });

// Update product rating when review is saved
reviewSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  
  if (product) {
    const reviews = await mongoose.model('Review').find({ 
      product: this.product, 
      isActive: true 
    });
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    product.rating.average = Math.round(averageRating * 10) / 10;
    product.rating.count = reviews.length;
    
    await product.save();
  }
});

// Update product rating when review is deleted
reviewSchema.post('findOneAndDelete', async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  
  if (product) {
    const reviews = await mongoose.model('Review').find({ 
      product: this.product, 
      isActive: true 
    });
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      product.rating.average = Math.round(averageRating * 10) / 10;
      product.rating.count = reviews.length;
    } else {
      product.rating.average = 0;
      product.rating.count = 0;
    }
    
    await product.save();
  }
});

module.exports = mongoose.model('Review', reviewSchema);
