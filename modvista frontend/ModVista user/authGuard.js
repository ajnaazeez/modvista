/**
 * authGuard.js
 * Handles route protection and logout functionality.
 */

function requireAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        // Not logged in, redirect to login
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Remove the global logout() function to avoid SyntaxErrors with api.js
// Pages should use window.logout() from script.js or ModVistaAPI.logout()

// Optional: check session on script load for immediate redirect
// This avoids content flicker if placed in the head
if (typeof shouldAutoCheckAuth !== 'undefined' && shouldAutoCheckAuth) {
    requireAuth();
}
