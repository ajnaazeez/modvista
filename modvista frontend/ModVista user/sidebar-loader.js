document.addEventListener("DOMContentLoaded", async () => {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    try {
        // 1. Fetch Sidebar HTML
        const response = await fetch("sidebar.html");
        if (!response.ok) throw new Error("Failed to load sidebar");
        const sidebarHTML = await response.text();
        sidebarContainer.innerHTML = sidebarHTML;

        // 2. Highlight Active Menu Item
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");

        menuItems.forEach(item => {
            // Remove hardcoded active classes from HTML
            item.classList.remove("active");

            // Get href from button (using onclick extraction for buttons or href for anchors)
            let href = item.getAttribute("href");
            if (!href && item.getAttribute("onclick")) {
                const match = item.getAttribute("onclick").match(/window\.location\.href='([^']+)'/);
                if (match) href = match[1];
            }

            if (href === currentPath) {
                item.classList.add("active");
            }
        });

        // 3. User Info & Avatar Logic
        updateSidebarUserInfo();

    } catch (error) {
        console.error("Sidebar Loader Error:", error);
    }
});

function updateSidebarUserInfo() {
    // Try to get user data from localStorage
    const userStr = localStorage.getItem("user") || localStorage.getItem("modvista_user");
    let user = userStr ? JSON.parse(userStr) : null;

    // Fallback if no user object, try individual keys
    const name = user?.name || localStorage.getItem("userName") || localStorage.getItem("name") || "User";
    const email = user?.email || localStorage.getItem("userEmail") || "user@example.com";

    // Update Text
    const nameEl = document.getElementById("profileName");
    const emailEl = document.getElementById("profileEmail");

    if (nameEl) nameEl.innerText = name;
    if (emailEl) emailEl.innerText = email;

    // Avatar Logic (First Letter)
    const avatarEl = document.getElementById("profileAvatar");
    if (avatarEl) {
        const initial = name.trim().charAt(0).toUpperCase() || "A";
        avatarEl.innerText = initial;

        // Ensure no image is interfering if styles try to put one
        avatarEl.style.backgroundImage = "none";
    }
}
