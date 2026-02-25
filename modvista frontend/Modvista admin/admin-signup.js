const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const API = `${API_BASE}/admin/auth/signup`;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("admin-signup-form");
    const nameEl = document.getElementById("admin-name");
    const emailEl = document.getElementById("admin-email");
    const phoneEl = document.getElementById("admin-phone");
    const passEl = document.getElementById("admin-password");
    const btn = document.getElementById("admin-signup-btn");
    const errEl = document.getElementById("admin-signup-error");
    const errText = document.getElementById("error-text");

    const showError = (msg) => {
        errText.textContent = msg;
        errEl.classList.add("show");
        errEl.style.display = 'flex';
    };

    const hideError = () => {
        errEl.classList.remove("show");
        errEl.style.display = 'none';
        errText.textContent = '';
    };

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError();

        const name = nameEl.value.trim();
        const email = emailEl.value.trim().toLowerCase();
        const phone = phoneEl.value.trim();
        const password = passEl.value;

        // Basic frontend validation
        if (!name || !email || !phone || !password) {
            showError("All fields are required.");
            return;
        }

        if (password.length < 8) {
            showError("Password must be at least 8 characters long.");
            return;
        }

        btn.disabled = true;
        const originalBtnHTML = btn.innerHTML;
        btn.innerHTML = 'Creating Account... <i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone, password })
            });

            let data = {};
            try {
                data = await res.json();
            } catch (_) {
                throw new Error("Server returned an unexpected response. Please ensure the backend is running.");
            }

            if (!res.ok) {
                // Extract error message from various possible formats
                const errMsg = data.message || data.error || data.errors?.[0]?.msg || "Admin registration failed. Please try again.";
                throw new Error(errMsg);
            }

            // Success — store token and redirect
            if (data.token) {
                localStorage.setItem("adminToken", data.token);
                localStorage.setItem("adminUser", JSON.stringify(data.admin || {}));

                // Show brief success state before redirect
                btn.innerHTML = '<i class="fas fa-check"></i> Account Created!';
                btn.style.background = 'linear-gradient(135deg, #00d68f, #009f6b)';

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 800);
            } else {
                throw new Error("Registration succeeded but no token was returned. Please try logging in.");
            }

        } catch (err) {
            showError(err.message);
            btn.disabled = false;
            btn.innerHTML = originalBtnHTML;
        }
    });
});
