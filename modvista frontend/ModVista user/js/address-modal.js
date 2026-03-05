/**
 * ModVista - Reusable Address Modal
 * Handles adding and editing addresses from any page.
 */

(function () {
    let onSaveSuccessCallback = null;
    let currentEditId = null;

    function getAPI() {
        return window.ModVistaAPI;
    }

    // Initialize Modal on Page Load
    document.addEventListener("DOMContentLoaded", () => {
        if (!document.getElementById("address-modal-container")) {
            const modalHTML = `
                <div class="address-modal-overlay" id="address-modal-container">
                    <div class="address-modal-content">
                        <div class="address-modal-header">
                            <h2 id="modal-title-text">Add New Address</h2>
                            <button class="close-modal-btn" onclick="closeAddressModal()">&times;</button>
                        </div>
                        <form id="address-modal-form" onsubmit="submitAddressForm(event)">
                            <div class="form-row">
                                <div class="input-group">
                                    <label>Full Name *</label>
                                    <input type="text" id="modal-fullName" placeholder="Recipient Name" required>
                                </div>
                                <div class="input-group">
                                    <label>Phone Number *</label>
                                    <input type="tel" id="modal-phone" placeholder="10-digit number" required pattern="[0-9]{10}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="input-group">
                                    <label>Pincode *</label>
                                    <input type="text" id="modal-pincode" placeholder="6-digit Pincode" required pattern="[0-9]{6}">
                                </div>
                                <div class="input-group">
                                    <label>House/Building No. *</label>
                                    <input type="text" id="modal-house" placeholder="Flat, House no., Building" required>
                                </div>
                            </div>
                            <div class="input-group">
                                <label>Area/Street/Sector *</label>
                                <input type="text" id="modal-area" placeholder="Area, Street, Sector, Village" required>
                            </div>
                            <div class="form-row">
                                <div class="input-group">
                                    <label>City *</label>
                                    <input type="text" id="modal-city" placeholder="Town/City" required>
                                </div>
                                <div class="input-group">
                                    <label>State *</label>
                                    <input type="text" id="modal-state" placeholder="State" required>
                                </div>
                            </div>
                            <div class="input-group">
                                <label>Landmark (Optional)</label>
                                <input type="text" id="modal-landmark" placeholder="E.g. Near Apollo Hospital">
                            </div>
                            <div class="address-type-group">
                                <label>Address Type</label>
                                <div class="type-options">
                                    <label><input type="radio" name="addressType" value="Home" checked> Home</label>
                                    <label><input type="radio" name="addressType" value="Work"> Work</label>
                                    <label><input type="radio" name="addressType" value="Other"> Other</label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="cancel-modal-btn" onclick="closeAddressModal()">Cancel</button>
                                <button type="submit" class="save-modal-btn">Save Address</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    });

    // Expose Global Functions
    window.openAddressModal = function (callback = null, existingAddress = null) {
        const modal = document.getElementById("address-modal-container");
        if (!modal) return;

        const titleText = document.getElementById("modal-title-text");
        const form = document.getElementById("address-modal-form");

        currentEditId = null;
        form.reset();

        if (existingAddress) {
            currentEditId = existingAddress._id || existingAddress.id;
            titleText.innerText = "Edit Address";

            // Populate form
            document.getElementById("modal-fullName").value = existingAddress.fullName || "";
            document.getElementById("modal-phone").value = existingAddress.phone || "";
            document.getElementById("modal-pincode").value = existingAddress.pincode || "";
            document.getElementById("modal-house").value = existingAddress.house || "";
            document.getElementById("modal-area").value = existingAddress.street || "";
            document.getElementById("modal-city").value = existingAddress.city || "";
            document.getElementById("modal-state").value = existingAddress.state || "";
            document.getElementById("modal-landmark").value = existingAddress.landmark || "";

            const typeRadio = form.querySelector(`input[name="addressType"][value="${existingAddress.type}"]`);
            if (typeRadio) typeRadio.checked = true;
        } else {
            titleText.innerText = "Add New Address";
        }

        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        onSaveSuccessCallback = callback;
    };

    window.closeAddressModal = function () {
        const modal = document.getElementById("address-modal-container");
        if (modal) {
            modal.classList.remove("active");
            document.body.style.overflow = "auto";
            document.getElementById("address-modal-form").reset();
            currentEditId = null;
        }
    };

    window.submitAddressForm = async function (event) {
        event.preventDefault();
        const api = getAPI();

        if (!api || !api.apiCall) {
            console.error("ModVistaAPI not found!");
            return;
        }

        const form = document.getElementById("address-modal-form");
        const submitBtn = form.querySelector('.save-modal-btn');
        const originalBtnText = submitBtn.innerText;

        // Validation
        const phone = document.getElementById("modal-phone").value;
        const pincode = document.getElementById("modal-pincode").value;

        if (!/^[0-9]{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit phone number.");
            return;
        }
        if (!/^[0-9]{5,6}$/.test(pincode)) {
            alert("Please enter a valid pincode.");
            return;
        }

        const formData = {
            fullName: document.getElementById("modal-fullName").value,
            phone: phone,
            pincode: pincode,
            house: document.getElementById("modal-house").value,
            street: document.getElementById("modal-area").value,
            city: document.getElementById("modal-city").value,
            state: document.getElementById("modal-state").value,
            landmark: document.getElementById("modal-landmark").value,
            type: form.querySelector('input[name="addressType"]:checked').value
        };

        try {
            submitBtn.innerText = "Saving...";
            submitBtn.disabled = true;

            const url = currentEditId ? `/addresses/${currentEditId}` : '/addresses';
            const method = currentEditId ? 'PUT' : 'POST';

            const result = await api.apiCall(url, {
                method: method,
                body: JSON.stringify(formData)
            });

            if (result && result.success) {
                // Success
                window.closeAddressModal();
                if (onSaveSuccessCallback && typeof onSaveSuccessCallback === 'function') {
                    onSaveSuccessCallback(result.data);
                } else if (window.loadAddresses) {
                    window.loadAddresses();
                }
            } else {
                throw new Error(result.message || "Failed to save address");
            }
        } catch (error) {
            console.error("Address Save Error:", error);
            alert(error.message || "Something went wrong. Please try again.");
        } finally {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    };
})();
