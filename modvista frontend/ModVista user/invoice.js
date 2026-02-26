document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to view invoice');
        window.location.href = 'login.html';
        return;
    }

    // 2. Get orderId from URL
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
        alert('No order ID found');
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await window.ModVistaAPI.apiCall(`/orders/${orderId}`);

        if (!response || !response.success) {
            throw new Error('Failed to load order for invoice');
        }

        populateInvoice(response.data);
    } catch (error) {
        console.error('Invoice Load Error:', error);
        alert('Failed to load invoice: ' + error.message);
    }

    function populateInvoice(data) {
        // Meta
        document.getElementById('invoice-no').textContent = 'INV-' + data._id.slice(-6).toUpperCase();
        document.getElementById('order-id').textContent = '#' + data._id;
        document.getElementById('invoice-date').textContent = new Date(data.createdAt).toLocaleDateString();

        // Customer & Address
        const addr = data.shippingAddress || {};
        const fullName = addr.fullName || 'N/A';
        const phone = addr.phone || data.contact?.phone || 'N/A';
        const email = data.contact?.email || 'N/A';

        // Billing
        document.getElementById('billing-name').textContent = fullName;
        document.getElementById('billing-phone').textContent = phone;
        document.getElementById('billing-email').textContent = email;
        document.getElementById('billing-address').textContent = addr.street || '';
        document.getElementById('billing-city').textContent = `${addr.city || ''}, ${addr.state || ''} ${addr.pincode || ''}`;

        // Shipping
        document.getElementById('shipping-name').textContent = fullName;
        document.getElementById('shipping-address').textContent = addr.street || '';
        document.getElementById('shipping-city').textContent = `${addr.city || ''}, ${addr.state || ''} ${addr.pincode || ''}`;

        // Items
        const tbody = document.getElementById('items-body');
        tbody.innerHTML = '';
        data.items.forEach(item => {
            const product = item.product || {};
            const name = item.name || product.name || 'Product';

            // Image handling
            let imgUrl = 'assets/default-product.png';
            if (item.image) {
                if (item.image.startsWith('http')) imgUrl = item.image;
                else if (item.image.startsWith('uploads/') || item.image.startsWith('src/')) {
                    imgUrl = `http://localhost:5000/${item.image}`;
                } else imgUrl = item.image;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Product">
                    <div class="product-info">
                        <img src="${imgUrl}" alt="" class="item-thumb">
                        <span>${name}</span>
                    </div>
                </td>
                <td data-label="Category">${product.category?.name || 'Modification'}</td>
                <td data-label="Variant">${item.variant || 'Standard'}</td>
                <td data-label="Qty">${item.quantity}</td>
                <td data-label="Price">₹${(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td data-label="Total">₹${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(tr);
        });

        // Payment Info
        const paymentMap = {
            'cod': 'Cash on Delivery',
            'razorpay': 'Razorpay (Online)',
            'wallet': 'Wallet Payment',
            'mock_razorpay': 'Razorpay (Mock)',
            'mock_wallet': 'Wallet (Mock)'
        };
        document.getElementById('payment-method').textContent = paymentMap[data.paymentMethod] || data.paymentMethod;

        const statusBadge = document.getElementById('payment-status');
        const isPaid = data.isPaid || data.paymentStatus === 'paid';
        statusBadge.textContent = isPaid ? 'Paid' : 'Pending';
        statusBadge.className = `status-badge ${isPaid ? 'paid' : 'unpaid'}`;

        // Map transaction ID from various possible fields
        const txId = data.razorpay_payment_id || data.paymentResult?.id || 'N/A';
        document.getElementById('transaction-id').textContent = txId;

        document.getElementById('order-status').textContent = data.status.replace(/_/g, ' ').toUpperCase();

        // Dates
        document.getElementById('invoice-date').textContent = new Date(data.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        const deliveryDate = new Date(data.createdAt);
        deliveryDate.setDate(deliveryDate.getDate() + 7);
        document.getElementById('delivery-date').textContent = deliveryDate.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        // Totals
        const subtotal = data.subtotal || 0;
        const tax = data.tax || 0;
        const total = data.total || 0;
        const couponDisc = data.coupon?.discount || 0;
        const offerDisc = data.offerDiscount || 0;
        const totalDiscount = couponDisc + offerDisc;
        const shipping = data.shipping || 0;

        document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('discount').textContent = `-₹${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('total').textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        // Coupon Logic
        const couponRow = document.querySelector('.summary-row.coupon');
        if (data.coupon?.code) {
            couponRow.style.display = 'flex';
            couponRow.querySelector('span:first-child').textContent = `Coupon (${data.coupon.code.toUpperCase()})`;
        } else {
            couponRow.style.display = 'none';
        }

        // Shipping logic
        const shippingEl = document.getElementById('shipping-cost');
        if (shipping > 0) {
            shippingEl.textContent = `₹${shipping.toFixed(2)}`;
            shippingEl.classList.remove('free');
        } else {
            shippingEl.textContent = 'Free';
            shippingEl.classList.add('free');
        }

        // Wallet deduction (if total payment was not full amount in items, subtract)
        // Check if wallet was used as payment method or partial
        const walletUsedEl = document.getElementById('wallet-used');
        if (data.paymentMethod === 'wallet' || data.paymentMethod === 'mock_wallet') {
            walletUsedEl.textContent = `-₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        } else {
            walletUsedEl.textContent = '-₹0.00';
        }
    }
});

function downloadInvoice() {
    // Basic simulation: alert user and use print as a fallback for "Save as PDF"
    alert('Generating PDF... Please use "Save as PDF" in the print dialog for a high-quality invoice.');
    window.print();
}
