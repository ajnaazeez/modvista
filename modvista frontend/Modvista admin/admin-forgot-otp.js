const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

const VERIFY_API = `${API_BASE}/auth/forgot-password/verify-otp`;
const RESEND_API = `${API_BASE}/auth/forgot-password/request-otp`;

document.addEventListener("DOMContentLoaded", () => {
    const email = sessionStorage.getItem('admin_fp_email');
    const sessionId = sessionStorage.getItem('admin_fp_sessionId');

    if (!email || !sessionId) {
        window.location.href = "admin-forgot-password.html";
        return;
    }

    const form = document.getElementById("otp-verify-form");
    const otpContainer = document.getElementById("otp-container");
    const inputs = otpContainer.querySelectorAll(".otp-input");
    const btn = document.getElementById("verify-btn");
    const errEl = document.getElementById("admin-error");
    const errText = document.getElementById("error-text");
    const resendBtn = document.getElementById("resend-otp");

    // Helper: auto-focus next input
    inputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errEl.classList.remove("show");

        const otp = Array.from(inputs).map(i => i.value).join("");
        if (otp.length !== 6) return;

        btn.disabled = true;
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = 'Verifying... <i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(VERIFY_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    resetSessionId: sessionId,
                    otp
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "OTP verification failed");

            sessionStorage.setItem('admin_fp_resetToken', data.resetToken);

            window.location.href = "admin-forgot-reset-password.html";
        } catch (err) {
            errText.textContent = err.message;
            errEl.classList.add("show");
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });

    resendBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        resendBtn.style.pointerEvents = "none";
        resendBtn.style.opacity = "0.5";

        try {
            const res = await fetch(RESEND_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('admin_fp_sessionId', data.resetSessionId);
                alert("New OTP sent!");
            }
        } catch (err) {
            console.error("Resend failed", err);
        } finally {
            setTimeout(() => {
                resendBtn.style.pointerEvents = "auto";
                resendBtn.style.opacity = "1";
            }, 30000);
        }
    });
});
