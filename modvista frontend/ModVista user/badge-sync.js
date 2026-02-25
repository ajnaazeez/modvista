/**
 * badge-sync.js
 * Lightweight script that ONLY updates the cart badge count.
 * Does NOT use localStorage or manage cart logic.
 * Fetches cart count from backend API only.
 */

(function () {
    const getApiBase = () => (window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api";
    const localApiBase = getApiBase();

    // Get token from localStorage
    function getToken() {
        // Check direct token first
        const token = localStorage.getItem('token');
        if (token) return token;

        // Fallback to userInfo
        try {
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
                const parsed = JSON.parse(userInfo);
                return parsed.token;
            }
        } catch (e) {
            console.error('Failed to parse userInfo:', e);
        }
        return null;
    }

    // Update badges UI
    function updateBadges(cartCount, wishlistCount) {
        const cartBadges = document.querySelectorAll('.cart-count-badge');
        cartBadges.forEach(badge => {
            badge.textContent = cartCount;
            badge.style.display = cartCount > 0 ? 'flex' : 'none';
        });

        const wishBadges = document.querySelectorAll('.wishlist-count-badge');
        wishBadges.forEach(badge => {
            badge.textContent = wishlistCount;
            badge.style.display = wishlistCount > 0 ? 'flex' : 'none';
        });
    }

    // Fetch from backend and update badges
    async function syncBadges() {
        const token = getToken();
        if (!token) {
            updateBadges(0, 0);
            return;
        }

        try {
            // Parallel fetch for speed
            const [cartRes, wishRes] = await Promise.all([
                fetch(`${localApiBase}/cart`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${localApiBase}/wishlist`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            let cartCount = 0;
            let wishCount = 0;

            if (cartRes.ok) {
                const cart = await cartRes.json();
                const items = cart.items || [];
                cartCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            }

            if (wishRes.ok) {
                const wish = await wishRes.json();
                const items = wish.data || [];
                wishCount = items.length;
            }

            updateBadges(cartCount, wishCount);

        } catch (error) {
            console.error('Badge sync error:', error);
            updateBadges(0, 0);
        }
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        syncBadges();
    });

    // Handle updates
    window.addEventListener('storage', syncBadges);
    window.addEventListener('wishlistUpdated', syncBadges);

    // Expose sync function globally
    window.syncCartBadge = syncBadges; // Keep name for compatibility
    window.syncWishlistBadge = syncBadges;

})();
