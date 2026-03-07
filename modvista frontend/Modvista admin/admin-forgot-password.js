const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const FORGOT_API = `${API_BASE}/auth/forgot-password/request-otp?role=admin`;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("admin-email");
    const btn = document.getElementById("request-otp-btn");
    const errEl = document.getElementById("admin-error");
    const errText = document.getElementById("error-text");
    const successEl = document.getElementById("admin-success");
    const successText = document.getElementById("success-text");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errEl.classList.remove("show");
        successEl.classList.remove("show");

        const email = emailInput.value.trim().toLowerCase();
        if (!email) return;

        btn.disabled = true;
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = 'Sending OTP... <i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(FORGOT_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to request OTP");

            sessionStorage.setItem('admin_fp_email', email);
            sessionStorage.setItem('admin_fp_sessionId', data.resetSessionId);

            successText.textContent = "OTP sent successfully! Redirecting...";
            successEl.classList.add("show");

            setTimeout(() => {
                window.location.href = "admin-forgot-otp.html";
            }, 1500);
        } catch (err) {
            errText.textContent = err.message;
            errEl.classList.add("show");
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });
});
