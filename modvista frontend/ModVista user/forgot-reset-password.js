const API_BASE = 'http://localhost:5000';

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const resetBtn = document.getElementById('reset-btn');
const alertBox = document.getElementById('alert-box');
const confirmError = document.getElementById('confirm-password-error');
const mainPanel = document.getElementById('main-panel');

// Read state from sessionStorage
const email = sessionStorage.getItem('fp_email');
const resetToken = sessionStorage.getItem('fp_resetToken');

// Guard: if user lands here without completing previous steps, redirect
if (!email || !resetToken) {
    window.location.href = 'forgot-password.html';
}

// ── Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
        const targetId = icon.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        }
    });
});

// ── Password requirements checker
const requirements = {
    length: document.getElementById('req-length'),
    upper: document.getElementById('req-upper'),
    number: document.getElementById('req-number'),
    special: document.getElementById('req-special'),
};

function checkRequirements(pwd) {
    const checks = {
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        number: /[0-9]/.test(pwd),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
    Object.keys(checks).forEach(key => {
        const el = requirements[key];
        if (checks[key]) {
            el.classList.add('valid');
            el.querySelector('i').classList.replace('fa-circle', 'fa-check-circle');
        } else {
            el.classList.remove('valid');
            el.querySelector('i').classList.replace('fa-check-circle', 'fa-circle');
        }
    });
    return Object.values(checks).every(Boolean);
}

// ── Live form validation
function validate() {
    const isNewValid = checkRequirements(newPasswordInput.value);
    const confirmMatch = confirmPasswordInput.value === newPasswordInput.value && confirmPasswordInput.value.length > 0;
    if (confirmPasswordInput.value.length > 0 && !confirmMatch) {
        confirmError.textContent = 'Passwords do not match.';
    } else {
        confirmError.textContent = '';
    }
    resetBtn.disabled = !(isNewValid && confirmMatch);
}
newPasswordInput.addEventListener('input', validate);
confirmPasswordInput.addEventListener('input', validate);

// ── Alert helpers
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert-box ${type}`;
    alertBox.style.display = 'block';
}
function hideAlert() { alertBox.style.display = 'none'; }

// ── Form submit
document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const newPassword = newPasswordInput.value;

    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    resetBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, resetToken, newPassword }),
        });

        const data = await res.json();

        if (!data.ok) {
            showAlert(data.message || 'Failed to reset password. Please try again.');
            resetBtn.innerHTML = 'Reset Password';
            resetBtn.disabled = false;
            return;
        }

        // Clear all forgot-password state from sessionStorage
        sessionStorage.removeItem('fp_email');
        sessionStorage.removeItem('fp_sessionId');
        sessionStorage.removeItem('fp_resetToken');

        // Show success state
        mainPanel.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <div style="font-size:4rem; color:var(--neon-red); margin-bottom:20px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2 style="margin-bottom:10px;">Password Reset!</h2>
                <p style="color:var(--text-secondary); margin-bottom:30px;">
                    Your password has been updated successfully. You can now log in.
                </p>
                <a href="login.html" class="primary-btn" style="display:inline-block; padding:12px 30px;">
                    Go to Login
                </a>
            </div>
        `;

    } catch (err) {
        console.error(err);
        showAlert('Network error. Please check your connection.');
        resetBtn.innerHTML = 'Reset Password';
        resetBtn.disabled = false;
    }
});
