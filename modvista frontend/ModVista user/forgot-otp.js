const API_BASE = 'http://localhost:5000';

const otpInput = document.getElementById('otp');
const verifyBtn = document.getElementById('verify-btn');
const resendBtn = document.getElementById('resend-btn');
const alertBox = document.getElementById('alert-box');
const timerText = document.getElementById('timer-text');
const otpError = document.getElementById('otp-error');

// Read state from sessionStorage
const email = sessionStorage.getItem('fp_email');
const sessionId = sessionStorage.getItem('fp_sessionId');

// If user lands here without going through step 1, redirect back
if (!email || !sessionId) {
    window.location.href = 'forgot-password.html';
}

// ── Countdown timer (5 minutes)
let timerInterval;
function startTimer(seconds = 300) {
    clearInterval(timerInterval);
    resendBtn.disabled = true;
    resendBtn.style.opacity = '0.5';

    timerInterval = setInterval(() => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerText.textContent = `OTP expires in ${m}:${String(s).padStart(2, '0')}`;
        seconds--;

        if (seconds < 0) {
            clearInterval(timerInterval);
            timerText.textContent = 'OTP expired. Please resend.';
            resendBtn.disabled = false;
            resendBtn.style.opacity = '1';
        }
    }, 1000);
}
startTimer();

// ── Alert helpers
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert-box ${type}`;
    alertBox.style.display = 'block';
}
function hideAlert() { alertBox.style.display = 'none'; }

// ── OTP input validation (digits only, 6 chars)
otpInput.addEventListener('input', () => {
    otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    verifyBtn.disabled = otpInput.value.length !== 6;
});

// ── Verify OTP
document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    otpError.textContent = '';

    const otp = otpInput.value.trim();

    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    verifyBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, resetSessionId: sessionId, otp }),
        });

        const data = await res.json();

        if (!data.ok) {
            showAlert(data.message || 'OTP verification failed.');
            verifyBtn.innerHTML = 'Verify OTP';
            verifyBtn.disabled = false;
            return;
        }

        // Store resetToken for step 3
        sessionStorage.setItem('fp_resetToken', data.resetToken);
        clearInterval(timerInterval);

        showAlert('OTP verified! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'forgot-reset-password.html';
        }, 800);

    } catch (err) {
        console.error(err);
        showAlert('Network error. Please check your connection.');
        verifyBtn.innerHTML = 'Verify OTP';
        verifyBtn.disabled = false;
    }
});

// ── Resend OTP
resendBtn.addEventListener('click', async () => {
    hideAlert();
    resendBtn.textContent = 'Sending...';
    resendBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (data.ok) {
            // Update sessionId in case it changed
            sessionStorage.setItem('fp_sessionId', data.resetSessionId);
            showAlert('New OTP sent to your phone!', 'success');
            otpInput.value = '';
            verifyBtn.disabled = true;
            startTimer();
        } else {
            showAlert(data.message || 'Failed to resend OTP.');
            resendBtn.disabled = false;
            resendBtn.style.opacity = '1';
        }
    } catch (err) {
        showAlert('Network error. Please try again.');
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
    } finally {
        resendBtn.textContent = 'Resend OTP';
    }
});
