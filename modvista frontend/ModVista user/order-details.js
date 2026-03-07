document.addEventListener('DOMContentLoaded', async () => {
    const getApiBase = () => (window.ModVistaAPI && window.ModVistaAPI.API_BASE) ||
        (window.location.hostname === 'localhost' ? "http://localhost:5000/api" : `${window.location.origin}/api`);
    const localApiBase = getApiBase();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Get Order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        alert("No order specified.");
        window.location.href = 'orders.html';
        return;
    }

    const itemsContainer = document.getElementById('items-container');
    const itemCountSpan = document.getElementById('item-count');

    // ====== FETCH ORDER DETAILS ======
    try {
        const data = await window.ModVistaAPI.apiCall(`/orders/${orderId}`);

        if (data && data.success) {
            renderOrderDetails(data.data);
            fetchSidebarProfile();
        } else {
            alert(data.message || "Failed to load order details.");
            window.location.href = 'orders.html';
        }
    } catch (error) {
        console.error("Error fetching order:", error);
        alert("An error occurred while loading the order.");
    }

    async function fetchSidebarProfile() {
        try {
            const data = await window.ModVistaAPI.apiCall('/users/me');
            if (data && data.success) {
                const user = data.user;
                if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.fullName || user.name;
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email;
                if (document.getElementById('profileAvatar') && user.avatarUrl) {
                    document.getElementById('profileAvatar').src = window.ModVistaAPI.resolveImg(user.avatarUrl);
                }
            }
        } catch (err) {
            console.error("Sidebar profile fetch error:", err);
        }
    }

    // ====== RENDER FUNCTION ======
    function renderOrderDetails(order) {
        const shortId = order._id.substring(order._id.length - 6).toUpperCase();
        const dateFormatted = new Date(order.createdAt).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // 1. Header Meta
        document.getElementById('order-id').textContent = `Order #MV-${shortId}`;
        document.getElementById('order-date').textContent = `Placed on ${dateFormatted}`;
        document.getElementById('status-text').textContent = capitalize(order.status);

        // 2. Status Badge Color
        const statusBadge = document.getElementById('order-status-badge');
        const statusDot = statusBadge.querySelector('.status-dot');
        const statusLower = (order.status || 'pending').toLowerCase();

        const colors = {
            'delivered': '#4cd137',
            'shipped': '#00a8ff',
            'confirmed': '#00a8ff',
            'processing': '#fbc531',
            'pending': '#fbc531',
            'cancelled': '#e84118'
        };

        const color = colors[statusLower] || '#fbc531';
        statusBadge.style.color = color;
        if (statusDot) {
            statusDot.style.background = color;
            statusDot.style.boxShadow = `0 0 10px ${color}`;
        }

        // 3. Render Items
        itemsContainer.innerHTML = '';
        const items = order.items || [];
        if (itemCountSpan) itemCountSpan.textContent = items.length;

        items.forEach(item => {
            // Image handling
            const img = window.ModVistaAPI.resolveImg(item.image);

            const row = document.createElement('div');
            row.className = 'order-item-row';
            row.innerHTML = `
                <img src="${img}" alt="${item.name}" class="item-thumb" onerror="this.src='assets/default-product.png'">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p>${item.variant || 'Standard'}</p>
                    <p class="mobile-only-qty">Qty: ${item.quantity}</p>
                </div>
                <div class="item-price-info">
                    <span class="item-price">₹${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span class="item-qty">Qty: ${item.quantity}</span>
                </div>
            `;
            itemsContainer.appendChild(row);
        });

        // 4. Shipping Info
        const shippingName = document.getElementById('shipping-name');
        const shippingAddress = document.getElementById('shipping-address');
        const shippingPhone = document.getElementById('shipping-phone');

        if (shippingName && order.shippingAddress) {
            shippingName.textContent = order.shippingAddress.fullName;
            shippingAddress.textContent = `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`;
            shippingPhone.textContent = order.shippingAddress.phone;
        }

        const paymentMethodEl = document.getElementById('payment-method');
        if (paymentMethodEl) {
            paymentMethodEl.textContent = capitalize(order.paymentMethod);
        }

        // 5. Summary
        const subtotal = order.subtotal || 0;
        const tax = order.tax || 0;
        const total = order.total || 0;
        const offerDiscount = order.offerDiscount || 0;
        const couponDiscount = order.coupon?.discount || 0;

        if (document.getElementById('subtotal')) {
            document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        }

        const offerRow = document.getElementById('offer-row');
        if (offerRow) {
            if (offerDiscount > 0) {
                offerRow.style.display = 'flex';
                document.getElementById('offer-discount').textContent = `-₹${offerDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            } else {
                offerRow.style.display = 'none';
            }
        }

        const couponRow = document.getElementById('coupon-row');
        if (couponRow) {
            if (couponDiscount > 0) {
                couponRow.style.display = 'flex';
                document.getElementById('coupon-discount').textContent = `-₹${couponDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                if (document.getElementById('coupon-code')) {
                    document.getElementById('coupon-code').textContent = order.coupon?.code || 'Applied';
                }
            } else {
                couponRow.style.display = 'none';
            }
        }

        if (document.getElementById('tax')) {
            document.getElementById('tax').textContent = `₹${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        }
        if (document.getElementById('grand-total')) {
            document.getElementById('grand-total').textContent = `₹${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        }

        // 6. Cancel/Refund Actions
        const cancelContainer = document.getElementById('cancel-action-container');
        if (cancelContainer) {
            if (statusLower === 'pending' || statusLower === 'confirmed' || statusLower === 'processing') {
                cancelContainer.innerHTML = `<a href="order-cancel.html?id=${order._id}" class="cancel-link">Cancel Order</a>`;
            } else {
                cancelContainer.innerHTML = '';
            }
        }

        // 7. Update Invoice Download Link & Track Order Button
        const trackBtn = document.querySelector('.action-btns .primary-btn');
        if (trackBtn) {
            // removed track order link
        }

        const downloadBtn = document.querySelector('.outline-btn:not(.cancel-order-btn)');
        if (downloadBtn) {
            downloadBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = `invoice.html?id=${order._id}`;
            };
        }

        // 8. Render Dynamic Timeline (Sync with status)
        renderTimeline(statusLower, order.createdAt, order.updatedAt);
    }

    function renderTimeline(status, createdDate, updatedDate) {
        const timelineContainer = document.querySelector('.timeline-container');
        if (!timelineContainer) return;

        const steps = [
            { id: 'pending', label: 'Order Placed', icon: 'fa-receipt' },
            { id: 'confirmed', label: 'Confirmed', icon: 'fa-check-circle' },
            { id: 'shipped', label: 'Shipped', icon: 'fa-box' },
            { id: 'delivered', label: 'Delivered', icon: 'fa-home' }
        ];

        let activeIndex = 0;
        if (status === 'confirmed' || status === 'processing') activeIndex = 1;
        if (status === 'shipped') activeIndex = 2;
        if (status === 'delivered') activeIndex = 3;

        if (status === 'cancelled') {
            timelineContainer.innerHTML = `
                <div class="timeline-step completed">
                    <div class="step-icon"><i class="fas fa-receipt"></i></div>
                    <div class="step-content">
                        <span class="step-label">Order Placed</span>
                        <span class="step-date">${formatDate(createdDate)}</span>
                    </div>
                </div>
                <div class="timeline-line completed" style="background: var(--neon-red);"></div>
                <div class="timeline-step active">
                    <div class="step-icon" style="background: var(--neon-red); box-shadow: 0 0 10px var(--neon-red);"><i class="fas fa-times"></i></div>
                    <div class="step-content">
                        <span class="step-label" style="color: var(--neon-red);">Cancelled</span>
                        <span class="step-date">${formatDate(updatedDate)}</span>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        steps.forEach((step, index) => {
            let stateClass = '';
            if (index < activeIndex) stateClass = 'completed';
            else if (index === activeIndex) stateClass = 'active';

            let dateStr = '';
            if (index === 0) dateStr = formatDate(createdDate);
            else if (index === activeIndex && activeIndex > 0) dateStr = formatDate(updatedDate);

            html += `
                <div class="timeline-step ${stateClass}" data-step="${index + 1}">
                    <div class="step-icon"><i class="fas ${step.icon}"></i></div>
                    <div class="step-content">
                        <span class="step-label">${step.label}</span>
                        <span class="step-date">${dateStr}</span>
                    </div>
                </div>
            `;

            if (index < steps.length - 1) {
                let lineClass = '';
                if (index < activeIndex) lineClass = 'completed';
                else if (index === activeIndex && status !== 'delivered') lineClass = 'active-line';
                html += `<div class="timeline-line ${lineClass}"></div>`;
            }
        });

        timelineContainer.innerHTML = html;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});
