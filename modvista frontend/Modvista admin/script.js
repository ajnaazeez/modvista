document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const profileToggle = document.getElementById('profileToggle');
    const profileDropdown = document.getElementById('profileDropdown');
    const adminLoginBtn = document.getElementById('adminLoginBtn');

    // --- Authentication & Session Logic ---
    const updateAuthUI = () => {
        const token = localStorage.getItem("adminToken");
        if (token) {
            if (adminLoginBtn) adminLoginBtn.style.display = 'none';
            if (profileToggle) profileToggle.style.display = 'flex';
        } else {
            if (adminLoginBtn) adminLoginBtn.style.display = 'flex';
            if (profileToggle) profileToggle.style.display = 'none';
        }
    };

    const logout = () => {
        console.log("Logging out admin...");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        window.location.href = "admin-login.html";
    };

    // Initial UI update
    updateAuthUI();

    // Bind Logout events
    document.querySelectorAll('.logout-action, .logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    // Sidebar Toggle
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Profile Dropdown Toggle
    if (profileToggle && profileDropdown) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileToggle.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    // Menu Item click handling
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // On mobile, close sidebar after selection
            if (window.innerWidth <= 1024 && sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });
});
