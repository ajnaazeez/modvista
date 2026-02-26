// --- GLOBAL FUNCTIONS (Attached to window for onclick access) ---

window.removeFromWishlist = async function (id) {
    // Animation before removal
    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        setTimeout(async () => {
            const success = await window.WishlistActions.removeFromWishlist(id);
            if (success) {
                showToast('Item removed from wishlist');
            } else {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
                showToast('Failed to remove item', 'error');
            }
        }, 300);
    } else {
        await window.WishlistActions.removeFromWishlist(id);
    }
};

window.moveToCart = async function (id) {
    if (typeof addToCartGlobal !== 'function') {
        console.error("addToCartGlobal not found");
        return;
    }

    try {
        // Add to cart with default qty 1
        const success = await addToCartGlobal(id, 1, "Standard");

        if (success) {
            // Remove from wishlist
            await window.WishlistActions.removeFromWishlist(id);
            showToast('Item moved to cart successfully', 'success');
        }
    } catch (err) {
        console.error('Move to cart failed:', err);
        showToast('Failed to move item to cart', 'error');
    }
};

// Helper: Toast Notification
function showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = 'cart-toast show'; // Reuse cart toast styles
    if (type === 'error') toast.style.borderColor = '#ff4757';
    else if (type === 'info') toast.style.borderColor = '#00d2d3';
    else toast.style.borderColor = 'var(--neon-red)';

    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'info' ? 'fa-info-circle' : 'fa-check-circle'}"></i> 
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}


/* --- Wishlist Logic --- */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const wishlistGrid = document.getElementById('wishlist-grid');
    const emptyState = document.getElementById('empty-state');
    const wishlistCountHeader = document.getElementById('wishlist-count-header');
    const wishlistBadge = document.getElementById('wishlist-badge');

    // Bulk Action Buttons
    const moveAllBtn = document.getElementById('move-all-btn');
    const clearBtn = document.getElementById('clear-wishlist-btn');

    let wishlist = [];

    // Listen for external updates
    window.addEventListener('wishlistUpdated', fetchAndRender);

    // Function to fetch and render
    async function fetchAndRender() {
        wishlist = await window.WishlistActions.getWishlist();
        renderWishlist();
    }

    // Function to render the wishlist
    function renderWishlist() {
        // Clear grid
        wishlistGrid.innerHTML = '';

        // Update counts
        updateCounts(wishlist.length);

        if (wishlist.length === 0) {
            wishlistGrid.style.display = 'none';
            emptyState.style.display = 'flex';
            if (moveAllBtn) moveAllBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            return;
        }

        wishlistGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        if (moveAllBtn) moveAllBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;

        wishlist.forEach(product => {
            const card = document.createElement('div');
            card.classList.add('product-card');
            card.setAttribute('data-id', product._id);

            // Resolve Image
            const image = window.ModVistaAPI.resolveImg(product.images && product.images.length > 0 ? product.images[0] : null);

            // Format Price
            const formattedPrice = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(product.price || 0);

            card.innerHTML = `
                <div class="product-img">
                    <a href="product-details.html?id=${product._id}">
                        <img src="${image}" alt="${product.name}" onerror="this.src='assets/default.png'">
                    </a>

                    <!-- Move to Cart Button (Slides up on hover) -->
                    <button class="add-cart-btn" data-product-id="${product._id}" onclick="event.stopPropagation(); moveToCart('${product._id}')">
                        <i class="fas fa-shopping-cart"></i> Move to Cart
                    </button>
                    
                    <!-- Remove Button (Top Right Absolute) -->
                    <button class="remove-btn-absolute" onclick="removeFromWishlist('${product._id}')" title="Remove from Wishlist">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-meta">
                        <span class="price">${formattedPrice}</span>
                        <div class="rating">
                            <i class="fas fa-star"></i>
                            <span>${product.rating || 5.0}</span>
                        </div>
                    </div>
                    
                </div>
            `;
            wishlistGrid.appendChild(card);
        });
    }

    // Update Badges and Headers
    function updateCounts(count) {
        if (wishlistCountHeader) wishlistCountHeader.textContent = `(${count} Items)`;
        if (wishlistBadge) {
            if (count > 0) {
                wishlistBadge.style.display = 'flex';
                wishlistBadge.textContent = count;
            } else {
                wishlistBadge.style.display = 'none';
            }
        }
    }

    // Bulk Actions
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (wishlist.length === 0) return;
            if (!confirm('Are you sure you want to clear your wishlist?')) return;

            const originalHTML = clearBtn.innerHTML;
            clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
            clearBtn.disabled = true;

            try {
                const success = await window.WishlistActions.clearWishlist();
                if (success) {
                    showToast('Wishlist cleared');
                } else {
                    showToast('Failed to clear wishlist', 'error');
                }
            } catch (err) {
                console.error('Clear failed:', err);
                showToast('Error clearing wishlist', 'error');
            } finally {
                clearBtn.innerHTML = originalHTML;
                clearBtn.disabled = false;
            }
        });
    }

    if (moveAllBtn) {
        moveAllBtn.addEventListener('click', async () => {
            if (wishlist.length === 0) return;
            if (!confirm(`Move all ${wishlist.length} items to cart?`)) return;

            if (typeof addToCartGlobal !== 'function') {
                showToast('Cart system unavailable', 'error');
                return;
            }

            const originalHTML = moveAllBtn.innerHTML;
            moveAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Moving...';
            moveAllBtn.disabled = true;

            try {
                let addedCount = 0;
                for (let i = 0; i < wishlist.length; i++) {
                    const item = wishlist[i];
                    moveAllBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Moving (${i + 1}/${wishlist.length})...`;

                    const success = await addToCartGlobal(item._id, 1, "Standard");
                    if (success) {
                        // Remove silently (no event trigger)
                        await window.WishlistActions.removeFromWishlist(item._id, true);
                        addedCount++;
                    }
                }

                if (addedCount > 0) {
                    // Manually trigger one update at the end
                    window.dispatchEvent(new Event('wishlistUpdated'));
                    showToast(`${addedCount} Items moved to cart`);
                } else {
                    showToast('Failed to move items', 'error');
                }
            } catch (err) {
                console.error('Bulk move failed:', err);
                showToast('Error moving items to cart', 'error');
            } finally {
                moveAllBtn.innerHTML = originalHTML;
                moveAllBtn.disabled = false;
            }
        });
    }

    // Initial Fetch
    fetchAndRender();
});
