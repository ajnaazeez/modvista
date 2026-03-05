const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";
const API_HOST = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000"
    : window.location.origin;

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
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        window.location.href = "admin-login.html";
        throw new Error("Admin session expired / not authorized");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

const DEFAULT_IMG = "assets/default-product.png";
const ON_ERROR_HANDLER = `this.onerror=null; this.src='${DEFAULT_IMG}';`;

let allProducts = [];
let currentEditId = null;
let currentProductImages = [];
let currentPage = 1;
let totalPages = 1;
let limit = 10;

function resolveImg(src) {
    if (!src) return DEFAULT_IMG;
    if (src.startsWith("uploads/")) return `${API_HOST}/${src}`;
    if (src.startsWith("/uploads/")) return `${API_HOST}${src}`;
    if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) {
        return src;
    }
    return src;
}

// Upload images to backend
async function uploadImages(files) {
    console.log("Starting uploadImages with files:", files);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
            // Content-Type is set automatically by browser for FormData
        },
        body: formData
    });

    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
    } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text);

        if (res.status === 413) {
            throw new Error("Image file is too large for the server. Please try a smaller image or update Nginx 'client_max_body_size'.");
        }

        // Extract error snippet from HTML if possible
        const errorSnippet = text.length > 200 ? text.substring(0, 200) + "..." : text;
        throw new Error(`Server returned an error (${res.status}): ${errorSnippet}`);
    }

    console.log("Upload response:", data);
    if (!res.ok) throw new Error(data.message || 'Image upload failed');
    return data.images || [];
}

async function loadAdminCategoriesIntoSelect() {
    const select = document.getElementById("productCategorySelect");
    const filterSelect = document.getElementById("categoryFilter");
    if (!select && !filterSelect) return;

    try {
        const { data: categories } = await apiFetch("/admin/categories");
        const active = categories.filter(c => c.isActive);

        const optionsHtml = active.map(c => `<option value="${c._id}">${c.name}</option>`).join("");

        if (select) {
            select.innerHTML = `
                <option value="">Select category</option>
                ${optionsHtml}
            `;
        }

        if (filterSelect) {
            filterSelect.innerHTML = `
                <option value="">All Categories</option>
                ${optionsHtml}
            `;
        }
    } catch (e) {
        if (select) select.innerHTML = `<option value="">Failed to load categories</option>`;
        console.error(e);
    }
}

async function loadAdminProducts() {
    const tbody = document.querySelector("#productsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

    try {
        const { data: products } = await apiFetch("/admin/products");
        allProducts = products || [];

        if (typeof handleFilters === 'function') {
            handleFilters();
        } else {
            renderProducts(allProducts);
        }
    } catch (e) {
        if (e.message.includes("Not authorized") || e.message.includes("Admin only")) {
            tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Access Denied. Please login as Admin.</td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="color:red;">${e.message}</td></tr>`;
        }
    }
}

function openEditModal(product) {
    currentEditId = product._id;
    currentProductImages = product.images || [];

    const modal = document.getElementById("productModal");
    const form = document.getElementById("productForm");
    const title = document.getElementById("modalTitle");
    const saveBtn = document.getElementById("saveProductBtn");

    // Pre-fill fields
    form.name.value = product.name;

    // Set category value (handling populated object or ID string)
    const catId = product.category?._id || product.category || "";
    const select = document.getElementById("productCategorySelect");
    if (select) {
        select.value = catId;
    }

    form.price.value = product.price;
    form.stock.value = product.stock || 0;
    form.description.value = product.description || "";

    // Pre-fill Images
    // Reset all slots first
    document.querySelectorAll('.image-upload-slot').forEach(slot => {
        slot.style.backgroundImage = '';
        slot.querySelector('i').style.display = 'block';
        slot.querySelector('span').style.display = 'block';
    });

    // Fill slots with existing images
    const slots = document.querySelectorAll('.image-upload-slot');
    currentProductImages.forEach((img, index) => {
        if (index < slots.length) {
            const slot = slots[index];
            const resolved = resolveImg(img);
            slot.style.backgroundImage = `url(${resolved})`;
            slot.style.backgroundSize = 'cover';
            slot.querySelector('i').style.display = 'none';
            slot.querySelector('span').style.display = 'none';
        }
    });

    // UI Updates
    title.innerText = "Edit Product";
    saveBtn.innerText = "Update Product";
    saveBtn.disabled = false;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

async function handleProductSubmit(form) {
    const formData = new FormData(form);

    // 1. Handle Images
    console.log("Current Edit ID:", currentEditId);
    console.log("Current Product Images:", currentProductImages);
    // If we are editing, start with existing images.
    // If creating, start empty.
    let finalImages = currentEditId ? [...currentProductImages] : [];

    const slotInputs = form.querySelectorAll('.slot-input');

    // Check for NEW uploads in each slot
    // We upload them one by one to keep order or just replace specific indices
    // Simplification: We will assign the new upload to the specific index of the slot

    const uploadPromises = [];
    const newFileIndices = [];

    slotInputs.forEach((input, index) => {
        if (input.files[0]) {
            console.log(`New file detected in slot ${index}:`, input.files[0].name);
            uploadPromises.push(uploadImages([input.files[0]]));
            newFileIndices.push(index);
        }
    });

    if (uploadPromises.length > 0) {
        try {
            console.log("Waiting for uploads...");
            const results = await Promise.all(uploadPromises);
            // results is array of arrays: [['path1'], ['path2']]

            results.forEach((res, i) => {
                const slotIndex = newFileIndices[i];
                if (res && res.length > 0) {
                    console.log(`Updating slot ${slotIndex} with new path:`, res[0]);
                    // Replace or Add at this index
                    finalImages[slotIndex] = res[0];
                }
            });
        } catch (e) {
            console.error("Upload failed:", e);
            throw new Error("Failed to upload new images: " + e.message);
        }
    }

    // Clean null/undefined if any gaps (though logic above shouldn't create gaps if we just replace)
    finalImages = finalImages.filter(img => img);
    console.log("Final Images Payload:", finalImages);

    // 2. Prepare Payload
    const payload = {
        name: formData.get("name"),
        description: formData.get("description") || "",
        price: Number(formData.get("price") || 0),
        images: finalImages,
        stock: Number(formData.get("stock") || 0),
        category: formData.get("category") || null
    };

    console.log("Submitting Payload:", payload);

    // 3. Send Request
    const url = currentEditId
        ? `/admin/products/${currentEditId}`
        : `/admin/products`;

    const method = currentEditId ? "PUT" : "POST";

    return apiFetch(url, {
        method: method,
        body: JSON.stringify(payload)
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminProducts(1);
    loadAdminCategoriesIntoSelect();

    // Event Listeners for Search & Filter
    const productSearch = document.getElementById('productSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (productSearch) productSearch.addEventListener('input', handleFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilters);
    if (statusFilter) statusFilter.addEventListener('change', handleFilters);

    const productModal = document.getElementById("productModal");
    const addProductBtn = document.getElementById("addProductBtn");
    const closeModal = document.getElementById("closeModal");
    const cancelModal = document.getElementById("cancelModal");
    const productForm = document.getElementById("productForm");
    const saveProductBtn = document.getElementById("saveProductBtn");
    const modalTitle = document.getElementById("modalTitle");

    // File input handling for custom slots
    document.querySelectorAll('.image-upload-slot').forEach(slot => {
        const input = slot.querySelector('input[type="file"]');
        slot.addEventListener('click', () => input.click());
        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                // Show preview
                const reader = new FileReader();
                reader.onload = (ev) => {
                    slot.style.backgroundImage = `url(${ev.target.result})`;
                    slot.style.backgroundSize = 'cover';
                    slot.querySelector('i').style.display = 'none';
                    slot.querySelector('span').style.display = 'none';
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    });

    const hideModal = () => {
        productModal.classList.remove("show");
        document.body.style.overflow = "";
        productForm.reset();

        // Reset state
        currentEditId = null;
        currentProductImages = [];
        modalTitle.innerText = "Add New Product";
        if (saveProductBtn) saveProductBtn.innerText = "Save Product";

        // Reset slots visuals
        document.querySelectorAll('.image-upload-slot').forEach(slot => {
            slot.style.backgroundImage = '';
            slot.querySelector('i').style.display = 'block';
            slot.querySelector('span').style.display = 'block';
        });

        // Clear file inputs
        document.querySelectorAll('.slot-input').forEach(input => input.value = '');
    };

    if (addProductBtn) {
        addProductBtn.addEventListener("click", async () => {
            await loadAdminCategoriesIntoSelect();
            // Ensure clean state for Add
            currentEditId = null;
            currentProductImages = [];
            modalTitle.innerText = "Add New Product";
            saveProductBtn.innerText = "Save Product";

            productModal.classList.add("show");
            document.body.style.overflow = "hidden";
        });
    }

    if (closeModal) closeModal.addEventListener("click", hideModal);
    if (cancelModal) cancelModal.addEventListener("click", hideModal);

    if (productForm) {
        productForm.addEventListener("input", () => {
            // Use native validity check
            const isValid = productForm.checkValidity();
            if (saveProductBtn) saveProductBtn.disabled = !isValid;
        });
    }

    if (saveProductBtn) {
        saveProductBtn.addEventListener("click", async () => {
            if (saveProductBtn.disabled) return;

            const originalText = saveProductBtn.innerText;
            saveProductBtn.disabled = true;
            saveProductBtn.innerHTML = "Saving...";

            try {
                console.log("Submitting product form..."); // Debug
                await handleProductSubmit(productForm);
                hideModal();
                await loadAdminProducts();

                const msg = currentEditId ? "Product updated!" : "Product saved!";
                alert(msg);

            } catch (e) {
                console.error(e);
                alert("Error: " + e.message);
            } finally {
                saveProductBtn.innerHTML = originalText;
                saveProductBtn.disabled = false;
            }
        });
    }
});

async function loadAdminProducts(page = 1) {
    const tbody = document.querySelector("#productsTable tbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading products...</td></tr>`;

    currentPage = page;
    const productSearch = document.getElementById('productSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    let query = `?page=${page}&limit=${limit}`;
    if (productSearch && productSearch.value) query += `&search=${productSearch.value}`;
    if (categoryFilter && categoryFilter.value) query += `&category=${categoryFilter.value}`;
    if (statusFilter && statusFilter.value) {
        query += `&isActive=${statusFilter.value === 'active'}`;
    }

    try {
        const res = await apiFetch(`/admin/products${query}`);
        if (res.success) {
            allProducts = res.data;
            totalPages = Math.ceil((res.total || 0) / limit);
            renderProducts(allProducts);
            renderPagination(res.total || 0);
        }
    } catch (e) {
        console.error("Load products error:", e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--status-cancelled); padding: 20px;">Error: ${e.message}</td></tr>`;
    }
}

function handleFilters() {
    loadAdminProducts(1);
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
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="loadAdminProducts(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadAdminProducts(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadAdminProducts(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${(currentPage - 1) * limit + 1} to ${Math.min(currentPage * limit, total)} of ${total} products
        </div>
    `;
    container.innerHTML = html;
}

function renderProducts(products) {
    const tbody = document.querySelector("#productsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!products || !products.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">No products found</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => {
        const imgSrc = p.images?.[0] ? resolveImg(p.images[0]) : DEFAULT_IMG;
        const categoryName = (p.category && p.category.name) ? p.category.name : (p.category || "-");
        const stockCount = p.stock || 0;
        const stockStatus = (stockCount > 0) ? "In Stock" : "Out of Stock";
        const stockClass = (stockCount > 0) ? "status-delivered" : "status-cancelled";
        const productData = encodeURIComponent(JSON.stringify(p));

        return `
        <tr data-id="${p._id}" data-product="${productData}">
          <td><img src="${imgSrc}" class="product-img" onerror="${ON_ERROR_HANDLER}" alt="${p.name}" /></td>
          <td style="font-weight:500;">${p.name}</td>
          <td>${categoryName}</td>
          <td>₹${Number(p.price).toFixed(2)}</td>
          <td><span class="status-badge ${stockClass}">${stockStatus} (${stockCount})</span></td>
          <td><span class="status-badge ${p.isActive ? 'status-active' : 'status-inactive'}">${p.isActive ? 'Active' : 'Disabled'}</span></td>
          <td>
            <div style="display:flex; gap:12px; align-items:center;">
              <i class="fas fa-toggle-${p.isActive ? 'on' : 'off'} toggle-icon" style="cursor:pointer; color: ${p.isActive ? 'var(--status-delivered)' : 'var(--text-dim)'};" title="${p.isActive ? 'Disable' : 'Enable'}"></i>
              <i class="fas fa-pencil-alt edit-icon" style="cursor:pointer; color: var(--text-dim);" title="Edit"></i>
              <i class="fas fa-trash-alt delete-icon" style="cursor:pointer;" title="Delete"></i>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Re-attach listeners after re-render
    tbody.querySelectorAll(".delete-icon").forEach(icon => {
        icon.addEventListener("click", async () => {
            const row = icon.closest("tr");
            const id = row.dataset.id;
            if (!confirm("Delete this product?")) return;
            try {
                await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
                row.remove();
                allProducts = allProducts.filter(p => p._id !== id);
            } catch (e) {
                alert(e.message);
            }
        });
    });

    tbody.querySelectorAll(".toggle-icon").forEach(icon => {
        icon.addEventListener("click", async () => {
            const row = icon.closest("tr");
            const id = row.dataset.id;
            try {
                const res = await apiFetch(`/admin/products/${id}/toggle-active`, { method: "PATCH" });
                if (res.success) {
                    // Update local state and re-render
                    const index = allProducts.findIndex(p => p._id === id);
                    if (index !== -1) {
                        allProducts[index].isActive = res.data.isActive;
                        handleFilters(); // Re-apply current filters and re-render
                    }
                }
            } catch (e) {
                alert(e.message);
            }
        });
    });

    tbody.querySelectorAll(".edit-icon").forEach(icon => {
        icon.addEventListener("click", async () => {
            const row = icon.closest("tr");
            const productData = JSON.parse(decodeURIComponent(row.dataset.product));
            await loadAdminCategoriesIntoSelect();
            openEditModal(productData);
        });
    });
}
