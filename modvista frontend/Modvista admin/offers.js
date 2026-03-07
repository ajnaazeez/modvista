const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const API_HOST = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000"
    : window.location.origin;

// --- Helpers ---
function getToken() {
    return localStorage.getItem("adminToken");
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    if (res.status === 401 || res.status === 403) {
        window.location.href = "admin-login.html";
        throw new Error("Admin session expired");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

const DEFAULT_IMG = "assets/default-product.png";
const ON_ERROR_HANDLER = `this.onerror=null; this.src='${DEFAULT_IMG}';`;

function resolveImg(src) {
    if (!src) return DEFAULT_IMG;
    // Normalize slashes for comparison and construction
    const normalizedSrc = src.replace(/\\/g, '/');
    if (normalizedSrc.startsWith("uploads/")) return `${API_HOST}/${normalizedSrc}`;
    if (normalizedSrc.startsWith("/uploads/")) return `${API_HOST}${normalizedSrc}`;
    if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) {
        return src;
    }
    return src;
}

// --- State ---
let products = [];
let currentPage = 1;
let totalPages = 1;
let limit = 10;
let searchQuery = "";

// --- Load Data ---
async function loadProducts(page = 1) {
    const tbody = document.getElementById('offersTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--text-dim);">Loading offers...</td></tr>';
    }

    currentPage = page;

    try {
        const query = `?page=${currentPage}&limit=${limit}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
        const response = await apiFetch(`/admin/products${query}`);
        if (response.success) {
            products = response.data || [];
            totalPages = Math.ceil((response.total || 0) / limit);
            renderTable();
            updateStats();
            renderPagination(response.total || 0);
        }
    } catch (err) {
        console.error('Failed to load products:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:3rem;">Error: ${err.message}</td></tr>`;
        }
    }
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
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="loadProducts(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadProducts(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadProducts(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${(currentPage - 1) * limit + 1} to ${Math.min(currentPage * limit, total)} of ${total} offers
        </div>
    `;

    container.innerHTML = html;
}

function updateStats() {
    const now = new Date();
    const activeCount = products.filter(p => {
        if (!p.offerActive) return false;
        const end = p.offerEnd ? new Date(p.offerEnd) : null;
        if (end && now > end) return false;

        const start = p.offerStart ? new Date(p.offerStart) : null;
        if (start && now < start) return false;

        return true;
    }).length;

    const activeOffersCount = document.getElementById('activeOffersCount');
    if (activeOffersCount) {
        activeOffersCount.textContent = activeCount;
    }
}

function renderTable() {
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--text-dim);">No products found</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');

        const hasOffer = !!p.offerActive;
        const discount = hasOffer && p.price && p.salePrice
            ? Math.round(((p.price - p.salePrice) / p.price) * 100)
            : 0;

        const period = (p.offerStart || p.offerEnd)
            ? `${p.offerStart ? new Date(p.offerStart).toLocaleDateString() : 'Always'} - ${p.offerEnd ? new Date(p.offerEnd).toLocaleDateString() : 'Forever'}`
            : '<span style="color: var(--text-dim);">Not set</span>';

        // Same image rendering pattern as products.js
        const imgSrc = p.images?.[0] ? resolveImg(p.images[0]) : DEFAULT_IMG;

        // Calculate effective status
        const now = new Date();
        const start = p.offerStart ? new Date(p.offerStart) : null;
        const end = p.offerEnd ? new Date(p.offerEnd) : null;

        let statusText = 'Inactive';
        let statusClass = 'status-inactive';

        if (p.offerActive) {
            if (end && now > end) {
                statusText = 'Expired';
                statusClass = 'status-expired';
            } else if (start && now < start) {
                statusText = 'Scheduled';
                statusClass = 'status-pending'; // Using yellow/pending color for scheduled
            } else {
                statusText = 'Active';
                statusClass = 'status-active';
            }
        }

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${imgSrc}" 
                         alt="${p.name || 'Product'}"
                         style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid var(--border); background:#111;"
                         onerror="${ON_ERROR_HANDLER}">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; color:var(--text-main); line-height:1.2;">${p.name || 'Unnamed Product'}</span>
                        <small style="color:var(--text-dim); font-size:0.7rem;">ID: ${p._id ? p._id.slice(-6).toUpperCase() : 'N/A'}</small>
                    </div>
                </div>
            </td>
            <td style="font-family: monospace; color: var(--text-dim);">₹${Number(p.price || 0).toLocaleString()}</td>
            <td style="font-weight: 600; color: ${statusText === 'Active' ? 'var(--status-delivered)' : 'var(--text-dim)'}">
                ${p.salePrice ? `₹${Number(p.salePrice).toLocaleString()}` : '-'}
            </td>
            <td>
                ${statusText === 'Active' ? `<span class="status-badge" style="background: rgba(0, 214, 143, 0.1); color: var(--status-delivered); border: 1px solid rgba(0, 214, 143, 0.2);">${discount}% OFF</span>` : '-'}
            </td>
            <td><small style="color: var(--text-dim);">${period}</small></td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td style="text-align: right;">
                <button class="action-btn" onclick="openOfferModal('${p._id}')" style="padding: 6px 12px; font-size: 0.8rem;">
                    <i class="fas fa-edit" style="margin-right: 4px;"></i> Edit
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Modal Logic ---
const modal = document.getElementById('offerModal');
const closeBtn = document.querySelector('.close-modal');
const cancelBtn = document.getElementById('cancelBtn');
const offerForm = document.getElementById('offerForm');

function openOfferModal(productId) {
    const p = products.find(prod => prod._id === productId);
    if (!p) return;

    document.getElementById('productId').value = p._id;
    document.getElementById('offerProductName').value = p.name || '';
    document.getElementById('basePrice').value = p.price || '';
    document.getElementById('salePrice').value = p.salePrice || '';
    document.getElementById('offerActive').checked = !!p.offerActive;

    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('offerStart');
    const endInput = document.getElementById('offerEnd');

    startInput.min = today;
    endInput.min = today;

    startInput.value = p.offerStart ? new Date(p.offerStart).toISOString().split('T')[0] : '';
    endInput.value = p.offerEnd ? new Date(p.offerEnd).toISOString().split('T')[0] : '';

    modal.classList.add('show');
}

function closeModal() {
    if (modal) modal.classList.remove('show');
    if (offerForm) offerForm.reset();
}

if (closeBtn) closeBtn.onclick = closeModal;
if (cancelBtn) cancelBtn.onclick = closeModal;

window.onclick = (e) => {
    if (e.target === modal) closeModal();
};

// --- Form Submission ---
if (offerForm) {
    offerForm.onsubmit = async (e) => {
        e.preventDefault();

        const productId = document.getElementById('productId').value;
        const isEnabled = document.getElementById('offerActive').checked;
        const basePrice = parseFloat(document.getElementById('basePrice').value);
        const salePrice = parseFloat(document.getElementById('salePrice').value);
        const offerStart = document.getElementById('offerStart').value;
        const offerEnd = document.getElementById('offerEnd').value;

        if (isEnabled) {
            if (!salePrice || salePrice <= 0 || salePrice >= basePrice) {
                alert('Sale price must be greater than 0 and less than base price');
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            if (offerStart) {
                const startStr = new Date(offerStart).toISOString().split('T')[0];
                if (startStr < todayStr) {
                    alert('Start date must be today or later');
                    return;
                }
            }

            if (offerEnd) {
                const endStr = new Date(offerEnd).toISOString().split('T')[0];
                if (endStr < todayStr) {
                    alert('End date must be today or later');
                    return;
                }
            }

            if (offerStart && offerEnd && new Date(offerStart) > new Date(offerEnd)) {
                alert('Start date should not be greater than end date');
                return;
            }
        }

        try {
            await apiFetch(`/admin/products/${productId}/offer`, {
                method: 'PATCH',
                body: JSON.stringify({
                    offerActive: isEnabled,
                    salePrice: isEnabled ? salePrice : null,
                    offerStart: isEnabled && offerStart ? offerStart : null,
                    offerEnd: isEnabled && offerEnd ? offerEnd : null
                })
            });

            alert('Offer updated successfully');
            closeModal();
            loadProducts(currentPage);
        } catch (err) {
            alert(err.message);
        }
    };
}

// --- Search ---
const searchInput = document.getElementById('productSearch');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        currentPage = 1;
        loadProducts(1);
    });
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts(1);

    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    if (adminUser.name) {
        const adminNameDisplay = document.getElementById('adminNameDisplay');
        if (adminNameDisplay) adminNameDisplay.textContent = adminUser.name;
    }
});