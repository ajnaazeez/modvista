/**
 * wishlist-actions.js
 * Centralized logic for wishlist operations.
 * Communicates with backend API and triggers UI updates.
 */

(function () {
    // Helper to trigger events for UI sync
    const triggerWishlistUpdate = () => {
        window.dispatchEvent(new Event('wishlistUpdated'));
        if (window.syncWishlistBadge) window.syncWishlistBadge();
    };

    const WishlistActions = {
        /**
         * Get full wishlist from backend
         */
        getWishlist: async () => {
            if (!window.ModVistaAPI.getToken()) return [];
            try {
                const response = await window.ModVistaAPI.apiCall('/wishlist');
                return response.data || [];
            } catch (err) {
                console.error('Failed to fetch wishlist:', err);
                return [];
            }
        },

        /**
         * Toggle product in wishlist
         */
        toggleWishlist: async (productId, silent = false) => {
            if (!window.ModVistaAPI.requireLogin()) return false;

            try {
                const wishlist = await WishlistActions.getWishlist();
                const isInWishlist = wishlist.some(item => {
                    const id = typeof item === 'object' ? item._id : item;
                    return id === productId;
                });

                let response;
                if (isInWishlist) {
                    response = await window.ModVistaAPI.apiCall(`/wishlist/${productId}`, { method: 'DELETE' });
                } else {
                    response = await window.ModVistaAPI.apiCall(`/wishlist/${productId}`, { method: 'POST' });
                }

                if (response && response.success) {
                    if (!silent) triggerWishlistUpdate();
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Toggle wishlist failed:', err);
                return false;
            }
        },

        /**
         * Add product to wishlist
         */
        addToWishlist: async (productId, silent = false) => {
            if (!window.ModVistaAPI.requireLogin()) return false;
            try {
                const response = await window.ModVistaAPI.apiCall(`/wishlist/${productId}`, { method: 'POST' });
                if (response && response.success) {
                    if (!silent) triggerWishlistUpdate();
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Add to wishlist failed:', err);
                return false;
            }
        },

        /**
         * Remove product from wishlist
         */
        removeFromWishlist: async (productId, silent = false) => {
            if (!window.ModVistaAPI.requireLogin()) return false;
            try {
                const response = await window.ModVistaAPI.apiCall(`/wishlist/${productId}`, { method: 'DELETE' });
                if (response && response.success) {
                    if (!silent) triggerWishlistUpdate();
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Remove from wishlist failed:', err);
                return false;
            }
        },

        /**
         * Bulk Clear
         */
        clearWishlist: async () => {
            const wishlist = await WishlistActions.getWishlist();
            if (wishlist.length === 0) return true;

            try {
                // Since the backend lacks a bulk clear, we loop but silenty
                const promises = wishlist.map(item => WishlistActions.removeFromWishlist(item._id || item, true));
                await Promise.all(promises);
                triggerWishlistUpdate();
                return true;
            } catch (err) {
                console.error('Clear wishlist failed:', err);
                return false;
            }
        }
    };

    // Expose to global scope
    window.WishlistActions = WishlistActions;
})();
