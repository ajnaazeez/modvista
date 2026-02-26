/**
 * apiFetch: Reusable fetch helper that handles JWT and 401 auto-logout
 */
async function apiFetch(endpoint, options = {}) {
    const apiBase = (window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api";
    // If endpoint already starts with /api, remove it to avoid double /api/api
    const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
    const url = `${apiBase}${cleanEndpoint}`;

    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401 || response.status === 403) {
        let message = response.status === 401 ? "Session expired. Please login again." : "Access denied. Your account may be deactivated.";
        console.warn(`${response.status} Forbidden/Unauthorized! clearing token...`);
        localStorage.removeItem("token");
        window.location.href = "login.html";
        throw new Error(message);
    }

    return response;
}

/**
 * Global Logout handlers
 */
window.openLogoutModal = function () {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('show');
};

window.closeLogoutModal = function () {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('show');
};

window.logoutNow = function () {
    if (window.ModVistaAPI && window.ModVistaAPI.logout) {
        window.ModVistaAPI.logout();
    } else {
        localStorage.removeItem("token");
        localStorage.removeItem("pendingEmail");
        localStorage.removeItem("userAvatar");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
};

// Keep existing logout for backward compatibility but make it trigger the modal
window.logout = function () {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        window.openLogoutModal();
    } else {
        window.logoutNow();
    }
};

// Global listener for modal closure (ESC and Outside Click)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeLogoutModal();
});

document.addEventListener('click', (e) => {
    const modalOverlay = document.getElementById('logoutModal');
    if (e.target === modalOverlay) {
        window.closeLogoutModal();
    }
});

// Navigation Background Change on Scroll
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

window.addEventListener('scroll', () => {
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Google Auth Configuration
const GOOGLE_CLIENT_ID = "983493563407-atoh4mv34ubcrb3j2kisjjhe0ii6pr5s.apps.googleusercontent.com"; // User should replace this

/**
 * Global Navbar Search Handler
 */
function initGlobalSearch() {
    const searchInputs = document.querySelectorAll('.nav-search input');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
            }
        });

        // Icon click handler
        const icon = input.nextElementSibling;
        if (icon && icon.classList.contains('fa-search')) {
            icon.addEventListener('click', () => {
                const query = input.value.trim();
                window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobalSearch();
});

// Initialize Google Auth with optional retry
function initGoogleAuth(retryCount = 0) {
    const hasGoogleButtons = !!(
        document.getElementById('custom-google-signup') ||
        document.getElementById('custom-google-login') ||
        document.getElementById('google-signup-btn') ||
        document.getElementById('google-login-btn')
    );

    if (typeof google === 'undefined') {
        if (hasGoogleButtons && retryCount < 10) {
            console.log(`Google GIS script not loaded yet, retrying... (${retryCount + 1})`);
            setTimeout(() => initGoogleAuth(retryCount + 1), 500);
        } else if (hasGoogleButtons && retryCount >= 10) {
            console.warn("Google GIS script failed to load after several retries.");
        }
        return;
    }

    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID_HERE")) {
        console.error("❌ Google Client ID is missing! Please update GOOGLE_CLIENT_ID in script.js");

        // Update custom buttons to show the missing ID warning
        const signupBtn = document.getElementById('custom-google-signup');
        if (signupBtn) {
            signupBtn.innerHTML = '<span>Google Client ID Missing</span>';
            signupBtn.style.opacity = '0.5';
            signupBtn.style.cursor = 'not-allowed';
        }
        const loginBtn = document.getElementById('custom-google-login');
        if (loginBtn) {
            loginBtn.innerHTML = '<span>Google Client ID Missing</span>';
            loginBtn.style.opacity = '0.5';
            loginBtn.style.cursor = 'not-allowed';
        }
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
    });

    // Use a small delay to ensure offsetWidth is calculated correctly after layout
    setTimeout(() => {
        const signupBtn = document.getElementById('google-signup-btn');
        if (signupBtn) {
            google.accounts.id.renderButton(signupBtn, {
                theme: 'filled_black',
                size: 'large',
                shape: 'rectangular',
                width: signupBtn.parentElement.offsetWidth || 350,
                text: 'signup_with',
                logo_alignment: 'left'
            });
        }

        const loginBtn = document.getElementById('google-login-btn');
        if (loginBtn) {
            google.accounts.id.renderButton(loginBtn, {
                theme: 'filled_black',
                size: 'large',
                shape: 'rectangular',
                width: loginBtn.parentElement.offsetWidth || 350,
                text: 'signin_with',
                logo_alignment: 'left'
            });
        }
    }, 100);
}

async function handleGoogleResponse(response) {
    try {
        const apiBase = (window.ModVistaAPI && window.ModVistaAPI.API_BASE) || "http://localhost:5000/api";
        const res = await fetch(`${apiBase}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.user.avatarUrl) {
                localStorage.setItem("userAvatar", window.ModVistaAPI.resolveImg(data.user.avatarUrl));
            }

            if (typeof window.showToast === 'function') {
                window.showToast('Logged in with Google!', 'success');
            } else {
                alert('Logged in with Google!');
            }

            setTimeout(() => {
                window.location.href = "profile.html";
            }, 1000);
        } else {
            throw new Error(data.message || 'Google authentication failed');
        }
    } catch (error) {
        console.error('Google Auth Error:', error);
        alert(error.message);
    }
}

// Call init on load
window.addEventListener('load', initGoogleAuth);

// Mobile Menu Toggle
if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');

        // Hamburger Animation
        const spans = hamburger.querySelectorAll('span');
        if (spans.length >= 3) {
            if (hamburger.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -8px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    });
}

// Close Mobile Menu on Link Click
document.querySelectorAll('.nav-link, .cart-icon-wrapper').forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu && navMenu.classList.contains('active')) {
            if (hamburger) hamburger.click();
        }
    });
});

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Product Details - Thumbnail Switching
const mainImg = document.getElementById('main-img');
const thumbs = document.querySelectorAll('.thumb');

if (mainImg && thumbs.length > 0) {
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // Update Main Image
            const newSrc = thumb.querySelector('img').src;
            mainImg.src = newSrc;

            // Update Active Thumbnail
            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });
}
// Product Details - Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

if (tabBtns.length > 0) {
    tabBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // Update Active Button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Active Pane
            tabPanes.forEach(p => p.classList.remove('active'));
            tabPanes[index].classList.add('active');
        });
    });
}

/* --- Global Wishlist Logic --- */

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalBadges();
    initializeWishlistButtons();

    // Auth & Dropdown Initialization
    toggleNavbarAuth();
    fetchCurrentUserNavbar();
    initUserDropdown();
});

// Real-time Badge Sync
window.addEventListener('storage', () => updateGlobalBadges());
window.addEventListener('wishlistUpdated', () => updateGlobalBadges());
window.addEventListener('cartUpdated', () => updateGlobalBadges()); // Assuming this might be used

// Toggle Wishlist Item
window.toggleWishlist = async function (btn, productId = null) {
    if (typeof window.WishlistActions !== 'undefined') {
        // If the specific page has WishlistActions, use it
        // Support both data-id (old) and data-product-id (new)
        const id = productId || btn.closest('.product-card')?.getAttribute('data-id') || btn.closest('.product-card')?.getAttribute('data-product-id');
        if (!id) return;

        btn.disabled = true;
        const success = await window.WishlistActions.toggleWishlist(id);
        btn.disabled = false;

        if (success) {
            const icon = btn.querySelector('i');
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            icon.style.color = icon.classList.contains('fas') ? '#ff4757' : '';
        }
    } else {
        // Fallback for pages without WishlistActions - check if logged in
        const token = localStorage.getItem("token");
        if (!token) {
            showToast('Please login to use wishlist', 'error');
            return;
        }

        // Simple implementation using apiFetch
        const id = productId || btn.closest('.product-card')?.getAttribute('data-id') || btn.closest('.product-card')?.getAttribute('data-product-id');
        if (!id) return;

        try {
            btn.disabled = true;
            // First check if it's in wishlist (this is a bit slow without centralized state, but works)
            const res = await apiFetch("/api/wishlist");
            const data = await res.json();
            const wishlist = data.data || [];
            const isInWishlist = wishlist.some(item => (item._id || item) === id);

            let actionRes;
            if (isInWishlist) {
                actionRes = await apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' });
            } else {
                actionRes = await apiFetch(`/api/wishlist/${id}`, { method: 'POST' });
            }

            if (actionRes.ok) {
                const icon = btn.querySelector('i');
                icon.classList.toggle('far');
                icon.classList.toggle('fas');
                icon.style.color = icon.classList.contains('fas') ? '#ff4757' : '';
                showToast(isInWishlist ? 'Removed from Wishlist' : 'Added to Wishlist', 'success');
                updateGlobalBadges();
            }
        } catch (err) {
            console.error('Toggle failed:', err);
        } finally {
            btn.disabled = false;
        }
    }
};

// Helper: Generate ID (if missing)
function generateIdFromTitle(card) {
    const title = card.querySelector('h3').innerText;
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Update Badges in Navbar
async function updateGlobalBadges() {
    const token = localStorage.getItem("token");
    const cartBadge = document.querySelector(".cart-count-badge");
    const wishBadge = document.getElementById('wishlist-badge');

    if (!token) {
        if (cartBadge) cartBadge.style.display = 'none';
        if (wishBadge) wishBadge.style.display = 'none';
        return;
    }

    try {
        // Fetch cart and wishlist in parallel
        const [cartRes, wishRes] = await Promise.all([
            apiFetch("/api/cart").catch(() => null),
            apiFetch("/api/wishlist").catch(() => null)
        ]);

        if (cartRes && cartRes.ok) {
            const data = await cartRes.json();
            const count = (data.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            if (cartBadge) {
                cartBadge.textContent = count;
                cartBadge.style.display = count > 0 ? "flex" : "none";
            }
        }

        if (wishRes && wishRes.ok) {
            const data = await wishRes.json();
            const count = (data.data || []).length;
            if (wishBadge) {
                wishBadge.textContent = count;
                wishBadge.style.display = count > 0 ? "flex" : "none";
            }
        }
    } catch (err) {
        console.error('Badge update failed:', err);
    }
}

// Initialize Button States (on page load)
async function initializeWishlistButtons() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await apiFetch("/api/wishlist");
        if (!res.ok) return;
        const data = await res.json();
        const wishlist = data.data || [];
        const wishIds = wishlist.map(item => item._id || item);

        const buttons = document.querySelectorAll('.wishlist-btn');
        buttons.forEach(btn => {
            const card = btn.closest('.product-card');
            if (!card) return;
            const id = card.getAttribute('data-id') || card.getAttribute('data-product-id');
            if (!id) return;

            const exists = wishIds.includes(id);
            const icon = btn.querySelector('i');
            if (exists) {
                btn.classList.add('active');
                if (icon) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    icon.style.color = '#ff4757';
                }
            } else {
                btn.classList.remove('active');
                if (icon) {
                    icon.classList.add('far');
                    icon.classList.remove('fas');
                    icon.style.color = '';
                }
            }
        });
    } catch (err) {
        console.error('Init wishlist buttons failed:', err);
    }
}

// Helper: Toast Notification (Global) -> Check if already exists in cart-script or reuse
// If not existing, we add a simple one here. 
if (typeof window.showToast !== 'function') {
    window.showToast = function (message, type = 'normal') {
        const toast = document.createElement('div');
        toast.className = 'cart-toast show'; // Reuse existing styles
        // Ensure styles exist or inline them if needed, but we rely on style.css
        if (type === 'success') toast.style.borderColor = 'var(--neon-red)';

        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
}

/* --- Global Cart Badge Logic (Backend-Connected) --- */
// Initialized in the main DOMContentLoaded block above

/**
 * Initialize User Dropdown Logic
 */
function initUserDropdown() {
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenu && userDropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle visibility
            const isShown = userDropdown.classList.toggle('show');
            userMenu.classList.toggle('active', isShown);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userDropdown.classList.remove('show');
                userMenu.classList.remove('active');
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                userDropdown.classList.remove('show');
                userMenu.classList.remove('active');
            }
        });
    }
}

/**
 * Fetch current user for navbar display
 */
window.fetchCurrentUserNavbar = async function () {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await apiFetch("/api/users/me");
        if (res.ok) {
            const data = await res.json();
            const userNameDisplay = document.getElementById('navUserName');
            const userAvatarImg = document.getElementById('navAvatar');

            if (userNameDisplay) {
                const name = data.user.name.split(' ')[0];
                userNameDisplay.textContent = name;

                // Set up avatar fallback using the name
                if (userAvatarImg) {
                    setupAvatarFallback(userAvatarImg, data.user.name);

                    if (data.user.avatarUrl) {
                        userAvatarImg.src = window.ModVistaAPI.resolveImg(data.user.avatarUrl);
                        userAvatarImg.style.display = 'block';
                    } else {
                        // Trigger fallback immediately if no URL
                        userAvatarImg.onerror();
                    }
                }
            }

            // Also store in session storage for profile page speed
            sessionStorage.setItem('tempUser', JSON.stringify(data.user));
        }
    } catch (error) {
        console.error("Error fetching navbar user data:", error.message);
    }
}

/**
 * Avatar Fallback Logic
 * Shows a letter bubble if image fails or is missing
 */
function setupAvatarFallback(imgElement, fullName) {
    if (!imgElement || !fullName) return;

    imgElement.onerror = () => {
        const firstLetter = fullName.charAt(0).toUpperCase();
        const fallback = document.createElement('div');
        fallback.className = 'avatar-fallback';
        fallback.textContent = firstLetter;

        // Transfer IDs or classes if needed for styling consistency
        if (imgElement.id === 'navAvatar') {
            fallback.id = 'navAvatarFallback';
        }

        imgElement.style.display = 'none';

        // Only insert if not already there
        if (!imgElement.parentNode.querySelector('.avatar-fallback')) {
            imgElement.parentNode.insertBefore(fallback, imgElement);
        }
    };
}

/**
 * Navbar Toggle Logic
 * Handles hiding/showing Login, Signup, and Profile links based on token
 */
function toggleNavbarAuth() {
    const token = localStorage.getItem("token");

    // Selectors for specific elements
    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    const userMenu = document.getElementById('userMenu'); // Updated to use ID
    const profileMenuItem = document.querySelector('.nav-menu a[href="profile.html"]');

    if (token) {
        // Logged In: Hide Login/Signup, Show User Menu
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "none";
        if (userMenu) userMenu.style.display = "flex";
        if (profileMenuItem) {
            const parentLi = profileMenuItem.closest('li');
            if (parentLi) parentLi.style.display = "block";
            else profileMenuItem.style.display = "block";
        }
    } else {
        // Logged Out: Show Login/Signup, Hide User Menu
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (signupBtn) signupBtn.style.display = "inline-block";
        if (userMenu) userMenu.style.display = "none";
        if (profileMenuItem) {
            const parentLi = profileMenuItem.closest('li');
            if (parentLi) parentLi.style.display = "none";
            else profileMenuItem.style.display = "none";
        }
    }
}

// Update sidebar avatar with initial
function updateSidebarAvatar() {
    const userJson = localStorage.getItem("user");
    if (!userJson) return;

    try {
        const user = JSON.parse(userJson);
        const name = user.fullname || user.name || "User";
        const initial = name.trim().charAt(0).toUpperCase();

        const avatarEl = document.getElementById("profileAvatar");
        if (avatarEl && avatarEl.classList.contains("profile-avatar-letter")) {
            avatarEl.textContent = initial;
        }

        // Also update the name and email in sidebar if they exist
        const nameEl = document.getElementById("profileName");
        if (nameEl) nameEl.textContent = name;

        const emailEl = document.getElementById("profileEmail");
        if (emailEl) emailEl.textContent = user.email || "";

    } catch (e) {
        console.error("Error updating sidebar avatar:", e);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', updateSidebarAvatar);

// Legacy function now redirected to the new one
window.updateGlobalCartBadgeBackend = updateGlobalBadges;

// Load Sidebar Component
async function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    try {
        const response = await fetch('sidebar.html');
        if (!response.ok) throw new Error('Failed to load sidebar');

        const html = await response.text();
        sidebarContainer.innerHTML = html;

        // Update Avatar and Info
        updateSidebarAvatar();

        // Set Active State
        const path = window.location.pathname;
        const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');

        menuItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');

            if (href) {
                if (path.includes('profile.html') && href.includes('profile.html')) {
                    item.classList.add('active');
                } else if ((path.includes('addresses.html') || path.includes('edit-address.html')) && href.includes('addresses.html')) {
                    item.classList.add('active');
                } else if (path.includes('wallet.html') && href.includes('wallet.html')) {
                    item.classList.add('active');
                }
            }
        });

    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadSidebar);

/* --- Signup Page Logic --- */
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    const signupBtn = document.getElementById('signup-btn');
    const inputs = signupForm.querySelectorAll('input');

    // Password Visibility Toggle
    const toggleButtons = signupForm.querySelectorAll('.toggle-password');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            if (passwordInput) {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

                // Toggle icon class
                btn.classList.toggle('fa-eye');
                btn.classList.toggle('fa-eye-slash');
            }
        });
    });

    // Function to check if all fields are filled
    const validateForm = () => {
        let allFilled = true;
        inputs.forEach(input => {
            if (!input.value.trim()) allFilled = false;
        });
        if (signupBtn) signupBtn.disabled = !allFilled;
    };

    // Listen to input changes
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });

    // Initial check (if browser auto-fills)
    validateForm();

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (password !== confirmPassword) {
            const errorEl = document.getElementById('confirmPassword-error');
            if (errorEl) {
                errorEl.textContent = "Passwords do not match";
                errorEl.classList.add('visible');
            } else {
                alert("Passwords do not match");
            }
            return;
        }

        const formData = {
            fullname: document.getElementById('fullname')?.value.trim(),
            email: document.getElementById('email')?.value.trim().toLowerCase(),
            phone: document.getElementById('phone')?.value.trim(),
            password,
            confirmPassword
        };

        try {
            if (signupBtn) {
                signupBtn.disabled = true;
                signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            }

            const apiBase = (window.ModVistaAPI && window.ModVistaAPI.API_BASE) ? window.ModVistaAPI.API_BASE.replace('/api', '') : 'http://localhost:5000';

            const res = await fetch(`${apiBase}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Signup failed');
            }

            // Success: Redirect to OTP page
            if (typeof window.showToast === 'function') {
                window.showToast('Registration successful! Check your email for OTP.', 'success');
            } else {
                alert('Registration successful! Check your email for OTP.');
            }

            setTimeout(() => {
                window.location.href = `otp.html?email=${encodeURIComponent(formData.email)}`;
            }, 1500);

        } catch (error) {
            console.error('Signup Error:', error);
            alert(error.message);
            if (signupBtn) {
                signupBtn.disabled = false;
                signupBtn.innerHTML = 'Sign Up';
            }
        }
    });
});
