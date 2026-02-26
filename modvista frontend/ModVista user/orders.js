document.addEventListener('DOMContentLoaded', () => {
    const getApiBase = () => (window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api";
    const localApiBase = getApiBase();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const ordersContainer = document.getElementById('orders-container');
    const emptyState = document.getElementById('empty-state');
    const filterSelect = document.getElementById('order-filter');
    const sortSelect = document.getElementById('order-sort');

    let allOrders = [];

    // ====== 1. FETCH ORDERS ======
    async function fetchOrders() {
        try {
            const data = await window.ModVistaAPI.apiCall('/orders/my');

            if (data && data.success) {
                allOrders = data.data;
                applyFiltersAndSort();
            } else {
                console.error('Failed to fetch orders:', data ? data.message : 'Unknown error');
                renderOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = '<div class="error-state"><p>Failed to load orders. Please try again.</p></div>';
        }
    }

    // ====== 2. CANCEL ORDER LOGIC ======
    window.handleCancelOrder = async (orderId) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        const API_BASE = getApiBase();
        const url = `${API_BASE}/orders/${orderId}/cancel`;

        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                alert('Order cancelled successfully!');
                fetchOrders();
            } else {
                throw new Error(data.message || 'Failed to cancel order');
            }
        } catch (error) {
            console.error('Cancel order error:', error);
            alert(error.message || 'An error occurred while cancelling the order.');
        }
    };

    // ====== 3. RETURN REQUEST LOGIC ======
    window.handleRequestReturn = (orderId) => {
        // Show the return modal
        const modal = document.getElementById('return-modal');
        document.getElementById('return-order-id').value = orderId;
        document.getElementById('return-reason').value = '';
        document.getElementById('return-error-msg').textContent = '';
        modal.classList.add('show');
    };

    window.closeReturnModal = () => {
        const modal = document.getElementById('return-modal');
        modal.classList.remove('show');
    };

    window.submitReturnRequest = async () => {
        const orderId = document.getElementById('return-order-id').value;
        const reason = document.getElementById('return-reason').value.trim();
        const errEl = document.getElementById('return-error-msg');
        const submitBtn = document.getElementById('return-submit-btn');

        if (!reason) {
            errEl.textContent = 'Please provide a reason for your return request.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        errEl.textContent = '';

        try {
            const data = await window.ModVistaAPI.apiCall(`/orders/${orderId}/return`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });

            if (data.success) {
                closeReturnModal();
                alert('Return request submitted! Our team will review and notify you.');
                fetchOrders();
            } else {
                errEl.textContent = data.message || 'Failed to submit return request.';
            }
        } catch (error) {
            errEl.textContent = error.message || 'An error occurred. Please try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
        }
    };

    // ====== 4. RENDER ORDERS ======
    function renderOrders(orders) {
        ordersContainer.innerHTML = '';

        if (!orders || orders.length === 0) {
            ordersContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        ordersContainer.style.display = 'grid';
        emptyState.style.display = 'none';

        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';

            const statusRaw = (order.status || 'pending').toLowerCase();
            const statusClass = statusRaw.replace(/_/g, '-');
            const dateObj = new Date(order.createdAt);
            const dateFormatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;

            const shortId = order._id.substring(order._id.length - 8).toUpperCase();

            // Items Logic
            const itemsCount = order.items ? order.items.length : 0;
            const shownItems = order.items ? order.items.slice(0, 3) : [];
            const moreItemsCount = itemsCount > 3 ? itemsCount - 3 : 0;

            const aiPreviewAvailable = order.status === 'delivered';

            const itemsListHtml = shownItems.map(item => `
                <img src="${window.ModVistaAPI.resolveImg(item.image)}" 
                     alt="${item.name}" 
                     class="thumb-image" 
                     style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #333;"
                     onerror="this.src='assets/default-product.png'">
            `).join('');

            // Status label with nice formatting
            const statusLabel = statusRaw === 'return_requested' ? 'Return Requested' : capitalize(order.status);

            // Return reason badge
            const returnReasonBadge = (statusRaw === 'return_requested' && order.returnReason)
                ? `<div style="margin-top:8px; padding: 8px 12px; background: rgba(255,165,0,0.1); border: 1px solid rgba(255,165,0,0.3); border-radius:6px; font-size:0.82rem; color:#ffb347;">
                    <i class="fas fa-undo" style="margin-right:6px;"></i><strong>Return Reason:</strong> ${order.returnReason}
                   </div>`
                : '';

            card.innerHTML = `
                <div class="order-card-header">
                    <div class="order-meta-info" style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center;">
                        <div class="meta-item">
                            <small style="color: #888; display: block; font-size: 10px; text-transform: uppercase;">ID</small>
                            <span class="order-id-tag" style="font-weight: bold; color: #ff1f1f;">#${shortId}</span>
                        </div>
                        <div class="meta-item">
                            <small style="color: #888; display: block; font-size: 10px; text-transform: uppercase;">Date</small>
                            <span style="color: #eee;">${dateFormatted}</span>
                        </div>
                        <div class="meta-item">
                            <small style="color: #888; display: block; font-size: 10px; text-transform: uppercase;">Status</small>
                            <span class="order-status-badge status-${statusClass}" style="display: inline-flex; align-items: center; gap: 5px;">
                                <span class="status-dot"></span>
                                ${statusLabel}
                            </span>
                        </div>
                        <div class="meta-item" style="margin-left: auto;">
                            <small style="color: #888; display: block; font-size: 10px; text-transform: uppercase;">Total</small>
                            <span class="header-total" style="font-weight: 800; color: white; font-size: 1.1rem;">₹${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div class="order-card-body" style="padding: 20px; display: block;">
                    <div class="product-info-section">
                        <div class="product-previews" style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
                            ${itemsCount === 1 ? `
                                <div class="single-item-preview" style="display: flex; align-items: center; gap: 15px;">
                                    ${itemsListHtml}
                                    <div class="single-item-header">
                                        <span class="item-name-prominent" style="font-weight: 600; color: #fff; display: block;">${shownItems[0].name}</span>
                                        <span class="item-variant-label" style="font-size: 0.8rem; color: #888;">${shownItems[0].variant || 'Standard'}</span>
                                    </div>
                                </div>
                            ` : `
                                ${itemsListHtml}
                                ${moreItemsCount > 0 ? `<span class="more-items" style="color: #888; font-size: 0.9rem;">+${moreItemsCount} more items</span>` : ''}
                            `}
                        </div>
                        ${returnReasonBadge}
                    </div>
                </div>
                <div class="order-card-footer">
                    ${getActionButtons(order._id, order.status, aiPreviewAvailable)}
                </div>
            `;
            ordersContainer.appendChild(card);
        });
    }

    // ====== 5. HELPER FUNCTIONS ======
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function getActionButtons(orderId, status, aiAvailable) {
        let buttons = `
            <a href="order-details.html?id=${orderId}" class="action-btn btn-view" 
               style="background: rgba(255, 31, 31, 0.1); border: 1px solid rgba(255, 31, 31, 0.3); color: #fff; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle" style="color: #ff1f1f; font-size: 0.9rem;"></i> Details
            </a>`;

        const s = status.toLowerCase();

        if (s === 'shipped' || s === 'out_for_delivery') {

        } else if (s === 'pending' || s === 'confirmed') {
            buttons += `
                <button onclick="window.handleCancelOrder('${orderId}')" class="action-btn btn-secondary" style="cursor: pointer;">
                    <i class="fas fa-times"></i> Cancel Order
                </button>`;
        } else if (s === 'delivered') {
            buttons += `
                <a href="shop.html" class="action-btn btn-secondary"><i class="fas fa-redo"></i> Buy Again</a>
                <button onclick="window.handleRequestReturn('${orderId}')" class="action-btn btn-return" style="cursor: pointer; background: rgba(255,165,0,0.15); border: 1px solid rgba(255,165,0,0.4); color: #ffb347;">
                    <i class="fas fa-undo"></i> Request Return
                </button>`;
        } else if (s === 'return_requested') {
            buttons += `
                <span class="action-btn" style="background: rgba(255,165,0,0.1); border: 1px solid rgba(255,165,0,0.3); color: #ffb347; cursor: default;">
                    <i class="fas fa-clock"></i> Return Pending Review
                </span>`;
        } else if (s === 'returned') {
            buttons += `
                <span class="action-btn" style="background: rgba(76,209,55,0.1); border: 1px solid rgba(76,209,55,0.3); color: #4cd137; cursor: default;">
                    <i class="fas fa-check-circle"></i> Returned & Refunded
                </span>`;
        }

        if (aiAvailable) {
            buttons += `<a href="ai-preview.html?orderId=${orderId}" class="action-btn btn-secondary ai-btn">View AI Preview</a>`;
        }

        return buttons;
    }

    // ====== 6. FILTER & SORT LOGIC ======
    function applyFiltersAndSort() {
        const filterValue = filterSelect.value;
        const sortValue = sortSelect.value;

        let filtered = [...allOrders];

        if (filterValue !== 'all') {
            if (filterValue === '30days') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filtered = filtered.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
            } else {
                filtered = filtered.filter(o => (o.status || '').toLowerCase() === filterValue);
            }
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return sortValue === 'newest' ? dateB - dateA : dateA - dateB;
        });

        renderOrders(filtered);
    }

    if (filterSelect) filterSelect.addEventListener('change', applyFiltersAndSort);
    if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);

    fetchOrders();
});
