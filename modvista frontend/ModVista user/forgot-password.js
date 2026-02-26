const API_BASE = 'http://localhost:5000';

const form = document.getElementById('forgot-form');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const submitBtn = document.getElementById('submit-btn');
const alertBox = document.getElementById('alert-box');

// ── Enable button only when email looks valid
emailInput.addEventListener('input', () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
    submitBtn.disabled = !valid;
    if (emailInput.value.trim() && !valid) {
        emailError.textContent = 'Please enter a valid email address.';
    } else {
        emailError.textContent = '';
    }
});

// ── Alert helpers
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert-box ${type}`;
    alertBox.style.display = 'block';
}
function hideAlert() {
    alertBox.style.display = 'none';
}

// ── Form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim().toLowerCase();

    // Loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!data.ok) {
            showAlert(data.message || 'Something went wrong. Please try again.');
            submitBtn.innerHTML = 'Send OTP to Phone';
            submitBtn.disabled = false;
            return;
        }

        // Store in sessionStorage for the next steps
        sessionStorage.setItem('fp_email', email);
        sessionStorage.setItem('fp_sessionId', data.resetSessionId);

        showAlert('OTP sent! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'forgot-otp.html';
        }, 800);

    } catch (err) {
        console.error(err);
        showAlert('Network error. Please check your connection.');
        submitBtn.innerHTML = 'Send OTP to Phone';
        submitBtn.disabled = false;
    }
});
