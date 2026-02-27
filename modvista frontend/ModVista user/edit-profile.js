document.addEventListener('DOMContentLoaded', async () => {
    const editForm = document.getElementById('edit-profile-form');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const saveBtn = document.getElementById('save-btn');

    // Password Visibility Toggle
    const toggleBtns = editForm.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');
            btn.classList.toggle('fa-eye');
            btn.classList.toggle('fa-eye-slash');
        });
    });

    const oldPasswordInput = document.getElementById('old-password');
    const messageBox = document.getElementById('message-box');

    // Avatar elements
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('avatar-preview');
    const uploadAvatarBtn = document.getElementById('upload-avatar-btn');

    // Cropper Elements
    const cropModal = document.getElementById('crop-modal');
    const cropImageElement = document.getElementById('crop-image-element');
    const confirmCropBtn = document.getElementById('confirm-crop-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    let cropper = null;

    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const API_BASE = window.ModVistaAPI ? window.ModVistaAPI.API_BASE : "http://localhost:5000/api";

    // 1. Fetch current data
    try {
        const res = await fetch(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        const data = await res.json();
        if (data.success) {
            currentUserData = data.user;
            nameInput.value = data.user.name;
            phoneInput.value = data.user.phone || '';

            // Update localStorage
            localStorage.setItem('user', JSON.stringify(data.user));

            // Handle Avatar Display
            if (data.user.avatarUrl) {
                const fullAvatarUrl = window.ModVistaAPI.resolveImg(data.user.avatarUrl);
                avatarPreview.src = fullAvatarUrl;
                // Pre-warm the cache for other pages
                localStorage.setItem('userAvatar', fullAvatarUrl);
            }
            fetchSidebarProfile();
        }
    } catch (error) {
        console.error("Error fetching user:", error);
    }

    // 2. Handle submit
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;

        // Simple validation
        if (phone && !/^[0-9]{10}$/.test(phone)) {
            showMessage("Phone must be exactly 10 digits", "error");
            return;
        }

        if (password && password.length < 6) {
            showMessage("Password must be at least 6 characters", "error");
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const payload = { name, phone };
            if (password) {
                if (!oldPasswordInput.value) {
                    showMessage("Current password is required to set a new password", "error");
                    return;
                }
                payload.password = password;
                payload.oldPassword = oldPasswordInput.value;
            }

            const data = await window.ModVistaAPI.apiCall('/users/me', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (data && data.success) {
                showMessage("Profile updated successfully!", "success");
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
            } else {
                showMessage(data.message || "Update failed", "error");
            }

        } catch (error) {
            console.error("Update error:", error);
            showMessage("Server error. Please try again.", "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    });

    // 3. Avatar Crop & Upload Logic
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // 1. Show Crop Modal
                    cropImageElement.src = event.target.result;
                    cropModal.style.display = 'flex';

                    // 2. Initialize Cropper
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(cropImageElement, {
                        aspectRatio: 1, // Force 1:1
                        viewMode: 1,
                        background: false,
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (cancelCropBtn) {
        cancelCropBtn.addEventListener('click', () => {
            cropModal.style.display = 'none';
            if (cropper) cropper.destroy();
            avatarInput.value = ""; // Reset input
        });
    }

    // Modal outside click close
    window.addEventListener('click', (e) => {
        if (e.target === cropModal) {
            cancelCropBtn.click();
        }
    });

    if (confirmCropBtn) {
        confirmCropBtn.addEventListener('click', () => {
            if (!cropper) return;

            // Get Cropped Canvas
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300
            });

            canvas.toBlob(async (blob) => {
                const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
                await uploadAvatar(file);
            }, 'image/jpeg');
        });
    }

    // Standard upload button can also trigger file input
    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', () => avatarInput.click());
    }

    async function uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            confirmCropBtn.disabled = true;
            confirmCropBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            const res = await fetch(`${API_BASE}/users/me/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showMessage("Profile photo updated!", "success");
                const fullAvatarUrl = window.ModVistaAPI.resolveImg(data.avatarUrl);
                avatarPreview.src = fullAvatarUrl;
                localStorage.setItem('userAvatar', fullAvatarUrl);

                // Close Modal
                cropModal.style.display = 'none';
                if (cropper) cropper.destroy();

                if (window.fetchCurrentUserNavbar) {
                    window.fetchCurrentUserNavbar();
                }
            } else {
                showMessage(data.message || "Upload failed", "error");
            }
        } catch (error) {
            console.error("Upload error:", error);
            showMessage("Error uploading file", "error");
        } finally {
            confirmCropBtn.disabled = false;
            confirmCropBtn.innerHTML = 'Crop & Upload';
        }
    }

    // 4. Delete Avatar Logic
    if (document.getElementById('delete-avatar-btn')) {
        document.getElementById('delete-avatar-btn').addEventListener('click', async () => {
            if (!confirm("Are you sure you want to remove your profile photo?")) return;

            const deleteBtn = document.getElementById('delete-avatar-btn');
            try {
                deleteBtn.disabled = true;
                deleteBtn.innerText = "Deleting...";

                const res = await fetch(`${API_BASE}/users/me`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ deleteAvatar: true })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    showMessage("Profile photo removed!", "success");

                    // Reset to default SVG
                    const defaultAvatar = "assets/default-avatar.svg";
                    avatarPreview.src = defaultAvatar;
                    localStorage.setItem('userAvatar', defaultAvatar);

                    if (window.fetchCurrentUserNavbar) {
                        window.fetchCurrentUserNavbar();
                    }
                } else {
                    showMessage(data.message || "Failed to remove photo", "error");
                }
            } catch (error) {
                console.error("Delete avatar error:", error);
                showMessage("Error removing photo", "error");
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerText = "Delete Photo";
            }
        });
    }

    function showMessage(msg, type) {
        messageBox.textContent = msg;
        messageBox.className = type;
        messageBox.style.display = 'block'; // Ensure it's visible

        // Remove existing timeout if any (optional but good)
        if (window.msgTimeout) clearTimeout(window.msgTimeout);

        window.msgTimeout = setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000); // 5 seconds is better
    }

    async function fetchSidebarProfile() {
        if (window.modvista_updateSidebar) {
            window.modvista_updateSidebar();
            return;
        }
        // Fallback if loader not initialized
        try {
            const resp = await fetch(`${API_BASE}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const pData = await resp.json();
            if (pData.success) {
                const user = pData.user;
                if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.name;
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email;

                const avatarLetterEl = document.getElementById("profileAvatarLetter");
                const avatarImgEl = document.getElementById("profileAvatarImg");

                if (user.avatarUrl && avatarImgEl) {
                    avatarImgEl.src = window.ModVistaAPI.resolveImg(user.avatarUrl);
                    avatarImgEl.style.display = "block";
                    if (avatarLetterEl) avatarLetterEl.style.display = "none";
                }
            }
        } catch (err) {
            console.error("Sidebar profile fetch error:", err);
        }
    }
});
