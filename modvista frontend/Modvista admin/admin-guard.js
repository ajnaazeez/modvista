const requireAdminAuth = () => {
    const token = localStorage.getItem("adminToken");
    const currentPage = window.location.pathname.split("/").pop();

    // Pages that don't require authentication
    const publicPages = ["admin-login.html", "admin-signup.html"];

    if (!token && !publicPages.includes(currentPage) && currentPage !== "") {
        console.log("No admin token found. Redirecting to login...");
        window.location.href = "admin-login.html";
        return false;
    }
    return true;
};

// Auto-run on load for immediate protection
(function () {
    requireAdminAuth();
})();
