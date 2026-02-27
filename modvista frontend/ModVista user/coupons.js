/**
 * ModVista - User Coupons Script
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchCoupons();
});

async function fetchCoupons() {
    const container = document.getElementById('coupons-container');
    const emptyState = document.getElementById('coupons-empty');

    if (!container) return;

    try {
        const res = await fetch(`${window.ModVistaAPI.API_BASE}/coupons`);
        const data = await res.json();

        if (data.success) {
            const coupons = data.data || [];

            if (coupons.length === 0) {
                container.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            container.innerHTML = coupons.map(coupon => renderCouponCard(coupon)).join('');
            attachCopyListeners();
        } else {
            throw new Error(data.message || 'Failed to fetch coupons');
        }
    } catch (err) {
        console.error('Error fetching coupons:', err);
        container.innerHTML = `<p class="error-text">Unable to load coupons. Please try again later.</p>`;
    }
}

function renderCouponCard(coupon) {
    const { code, type, value, minOrderAmount, endDate, isExpired } = coupon;

    const discountText = type === 'FLAT'
        ? `₹${value.toLocaleString()} OFF`
        : `${value}% OFF`;

    const formattedExpiry = endDate
        ? new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Never';

    return `
        <div class="coupon-card ${isExpired ? 'expired' : ''}">
            <div class="coupon-header">
                <span class="coupon-badge">${discountText}</span>
                ${isExpired ? '<span class="status-badge error">Expired</span>' : ''}
            </div>
            
            <div class="coupon-code-wrap">
                <span class="coupon-code">${code}</span>
                <button class="copy-btn" data-code="${code}" title="Copy Code">
                    <i class="far fa-copy"></i>
                </button>
            </div>
            
            <div class="coupon-detail">
                Min. Order: <strong>₹${(minOrderAmount || 0).toLocaleString()}</strong>
            </div>
            
            <div class="coupon-expiry">
                Expires: ${formattedExpiry}
            </div>
        </div>
    `;
}

function attachCopyListeners() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.code;
            navigator.clipboard.writeText(code).then(() => {
                const icon = btn.querySelector('i');
                icon.className = 'fas fa-check';
                icon.style.color = '#00d26a';

                setTimeout(() => {
                    icon.className = 'far fa-copy';
                    icon.style.color = '';
                }, 2000);
            });
        });
    });
}
