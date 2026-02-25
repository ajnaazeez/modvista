const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const adminToken = localStorage.getItem("adminToken");

if (!adminToken) {
    window.location.href = "admin-login.html";
}

let allOrders = [];
let currentPage = 1;
let totalPages = 1;
let limit = 10;

document.addEventListener('DOMContentLoaded', () => {
    const ordersTbody = document.getElementById('ordersTbody');
    const orderModal = document.getElementById('orderModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeModalIcon = document.getElementById('closeModal');
    const successToast = document.getElementById('successToast');

    // Initial Load
    fetchOrders(1);

    // Event Delegation for Table Actions
    if (ordersTbody) {
        ordersTbody.addEventListener('click', (e) => {
            // Traverse up in case click is on icon inside button
            const target = e.target.closest('button') || e.target;

            const orderId = target.getAttribute('data-id');
            if (target.classList.contains('view-details') && orderId) {
                showOrderDetails(orderId);
            }
        });

        ordersTbody.addEventListener('change', (e) => {
            const target = e.target;
            if (target.classList.contains('status-update')) {
                const orderId = target.getAttribute('data-id');
                const newStatus = target.value;
                confirmUpdateStatus(orderId, newStatus, target);
            }
        });
    }

    // Modal Close
    const hideModal = () => {
        orderModal.classList.remove('show');
        document.body.style.overflow = '';
    };

    if (closeDetailModal) closeDetailModal.addEventListener('click', hideModal);
    if (closeModalIcon) closeModalIcon.addEventListener('click', hideModal);

    // Event Listeners for Search & Filter
    const orderSearch = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('statusFilter');
    const paymentFilter = document.getElementById('paymentFilter');

    if (orderSearch) orderSearch.addEventListener('input', handleFilters);
    if (statusFilter) statusFilter.addEventListener('change', handleFilters);
    if (paymentFilter) paymentFilter.addEventListener('change', handleFilters);

    // Close on click outside
    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) hideModal();
        });
    }
});

function handleFilters() {
    fetchOrders(1);
}

async function fetchOrders(page = 1) {
    const tbody = document.getElementById('ordersTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Loading orders...</td></tr>';

    currentPage = page;
    const orderSearch = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('statusFilter');
    const paymentFilter = document.getElementById('paymentFilter');

    let query = `?page=${page}&limit=${limit}`;
    if (orderSearch && orderSearch.value) query += `&search=${encodeURIComponent(orderSearch.value)}`;
    if (statusFilter && statusFilter.value) query += `&status=${statusFilter.value}`;
    if (paymentFilter && paymentFilter.value) query += `&paymentMethod=${paymentFilter.value}`;

    try {
        const response = await fetch(`${API_BASE}/admin/orders${query}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (response.status === 401 || response.status === 403) {
            handleAuthError();
            return;
        }

        const data = await response.json();
        if (data.success) {
            allOrders = data.data;
            totalPages = Math.ceil((data.total || 0) / limit);
            renderOrders(allOrders);
            renderPagination(data.total || 0);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error: ${data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Failed to fetch orders.</td></tr>`;
    }
}

function handleAuthError() {
    alert("Session expired or unauthorized. Redirecting to login...");
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login.html";
}

function renderPagination(total) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="pagination">
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="fetchOrders(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="fetchOrders(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="fetchOrders(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${(currentPage - 1) * limit + 1} to ${Math.min(currentPage * limit, total)} of ${total} orders
        </div>
    `;
    container.innerHTML = html;
}

function renderOrders(orders) {
    const ordersTbody = document.getElementById('ordersTbody');
    ordersTbody.innerHTML = '';

    if (orders.length === 0) {
        ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No orders found</td></tr>';
        return;
    }

    orders.forEach(order => {
        const shortId = order._id.substring(order._id.length - 6).toUpperCase();
        const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const statusLower = order.status.toLowerCase();
        // Map 'paid' to 'confirmed' for UI consistency if legacy data exists
        const displayStatus = statusLower === 'paid' ? 'confirmed' : statusLower;

        // Use user populate or shipping address name
        const userName = order.user ? order.user.name : (order.shippingAddress?.fullName || 'Guest');

        const paymentStatus = order.paymentStatus || (order.isPaid ? 'paid' : 'pending');
        // Normalize classes: status-badge status-out-for-delivery
        const displayStatusClass = displayStatus.replace(/_/g, '-');
        const paymentBadgeClass = `status-${paymentStatus.replace(/_/g, '-')}`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#MV-${shortId}</td>
            <td>${userName}</td>
            <td>${date}</td>
            <td style="font-weight: 600;">₹${order.total.toLocaleString()}</td>
            <td style="text-transform: capitalize;">${order.paymentMethod}</td>
            <td><span class="status-badge ${paymentBadgeClass}">${capitalize(paymentStatus.replace(/_/g, ' '))}</span></td>
            <td><span class="status-badge status-${displayStatusClass}">${capitalize(displayStatus.replace(/_/g, ' '))}</span></td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button class="view-details"
                        style="background:none; border:none; color: var(--accent); cursor: pointer; font-size: 0.9rem;"
                        data-id="${order._id}">View Details</button>
                    ${statusLower === 'return_requested'
                ? `<button onclick="approveReturn('${order._id}')" 
                                style="background: rgba(76,209,55,0.15); border: 1px solid rgba(76,209,55,0.4); color: #4cd137; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                <i class="fas fa-check"></i> Approve
                           </button>
                           <button onclick="rejectReturn('${order._id}')" 
                                style="background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.4); color: #e74c3c; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                <i class="fas fa-times"></i> Reject
                           </button>`
                : `<select class="form-control status-update" data-id="${order._id}"
                                style="width: 130px; height: 32px; padding: 0 8px; font-size: 0.8rem;">
                                <option value="pending" ${statusLower === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="confirmed" ${statusLower === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="shipped" ${statusLower === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="out_for_delivery" ${statusLower === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
                                <option value="delivered" ${statusLower === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${statusLower === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                <option value="returned" ${statusLower === 'returned' ? 'selected' : ''}>Returned</option>
                           </select>`
            }
                </div>
            </td>
        `;
        ordersTbody.appendChild(row);
    });
}

function capitalize(text) {
    if (!text) return '—';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

async function showOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned non-JSON response");
        }

        const data = await response.json();
        if (!data.success) return alert(data.message);

        const order = data.data;
        const shortId = order._id.substring(order._id.length - 6).toUpperCase();

        // Fill Modal Header
        document.getElementById('targetOrderId').textContent = `#MV-${shortId}`;

        // Selectors for Modal Content
        const modalBody = document.querySelector('.modal-body');
        const grid = modalBody.firstElementChild;
        const leftCol = grid.firstElementChild;
        const rightCol = grid.lastElementChild;

        // Customer Info (2nd child of left col)
        const customerInfoDiv = leftCol.children[1];

        // Product List Container (4th child of left col)
        const productListDiv = leftCol.children[3]; // <div style="display: grid; gap: 12px;">

        // Total Span (Inside 5th child of left col)
        const totalContainer = leftCol.children[4];
        const totalSpan = totalContainer ? totalContainer.querySelector('span:last-child') : null;

        // Payment Details (2nd child of right col)
        const paymentDiv = rightCol.children[1];

        // Timeline
        const timeline = rightCol.querySelector('.timeline');

        // --- Populate Data ---

        // Customer Info
        const addr = order.shippingAddress || {};
        const user = order.user || {};
        const customerName = addr.fullName || user.name || 'Guest';
        const customerPhone = addr.phone || user.phone || '—';
        const customerEmail = order.contact?.email || user.email || '—';

        if (customerInfoDiv) {
            customerInfoDiv.innerHTML = `
                <div style="background: var(--bg-dark); padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 24px;">
                    <p style="margin-bottom: 8px;"><strong>Name:</strong> ${customerName}</p>
                    <p style="margin-bottom: 8px;"><strong>Email:</strong> ${customerEmail}</p>
                    <p style="margin-bottom: 8px;"><strong>Phone:</strong> ${customerPhone}</p>
                    <p><strong>Address:</strong> ${addr.street || '—'}, ${addr.city || '—'}, ${addr.state || '—'} - ${addr.pincode || '—'}${addr.landmark ? ` (Near ${addr.landmark})` : ''}</p>
                </div>
            `;
        }

        // Product List
        if (productListDiv) {
            productListDiv.innerHTML = order.items.map(item => `
                <div style="display: flex; align-items: center; gap: 16px; background: var(--bg-dark); padding: 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 12px;">
                    <img src="${item.image || 'assets/default-product.png'}" alt="${item.name}" class="product-img" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;" onerror="this.src='assets/default-product.png'">
                    <div style="flex: 1;">
                        <p style="font-weight: 500;">${item.name}</p>
                        <p style="color: var(--text-dim); font-size: 0.85rem;">${item.quantity} × ₹${item.price.toLocaleString()}</p>
                        ${item.variant ? `<span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${item.variant}</span>` : ''}
                    </div>
                    <div style="font-weight: 600;">₹${(item.price * item.quantity).toLocaleString()}</div>
                </div>
            `).join("");
        }

        // Populate Pricing Breakdown
        const subtotalEl = document.getElementById('modalSubtotal');
        const offerDiscountEl = document.getElementById('modalOfferDiscount');
        const couponDiscountEl = document.getElementById('modalCouponDiscount');
        const couponCodeEl = document.getElementById('modalCouponCode');
        const taxEl = document.getElementById('modalTax');
        const totalEl = document.getElementById('modalTotal');

        if (subtotalEl) subtotalEl.textContent = `₹${(order.subtotal || 0).toLocaleString()}`;
        if (offerDiscountEl) offerDiscountEl.textContent = `-₹${(order.offerDiscount || 0).toLocaleString()}`;

        if (couponDiscountEl) {
            const coupDiscount = order.coupon?.discount || 0;
            couponDiscountEl.textContent = `-₹${coupDiscount.toLocaleString()}`;

            if (couponCodeEl) {
                if (order.coupon?.code) {
                    couponCodeEl.textContent = order.coupon.code;
                    couponCodeEl.style.display = 'inline-block';
                } else {
                    couponCodeEl.style.display = 'none';
                }
            }
        }

        if (taxEl) taxEl.textContent = `₹${(order.tax || 0).toLocaleString()}`;
        if (totalEl) totalEl.textContent = `₹${(order.total || 0).toLocaleString()}`;

        // Payment Details
        if (paymentDiv) {
            const pStatus = order.paymentStatus || (order.isPaid ? 'paid' : 'pending');
            const pStatusColor = pStatus === 'paid' ? 'var(--status-delivered)' :
                pStatus === 'pending' ? 'var(--status-pending)' :
                    pStatus === 'refunded_to_wallet' ? 'var(--status-shipped)' :
                        'var(--status-cancelled)';

            paymentDiv.innerHTML = `
                <p style="margin-bottom: 8px;">Method: <span style="color: var(--text-dim); text-transform: capitalize;">${order.paymentMethod}</span></p>
                <p>Status: <span style="color: ${pStatusColor}; font-weight: 600;">${capitalize(pStatus.replace(/_/g, ' '))}</span></p>
                ${order.razorpay_payment_id ? `<p style="font-size: 0.8rem; margin-top: 4px; color: var(--text-dim);">ID: ${order.razorpay_payment_id}</p>` : ''}
            `;
        }

        // Timeline (Dynamic based on status)
        const statuses = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered'];
        const currentStatusIndex = statuses.indexOf(order.status.toLowerCase() === 'paid' ? 'confirmed' : order.status.toLowerCase());

        let timelineHtml = '';
        const createdDate = new Date(order.createdAt).toLocaleString();

        // Order Placed
        timelineHtml += `
            <div class="timeline-item active">
                <div class="timeline-content">
                    <h4>Order Placed</h4>
                    <span>${createdDate}</span>
                </div>
            </div>
        `;

        // Status Flow
        if (order.status.toLowerCase() === 'cancelled') {
            timelineHtml += `
                <div class="timeline-item active">
                    <div class="timeline-content">
                        <h4 style="color: var(--status-cancelled);">Cancelled</h4>
                        <span>${new Date(order.updatedAt).toLocaleString()}</span>
                    </div>
                </div>
            `;
        } else if (order.status.toLowerCase() === 'returned') {
            timelineHtml += `
                <div class="timeline-item active">
                    <div class="timeline-content">
                        <h4 style="color: var(--status-returned);">Returned</h4>
                        <span>${new Date(order.updatedAt).toLocaleString()}</span>
                    </div>
                </div>
            `;
        } else {
            // Flow: Confirmed -> Shipped -> Out for Delivery -> Delivered
            const flow = [
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'shipped', label: 'Shipped' },
                { id: 'out_for_delivery', label: 'Out for Delivery' },
                { id: 'delivered', label: 'Delivered' }
            ];

            flow.forEach((step, index) => {
                const isActive = currentStatusIndex >= (index + 1);
                timelineHtml += `
                    <div class="timeline-item ${isActive ? 'active' : ''}">
                        <div class="timeline-content">
                            <h4>${step.label}</h4>
                            ${(isActive && step.id === order.status.toLowerCase()) ? `<span>${new Date(order.updatedAt).toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        if (timeline) {
            timeline.innerHTML = timelineHtml;
        }

        document.getElementById('orderModal').classList.add('show');
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error("Error loading order details:", error);
        alert("Failed to load order details. Check console.");
    }
}

function confirmUpdateStatus(orderId, newStatus, selectElement) {
    if (confirm(`Are you sure you want to change status to "${capitalize(newStatus)}"?`)) {
        updateOrderStatus(orderId, newStatus);
    } else {
        // Reset to previous value if known, or just re-fetch
        fetchOrders();
    }
}

async function approveReturn(orderId) {
    if (!confirm('Approve this return request? The order amount will be refunded to the user\'s wallet.')) return;
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/return/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.success) {
            showToast('Return approved and refund credited to wallet!');
            fetchOrders();
        } else {
            alert(data.message || 'Failed to approve return');
        }
    } catch (error) {
        console.error('Approve return error:', error);
        alert('An error occurred.');
    }
}

async function rejectReturn(orderId) {
    const reason = prompt('Enter a reason for rejecting this return request (optional):');
    if (reason === null) return; // User cancelled prompt
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/return/reject`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || 'Not specified' })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Return request rejected.');
            fetchOrders();
        } else {
            alert(data.message || 'Failed to reject return');
        }
    } catch (error) {
        console.error('Reject return error:', error);
        alert('An error occurred.');
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (data.success) {
            showToast("Order status updated successfully!");
            fetchOrders();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

function showToast(message) {
    const toast = document.getElementById('successToast');
    if (!toast) return;
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
