const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const RESET_API = `${API_BASE}/auth/forgot-password/reset`;

document.addEventListener("DOMContentLoaded", () => {
    const email = sessionStorage.getItem('admin_fp_email');
    const resetToken = sessionStorage.getItem('admin_fp_resetToken');

    if (!email || !resetToken) {
        window.location.href = "admin-forgot-password.html";
        return;
    }

    const form = document.getElementById("reset-password-form");
    const passInput = document.getElementById("new-password");
    const confirmInput = document.getElementById("confirm-password");
    const btn = document.getElementById("reset-btn");
    const errEl = document.getElementById("admin-error");
    const errText = document.getElementById("error-text");
    const successState = document.getElementById("success-state");
    const header = document.querySelector(".login-header");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errEl.classList.remove("show");

        const newPassword = passInput.value;
        const confirmPassword = confirmInput.value;

        if (newPassword !== confirmPassword) {
            errText.textContent = "Passwords do not match";
            errEl.classList.add("show");
            return;
        }

        btn.disabled = true;
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = 'Resetting... <i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(RESET_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    resetToken,
                    newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to reset password");

            // Success state
            form.style.display = "none";
            header.style.display = "none";
            successState.style.display = "block";

            // Cleanup
            sessionStorage.removeItem('admin_fp_email');
            sessionStorage.removeItem('admin_fp_sessionId');
            sessionStorage.removeItem('admin_fp_resetToken');

        } catch (err) {
            errText.textContent = err.message;
            errEl.classList.add("show");
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });
});
