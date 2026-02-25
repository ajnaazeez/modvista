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
        const phone = addr.phone || 'N/A';
        const email = data.contact?.email || 'N/A'; // Assuming contact was saved
        const fullAddr = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`;

        // Billing
        document.getElementById('billing-name').textContent = fullName;
        document.getElementById('billing-phone').textContent = phone;
        document.getElementById('billing-email').textContent = email;
        document.getElementById('billing-address').textContent = addr.street || '';
        document.getElementById('billing-city').textContent = `${addr.city || ''}, ${addr.state || ''} ${addr.pincode || ''}`;

        // Shipping (Same as Billing for MVP)
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
                else if (item.image.startsWith('uploads/')) imgUrl = `http://localhost:5000/${item.image}`;
                else imgUrl = item.image;
            } else if (product.image) {
                imgUrl = product.image; // Assume full path or handle similarly
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Product">
                    <div class="product-info">
                        <img src="${imgUrl}" alt="" class="item-thumb">
                        <span>${name}</span>
                    </div>
                </td>
                <td data-label="Category">${product.category || 'Modification'}</td>
                <td data-label="Variant">${item.variant || 'Standard'}</td>
                <td data-label="Qty">${item.quantity}</td>
                <td data-label="Price">₹${(item.price || 0).toFixed(2)}</td>
                <td data-label="Total">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Payment Info
        const paymentMap = {
            'cod': 'Cash on Delivery',
            'razorpay': 'Razorpay',
            'mock_razorpay': 'Razorpay (MOCK)',
            'mock_wallet': 'Wallet (MOCK)'
        };
        document.getElementById('payment-method').textContent = paymentMap[data.paymentMethod] || data.paymentMethod;

        const statusBadge = document.getElementById('payment-status');
        // Backend statuses: 'pending', 'paid'
        const isPaid = data.isPaid;
        statusBadge.textContent = isPaid ? 'Paid' : 'Pending';
        statusBadge.className = `status-badge ${isPaid ? 'paid' : 'unpaid'}`;

        document.getElementById('transaction-id').textContent = data.paymentResult?.id || 'N/A';
        document.getElementById('order-status').textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);

        // Dates
        const deliveryDate = new Date(data.createdAt);
        deliveryDate.setDate(deliveryDate.getDate() + 5);
        document.getElementById('delivery-date').textContent = deliveryDate.toLocaleDateString();

        // Totals
        const subtotal = data.subtotal || 0;
        const tax = data.tax || 0;
        const total = data.total || 0;
        const discount = data.discount || 0;

        document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('discount').textContent = `-₹${discount.toFixed(2)}`;
        document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `₹${total.toFixed(2)}`;

        // Hide coupon if 0
        const couponRow = document.querySelector('.summary-row.coupon');
        if (discount > 0) {
            couponRow.style.display = 'flex';
            couponRow.querySelector('span:last-child').textContent = 'Applied';
        } else {
            couponRow.style.display = 'none';
        }

        // Wallet (not fully tracked in order model separate from payment method yet, but if method is mock_wallet, total paid via wallet)
        // For now, leave wallet-used as 0 or implement specific logic if needed. 
        // Based on previous files, wallet usage wasn't explicitly stored as a separate 'walletUsed' amount in Order model top-level, 
        // but implied by payment method or split. Assuming 0 for now unless paymentMethod is wallet.
        document.getElementById('wallet-used').textContent = '-₹0.00';
    }
});

function downloadInvoice() {
    // Basic simulation: alert user and use print as a fallback for "Save as PDF"
    alert('Generating PDF... Please use "Save as PDF" in the print dialog for a high-quality invoice.');
    window.print();
}
