document.addEventListener('DOMContentLoaded', () => {
    // API and State
    const urlParams = new URLSearchParams(window.location.search);
    const addressId = urlParams.get('id');

    // DOM Elements
    const addressForm = document.getElementById('edit-address-form');
    const pageTitleAction = document.getElementById('page-title-action');
    const submitBtn = addressForm.querySelector('button[type="submit"]');

    // --- Core Functions ---

    async function initializePage() {
        if (addressId) {
            // Edit Mode
            pageTitleAction.textContent = 'EDIT';
            submitBtn.textContent = 'Save Address Changes';
            await loadAddressDetails(addressId);
        } else {
            // Add Mode
            pageTitleAction.textContent = 'ADD';
            submitBtn.textContent = 'Add Address';
        }
    }

    async function loadAddressDetails(id) {
        try {
            // Since we don't have a single GET /api/addresses/:id on backend, fetch all and filter
            const result = await window.ModVistaAPI.apiCall('/addresses');
            if (!result || !result.success) throw new Error("Failed to fetch addresses");

            const address = result.data.find(addr => (addr._id || addr.id) === id);

            if (address) {
                fillForm(address);
            } else {
                alert('Address not found');
                window.location.href = 'addresses.html';
            }
        } catch (error) {
            console.error('Error loading address:', error);
            alert('Failed to load address details');
        }
    }

    function fillForm(data) {
        document.getElementById('full-name').value = data.fullName || '';
        document.getElementById('mobile-number').value = data.phone || '';
        document.getElementById('house-info').value = data.house || '';
        document.getElementById('street-info').value = data.street || '';
        document.getElementById('landmark').value = data.landmark || '';
        document.getElementById('city').value = data.city || '';
        document.getElementById('pincode').value = data.pincode || '';
        document.getElementById('state').value = data.state || '';

        // Address Type (Radio)
        const typeRadios = document.getElementsByName('address-type');
        typeRadios.forEach(radio => {
            if (radio.value === data.type) {
                radio.checked = true;
            }
        });

        document.getElementById('set-default').checked = data.isDefault || false;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        // Basic validation for phone number (should be 10 digits as per backend)
        const phone = document.getElementById('mobile-number').value;
        if (!/^\d{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        const formData = {
            fullName: document.getElementById('full-name').value,
            phone: phone,
            house: document.getElementById('house-info').value,
            street: document.getElementById('street-info').value,
            landmark: document.getElementById('landmark').value,
            city: document.getElementById('city').value,
            pincode: document.getElementById('pincode').value,
            state: document.getElementById('state').value,
            type: document.querySelector('input[name="address-type"]:checked').value,
            isDefault: document.getElementById('set-default').checked
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = addressId ? 'Saving...' : 'Adding...';

            const url = addressId ? `/addresses/${addressId}` : `/addresses`;
            const method = addressId ? 'PUT' : 'POST';

            await window.ModVistaAPI.apiCall(url, {
                method: method,
                body: JSON.stringify(formData)
            });

            // Redirect back to addresses list
            window.location.href = 'addresses.html';
        } catch (error) {
            console.error('Error saving address:', error);
            alert(error.message || 'Error occurred while saving');
            submitBtn.disabled = false;
            submitBtn.textContent = addressId ? 'Save Address Changes' : 'Add Address';
        }
    }

    // --- Init ---
    if (addressForm) {
        addressForm.addEventListener('submit', handleFormSubmit);
    }
    initializePage();
});
