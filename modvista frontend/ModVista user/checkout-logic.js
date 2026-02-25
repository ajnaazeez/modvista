/* ========================================
   MODVISTA CHECKOUT LOGIC
   Coupon + Wallet Integration
   ======================================== */

// Mock Data (In real app, this comes from backend/localStorage)
let CART_SUBTOTAL = 15000; // Example cart total
let WALLET_BALANCE = 5000;  // Example wallet balance
let USE_WALLET = true;      // Wallet toggle state

// Checkout State
let checkoutState = {
    subtotal: CART_SUBTOTAL,
    appliedCoupon: null,
    walletBalance: WALLET_BALANCE,
    useWallet: USE_WALLET,
    couponDiscount: 0,
    walletUsed: 0,
    finalPayable: 0,
    totalSavings: 0
};

/* ========================================
   CORE CALCULATION FUNCTION
   ======================================== */

function calculateCheckout() {
    const { subtotal, appliedCoupon, walletBalance, useWallet } = checkoutState;

    // STEP 1: Apply Coupon Discount (if any)
    let couponDiscount = 0;
    if (appliedCoupon) {
        couponDiscount = calculateCouponDiscount(subtotal, appliedCoupon);
    }

    // Amount after coupon
    let afterCoupon = subtotal - couponDiscount;

    // STEP 2: Apply Wallet (if enabled and amount > 0)
    let walletUsed = 0;
    if (useWallet && afterCoupon > 0) {
        walletUsed = Math.min(walletBalance, afterCoupon);
    }

    // STEP 3: Calculate Final Payable
    let finalPayable = Math.max(0, afterCoupon - walletUsed);

    // Update state
    checkoutState.couponDiscount = couponDiscount;
    checkoutState.walletUsed = walletUsed;
    checkoutState.finalPayable = finalPayable;
    checkoutState.totalSavings = couponDiscount + walletUsed;

    return checkoutState;
}

/* ========================================
   COUPON DISCOUNT CALCULATION
   ======================================== */

function calculateCouponDiscount(subtotal, coupon) {
    if (!coupon) return 0;

    // Validate minimum order
    if (subtotal < coupon.minOrder) {
        return 0;
    }

    // Calculate discount based on type
    if (coupon.type === 'flat') {
        return Math.min(coupon.discountValue, subtotal);
    } else if (coupon.type === 'percentage') {
        const percentDiscount = (subtotal * coupon.discountValue) / 100;
        return Math.min(percentDiscount, coupon.maxCap || Infinity, subtotal);
    }

    return 0;
}

/* ========================================
   COUPON REMOVAL WITH WALLET RECALCULATION
   ======================================== */

function removeCoupon() {
    // Prevent multiple rapid clicks
    if (checkoutState.isRecalculating) return;
    checkoutState.isRecalculating = true;

    // Store previous values for animation
    const previousCouponDiscount = checkoutState.couponDiscount;
    const previousWalletUsed = checkoutState.walletUsed;
    const previousPayable = checkoutState.finalPayable;

    // STEP 1: Remove coupon
    checkoutState.appliedCoupon = null;
    localStorage.removeItem('appliedCoupon');

    // STEP 2: Recalculate with wallet
    const newState = calculateCheckout();

    // STEP 3: Update UI with animation
    animateRecalculation(
        previousCouponDiscount,
        previousWalletUsed,
        previousPayable,
        newState
    );

    // STEP 4: Update UI state
    updateCheckoutUI(newState);

    // Show toast notification
    showToast('Coupon removed. Wallet recalculated.', 'normal');

    // Unlock after animation
    setTimeout(() => {
        checkoutState.isRecalculating = false;
    }, 600);
}

/* ========================================
   WALLET TOGGLE
   ======================================== */

function toggleWallet(enabled) {
    checkoutState.useWallet = enabled;
    const newState = calculateCheckout();
    updateCheckoutUI(newState);
}

/* ========================================
   UI UPDATE FUNCTION
   ======================================== */

function updateCheckoutUI(state) {
    // Update order summary
    updateOrderSummary(state);

    // Update payment method visibility
    updatePaymentMethods(state);

    // Update CTA button
    updateCTAButton(state);

    // Update wallet toggle state
    updateWalletToggle(state);
}

function updateOrderSummary(state) {
    const summaryEl = document.getElementById('order-summary');
    if (!summaryEl) return;

    const { subtotal, couponDiscount, walletUsed, finalPayable, totalSavings } = state;

    let summaryHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toLocaleString()}</span>
        </div>
    `;

    // Show coupon discount if applied
    if (couponDiscount > 0) {
        summaryHTML += `
        <div class="summary-row discount highlight-update">
            <span>Coupon Discount</span>
            <span class="discount-text">-₹${couponDiscount.toLocaleString()}</span>
        </div>
        `;
    }

    // Show wallet used if applied
    if (walletUsed > 0) {
        summaryHTML += `
        <div class="summary-row wallet highlight-update">
            <span>Wallet Applied</span>
            <span class="wallet-text">-₹${walletUsed.toLocaleString()}</span>
        </div>
        `;
    }

    // Show total savings if any
    if (totalSavings > 0) {
        summaryHTML += `
        <div class="summary-row savings">
            <span><i class="fas fa-star"></i> Total Savings</span>
            <span class="savings-text">₹${totalSavings.toLocaleString()}</span>
        </div>
        `;
    }

    summaryHTML += `
        <div class="summary-row total">
            <span>Final Payable Amount</span>
            <span class="final-amount">₹${finalPayable.toLocaleString()}</span>
        </div>
    `;

    summaryEl.innerHTML = summaryHTML;

    // Trigger highlight animation
    setTimeout(() => {
        document.querySelectorAll('.highlight-update').forEach(el => {
            el.classList.add('updated');
        });
    }, 50);
}

function updatePaymentMethods(state) {
    const razorpayOption = document.getElementById('razorpay-option');
    const codOption = document.getElementById('cod-option');

    if (state.finalPayable === 0) {
        // Hide payment methods when order is free
        if (razorpayOption) razorpayOption.style.display = 'none';
        if (codOption) codOption.style.display = 'none';
    } else {
        // Show payment methods
        if (razorpayOption) razorpayOption.style.display = 'block';
        if (codOption) codOption.style.display = 'block';
    }
}

function updateCTAButton(state) {
    const ctaBtn = document.getElementById('checkout-cta-btn');
    if (!ctaBtn) return;

    if (state.finalPayable === 0) {
        ctaBtn.textContent = 'Place Order';
        ctaBtn.classList.add('free-order');
    } else {
        ctaBtn.textContent = `Pay ₹${state.finalPayable.toLocaleString()}`;
        ctaBtn.classList.remove('free-order');
    }
}

function updateWalletToggle(state) {
    const walletToggle = document.getElementById('wallet-toggle');
    const walletSection = document.getElementById('wallet-section');

    if (!walletToggle || !walletSection) return;

    // Disable wallet if coupon covers full amount
    if (state.subtotal - state.couponDiscount <= 0) {
        walletToggle.disabled = true;
        walletToggle.checked = false;
        walletSection.classList.add('disabled');
        walletSection.setAttribute('title', 'Coupon covers full amount');
    } else {
        walletToggle.disabled = false;
        walletSection.classList.remove('disabled');
        walletSection.removeAttribute('title');
    }
}

/* ========================================
   ANIMATION HELPER
   ======================================== */

function animateRecalculation(prevCoupon, prevWallet, prevPayable, newState) {
    // Add smooth transition class to summary
    const summaryEl = document.getElementById('order-summary');
    if (summaryEl) {
        summaryEl.classList.add('recalculating');
        setTimeout(() => {
            summaryEl.classList.remove('recalculating');
        }, 600);
    }
}

/* ========================================
   TOAST NOTIFICATION
   ======================================== */

function showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = 'cart-toast show';

    const iconClass = type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Load applied coupon from localStorage
    const storedCoupon = localStorage.getItem('appliedCoupon');
    if (storedCoupon) {
        checkoutState.appliedCoupon = JSON.parse(storedCoupon);
    }

    // Initial calculation
    const initialState = calculateCheckout();
    updateCheckoutUI(initialState);

    // Attach event listeners
    const removeCouponBtn = document.getElementById('remove-coupon-btn');
    if (removeCouponBtn) {
        removeCouponBtn.addEventListener('click', removeCoupon);
    }

    const walletToggle = document.getElementById('wallet-toggle');
    if (walletToggle) {
        walletToggle.addEventListener('change', (e) => {
            toggleWallet(e.target.checked);
        });
    }
});

/* ========================================
   GLOBAL EXPORTS
   ======================================== */

window.removeCoupon = removeCoupon;
window.toggleWallet = toggleWallet;
window.calculateCheckout = calculateCheckout;
