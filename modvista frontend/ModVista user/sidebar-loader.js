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

window.modvista_updateSidebar = updateSidebarUserInfo;

function updateSidebarUserInfo() {
    // Try to get user data from localStorage
    const userStr = localStorage.getItem("user") || localStorage.getItem("modvista_user");
    let user = userStr ? JSON.parse(userStr) : null;

    // Fallback if no user object, try individual keys
    const name = user?.name || user?.fullname || localStorage.getItem("userName") || localStorage.getItem("name") || "User";
    const email = user?.email || localStorage.getItem("userEmail") || "user@example.com";

    // Update Text
    const nameEl = document.getElementById("profileName");
    const emailEl = document.getElementById("profileEmail");

    if (nameEl) nameEl.innerText = name;
    if (emailEl) emailEl.innerText = email;

    // Avatar Logic
    const avatarLetterEl = document.getElementById("profileAvatarLetter");
    const avatarImgEl = document.getElementById("profileAvatarImg");

    // Prioritize userAvatar if it's already resolved, otherwise use user object
    const avatarUrl = localStorage.getItem("userAvatar") || user?.avatarUrl;

    if (avatarUrl && avatarImgEl) {
        avatarImgEl.src = window.ModVistaAPI.resolveImg(avatarUrl);
        avatarImgEl.style.display = "block";
        if (avatarLetterEl) avatarLetterEl.style.display = "none";
    } else if (avatarLetterEl) {
        const initial = name.trim().charAt(0).toUpperCase() || "A";
        avatarLetterEl.innerText = initial;
        avatarLetterEl.style.display = "flex";
        if (avatarImgEl) avatarImgEl.style.display = "none";
    }
}
