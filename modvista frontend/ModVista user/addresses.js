document.addEventListener("DOMContentLoaded", () => {
    console.log("ModVista API Addresses Loaded ✅");

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

    // ---------- Core ----------
    async function loadAddresses() {
        try {
            const result = await window.ModVistaAPI.apiCall("/addresses");
            addresses = result?.data || [];
            renderAddresses();
        } catch (error) {
            console.error("Error loading addresses:", error);
        }
    }

    function renderAddresses() {
        const existingCards = addressGrid.querySelectorAll(".address-card:not(.add-new-card)");
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
        <span class="phone">+91 ${addr.phone || ""}</span>
        <p class="address-text">${addr.house || ""}, ${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || ""}</p>
      </div>
      <div class="address-actions">
        <button class="action-link edit-trigger">Edit</button>
        <button class="action-link delete delete-trigger">Delete</button>
        ${!addr.isDefault ? '<button class="action-link set-default set-default-trigger">Set as Default</button>' : ""}
      </div>
    `;

        card.querySelector(".edit-trigger").addEventListener("click", () => {
            window.location.href = `edit-address.html?id=${id}`;
        });

        card.querySelector(".delete-trigger").addEventListener("click", () => openDeleteConfirm(id));

        const setDefaultBtn = card.querySelector(".set-default-trigger");
        if (setDefaultBtn) {
            setDefaultBtn.addEventListener("click", () => setDefaultAddress(id));
        }

        return card;
    }

    async function deleteAddress() {
        if (!deleteId) return;
        try {
            await window.ModVistaAPI.apiCall(`/addresses/${deleteId}`, { method: "DELETE" });
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
            await window.ModVistaAPI.apiCall(`/addresses/${id}/default`, { method: "PUT" });
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
    if (addAddressTrigger) addAddressTrigger.addEventListener("click", () => { window.location.href = "edit-address.html"; });
    if (addNewCardBtn) addNewCardBtn.addEventListener("click", () => { window.location.href = "edit-address.html"; });

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
            const data = await window.ModVistaAPI.apiCall("/users/me");
            if (data.success) {
                const user = data.user;
                if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.fullName || user.name;
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email;
                if (document.getElementById('profileAvatar')) {
                    document.getElementById('profileAvatar').src = window.ModVistaAPI.resolveImg(user.avatar);
                }
            }
        } catch (err) {
            console.error("Sidebar profile fetch error:", err);
        }
    }
});
