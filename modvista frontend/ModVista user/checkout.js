document.addEventListener('DOMContentLoaded', async () => {
    const { apiCall, requireLogin, API_BASE } = window.ModVistaAPI;

    // One-time localStorage cleanup (remove old cart data)
    // Uncomment these lines to clear localStorage cart data if needed:
    // localStorage.removeItem("modvista_cart");
    // localStorage.removeItem("modvista_applied_discount");

    // 1. Auth Guard
    if (!requireLogin('checkout.html')) return;

    // Elements
    const addressList = document.getElementById('address-list');
    const showFormBtn = document.getElementById('show-address-form');
    const addressFormContainer = document.getElementById('new-address-form');
    const addressForm = document.getElementById('address-form');
    const cancelAddressBtn = document.getElementById('cancel-address');
    const summaryItemsList = document.getElementById('summary-items');
    const payBtn = document.getElementById('pay-btn');
    const applyCouponBtn = document.getElementById('apply-coupon');
    const couponInput = document.getElementById('coupon-code');
    const couponMessage = document.getElementById('coupon-message');

    // State
    let addresses = [];
    let selectedAddressId = null;
    let appliedDiscount = 0;
    let subtotalAmount = 0;
    // cartItems is declared below in the sample data section


    // --- Load User Profile ---

    async function loadMe() {
        try {
            const res = await apiCall('/users/me');
            if (res && res.success && res.user) {
                document.getElementById('contact-email').value = res.user.email || '';
                document.getElementById('contact-phone').value = res.user.phone || '';
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    // --- Address Functions ---

    async function loadAddresses() {
        try {
            const res = await apiCall('/addresses');
            if (res && res.data) {
                addresses = res.data;
                const defaultAddr = addresses.find(a => a.isDefault);
                if (defaultAddr) {
                    selectedAddressId = defaultAddr._id;
                } else if (addresses.length > 0) {
                    selectedAddressId = addresses[0]._id;
                }
                renderAddresses();
            }
        } catch (error) {
            console.error(error);
            addressList.innerHTML = '<p class="error">Failed to load addresses.</p>';
        }
    }

    function renderAddresses() {
        addressList.innerHTML = '';
        if (addresses.length === 0) {
            addressList.innerHTML = '<p>No addresses found. Please add one.</p>';
            updatePayButtonStatus();
            return;
        }

        addresses.forEach(addr => {
            const isSelected = addr._id === selectedAddressId;
            const card = document.createElement('div');
            card.className = `address-card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `
                <input type="radio" name="address" value="${addr._id}" ${isSelected ? 'checked' : ''}>
                <span class="name">${addr.fullName} ${addr.isDefault ? '<small>(Default)</small>' : ''}</span>
                <span class="phone">${addr.phone}</span>
                <span class="full-address">${addr.house || ''} ${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}</span>
            `;

            card.addEventListener('click', () => selectAddress(addr._id));
            addressList.appendChild(card);
        });

        updatePayButtonStatus();
    }

    async function selectAddress(id) {
        selectedAddressId = id;
        renderAddresses();
    }

    async function saveNewAddress(e) {
        e.preventDefault();

        const formData = {
            fullName: document.getElementById('addr-name').value,
            phone: document.getElementById('addr-phone').value,
            house: "N/A",
            street: document.getElementById('addr-street').value,
            city: document.getElementById('addr-city').value,
            state: document.getElementById('addr-state').value,
            pincode: document.getElementById('addr-pincode').value,
            isDefault: addresses.length === 0
        };

        try {
            const res = await apiCall('/addresses', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (res && res.success) {
                addressForm.reset();
                addressFormContainer.classList.remove('open');
                showFormBtn.style.display = 'flex';
                await loadAddresses();
            }
        } catch (error) {
            alert(error.message);
        }
    }

    // --- Order Summary & Coupons ---

    // --- State Management ---
    let appliedCoupon = null;
    let availableCoupons = [];
    let cartSummary = null;
    let cartItems = [];

    // --- Core Logic ---

    async function loadCartSummary() {
        try {
            const res = await apiCall('/cart');
            if (res && res.success) {
                cartItems = res.orderItems || [];
                cartSummary = res.summary;
                appliedCoupon = res.appliedCoupon || null;

                renderOrderSummary(cartItems, cartSummary);
                await fetchAndRenderCoupons();
            }
        } catch (error) {
            console.error('Error loading cart summary:', error);
        }
    }

    async function fetchAndRenderCoupons() {
        try {
            const res = await apiCall('/coupons');
            if (res && res.success) {
                availableCoupons = res.data || [];
                renderEligibleCoupons();
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    }

    function getCouponEligibility(coupon, currentSubtotal, items = []) {
        if (!coupon.isActive) return { eligible: false, reason: 'Inactive' };

        const now = new Date();
        const start = new Date(coupon.startDate);
        const end = new Date(coupon.endDate);

        if (now < start) return { eligible: false, reason: `Starts on ${start.toLocaleDateString()}` };
        if (now > end) return { eligible: false, reason: 'Expired' };

        // Check Min Product Price
        const hasQualifyingProduct = (items || []).some(item => {
            const itemPrice = item.basePrice || item.price || 0;
            return itemPrice >= (coupon.minProductPrice || 0);
        });
        if (!hasQualifyingProduct) {
            return { eligible: false, reason: `Min. Product Price ₹${(coupon.minProductPrice || 0).toLocaleString()} required` };
        }

        // Check Min Order Amount
        if (currentSubtotal < (coupon.minOrderAmount || 0)) {
            return { eligible: false, reason: `Min. Order ₹${(coupon.minOrderAmount || 0).toLocaleString()} required` };
        }

        return { eligible: true };
    }

    function renderEligibleCoupons() {
        const listContainer = document.getElementById('eligible-coupons-list');
        // Check eligibility against discountedSubtotal (after offers)
        const checkAmount = cartSummary ? cartSummary.discountedSubtotal : 0;

        listContainer.innerHTML = '';
        const items = cartItems || [];

        if (availableCoupons.length === 0) {
            listContainer.innerHTML = '<p style="color: #888; font-size: 0.9rem;">No coupons found at the moment.</p>';
            return;
        }

        availableCoupons.forEach(coupon => {
            const { eligible, reason } = getCouponEligibility(coupon, checkAmount, items);
            const isApplied = appliedCoupon && appliedCoupon.code === coupon.code;

            // If a coupon was applied but is no longer eligible, auto-remove it silently
            if (isApplied && !eligible) {
                removeCoupon();
                return;
            }

            const card = document.createElement('div');
            card.className = `eligible-coupon-card ${!eligible ? 'ineligible' : ''} ${isApplied ? 'applied-card' : ''}`;

            const discountText = coupon.discountType === 'PERCENT'
                ? `${coupon.discountValue}% OFF`
                : `₹${coupon.discountValue} OFF`;

            const metaLine = !eligible
                ? `<br><span class="ineligible-reason" style="color: #ff6b6b; font-size: 11px;">${reason}</span>`
                : ` • Min. Item ₹${(coupon.minProductPrice || 0).toLocaleString()}`;

            card.innerHTML = `
                <div class="eligible-coupon-left">
                    <div class="eligible-coupon-code">${coupon.code}</div>
                    <div class="eligible-coupon-meta">
                        ${discountText}${metaLine}
                    </div>
                </div>
                <button class="apply-btn ${isApplied ? 'applied' : ''}" 
                        ${!eligible ? 'disabled' : ''} 
                        onclick="handleCouponAction('${coupon.code}')"
                        style="${!eligible ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    ${isApplied ? 'Applied' : 'Apply'}
                </button>
            `;
            listContainer.appendChild(card);
        });

        // Update info display
        const infoMsg = document.getElementById('applied-coupon-info');
        const displayDiscount = cartSummary ? cartSummary.couponDiscount : 0;

        if (appliedCoupon && displayDiscount > 0) {
            infoMsg.style.display = 'block';
            document.getElementById('applied-coupon-tag').textContent = appliedCoupon.code || 'COUPON';
            document.getElementById('applied-coupon-msg').textContent = `₹${displayDiscount.toFixed(2)} Discount Applied`;
        } else {
            infoMsg.style.display = 'none';
        }
    }


    window.handleCouponAction = async (code) => {
        if (appliedCoupon && appliedCoupon.code === code) return;

        try {
            const res = await apiCall('/coupons/apply', {
                method: 'POST',
                body: JSON.stringify({ code })
            });

            if (res && res.success) {
                await loadCartSummary();
            } else {
                alert(res.message || "Failed to apply coupon");
            }
        } catch (error) {
            alert(error.message);
        }
    };

    async function removeCoupon() {
        try {
            const res = await apiCall('/cart/coupon/remove', { method: 'POST' });
            if (res && res.success) {
                await loadCartSummary();
            }
        } catch (error) {
            console.error('Remove coupon failed:', error);
        }
    }

    function renderOrderSummary(items, summary = {}) {
        const summaryItemsList = document.getElementById('summary-items');
        summaryItemsList.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'summary-item';
            const fallbackImg = 'assets/default-product.png';
            let img = item.image || fallbackImg;
            if (img && img.startsWith('uploads/')) img = `http://localhost:5000/${img}`;

            itemElement.innerHTML = `
                <img src="${img}" alt="${item.name}" onerror="this.onerror=null;this.src='${fallbackImg}'" style="width: 50px; height: 50px; border-radius: 4px; object-fit: cover;">
                <div class="summary-item-info">
                    <h4 style="color: white; font-size: 0.9rem;">${item.name}</h4>
                    <p style="color: #aaa; font-size: 0.8rem;">Qty: ${item.quantity}</p>
                </div>
                <div class="summary-item-price" style="color: white;">₹${(item.itemFinalTotal || item.basePrice * item.quantity).toFixed(2)}</div>
            `;
            summaryItemsList.appendChild(itemElement);
        });

        document.getElementById('summary-subtotal').textContent = `₹${(summary.subtotal || 0).toFixed(2)}`;

        const shippingEl = document.getElementById('summary-shipping');
        if (summary.shipping > 0) {
            shippingEl.textContent = `₹${summary.shipping.toFixed(2)}`;
            shippingEl.style.color = 'white';
        } else {
            shippingEl.textContent = 'FREE';
            shippingEl.style.color = '#4cd137';
        }

        document.getElementById('summary-total').textContent = `₹${(summary.total || 0).toFixed(2)}`;

        const offerRow = document.getElementById('offer-discount-row');
        if (summary.offerDiscountTotal > 0) {
            offerRow.style.display = 'flex';
            document.getElementById('summary-offer-discount').textContent = `-₹${summary.offerDiscountTotal.toFixed(2)}`;
        } else {
            offerRow.style.display = 'none';
        }

        const discRow = document.getElementById('discount-row');
        if (summary.couponDiscount > 0) {
            discRow.style.display = 'flex';
            document.getElementById('summary-discount').textContent = `-₹${summary.couponDiscount.toFixed(2)}`;
        } else {
            discRow.style.display = 'none';
        }

        updatePayButtonStatus(summary.total);
    }

    function updatePayButtonStatus(totalAmount) {
        const total = totalAmount !== undefined ? totalAmount : (cartSummary ? cartSummary.total : 0);
        const payBtn = document.getElementById('pay-btn'); // Ensure fresh reference
        if (!payBtn) return;

        if (selectedAddressId && total > 0) {
            payBtn.disabled = false;
            payBtn.textContent = `Pay ₹${total.toFixed(2)}`;
            payBtn.style.background = 'var(--neon-red)';
        } else {
            payBtn.disabled = true;
            payBtn.textContent = selectedAddressId ? 'Your Cart is Empty' : 'Select Address to Proceed';
            payBtn.style.background = '#444';
        }
    }



    // --- Order Placement ---

    async function placeOrder() {
        if (!selectedAddressId) return;

        payBtn.disabled = true;
        payBtn.textContent = 'Processing...';

        const codeInput = document.getElementById('coupon-code');
        const couponCode = codeInput ? codeInput.value : '';

        const payload = {
            addressId: selectedAddressId,
            couponCode: couponCode,
            contactPhone: document.getElementById('contact-phone').value
        };

        try {
            const res = await apiCall('/checkout', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                localStorage.setItem('orderId', res.orderId);
                localStorage.removeItem('appliedCoupon');
                window.location.href = 'payment.html';
            }
        } catch (error) {
            alert(error.message);
            payBtn.disabled = false;
            payBtn.textContent = 'Pay Now';
        }
    }

    if (payBtn) {
        payBtn.addEventListener('click', placeOrder);
    }
    const removeCpBtn = document.getElementById('remove-coupon-btn');
    if (removeCpBtn) {
        removeCpBtn.addEventListener('click', removeCoupon);
    }


    // Initialize
    loadMe();
    loadAddresses();
    loadCartSummary();
});
