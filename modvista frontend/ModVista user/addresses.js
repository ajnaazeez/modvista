document.addEventListener("DOMContentLoaded", () => {
    console.log("API VERSION LOADED ✅");

    // Clear old localStorage demo data
    localStorage.removeItem("modvista_addresses");

    // API Configuration
    const BASE_URL = "http://localhost:5000/api";

    // DOM
    const addAddressTrigger = document.getElementById("add-address-trigger");
    const addNewCardBtn = document.querySelector(".add-new-card");
    const cancelDeleteBtn = document.getElementById("cancel-delete");
    const confirmDeleteBtn = document.getElementById("confirm-delete");
    const confirmModal = document.getElementById("confirm-modal");
    const addressGrid = document.getElementById("address-grid");
    const emptyState = document.getElementById("empty-state");

    // State
    let addresses = [];
    let deleteId = null;

    // ---------- Helpers ----------
    function getToken() {
        // change key if you store token with another name
        return localStorage.getItem("token");
    }

    function redirectToLogin() {
        // change this to your login page if different
        window.location.href = "login.html";
    }

    async function apiFetch(url, options = {}) {
        const token = getToken();

        // If token not found, redirect to login
        if (!token) {
            redirectToLogin();
            throw new Error("No token found. Please login again.");
        }

        const res = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        // Safe JSON parsing
        let data = null;
        try {
            data = await res.json();
        } catch (e) {
            data = null;
        }

        // 401 -> token expired / invalid
        if (res.status === 401) {
            localStorage.removeItem("token");
            redirectToLogin();
            throw new Error("Session expired. Please login again.");
        }

        if (!res.ok) {
            const msg = data?.message || data?.error || "API Error";
            throw new Error(msg);
        }

        return data;
    }

    // ---------- Core ----------
    async function loadAddresses() {
        try {
            const result = await apiFetch(`${BASE_URL}/addresses`);
            addresses = result?.data || [];
            renderAddresses();
        } catch (error) {
            console.error("Error loading addresses:", error);
            // optional: alert(error.message);
        }
    }

    function renderAddresses() {
        // Clear except the "Add New" card
        const existingCards = addressGrid.querySelectorAll(
            ".address-card:not(.add-new-card)"
        );
        existingCards.forEach((card) => card.remove());

        if (!addresses || addresses.length === 0) {
            emptyState.style.display = "block";
            addressGrid.style.display = "none";
            addAddressTrigger.style.display = "none";
            return;
        }

        emptyState.style.display = "none";
        addressGrid.style.display = "grid";
        addAddressTrigger.style.display = "block";

        addresses.forEach((addr) => {
            const card = createAddressCard(addr);
            addressGrid.appendChild(card);
        });
    }

    function createAddressCard(addr) {
        const card = document.createElement("div");
        const id = addr._id || addr.id;

        const fullName = addr.fullName || addr.name || "Unnamed";
        const phone = addr.phone || "";
        const house = addr.house || "";
        const street = addr.street || "";
        const city = addr.city || "";
        const state = addr.state || "";
        const pincode = addr.pincode || "";
        const type = addr.type || "Home";

        card.className = `address-card ${addr.isDefault ? "default" : ""}`;
        card.dataset.id = id;

        card.innerHTML = `
      <div class="card-header-type">
        <span class="type-badge">${type}</span>
        ${addr.isDefault ? '<span class="default-badge">DEFAULT</span>' : ""}
      </div>

      <div class="address-details">
        <h3>${fullName}</h3>
        <span class="phone">+91 ${phone}</span>
        <p class="address-text">${house}, ${street}, ${city}, ${state} - ${pincode}</p>
      </div>

      <div class="address-actions">
        <button class="action-link edit-trigger">Edit</button>
        <button class="action-link delete delete-trigger">Delete</button>
        ${!addr.isDefault
                ? '<button class="action-link set-default set-default-trigger">Set as Default</button>'
                : ""
            }
      </div>
    `;

        card.querySelector(".edit-trigger").addEventListener("click", () => {
            window.location.href = `edit-address.html?id=${id}`;
        });

        card.querySelector(".delete-trigger").addEventListener("click", () =>
            openDeleteConfirm(id)
        );

        const setDefaultBtn = card.querySelector(".set-default-trigger");
        if (setDefaultBtn) {
            setDefaultBtn.addEventListener("click", () => setDefaultAddress(id));
        }

        return card;
    }

    async function deleteAddress() {
        if (!deleteId) return;

        try {
            await apiFetch(`${BASE_URL}/addresses/${deleteId}`, {
                method: "DELETE"
            });

            deleteId = null;
            closeModal();
            loadAddresses();
        } catch (error) {
            console.error("Error deleting address:", error);
            alert(error.message);
        }
    }

    async function setDefaultAddress(id) {
        try {
            await apiFetch(`${BASE_URL}/addresses/${id}/default`, {
                method: "PUT"
            });
            loadAddresses();
        } catch (error) {
            console.error("Error setting default address:", error);
            alert(error.message);
        }
    }

    function closeModal() {
        confirmModal.classList.remove("active");
        document.body.style.overflow = "auto";
    }

    function openDeleteConfirm(id) {
        deleteId = id;
        confirmModal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    // ---------- Events ----------
    addAddressTrigger.addEventListener("click", () => {
        window.location.href = "edit-address.html";
    });

    if (addNewCardBtn) {
        addNewCardBtn.addEventListener("click", () => {
            window.location.href = "edit-address.html";
        });
    }

    cancelDeleteBtn.addEventListener("click", closeModal);
    confirmDeleteBtn.addEventListener("click", deleteAddress);

    window.addEventListener("click", (e) => {
        if (e.target === confirmModal) closeModal();
    });

    // ---------- Init ----------
    loadAddresses();
    fetchSidebarProfile();

    async function fetchSidebarProfile() {
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch(`${BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                const user = data.user;
                if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.fullName || user.name;
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email;
                if (document.getElementById('profileAvatar') && user.avatar) {
                    let avatarSrc = user.avatar;
                    if (avatarSrc.startsWith('uploads/')) {
                        avatarSrc = `${BASE_URL.replace('/api', '')}/${avatarSrc}`;
                    }
                    document.getElementById('profileAvatar').src = avatarSrc;
                }
            }
        } catch (err) {
            console.error("Sidebar profile fetch error:", err);
        }
    }
});
