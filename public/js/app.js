// FarmConnect Kenya - Main JavaScript Application

// Global variables
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentPage = 1;
let isLoading = false;

// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    checkAuthStatus();
    loadProducts();
    loadFarmers();
    loadStats();
    setupEventListeners();
    updateCartUI();
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token with server
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                showUserMenu();
            } else {
                localStorage.removeItem('token');
                showAuthButtons();
            }
        })
        .catch(error => {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            showAuthButtons();
        });
    } else {
        showAuthButtons();
    }
}

// Show authentication buttons
function showAuthButtons() {
    document.getElementById('authButtons').style.display = 'flex';
    document.getElementById('userMenu').style.display = 'none';
}

// Show user menu
function showUserMenu() {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userMenu').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.firstName;
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Search functionality
    document.getElementById('productSearch').addEventListener('input', debounce(searchProducts, 300));
    
    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserMenu();
            hideModal('loginModal');
            showAlert('Login successful!', 'success');
            
            // Reset form
            document.getElementById('loginForm').reset();
        } else {
            showAlert(data.message || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Network error. Please try again.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value,
        county: document.getElementById('regCounty').value,
        subCounty: document.getElementById('regSubCounty').value,
        ward: document.getElementById('regWard').value
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserMenu();
            hideModal('registerModal');
            showAlert('Registration successful! Welcome to FarmConnect Kenya!', 'success');
            
            // Reset form
            document.getElementById('registerForm').reset();
        } else {
            showAlert(data.message || 'Registration failed', 'danger');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Network error. Please try again.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Load products
async function loadProducts(page = 1, category = '', search = '') {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading(true);
        
        const params = new URLSearchParams({
            page: page,
            limit: 12
        });
        
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        
        const response = await fetch(`${API_BASE_URL}/products?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            displayProducts(data.products);
            updatePagination(data.pagination);
            currentPage = page;
        } else {
            showAlert('Failed to load products', 'danger');
        }
    } catch (error) {
        console.error('Load products error:', error);
        showAlert('Network error. Please try again.', 'danger');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Display products
function displayProducts(products) {
    const container = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No products found</h4>
                <p class="text-muted">Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }
    
    const productsHTML = products.map(product => `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.images[0] || '/images/placeholder.jpg'}" 
                         alt="${product.name}" 
                         loading="lazy">
                    <div class="product-badge">${product.category}</div>
                </div>
                <div class="product-info">
                    <h5 class="product-title">${product.name}</h5>
                    <p class="product-description">${product.description}</p>
                    <div class="product-meta">
                        <div class="product-rating">
                            <span class="stars">${'★'.repeat(Math.floor(product.rating.average))}</span>
                            <span class="ms-1">(${product.rating.count})</span>
                        </div>
                        <span class="text-muted">${product.views} views</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="product-price">KSh ${product.price.toLocaleString()}</div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-success btn-sm" 
                                    onclick="viewProduct('${product._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-success btn-sm" 
                                    onclick="addToCart('${product._id}', '${product.name}', ${product.price})">
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    if (currentPage === 1) {
        container.innerHTML = productsHTML;
    } else {
        container.insertAdjacentHTML('beforeend', productsHTML);
    }
}

// Load farmers
async function loadFarmers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/farmers?limit=6`);
        const data = await response.json();
        
        if (response.ok) {
            displayFarmers(data.farmers);
        }
    } catch (error) {
        console.error('Load farmers error:', error);
    }
}

// Display farmers
function displayFarmers(farmers) {
    const container = document.getElementById('farmersGrid');
    
    const farmersHTML = farmers.map(farmer => `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="farmer-card">
                <div class="farmer-info">
                    <img src="${farmer.profileImage || '/images/avatar-placeholder.jpg'}" 
                         alt="${farmer.firstName} ${farmer.lastName}" 
                         class="farmer-avatar mb-3">
                    <h5 class="farmer-name">${farmer.firstName} ${farmer.lastName}</h5>
                    <p class="farmer-location">
                        <i class="fas fa-map-marker-alt me-1"></i>
                        ${farmer.location.county}, ${farmer.location.subCounty}
                    </p>
                    <div class="farmer-stats">
                        <div class="stat-item">
                            <div class="stat-number">${farmer.productCount}</div>
                            <div class="stat-label">Products</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">4.8</div>
                            <div class="stat-label">Rating</div>
                        </div>
                    </div>
                    <button class="btn btn-outline-success btn-sm mt-3" 
                            onclick="viewFarmer('${farmer._id}')">
                        View Profile
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = farmersHTML;
}

// Load statistics
async function loadStats() {
    try {
        // This would typically come from an admin endpoint
        // For now, we'll use placeholder values
        document.getElementById('totalFarmers').textContent = '150+';
        document.getElementById('totalProducts').textContent = '500+';
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value;
    currentPage = 1;
    loadProducts(1, document.getElementById('categoryFilter').value, searchTerm);
}

// Filter products
function filterProducts() {
    const category = document.getElementById('categoryFilter').value;
    currentPage = 1;
    loadProducts(1, category, document.getElementById('productSearch').value);
}

// Load more products
function loadMoreProducts() {
    const nextPage = currentPage + 1;
    loadProducts(nextPage, document.getElementById('categoryFilter').value, document.getElementById('productSearch').value);
}

// Add to cart
function addToCart(productId, productName, price) {
    if (!currentUser) {
        showAlert('Please login to add items to cart', 'warning');
        showLoginModal();
        return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId,
            productName,
            price,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showAlert(`${productName} added to cart!`, 'success');
}

// Update cart UI
function updateCartUI() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartButton = document.querySelector('[onclick="showCartModal()"]');
    
    if (cartButton) {
        cartButton.innerHTML = `<i class="fas fa-shopping-cart me-1"></i>Cart (${cartCount})`;
    }
}

// Show cart modal
function showCartModal() {
    if (!currentUser) {
        showAlert('Please login to view cart', 'warning');
        showLoginModal();
        return;
    }
    
    displayCartItems();
    const modal = new bootstrap.Modal(document.getElementById('cartModal'));
    modal.show();
}

// Display cart items
function displayCartItems() {
    const container = document.getElementById('cartContent');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Your cart is empty</h5>
                <p class="text-muted">Add some products to get started!</p>
            </div>
        `;
        return;
    }
    
    const cartHTML = cart.map(item => `
        <div class="cart-item">
            <img src="/images/placeholder.jpg" alt="${item.productName}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.productName}</div>
                <div class="cart-item-price">KSh ${item.price.toLocaleString()}</div>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.productId}', -1)">-</button>
                <span class="mx-2">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.productId}', 1)">+</button>
                <button class="btn btn-outline-danger btn-sm ms-2" onclick="removeFromCart('${item.productId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    container.innerHTML = cartHTML + `
        <div class="cart-total">
            <div class="d-flex justify-content-between">
                <strong>Total:</strong>
                <strong>KSh ${total.toLocaleString()}</strong>
            </div>
        </div>
    `;
}

// Update quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            displayCartItems();
        }
    }
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    displayCartItems();
    showAlert('Item removed from cart', 'info');
}

// Proceed to checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showAlert('Your cart is empty', 'warning');
        return;
    }
    
    // This would redirect to checkout page
    showAlert('Checkout functionality coming soon!', 'info');
}

// Show modals
function showLoginModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

function showRegisterModal() {
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
}

function hideModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
        modal.hide();
    }
}

// Show alerts
function showAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertContainer.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertContainer);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertContainer.parentNode) {
            alertContainer.parentNode.removeChild(alertContainer);
        }
    }, 5000);
}

// Show loading
function showLoading(show) {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        if (show) {
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner me-2"></span>Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text') || button.innerHTML;
        }
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

// Placeholder functions for future implementation
function viewProduct(productId) {
    showAlert('Product details coming soon!', 'info');
}

function viewFarmer(farmerId) {
    showAlert('Farmer profile coming soon!', 'info');
}

function showProfile() {
    showAlert('Profile page coming soon!', 'info');
}

function showDashboard() {
    showAlert('Dashboard coming soon!', 'info');
}

function showOrders() {
    showAlert('Orders page coming soon!', 'info');
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    showAuthButtons();
    showAlert('Logged out successfully', 'success');
}

// Update pagination
function updatePagination(pagination) {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (pagination.hasNext) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
