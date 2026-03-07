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
    const { code, discountType, discountValue, minOrderAmount, minProductPrice, endDate, isExpired, usedByUser } = coupon;

    const discountText = discountType === 'FLAT'
        ? `₹${discountValue.toLocaleString()} OFF`
        : `${discountValue}% OFF`;

    const formattedExpiry = endDate
        ? new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Never';

    let minOrderHtml = '';
    if (minOrderAmount > 0) {
        minOrderHtml += `<div class="coupon-detail">Min. Order: <strong>₹${minOrderAmount.toLocaleString()}</strong></div>`;
    }
    if (minProductPrice > 0) {
        minOrderHtml += `<div class="coupon-detail">Min. Item: <strong>₹${minProductPrice.toLocaleString()}</strong></div>`;
    }

    if (!minOrderHtml) {
        minOrderHtml = `<div class="coupon-detail" style="color: #6c757d; font-style: italic;">No minimum requirement</div>`;
    }

    // Status badges
    let statusBadge = '';
    if (usedByUser) {
        statusBadge = '<span class="status-badge success">Already Used</span>';
    } else if (isExpired) {
        statusBadge = '<span class="status-badge error">Expired</span>';
    }

    return `
        <div class="coupon-card ${isExpired || usedByUser ? 'expired' : ''}">
            <div class="coupon-header">
                <span class="coupon-badge">${discountText}</span>
                ${statusBadge}
            </div>
            
            <div class="coupon-code-wrap">
                <span class="coupon-code ${usedByUser ? 'strikethrough' : ''}">${code}</span>
                ${usedByUser ? '' : `
                <button class="copy-btn" data-code="${code}" title="Copy Code">
                    <i class="far fa-copy"></i>
                </button>
                `}
            </div>
            
            ${minOrderHtml}
            
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
