document.addEventListener("DOMContentLoaded", () => {
    // DOM
    const addAddressTrigger = document.getElementById("add-address-trigger");
    const addNewCardBtn = document.getElementById("add-new-card-btn");
    const cancelDeleteBtn = document.getElementById("cancel-delete");
    const confirmDeleteBtn = document.getElementById("confirm-delete");
    const confirmModal = document.getElementById("confirm-modal");
    const addressGrid = document.getElementById("address-grid");
    const emptyState = document.getElementById("empty-state");

    // State
    let addresses = [];
    let deleteId = null;

    // ---------- Core ----------
    window.loadAddresses = async function () {
        try {
            const result = await window.ModVistaAPI.apiCall("/addresses");
            addresses = result?.data || [];
            renderAddresses();
        } catch (error) {
            console.error("Error loading addresses:", error);
            addressGrid.innerHTML = `<p class="error-msg" style="display:block; text-align:center; grid-column: 1/-1;">Error loading addresses. Please try again.</p>`;
        }
    }

    function renderAddresses() {
        // Keep the "Add New Card" if it exists, clear others
        const cards = Array.from(addressGrid.querySelectorAll(".address-card"));
        cards.forEach(card => {
            if (!card.classList.contains('add-new-card')) {
                card.remove();
            }
        });

        if (!addresses || addresses.length === 0) {
            emptyState.style.display = "block";
            addressGrid.style.display = "none";
            if (addAddressTrigger) addAddressTrigger.style.display = "none";
            return;
        }

        emptyState.style.display = "none";
        addressGrid.style.display = "grid";
        if (addAddressTrigger) addAddressTrigger.style.display = "block";

        addresses.forEach((addr) => {
            const card = createAddressCard(addr);
            addressGrid.appendChild(card);
        });
    }

    function createAddressCard(addr) {
        const card = document.createElement("div");
        const id = addr._id || addr.id;
        const fullName = addr.fullName || "User";
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
    if (addAddressTrigger) {
        addAddressTrigger.addEventListener("click", () => {
            window.openAddressModal(() => window.loadAddresses());
        });
    }

    if (addNewCardBtn) {
        addNewCardBtn.addEventListener("click", () => {
            window.openAddressModal(() => window.loadAddresses());
        });
    }

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", deleteAddress);

    window.addEventListener("click", (e) => {
        if (e.target === confirmModal) closeModal();
    });

    // ---------- Init ----------
    loadAddresses();
});
