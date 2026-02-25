const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const API = `${API_BASE}/admin/auth/login`;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("admin-login-form");
    const emailEl = document.getElementById("admin-email");
    const passEl = document.getElementById("admin-password");
    const btn = document.getElementById("admin-login-btn");
    const errEl = document.getElementById("admin-login-error");
    const errText = document.getElementById("error-text");

    // Removed the automatic redirect to products.html if token exists
    // to allow users to access the login page even if they have a token.

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errEl.classList.remove("show"); // Hide error before starting
        errText.textContent = "";

        btn.disabled = true;
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = 'Logging in... <i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: emailEl.value.trim().toLowerCase(),
                    password: passEl.value
                })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Admin login failed");

            localStorage.setItem("adminToken", data.token);
            localStorage.setItem("adminUser", JSON.stringify(data.admin || {}));

            // Redirect to dashboard (index.html) instead of products
            window.location.href = "index.html";
        } catch (err) {
            errText.textContent = err.message;
            errEl.classList.add("show"); // Show the styled error box
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });
});

