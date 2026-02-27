document.addEventListener('DOMContentLoaded', async () => {
    // 0. Security Check
    if (!window.ModVistaAPI || !window.ModVistaAPI.requireLogin()) return;

    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.classList.add('scrolled');
        window.addEventListener('scroll', () => {
            navbar.classList.add('scrolled');
        });
    }

    // 1. Initial Load
    let allProfileOrders = [];
    let currentUserData = null;

    // Parallel fetch for speed
    Promise.allSettled([
        fetchUserProfile(),
        fetchUserAddresses(),
        fetchUserOrders(),
        fetchUserWishlist(),
        fetchProfileWallet()
    ]);

    initSectionSwitching();

    // ---------- Data Fetching ----------

    async function fetchUserProfile() {
        try {
            const data = await window.ModVistaAPI.apiCall('/users/me');
            if (data && data.success) {
                currentUserData = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user.avatarUrl) {
                    localStorage.setItem('userAvatar', window.ModVistaAPI.resolveImg(data.user.avatarUrl));
                } else {
                    localStorage.removeItem('userAvatar');
                }
                renderProfileData(data.user);
            }
        } catch (error) {
            console.error("Profile load error:", error);
            showError('my-profile', 'Failed to load profile details');
        }
    }


    async function fetchUserAddresses() {
        try {
            const data = await window.ModVistaAPI.apiCall('/addresses');
            if (data && data.success) {
                const defaultAddr = data.data.find(addr => addr.isDefault) || data.data[0];
                renderDefaultAddress(defaultAddr);
            }
        } catch (error) {
            console.error("Address load error:", error);
            document.getElementById('default-address-container').innerHTML = '<p class="text-error">Failed to load address</p>';
        }
    }

    async function fetchUserOrders() {
        try {
            const data = await window.ModVistaAPI.apiCall('/orders/my');
            if (data && data.success) {
                allProfileOrders = data.data;
                const orderCountEl = document.getElementById('stat-orders-count');
                if (orderCountEl) orderCountEl.innerText = allProfileOrders.length;
                renderOrdersPreview(allProfileOrders);
            }
        } catch (error) {
            console.error("Orders load error:", error);
        }
    }

    async function fetchUserWishlist() {
        try {
            const data = await window.ModVistaAPI.apiCall('/wishlist');
            if (data && data.success) {
                const wishlistCountEl = document.getElementById('stat-wishlist-count');
                if (wishlistCountEl) wishlistCountEl.innerText = data.data.length;
                renderWishlistPreview(data.data);
            }
        } catch (error) {
            console.error("Wishlist load error:", error);
        }
    }

    async function fetchProfileWallet() {
        try {
            const data = await window.ModVistaAPI.apiCall('/wallet/balance');
            if (data && data.success) {
                const balance = data.balance || 0;
                renderProfileWallet(balance);
                const statBalanceEl = document.getElementById('stat-wallet-balance');
                if (statBalanceEl) statBalanceEl.innerText = `₹${balance.toFixed(2)}`;
            }
        } catch (error) {
            console.error("Wallet load error:", error);
        }
    }

    // ---------- Rendering ----------

    function renderWishlistPreview(items) {
        const grid = document.getElementById('profile-wishlist-grid');
        const emptyState = document.getElementById('profile-wishlist-empty');
        if (!grid) return;

        grid.innerHTML = '';
        if (!items || items.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        items.slice(0, 4).forEach(product => {
            const itemEl = document.createElement('div');
            itemEl.className = 'wishlist-preview-card';
            itemEl.style.cssText = 'background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; margin-bottom: 15px;';

            const img = window.ModVistaAPI.resolveImg(product.images?.[0]);

            itemEl.innerHTML = `
                <div class="wishlist-img"><img src="${img}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"></div>
                <div class="wishlist-details">
                    <h4 style="font-size: 0.95rem; margin-bottom: 4px;">${product.name}</h4>
                    <p style="color: #ff1f1f; font-weight: 700;">₹${product.price.toFixed(2)}</p>
                </div>
            `;
            grid.appendChild(itemEl);
        });
    }

    function initSectionSwitching() {
        const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
        const sections = document.querySelectorAll('.content-section');

        const menuMap = {
            'My Profile': 'my-profile',
            'My Orders': 'my-orders',
            'Order Tracking': 'order-tracking',
            'Returns & Refunds': 'returns',
            'Saved Addresses': 'addresses',
            'Wallet': 'wallet',
            'Wishlist': 'wishlist'
        };

        menuItems.forEach(item => {
            const text = item.innerText.trim();
            const sectionId = menuMap[text];

            if (sectionId) {
                item.onclick = (e) => {
                    e.preventDefault();
                    menuItems.forEach(mi => mi.classList.remove('active'));
                    item.classList.add('active');
                    sections.forEach(s => s.style.display = 'none');
                    const target = document.getElementById(sectionId);
                    if (target) {
                        target.style.display = 'block';
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                };
            }
        });

        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            const span = card.querySelector('span');
            if (span) {
                const text = span.innerText.trim();
                const sectionId = menuMap[text];
                if (sectionId) {
                    card.onclick = (e) => {
                        e.preventDefault();
                        const menuBtn = Array.from(menuItems).find(mi => mi.innerText.trim() === text);
                        if (menuBtn) menuBtn.click();
                    };
                }
            }
        });
    }


    function renderProfileWallet(balance) {
        const el = document.getElementById('profile-wallet-balance');
        if (el) el.innerText = `₹${balance.toFixed(2)}`;
    }

    function renderProfileData(user) {
        setText('navUserName', user.name);
        setText('profile-name', user.name);
        setText('profile-email', user.email);
        setText('profile-phone', user.phone || 'Not provided');

        // Update sidebar and other global UI components
        if (window.modvista_updateSidebar) {
            window.modvista_updateSidebar();
        }

        if (window.fetchCurrentUserNavbar) {
            window.fetchCurrentUserNavbar();
        }
    }



    function renderDefaultAddress(address) {
        const container = document.getElementById('default-address-container');
        if (!container) return;

        if (!address) {
            container.innerHTML = '<p class="text-muted">No address saved yet</p>';
            return;
        }

        container.innerHTML = `
            <p>
                <strong>${address.fullName}</strong><br>
                ${address.house}, ${address.street}<br>
                ${address.city}, ${address.state} - ${address.pincode}<br>
                Phone: ${address.phone}
            </p>
        `;
    }

    function renderOrdersPreview(orders) {
        const orderContainer = document.getElementById('profile-orders-container');
        const emptyState = document.getElementById('profile-orders-empty');
        if (!orderContainer) return;

        orderContainer.innerHTML = '';
        if (!orders || orders.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card-mini';
            card.style.cssText = 'background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; margin-bottom: 15px; overflow: hidden;';

            const status = (order.status || 'pending').toLowerCase();
            const date = new Date(order.createdAt).toLocaleDateString();
            const shortId = order._id.slice(-8).toUpperCase();

            card.innerHTML = `
                <div style="padding: 12px 20px; border-bottom: 1px solid #2d2d2d; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700;">#${shortId}</span>
                    <span class="card-mini-status status-${status}">${capitalize(status)}</span>
                </div>
                <div style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 10px;">
                        ${(order.items || []).slice(0, 3).map(item => `
                            <img src="${window.ModVistaAPI.resolveImg(item.image)}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
                        `).join('')}
                    </div>
                    <div style="text-align: right;">
                        <span style="font-weight: 800; display: block;">₹${order.total.toFixed(2)}</span>
                        <small style="color: #888;">${date}</small>
                    </div>
                </div>
            `;
            orderContainer.appendChild(card);
        });
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    function showError(id, message) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<p class="text-error">${message}</p>`;
    }
});
