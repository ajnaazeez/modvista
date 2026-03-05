/**
 * ModVista - Shop Page Script
 * Fetches products from backend and renders them via DOM.
 * "Add to Cart" logic is handled by cart-actions.js via delegation.
 */

// Use centralized API_BASE from api.js
const getApiBase = () => {
    return (window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api";
};

// Lazy-load API URLs to avoid race conditions with api.js
const getProductsUrl = () => `${(window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api"}/products`;
const getCategoriesUrl = () => `${(window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api"}/categories`;

let allProducts = [];
let currentPage = 1;
const itemsPerPage = 10;
let totalResults = 0;
let totalPages = 1;
let currentFilters = {
    category: 'all',
    minPrice: null,
    maxPrice: null,
    rating: 0,
    sortBy: 'price-low',
    search: ''
};

// Track global total to keep "All Products" count stable
let globalTotalProducts = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Check for category in URL
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    if (catParam) {
        currentFilters.category = catParam;
    }

    const searchParam = urlParams.get('search');
    if (searchParam) {
        currentFilters.search = searchParam;
        const searchInput = document.getElementById('shop-search');
        if (searchInput) searchInput.value = searchParam;
    }

    fetchAllProductsForSidebar().then(() => {
        loadShopCategories();
    });

    fetchProducts();

    // Mobile filter logic

    setupMobileFilters();
    // Setup Filters
    setupPriceFilter();
    setupSortFilter();
    setupShopSearch();
});

function setupShopSearch() {
    const searchInput = document.getElementById('shop-search');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters.search = e.target.value;
            applyFilters();
        }, 500);
    });
}

async function fetchAllProductsForSidebar() {
    try {
        const res = await fetch(`${getProductsUrl()}?limit=5000`);
        const data = await res.json();
        if (data.success) {
            window.__ALL_PRODUCTS__ = data.data || [];
            globalTotalProducts = window.__ALL_PRODUCTS__.length;
        }
    } catch (err) {
        console.error("Failed to pre-fetch products for sidebar counts", err);
        window.__ALL_PRODUCTS__ = [];
    }
}

async function loadShopCategories() {
    const list = document.getElementById('sidebar-category-list');
    if (!list) return;

    try {
        const res = await fetch(getCategoriesUrl());
        const responseData = await res.json();
        const categories = responseData.data || [];

        // Function to get icon based on name
        const getIcon = (name) => {
            const n = name.toLowerCase();
            if (n.includes('exterior')) return 'fas fa-car';
            if (n.includes('interior')) return 'fas fa-couch';
            if (n.includes('performance')) return 'fas fa-tachometer-alt';
            if (n.includes('wheel')) return 'fas fa-circle-notch';
            if (n.includes('headlight')) return 'fas fa-lightbulb';
            if (n.includes('spoiler')) return 'fas fa-wind';
            return 'fas fa-tags';
        };

        let html = '';

        categories.forEach(cat => {
            // Compute count per category by matching product.category (string or populated) to cat._id
            let count = 0;
            if (window.__ALL_PRODUCTS__ && window.__ALL_PRODUCTS__.length > 0) {
                count = window.__ALL_PRODUCTS__.filter(p => {
                    const pCatId = (p.category && typeof p.category === 'object') ? p.category._id : p.category;
                    return pCatId === cat._id;
                }).length;
            }

            // Check if this category is active
            let match = false;
            if (currentFilters.category === cat._id) match = true;
            if (currentFilters.category.toLowerCase() === cat.name.toLowerCase()) {
                currentFilters.category = cat._id;
                match = true;
            }
            if (cat.slug && currentFilters.category.toLowerCase() === cat.slug.toLowerCase()) {
                currentFilters.category = cat._id;
                match = true;
            }

            html += `<li><a href="#" class="${match ? 'active' : ''}" data-cat="${cat._id}"><i class="${getIcon(cat.name)}"></i> ${cat.name} <span class="count">${count}</span></a></li>`;
        });

        // "All Products" active state and count
        const allActive = (currentFilters.category === 'all' || !currentFilters.category) ? 'active' : '';
        const totalCount = window.__ALL_PRODUCTS__ ? window.__ALL_PRODUCTS__.length : globalTotalProducts;
        html = `<li><a href="#" class="${allActive}" data-cat="all"><i class="fas fa-border-all"></i> All Products <span class="count">${totalCount}</span></a></li>` + html;

        list.innerHTML = html;
        attachCategoryListeners();

    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

function attachCategoryListeners() {
    const links = document.querySelectorAll('#sidebar-category-list a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Active state
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            currentFilters.category = link.dataset.cat;
            applyFilters();
        });
    });
}

function setupPriceFilter() {
    const applyBtn = document.querySelector('.apply-filter-btn');
    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');

    if (!applyBtn || !minInput || !maxInput) return;

    const performFilter = () => {
        const min = minInput.value;
        const max = maxInput.value;

        currentFilters.minPrice = (min !== '' && !isNaN(min)) ? parseFloat(min) : null;
        currentFilters.maxPrice = (max !== '' && !isNaN(max)) ? parseFloat(max) : null;

        if (currentFilters.minPrice !== null && currentFilters.maxPrice !== null && currentFilters.minPrice > currentFilters.maxPrice) {
            alert("Min price cannot be greater than Max price.");
            return;
        }

        applyFilters();
    };

    applyBtn.addEventListener('click', performFilter);

    [minInput, maxInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performFilter();
            }
        });
    });
}

function setupRatingFilter() {
    const links = document.querySelectorAll('#rating-filter-list a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            currentFilters.rating = parseFloat(link.dataset.rating || 0);
            applyFilters();
        });
    });
}

function setupSortFilter() {
    const select = document.getElementById('sort-select');
    if (!select) return;

    select.addEventListener('change', (e) => {
        currentFilters.sortBy = e.target.value;
        applyFilters();
    });
}

function applyFilters() {
    currentPage = 1;
    fetchProducts();
}

function applySorting(products, sortBy) {
    switch (sortBy) {
        case 'price-high':
            products.sort((a, b) => b.price - a.price);
            break;
        case 'price-low':
        default:
            products.sort((a, b) => a.price - b.price);
            break;
    }
}

function renderPage() {
    renderProducts(allProducts);

    const start = totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalResults);
    updateCount(start, end, totalResults);
    renderPagination(totalResults);

    // Scroll to top of products area
    const productsArea = document.querySelector('.products-area');
    if (productsArea) {
        productsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateCount(start, end, total) {
    const el = document.getElementById('results-count-text');
    if (!el) return;

    if (total === 0) {
        el.innerHTML = 'Showing <strong>0</strong> products';
    } else {
        el.innerHTML = `Showing <strong>${start}-${end}</strong> of <strong>${total}</strong> products`;
    }
}

function renderPagination(total) {
    const container = document.querySelector('.pagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    fetchProducts();
}

async function fetchProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '<p class="loading-text">Loading premium mods...</p>';
    const countText = document.getElementById('results-count-text');
    if (countText) countText.textContent = 'Loading results...';

    try {
        const { category, minPrice, maxPrice, sortBy, search } = currentFilters;
        let query = `?page=${currentPage}&limit=${itemsPerPage}`;

        if (category && category !== 'all') query += `&category=${category}`;
        if (currentFilters.minPrice !== null && !isNaN(currentFilters.minPrice)) query += `&price[gte]=${currentFilters.minPrice}`;
        if (currentFilters.maxPrice !== null && !isNaN(currentFilters.maxPrice)) query += `&price[lte]=${currentFilters.maxPrice}`;
        if (search && search.trim() !== '') query += `&search=${encodeURIComponent(search)}`;

        // Sorting mapping
        if (sortBy === 'price-low') query += `&sort=price`;
        if (sortBy === 'price-high') query += `&sort=-price`;
        if (sortBy === 'newest') query += `&sort=-createdAt`;

        const res = await fetch(`${getProductsUrl()}${query}`);
        const data = await res.json();

        if (data.success) {
            allProducts = data.data;
            totalResults = data.total;

            // Only update global total if we're looking at "All Products" with no other filters
            if (category === 'all' && !minPrice && !maxPrice && !search) {
                globalTotalProducts = totalResults;
            }

            totalPages = Math.ceil(totalResults / itemsPerPage);
            renderPage();
            // Category counts are based on cached all products, no need to reload unless categories change
            // but we call it here to ensure active state is updated
            loadShopCategories();
        } else {
            throw new Error(data.message || 'Failed to load products');
        }

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p class="error-text">Failed to load products. Please try again later.</p>';
    }
}

function resolveShopImg(src) {
    if (window.ModVistaAPI && typeof window.ModVistaAPI.resolveImg === 'function') {
        return window.ModVistaAPI.resolveImg(src);
    }
    return src ? src : 'assets/default-product.png';
}

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (!products || products.length === 0) {
        grid.innerHTML = '<p>No products found.</p>';
        return;
    }

    products.forEach(product => {
        const image = resolveShopImg(product.images?.[0]);

        const price = typeof product.price === 'number' ? product.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00';
        const rating = product.rating || 4.5;
        const productId = product._id;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = productId;

        const isOutOfStock = (product.stock !== undefined && product.stock <= 0);

        const pricing = product.pricing || { displayPrice: product.price, originalPrice: null, discountPercent: 0, offerApplied: false };
        const priceHTML = pricing.offerApplied
            ? `<span class="price">₹${pricing.displayPrice.toLocaleString()}</span>
               <span class="original-price">₹${pricing.originalPrice.toLocaleString()}</span>
               <span class="discount-text">${pricing.discountPercent}% OFF</span>`
            : `<span class="price">₹${pricing.displayPrice.toLocaleString()}</span>`;

        card.innerHTML = `
            <div class="product-img">
                <button class="wishlist-btn" data-product-id="${productId}"><i class="far fa-heart"></i></button>
                ${isOutOfStock ? '<div class="out-of-stock-badge">Out of Stock</div>' : ''}
                <a href="product-details.html?id=${productId}">
                    <img src="${image}" alt="${product.name}" onerror="this.onerror=null; this.src='assets/default.png';" style="${isOutOfStock ? 'filter: grayscale(0.5);' : ''}">
                </a>
                <button class="add-cart-btn ${isOutOfStock ? 'btn-disabled' : ''}" 
                        data-product-id="${productId}" 
                        data-variant="Standard"
                        ${isOutOfStock ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> ${isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                </button>
            </div>
            <div class="product-info">
                <h3><a href="product-details.html?id=${productId}" class="product-title-link">${product.name}</a></h3>
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
            const success = await window.WishlistActions.toggleWishlist(productId);
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

    // Check current wishlist status to highlight hearts
    syncWishlistHearts();
}

async function syncWishlistHearts() {
    if (typeof window.WishlistActions === 'undefined') return;
    if (!window.ModVistaAPI.getToken()) return; // Don't fetch if guest
    const wishlist = await window.WishlistActions.getWishlist();
    const wishIds = wishlist.map(item => item._id || item);

    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const id = btn.dataset.productId;
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

function setupMobileFilters() {
    const filterToggle = document.getElementById('mobile-filter-toggle');
    const filtersSidebar = document.getElementById('filters-sidebar');
    const closeFilters = document.getElementById('close-filters');

    if (filterToggle && filtersSidebar) {
        filterToggle.addEventListener('click', () => {
            filtersSidebar.classList.add('active');
        });
    }

    if (closeFilters && filtersSidebar) {
        closeFilters.addEventListener('click', () => {
            filtersSidebar.classList.remove('active');
        });
    }
}
