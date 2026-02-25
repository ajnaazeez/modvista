document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchFeaturedProducts();
});

// Use centralized API_BASE from api.js
const getApiBase = () => {
    return (window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api";
};

const localApiBase = getApiBase();

// Fetch Categories
async function fetchCategories() {
    try {
        const res = await fetch(`${localApiBase}/categories`);
        const responseData = await res.json();
        const categories = Array.isArray(responseData) ? responseData : (responseData.data || []);

        const grid = document.querySelector('#categories .category-grid');
        if (!grid) return;

        // Clear only if we have data, otherwise keep placeholders maybe? 
        // Better to clear placeholders.
        grid.innerHTML = '';

        // If no categories, maybe hide section or show message?
        if (!categories || categories.length === 0) {
            grid.innerHTML = '<p>No categories found.</p>';
            return;
        }

        // Limit to 4 for the home page or show all? 
        // Design has 2 groups (Exterior, Interior). 
        // The current backend just returns a flat list. 
        // I will just render them all in one grid for now.

        // Static Image Map (Fallback for better visuals if DB has no image)
        const categoryImageMap = {
            'Alloy Wheels': 'assets/ChatGPT Image Jan 22, 2026, 04_34_54 PM.png',
            'Headlights': 'assets/ChatGPT Image Jan 22, 2026, 04_37_55 PM.png',
            'Body Kits': 'assets/ChatGPT Image Jan 22, 2026, 04_41_41 PM.png',
            'Exterior Mods': 'assets/ChatGPT Image Jan 22, 2026, 04_41_41 PM.png',
            'Exterior': 'assets/ChatGPT Image Jan 22, 2026, 04_41_41 PM.png',
            'Spoilers': 'assets/ChatGPT Image Jan 22, 2026, 04_45_23 PM.png',
            'Interior': 'assets/ChatGPT Image Jan 22, 2026, 04_48_20 PM.png',
            'Interior Precision': 'assets/ChatGPT Image Jan 22, 2026, 04_48_20 PM.png',
            'Cabin Accessories': 'assets/ChatGPT Image Jan 22, 2026, 04_48_20 PM.png',
            'Exhaust Systems': 'assets/Gemini_Generated_Image_hvnjdvhvnjdvhvnj.png',
            'Suspension': 'assets/Gemini_Generated_Image_rxq5acrxq5acrxq5.png',
            'Brakes': 'assets/Gemini_Generated_Image_2v3xxq2v3xxq2v3x.png',
            'Brake Systems': 'assets/Gemini_Generated_Image_2v3xxq2v3xxq2v3x.png',
            'Performance': 'assets/Gemini_Generated_Image_hvnjdvhvnjdvhvnj.png'
        };

        // Actually index.html had multiple groups. Let's simplfy to one "Explore Categories" grid for now.
        // Or I can try to split them if they have a 'type' field, but schema doesn't seem to have 'group'.
        // I will replace the multiple groups with one dynamic grid for simplicity.

        categories.forEach(cat => {
            const card = document.createElement('a');
            card.href = `shop.html?category=${cat._id}`;
            card.className = 'category-card';

            // Image handling (assets vs uploads)
            // Priority: DB Image -> Static Map -> Default
            let img = 'assets/default-product.png';

            if (cat.image) {
                if (cat.image.startsWith('http')) img = cat.image;
                else if (cat.image.startsWith('uploads/')) img = `http://localhost:5000/${cat.image}`;
                else img = cat.image; // Assume asset path
            } else if (categoryImageMap[cat.name]) {
                img = categoryImageMap[cat.name];
            }

            card.innerHTML = `
                <img src="${img}" alt="${cat.name}" onerror="this.src='assets/default-product.png'">
                <div class="category-overlay">
                    <h3>${cat.name}</h3>
                </div>
            `;
            grid.appendChild(card);
        });

        // If there were multiple groups in HTML, I should probably hide/remove the other containers and just use one.
        // I'll handle that in update index.html step by cleaning up the structure.

    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

// Fetch Featured Products (Top 4 or Random 4)
async function fetchFeaturedProducts() {
    try {
        const res = await fetch(`${localApiBase}/products`);
        const responseData = await res.json();
        const products = responseData; // Keep for existing checks below

        const grid = document.querySelector('#shop .product-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // Support different response structures
        let productList = [];
        if (Array.isArray(products)) {
            productList = products;
        } else if (products && Array.isArray(products.data)) {
            productList = products.data;
        } else if (products && Array.isArray(products.products)) {
            productList = products.products;
        } else if (products && Array.isArray(products.value)) {
            productList = products.value;
        }

        if (!productList || productList.length === 0) {
            grid.innerHTML = '<p>No products found.</p>';
            return;
        }

        // Limit to 8 products for home page
        const featured = productList.slice(0, 8);

        featured.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-product-id', product._id); // Vital for cart-actions.js

            // Image
            let img = 'assets/default-product.png';
            if (product.images && product.images.length > 0) {
                const firstImg = product.images[0];
                if (firstImg.startsWith('http')) img = firstImg;
                else if (firstImg.startsWith('uploads/')) img = `http://localhost:5000/${firstImg}`;
                else img = `assets/${firstImg}`;
            }

            const pricing = product.pricing || { displayPrice: product.price, originalPrice: null, discountPercent: 0, offerApplied: false };
            const priceHTML = pricing.offerApplied
                ? `<span class="price">₹${pricing.displayPrice.toLocaleString()}</span>
                   <span class="original-price">₹${pricing.originalPrice.toLocaleString()}</span>
                   <span class="discount-text">${pricing.discountPercent}% OFF</span>`
                : `<span class="price">₹${pricing.displayPrice.toLocaleString()}</span>`;

            card.innerHTML = `
                <div class="product-img">
                    <button class="wishlist-btn" data-product-id="${product._id}"><i class="far fa-heart"></i></button>
                    <a href="product-details.html?id=${product._id}">
                        <img src="${img}" alt="${product.name}" onerror="this.src='assets/default-product.png'">
                    </a>
                    <button class="add-cart-btn"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                </div>
                <div class="product-info">
                    <h3><a href="product-details.html?id=${product._id}" class="product-title-link">${product.name}</a></h3>
                    <div class="product-meta">
                        ${priceHTML}
                    </div>
                    
                </div>
            `;

            // Wishlist Toggle Listener
            const wishBtn = card.querySelector('.wishlist-btn');
            wishBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (typeof window.WishlistActions === 'undefined') {
                    console.error("WishlistActions not loaded");
                    return;
                }

                wishBtn.disabled = true;
                const success = await window.WishlistActions.toggleWishlist(product._id);
                wishBtn.disabled = false;

                if (success) {
                    const icon = wishBtn.querySelector('i');
                    icon.classList.toggle('far');
                    icon.classList.toggle('fas');
                    icon.style.color = icon.classList.contains('fas') ? '#ff4757' : '';
                }
            });

            grid.appendChild(card);
        });

        // Initialize wishlist buttons state
        syncWishlistHeartsHome();

    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

async function syncWishlistHeartsHome() {
    if (typeof window.WishlistActions === 'undefined') return;
    const wishlist = await window.WishlistActions.getWishlist();
    const wishIds = wishlist.map(item => item._id || item);

    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const id = btn.closest('.product-card').dataset.productId;
        const icon = btn.querySelector('i');
        if (wishIds.includes(id)) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = '#ff4757';
        } else {
            icon.classList.add('far');
            icon.classList.remove('fas');
            icon.style.color = '';
        }
    });
}
