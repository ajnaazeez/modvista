
const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";
const token = localStorage.getItem("adminToken");

if (!token) {
    window.location.href = "admin-login.html";
}

let editCouponId = null;
let allCoupons = [];
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    // Modals
    const createNewBtn = document.getElementById('createNewBtn');
    const couponModal = document.getElementById('couponModal');
    const couponSearch = document.getElementById('couponSearch');

    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            resetCouponForm();
            couponModal.classList.add('show');
        });
    }

    document.querySelectorAll('.close-modal, #cancelCoupon').forEach(btn => {
        btn.addEventListener('click', () => {
            couponModal.classList.remove('show');
        });
    });

    // Search handling
    let searchTimeout;
    if (couponSearch) {
        couponSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                fetchCoupons(e.target.value);
            }, 500);
        });
    }

    // Initial load
    fetchCoupons();

    // Form submissions (Handled by createCouponSimple now)
    // document.getElementById('couponForm').addEventListener('submit', handleCouponSubmit);

    // Event delegation for dynamic rows
    document.getElementById('couponsTbody').addEventListener('click', handleCouponActions);
});

async function fetchCoupons(search = '') {
    try {
        const url = new URL(`${API_BASE}/admin/coupons`);
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', 10);
        if (search) url.searchParams.append('search', search);

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            allCoupons = data.data;
            totalPages = Math.ceil((data.total || 0) / 10);
            renderCoupons();
            renderPagination(data.total || 0);
        } else if (res.status === 401 || res.status === 403) {
            handleAuthError();
        }
    } catch (err) {
        console.error('Error fetching coupons:', err);
    }
}

function renderCoupons() {
    const tbody = document.getElementById('couponsTbody');
    if (allCoupons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-dim);">No coupons found. Click "Create Coupon" to add one.</td></tr>`;
        return;
    }

    tbody.innerHTML = allCoupons.map(coupon => {
        const startDate = new Date(coupon.startDate).toLocaleDateString();
        const endDate = new Date(coupon.endDate).toLocaleDateString();
        const validity = `${startDate} - ${endDate}`;

        return `
            <tr>
                <td style="font-weight: 700; color: var(--accent);">${coupon.code}</td>
                <td style="font-weight: 600;">₹${coupon.discountValue}</td>
                <td>₹${coupon.minProductPrice || 0}</td>
                <td style="font-size: 0.85rem;">${validity}</td>
                <td><span class="status-badge status-${coupon.isActive ? 'active' : 'disabled'}">${coupon.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <i class="fas fa-pencil-alt edit-coupon" data-id="${coupon._id}" style="cursor: pointer; color: var(--text-dim);" title="Edit"></i>
                        <label class="switch">
                            <input type="checkbox" class="toggle-coupon" data-id="${coupon._id}" ${coupon.isActive ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <i class="fas fa-trash-alt delete-coupon" data-id="${coupon._id}" style="cursor: pointer; color: var(--status-cancelled);" title="Delete"></i>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="currentPage--; fetchCoupons(document.getElementById('couponSearch')?.value || '')">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="currentPage=${i}; fetchCoupons(document.getElementById('couponSearch')?.value || '')">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="currentPage++; fetchCoupons(document.getElementById('couponSearch')?.value || '')">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${(currentPage - 1) * 10 + 1} to ${Math.min(currentPage * 10, total)} of ${total} coupons
        </div>
    `;
    container.innerHTML = html;
}

async function handleCouponSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {};
    formData.forEach((value, key) => {
        if (value === '' && (key === 'usageLimit' || key === 'maxDiscount')) {
            payload[key] = null;
        } else {
            payload[key] = value;
        }
    });

    // Basic frontend conversion for numeric fields
    const numericFields = ['discountValue', 'minOrderAmount', 'minProductPrice', 'maxDiscount', 'usageLimit'];
    numericFields.forEach(field => {
        if (payload[field] !== undefined && payload[field] !== null) {
            payload[field] = Number(payload[field]);
        }
    });

    const url = editCouponId ? `${API_BASE}/admin/coupons/${editCouponId}` : `${API_BASE}/admin/coupons`;
    const method = editCouponId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showToast(`Coupon ${editCouponId ? 'updated' : 'created'} successfully!`);
            document.getElementById('couponModal').classList.remove('show');
            fetchCoupons(document.getElementById('couponSearch')?.value || '');
        } else {
            alert(data.errors || data.message || "Validation Error");
        }
    } catch (err) {
        console.error('Error saving coupon:', err);
        alert("Server communication error");
    }
}

async function handleCouponActions(e) {
    const target = e.target;
    const id = target.getAttribute('data-id');

    if (target.classList.contains('edit-coupon')) {
        const coupon = allCoupons.find(c => c._id === id);
        fillCouponForm(coupon);
    } else if (target.classList.contains('toggle-coupon')) {
        toggleStatus(`${API_BASE}/admin/coupons/${id}/toggle`, () => fetchCoupons(document.getElementById('couponSearch')?.value || ''));
    } else if (target.classList.contains('delete-coupon')) {
        if (confirm('Are you sure you want to permanently delete this coupon?')) {
            deleteResource(`${API_BASE}/admin/coupons/${id}`, () => fetchCoupons(document.getElementById('couponSearch')?.value || ''));
        }
    }
}

async function toggleStatus(url, reloadFn) {
    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast("Status updated");
            reloadFn();
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteResource(url, reloadFn) {
    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast("Coupon deleted");
            reloadFn();
        }
    } catch (err) {
        console.error(err);
    }
}

function handleAuthError() {
    alert("Session expired or unauthorized. Please login again.");
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login.html";
}

function showToast(msg) {
    const toast = document.getElementById('successToast');
    const text = document.getElementById('toastMessage');
    if (text) text.textContent = msg;
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function fillCouponForm(coupon) {
    editCouponId = coupon._id;

    document.getElementById('simpleCode').value = coupon.code;
    document.getElementById('simpleValue').value = coupon.discountValue;
    document.getElementById('simpleMinPrice').value = coupon.minProductPrice || 0;
    document.getElementById('simpleStart').value = coupon.startDate ? coupon.startDate.split('T')[0] : '';
    document.getElementById('simpleEnd').value = coupon.endDate ? coupon.endDate.split('T')[0] : '';

    document.getElementById('couponModalTitle').textContent = 'Edit Coupon';
    document.getElementById('couponModal').classList.add('show');
}

function resetCouponForm() {
    editCouponId = null;
    const form = document.getElementById('couponFormSimple');
    if (form) form.reset();

    document.getElementById('couponModalTitle').textContent = 'Create New Coupon';
    const msg = document.getElementById('simpleModalMsg');
    if (msg) msg.style.display = 'none';

    // Set default dates
    const todayStr = new Date().toISOString().split('T')[0];
    const sInput = document.getElementById('simpleStart');
    const eInput = document.getElementById('simpleEnd');

    if (sInput) sInput.value = todayStr;

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    if (eInput) eInput.value = nextWeek.toISOString().split('T')[0];
}

// Simplified Coupon Creation Helpers
function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function showCpMsg(type, msg) {
    const el = document.getElementById('simpleModalMsg');
    if (!el) return;
    el.textContent = msg;
    el.className = type; // 'success' or 'error'
    el.style.display = 'block';
}

function closeCouponModal() {
    const modal = document.getElementById('couponModal');
    if (modal) modal.classList.remove('show');
}

async function createCouponSimple(e) {
    if (e) e.preventDefault();

    const code = document.getElementById('simpleCode').value.trim();
    const discountValue = parseFloat(document.getElementById('simpleValue').value);
    const minProductPrice = parseFloat(document.getElementById('simpleMinPrice').value);
    const startDateVal = document.getElementById('simpleStart').value;
    const endDateVal = document.getElementById('simpleEnd').value;

    // Validation
    if (!code) return showCpMsg('error', 'Coupon Code is required');
    if (isNaN(discountValue) || discountValue <= 0) return showCpMsg('error', 'Flat Discount must be greater than 0');
    if (isNaN(minProductPrice) || minProductPrice < 0) return showCpMsg('error', 'Min Product Price must be at least 0');
    if (!startDateVal || !endDateVal) return showCpMsg('error', 'Start and End dates are required');

    const today = startOfToday();
    const start = new Date(startDateVal);
    const end = new Date(endDateVal);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start < today) return showCpMsg('error', 'Start date must be today or later');
    if (end < today) return showCpMsg('error', 'End date must be today or later');
    if (start > end) return showCpMsg('error', 'Start date should not be greater than end date');

    const payload = {
        code: code.toUpperCase(),
        discountType: "FLAT",
        discountValue,
        minProductPrice,
        startDate: startDateVal,
        endDate: endDateVal,
        isActive: true
    };

    const url = editCouponId ? `${API_BASE}/admin/coupons/${editCouponId}` : `${API_BASE}/admin/coupons`;
    const method = editCouponId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showCpMsg('success', `Coupon ${editCouponId ? 'updated' : 'created'} successfully!`);
            setTimeout(() => {
                closeCouponModal();
                editCouponId = null;
                if (typeof fetchCoupons === 'function') fetchCoupons();
            }, 1500);
        } else {
            showCpMsg('error', data.message || data.errors || 'API Error');
        }
    } catch (error) {
        showCpMsg('error', 'Network error. Please try again.');
        console.error('Save Coupon Error:', error);
    }
}

// Set min dates on load
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.min = today;
    if (endInput) endInput.min = today;

    const todayStr = new Date().toISOString().split('T')[0];
    const sInput = document.getElementById('simpleStart');
    const eInput = document.getElementById('simpleEnd');
    if (sInput) sInput.min = todayStr;
    if (eInput) eInput.min = todayStr;
});
