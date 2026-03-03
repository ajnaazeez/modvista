/**
 * ModVista - Reusable Address Modal
 * Handles adding new addresses from any page.
 */

(function () {
    const apiCall = window.ModVistaAPI ? window.ModVistaAPI.apiCall : null;
    let onSaveSuccessCallback = null;

    // Initialize Modal on Page Load
    document.addEventListener("DOMContentLoaded", () => {
        if (!document.getElementById("address-modal-container")) {
            const modalHTML = `
                <div class="address-modal-overlay" id="address-modal-container">
                    <div class="address-modal-content">
                        <div class="address-modal-header">
                            <h2>Add New Address</h2>
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
    window.openAddressModal = function (callback = null) {
        const modal = document.getElementById("address-modal-container");
        if (modal) {
            modal.classList.add("active");
            document.body.style.overflow = "hidden";
            onSaveSuccessCallback = callback;
        }
    };

    window.closeAddressModal = function () {
        const modal = document.getElementById("address-modal-container");
        if (modal) {
            modal.classList.remove("active");
            document.body.style.overflow = "auto";
            document.getElementById("address-modal-form").reset();
        }
    };

    window.submitAddressForm = async function (event) {
        event.preventDefault();

        if (!apiCall) {
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
        if (!/^[0-9]{6}$/.test(pincode)) {
            alert("Please enter a valid 6-digit pincode.");
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

            const result = await apiCall('/addresses', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (result && result.success) {
                // Success
                alert("Address saved successfully!");
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
