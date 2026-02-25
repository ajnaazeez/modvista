const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

// --- Helpers ---
function getToken() { return localStorage.getItem("adminToken"); }

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

// --- State ---
let products = [];
let currentPage = 1;
let totalPages = 1;
let limit = 10;
let searchQuery = "";

// --- Load Data ---
async function loadProducts(page = 1) {
    const tbody = document.getElementById('offersTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--text-dim);">Loading offers...</td></tr>';

    currentPage = page;
    try {
        const query = `?page=${currentPage}&limit=${limit}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
        const response = await apiFetch(`/admin/products${query}`);
        if (response.success) {
            products = response.data;
            totalPages = Math.ceil((response.total || 0) / limit);
            renderTable();
            updateStats();
            renderPagination(response.total || 0);
        }
    } catch (err) {
        console.error('Failed to load products:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:3rem;">Error: ${err.message}</td></tr>`;
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
    const activeCount = products.filter(p => p.offerActive).length;
    document.getElementById('activeOffersCount').textContent = activeCount;
}

function renderTable() {
    const tbody = document.getElementById('offersTableBody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--text-dim);">No products found</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');

        const hasOffer = p.offerActive;
        const discount = hasOffer ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;

        const period = (p.offerStart || p.offerEnd)
            ? `${p.offerStart ? new Date(p.offerStart).toLocaleDateString() : 'Always'} - ${p.offerEnd ? new Date(p.offerEnd).toLocaleDateString() : 'Forever'}`
            : '<span style="color: var(--text-dim);">Not set</span>';

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${p.images && p.images[0] ? (p.images[0].startsWith('uploads/') ? `http://localhost:5000/${p.images[0]}` : p.images[0]) : 'assets/default-product.png'}" 
                         style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid var(--border);"
                         onerror="this.src='assets/default-product.png'">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; color:var(--text-main);">${p.name}</span>
                        <small style="color:var(--text-dim); font-size:0.7rem;">ID: ${p._id.slice(-6).toUpperCase()}</small>
                    </div>
                </div>
            </td>
            <td style="font-family: monospace; color: var(--text-dim);">₹${p.price.toLocaleString()}</td>
            <td style="font-weight: 600; color: ${hasOffer ? 'var(--status-delivered)' : 'var(--text-dim)'}">
                ${p.salePrice ? `₹${p.salePrice.toLocaleString()}` : '-'}
            </td>
            <td>
                ${hasOffer ? `<span class="status-badge" style="background: rgba(0, 214, 143, 0.1); color: var(--status-delivered); border: 1px solid rgba(0, 214, 143, 0.2);">${discount}% OFF</span>` : '-'}
            </td>
            <td><small style="color: var(--text-dim);">${period}</small></td>
            <td>
                <span class="status-badge ${hasOffer ? 'status-active' : 'status-inactive'}">
                    ${hasOffer ? 'Active' : 'Inactive'}
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
    document.getElementById('offerProductName').value = p.name;
    document.getElementById('basePrice').value = p.price;
    document.getElementById('salePrice').value = p.salePrice || '';
    document.getElementById('offerActive').checked = p.offerActive;

    // Format dates for input[type="date"]
    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('offerStart');
    const endInput = document.getElementById('offerEnd');

    startInput.min = today;
    endInput.min = today;

    if (p.offerStart) startInput.value = new Date(p.offerStart).toISOString().split('T')[0];
    else startInput.value = '';

    if (p.offerEnd) endInput.value = new Date(p.offerEnd).toISOString().split('T')[0];
    else endInput.value = '';

    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
    offerForm.reset();
}

if (closeBtn) closeBtn.onclick = closeModal;
if (cancelBtn) cancelBtn.onclick = closeModal;
window.onclick = (e) => { if (e.target === modal) closeModal(); };

// --- Form Submission ---
offerForm.onsubmit = async (e) => {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const isEnabled = document.getElementById('offerActive').checked;
    const basePrice = parseFloat(document.getElementById('basePrice').value);
    const salePrice = parseFloat(document.getElementById('salePrice').value);
    const offerStart = document.getElementById('offerStart').value;
    const offerEnd = document.getElementById('offerEnd').value;

    // Client-side validation
    if (isEnabled) {
        if (!salePrice || salePrice <= 0 || salePrice >= basePrice) {
            alert('Sale price must be greater than 0 and less than base price');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (offerStart) {
            const startStr = new Date(offerStart).toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
            if (startStr < todayStr) {
                alert('Start date must be today or later');
                return;
            }
        }

        if (offerEnd) {
            const endStr = new Date(offerEnd).toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
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
        loadProducts();
    } catch (err) {
        alert(err.message);
    }
};

// --- Search ---
document.getElementById('productSearch').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    currentPage = 1;
    loadProducts();
});

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts(1);
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    if (adminUser.name) document.getElementById('adminNameDisplay').textContent = adminUser.name;
});
