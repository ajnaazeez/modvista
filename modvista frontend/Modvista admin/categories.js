const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";
const API_HOST = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000"
    : window.location.origin;

let currentEditId = null;
let currentImage = "";
let currentPage = 1;
let totalPages = 1;
let limit = 10;

// --- Helpers ---

function getToken() {
    return localStorage.getItem("adminToken");
}

function resolveImg(src) {
    if (!src) return ""; // Return empty to indicate no image
    if (src.startsWith("uploads/")) return `${API_HOST}/${src}`;
    if (src.startsWith("/uploads/")) return `${API_HOST}${src}`;
    if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) {
        return src;
    }
    return src;
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

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('images', file); // API expects 'images' field

    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Image upload failed');
    return data.images && data.images.length > 0 ? data.images[0] : "";
}

// --- Main Logic ---

async function loadCategories(page = 1) {
    const tbody = document.querySelector(".table-wrapper tbody");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;

    currentPage = page;
    const searchInput = document.querySelector(".search-box input");
    let query = `?page=${page}&limit=${limit}`;
    if (searchInput && searchInput.value) {
        query += `&search=${encodeURIComponent(searchInput.value)}`;
    }

    try {
        const res = await apiFetch(`/admin/categories${query}`);
        if (res.success) {
            totalPages = Math.ceil((res.total || 0) / limit);
            renderTable(res.data);
            renderPagination(res.total || 0);
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading categories: ${err.message}</td></tr>`;
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
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="loadCategories(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadCategories(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadCategories(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${(currentPage - 1) * limit + 1} to ${Math.min(currentPage * limit, total)} of ${total} categories
        </div>
    `;
    container.innerHTML = html;
}

function renderTable(categories) {
    const tbody = document.querySelector(".table-wrapper tbody");
    tbody.innerHTML = "";

    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No categories found</td></tr>`;
        return;
    }

    categories.forEach(cat => {
        const imgSrc = resolveImg(cat.image);
        const imgHtml = imgSrc
            ? `<div class="avatar" style="background: transparent; padding:0;"><img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" onerror="this.onerror=null; this.src='assets/default-product.png';"></div>`
            : `<div class="avatar" style="background: rgba(var(--accent-rgb), 0.1); color: var(--accent); border: none;"><i class="fas fa-box"></i></div>`;

        const statusHtml = cat.isActive
            ? `<span class="status-badge status-active">Active</span>`
            : `<span class="status-badge status-disabled">Disabled</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="font-weight: 500;">${cat.name}</td>
            <td style="color: var(--text-dim);">${cat.description || '-'}</td>
            <td>${cat.totalProducts || 0}</td>
            <td>${statusHtml}</td>
            <td>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <i class="fas fa-pencil-alt edit-icon" style="cursor: pointer; color: var(--text-dim);" title="Edit" data-id="${cat._id}"></i>
                    <label class="switch">
                        <input type="checkbox" class="toggle-status" ${cat.isActive ? 'checked' : ''} data-id="${cat._id}">
                        <span class="slider"></span>
                    </label>
                    <i class="fas fa-trash-alt delete-icon" style="cursor: pointer; color: var(--status-cancelled);" title="Delete" data-id="${cat._id}" data-products="${cat.totalProducts || 0}"></i>
                </div>
            </td>
        `;

        // Attach Row data for easy edit retrieval
        tr.dataset.json = JSON.stringify(cat);
        tbody.appendChild(tr);
    });

    // Attach Listeners
    attachRowListeners();
}

function attachRowListeners() {
    // Edit
    document.querySelectorAll(".edit-icon").forEach(icon => {
        icon.addEventListener("click", () => {
            const tr = icon.closest("tr");
            const cat = JSON.parse(tr.dataset.json);
            openModal(cat);
        });
    });

    // Delete
    document.querySelectorAll(".delete-icon").forEach(icon => {
        icon.addEventListener("click", async () => {
            const id = icon.dataset.id;
            const productCount = parseInt(icon.dataset.products);

            if (productCount > 0) {
                alert(`Cannot delete category: ${productCount} products are still assigned to this category.`);
                return;
            }

            if (!confirm("Are you sure you want to delete this category?")) return;

            try {
                await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
                loadCategories();
                showToast("Category deleted.");
            } catch (err) {
                alert(err.message);
            }
        });
    });

    // Toggle Status
    document.querySelectorAll(".toggle-status").forEach(toggle => {
        toggle.addEventListener("change", async (e) => {
            const id = toggle.dataset.id;
            const newStatus = toggle.checked;

            try {
                // Optimistic check? Or just wait.
                await apiFetch(`/admin/categories/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ isActive: newStatus })
                });
                // No need to reload whole table usually, but to update dataset json it's safer
                // Or update the dataset manually if we want to avoid reload
                const tr = toggle.closest("tr");
                const cat = JSON.parse(tr.dataset.json);
                cat.isActive = newStatus;
                tr.dataset.json = JSON.stringify(cat);

                // Update Badge
                const statusCell = tr.cells[4];
                statusCell.innerHTML = newStatus
                    ? `<span class="status-badge status-active">Active</span>`
                    : `<span class="status-badge status-disabled">Disabled</span>`;

                showToast("Status updated.");
            } catch (err) {
                e.target.checked = !newStatus; // Revert
                alert(err.message);
            }
        });
    });
}

// --- Modal & Form ---

function openModal(cat = null) {
    const modal = document.getElementById("categoryModal");
    const title = document.getElementById("modalTitle");
    const saveBtn = document.getElementById("saveCategoryBtn");
    const form = document.getElementById("categoryForm");

    // Upload Elements
    const uploadPlaceholder = document.getElementById("uploadPlaceholder");
    const imagePreview = document.getElementById("imagePreview");
    const removeImageBtn = document.getElementById("removeImageBtn");
    const uploadText = document.getElementById("uploadText");

    if (cat) {
        currentEditId = cat._id;
        currentImage = cat.image || "";
        title.innerText = "Edit Category";
        saveBtn.innerText = "Update Category";

        form.name.value = cat.name;
        form.description.value = cat.description;
        form.status.checked = cat.isActive;

        if (currentImage) {
            uploadPlaceholder.style.display = "none";
            imagePreview.src = resolveImg(currentImage);
            imagePreview.style.display = "block";
            removeImageBtn.style.display = "block";
        } else {
            uploadPlaceholder.style.display = "block";
            imagePreview.style.display = "none";
            imagePreview.src = "";
            removeImageBtn.style.display = "none";
            uploadText.innerText = "Click to upload or drag & drop";
        }
    } else {
        currentEditId = null;
        currentImage = "";
        title.innerText = "Add New Category";
        saveBtn.innerText = "Save Category";
        form.reset();

        uploadPlaceholder.style.display = "block";
        imagePreview.style.display = "none";
        imagePreview.src = "";
        removeImageBtn.style.display = "none";
        uploadText.innerText = "Click to upload or drag & drop";
    }

    saveBtn.disabled = false;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("categoryModal").classList.remove("show");
    document.body.style.overflow = "";
}

function showToast(msg) {
    const toast = document.getElementById("successToast");
    const msgEl = document.getElementById("toastMessage");
    if (toast && msgEl) {
        msgEl.innerText = msg;
        toast.style.display = "block";
        setTimeout(() => toast.style.display = "none", 3000);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadCategories(1);

    // Event Bindings
    document.getElementById("addCategoryBtn").addEventListener("click", () => openModal());
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("cancelModal").addEventListener("click", closeModal);

    // Search
    const searchInput = document.querySelector(".search-box input");
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadCategories(1);
            }, 500);
        });
    }

    // Image Upload
    const imageInput = document.getElementById("categoryImageInput");
    const uploadArea = document.getElementById("imageUploadArea");
    const uploadPlaceholder = document.getElementById("uploadPlaceholder");
    const imagePreview = document.getElementById("imagePreview");
    const removeImageBtn = document.getElementById("removeImageBtn");
    const uploadText = document.getElementById("uploadText");

    // Click to upload (prevent click propagation from remove button)
    uploadArea.addEventListener("click", (e) => {
        if (e.target !== removeImageBtn && !removeImageBtn.contains(e.target)) {
            imageInput.click();
        }
    });

    imageInput.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            uploadText.innerText = "Uploading...";

            try {
                const path = await uploadImage(file);
                currentImage = path;

                // Show Preview
                uploadPlaceholder.style.display = "none";
                imagePreview.src = resolveImg(currentImage);
                imagePreview.style.display = "block";
                removeImageBtn.style.display = "block";

            } catch (err) {
                console.error(err);
                uploadText.innerText = "Upload failed: " + err.message;
                uploadText.style.color = "red";
            }
        }
    });

    // Remove Image
    removeImageBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent triggering upload
        currentImage = "";
        imageInput.value = ""; // Clear input

        uploadPlaceholder.style.display = "block";
        imagePreview.style.display = "none";
        imagePreview.src = "";
        removeImageBtn.style.display = "none";
        uploadText.innerText = "Click to upload or drag & drop";
        uploadText.style.color = "var(--text-dim)";
    });

    // Save
    const saveBtn = document.getElementById("saveCategoryBtn");
    saveBtn.addEventListener("click", async () => {
        const form = document.getElementById("categoryForm");
        const name = form.name.value;
        const description = form.description.value;
        const isActive = form.status.checked;

        if (!name) {
            alert("Name is required");
            return;
        }

        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;

        const payload = {
            name,
            description,
            image: currentImage,
            isActive
        };

        try {
            if (currentEditId) {
                await apiFetch(`/admin/categories/${currentEditId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
                showToast("Category Updated");
            } else {
                await apiFetch("/admin/categories", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                showToast("Category Created");
            }
            closeModal();
            loadCategories();
        } catch (err) {
            alert(err.message);
            saveBtn.disabled = false;
            saveBtn.innerText = currentEditId ? "Update Category" : "Save Category";
        }
    });
});
