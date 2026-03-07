const getApiBase = () => (window.ModVistaAPI && window.ModVistaAPI.API_BASE) ||
    (window.location.hostname === 'localhost' ? "http://localhost:5000/api" : `${window.location.origin}/api`);
const localApiBase = getApiBase();

function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function fetchProduct(id) {
    const res = await fetch(`${localApiBase}/products/${id}`);
    if (!res.ok) throw new Error("Product not found");
    return res.json();
}

function resolveImg(src) {
    if (!src) return "assets/default.png";
    if (src.startsWith("uploads/") || src.startsWith("/uploads/")) {
        const cleanPath = src.startsWith('/') ? src.slice(1) : src;
        // Fix: API_BASE was not defined in this scope, use localApiBase
        return `${localApiBase.replace('/api', '')}/${cleanPath}`;
    }
    if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) {
        return src;
    }
    return src;
}

function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

function setImage(selector, src, fallback = "assets/default.png") {
    const img = document.querySelector(selector);
    if (!img) return;
    const resolved = resolveImg(src);
    img.src = resolved;
    img.onerror = () => {
        img.onerror = null;
        img.src = fallback;
    };
}


// Tab Switching Logic
function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));

            // Add active to current
            btn.classList.add("active");
            tabPanes[index].classList.add("active");
        });
    });
}

// Fetch and Render Related Products
async function loadRelatedProducts(categoryId, currentProductId) {
    const grid = document.getElementById("related-products-grid");
    if (!grid) return;

    try {
        const res = await fetch(`${localApiBase}/products`);
        if (!res.ok) throw new Error("Failed to fetch related products");
        const allProducts = await res.json();

        // Filter: Same category, not current product, and active
        const related = allProducts.filter(p =>
            p.category?._id === categoryId || p.category === categoryId
        ).filter(p => p._id !== currentProductId && p.isActive).slice(0, 4);

        if (related.length === 0) {
            document.querySelector(".related-products").style.display = "none";
            return;
        }

        grid.innerHTML = related.map(p => {
            const pricing = p.pricing || { displayPrice: p.price };
            const imgSrc = p.images?.[0] || "assets/default.png";
            return `
                <div class="product-card">
                    <div class="product-img">
                        <a href="product-details.html?id=${p._id}">
                            <img src="${resolveImg(imgSrc)}" alt="${p.name}" onerror="this.src='assets/default.png'">
                        </a>
                        <button class="add-cart-btn" onclick="if(typeof addToCartGlobal === 'function') addToCartGlobal('${p._id}', 1, 'Standard')">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        <div class="product-meta">
                            <span class="price">₹${pricing.displayPrice.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Related products error:", err);
        grid.innerHTML = "<p>Failed to load related products.</p>";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const id = getProductIdFromURL();
    console.log("Loading product details for ID:", id);

    if (!id) {
        // Option: redirect or show generic
        console.warn("No ID found in URL");
        // alert("No product ID specified");
        // window.location.href = "shop.html";
        return;
    }

    try {
        const product = await fetchProduct(id);
        console.log("Product fetched:", product);

        setText(".product-title", product.name);

        const pricing = product.pricing || { displayPrice: product.price, originalPrice: null, discountPercent: 0, offerApplied: false };
        const priceEl = document.querySelector(".product-price");
        if (priceEl) {
            if (pricing.offerApplied) {
                priceEl.innerHTML = `
                    <span class="price">₹${pricing.displayPrice.toLocaleString()}</span>
                    <span class="original-price" style="margin-left: 10px;">₹${pricing.originalPrice.toLocaleString()}</span>
                    <span class="discount-text" style="margin-left: 10px;">${pricing.discountPercent}% OFF</span>
                `;
            } else {
                priceEl.textContent = `₹${pricing.displayPrice.toLocaleString()}`;
            }
        }

        const shortEl = document.querySelector(".short-desc");
        if (shortEl) shortEl.textContent = product.description || "No description available.";

        const mainDescEl = document.querySelector("#description-tab");
        if (mainDescEl) {
            mainDescEl.innerHTML = `
                <h2>Product Description</h2>
                <p>${product.description || "No detailed description available for this product."}</p>
            `;
        }


        // Image Handling
        const images = product.images && product.images.length > 0 ? product.images : ["assets/default.png"];
        const mainImgSrc = images[0];

        setImage("#main-img", mainImgSrc, "assets/default.png");

        // Render Thumbnails
        const thumbGrid = document.querySelector(".thumbnail-grid");
        if (thumbGrid && images.length > 1) {
            thumbGrid.innerHTML = ""; // Clear static thumbs
            images.forEach((imgSrc, index) => {
                const thumbDiv = document.createElement("div");
                thumbDiv.className = `thumb ${index === 0 ? "active" : ""}`;
                const resolved = resolveImg(imgSrc);

                thumbDiv.innerHTML = `<img src="${resolved}" alt="Thumb ${index + 1}" onerror="this.src='assets/default.png'">`;

                thumbDiv.addEventListener("click", () => {
                    // Update main image
                    setImage("#main-img", imgSrc);
                    // Update active state
                    document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
                    thumbDiv.classList.add("active");
                });

                thumbGrid.appendChild(thumbDiv);
            });
        } else if (thumbGrid) {
            thumbGrid.innerHTML = ""; // Clear if only 1 image
        }

        const stock = Number(product.stock || 0);
        const isOutOfStock = stock <= 0;

        const stockEl = document.querySelector(".stock-status");
        if (stockEl) {
            stockEl.innerHTML =
                stock > 0
                    ? `<i class="fas fa-check-circle"></i> In Stock`
                    : `<i class="fas fa-times-circle" style="color: var(--neon-red);"></i> Out of Stock`;
        }

        // Handle disabled states
        const addBtn = document.querySelector(".add-to-cart-big");
        const buyBtn = document.querySelector(".buy-now-btn");
        const qtyInput = document.querySelector(".qty-selector input");
        const mainImg = document.querySelector("#main-img");

        if (isOutOfStock) {
            // Apply grayscale to image
            if (mainImg) mainImg.style.filter = "grayscale(0.5)";

            // Add Badge
            const featuredImageDiv = document.querySelector(".featured-image");
            if (featuredImageDiv) {
                const badge = document.createElement("div");
                badge.className = "out-of-stock-badge";
                badge.textContent = "Out of Stock";
                featuredImageDiv.appendChild(badge);
            }

            // Disable Buttons
            if (addBtn) {
                addBtn.disabled = true;
                addBtn.classList.add("btn-disabled");
                addBtn.textContent = "Unavailable";
            }
            if (buyBtn) {
                buyBtn.disabled = true;
                buyBtn.classList.add("btn-disabled");
                buyBtn.textContent = "Currently Unavailable";
            }
            if (qtyInput) {
                qtyInput.disabled = true;
            }
        }

        // Initialize Tab Logic
        initTabs();

        // Load Related Products
        if (product.category) {
            loadRelatedProducts(product.category._id || product.category, id);
        }

        if (addBtn && !isOutOfStock) {
            addBtn.addEventListener("click", async (e) => {
                e.preventDefault();

                if (typeof addToCartGlobal !== 'function') {
                    console.error("addToCartGlobal not found");
                    alert("Cart system unavailable. Please refresh.");
                    return;
                }

                const originalHTML = addBtn.innerHTML;
                addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
                addBtn.disabled = true;

                try {
                    const qty = qtyInput ? Number(qtyInput.value || 1) : 1;
                    await addToCartGlobal(id, qty, "Standard");
                } catch (err) {
                    console.error(err);
                } finally {
                    addBtn.innerHTML = originalHTML;
                    addBtn.disabled = false;
                }
            });
        }

        // Buy Now Logic
        if (buyBtn && !isOutOfStock) {
            buyBtn.addEventListener("click", async () => {
                if (typeof addToCartGlobal !== 'function') return;
                try {
                    const qty = qtyInput ? Number(qtyInput.value || 1) : 1;
                    await addToCartGlobal(id, qty, "Standard");
                    window.location.href = "checkout.html";
                } catch (err) {
                    console.error("Buy now error:", err);
                }
            });
        }

        // Wishlist Logic
        const wishBtn = document.getElementById('wishlist-btn-detail');
        if (wishBtn) {
            // Initial State
            syncWishlistStatus(id, wishBtn);

            wishBtn.addEventListener('click', async () => {
                if (typeof window.WishlistActions === 'undefined') {
                    console.error("WishlistActions not loaded");
                    return;
                }
                wishBtn.disabled = true;
                const success = await window.WishlistActions.toggleWishlist(id);
                wishBtn.disabled = false;
                if (success) {
                    syncWishlistStatus(id, wishBtn);
                }
            });
        }

        const qtyMinus = document.querySelector(".qty-selector button:first-child");
        const qtyPlus = document.querySelector(".qty-selector button:last-child");

        if (qtyInput && qtyMinus && qtyPlus) {
            qtyMinus.addEventListener("click", () => {
                const v = Math.max(1, Number(qtyInput.value || 1) - 1);
                qtyInput.value = v;
            });
            qtyPlus.addEventListener("click", () => {
                const v = Math.min(99, Number(qtyInput.value || 1) + 1);
                qtyInput.value = v;
            });
        }
    } catch (err) {
        console.error(err);
        alert(`Failed to load product details: ${err.message}`);
        // window.location.href = "shop.html"; // Commented out to allow debugging
    }
});

async function syncWishlistStatus(productId, btn) {
    if (typeof window.WishlistActions === 'undefined') return;
    try {
        const wishlist = await window.WishlistActions.getWishlist();
        const isInWishlist = wishlist.some(item => (item._id || item) === productId);
        const icon = btn.querySelector('i');
        if (isInWishlist) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = '#ff4757';
        } else {
            icon.classList.add('far');
            icon.classList.remove('fas');
            icon.style.color = '';
        }
    } catch (err) {
        console.error('Failed to sync wishlist status:', err);
    }
}
