document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const BASE_URL = 'http://localhost:5000/api';

    // Elements
    const addressForm = document.getElementById('edit-address-form');
    const pageTitleAction = document.getElementById('page-title-action');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    const submitBtnText = document.querySelector('.submit-btn');

    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const addressId = urlParams.get('id');

    // --- Helper Functions ---

    function getToken() {
        return localStorage.getItem("token");
    }

    async function apiFetch(url, options = {}) {
        const token = getToken();

        const res = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "API Error");
        return data;
    }

    // --- Core Functions ---

    async function initializePage() {
        if (addressId) {
            // Edit Mode
            pageTitleAction.textContent = 'EDIT';
            breadcrumbCurrent.textContent = 'Edit Address';
            submitBtnText.textContent = 'Save Address Changes';
            await loadAddressDetails(addressId);
        } else {
            // Add Mode
            pageTitleAction.textContent = 'ADD';
            breadcrumbCurrent.textContent = 'Add New Address';
            submitBtnText.textContent = 'Add Address';
        }
    }

    async function loadAddressDetails(id) {
        try {
            // Since we don't have a GET /api/addresses/:id yet, we find it from the list
            // Optimization: Fetch all and find
            const result = await apiFetch(`${BASE_URL}/addresses`);
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

        const formData = {
            fullName: document.getElementById('full-name').value,
            phone: document.getElementById('mobile-number').value,
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
            const url = addressId ? `${BASE_URL}/addresses/${addressId}` : `${BASE_URL}/addresses`;
            const method = addressId ? 'PUT' : 'POST';

            await apiFetch(url, {
                method: method,
                body: JSON.stringify(formData)
            });

            // Redirect back to addresses list
            window.location.href = 'addresses.html';
        } catch (error) {
            console.error('Error saving address:', error);
            alert(error.message);
        }
    }

    // --- Init ---
    addressForm.addEventListener('submit', handleFormSubmit);
    initializePage();
});
