/* --- OTP Verification Page Logic --- */
document.addEventListener('DOMContentLoaded', () => {
    const otpForm = document.getElementById('otp-form');
    if (!otpForm) return;

    const verifyBtn = document.getElementById('verify-btn');
    const otpInput = document.getElementById('otp');
    const resendBtn = document.getElementById('resend-otp-link');
    const messageDisplay = document.getElementById('otp-message');

    // Get email from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (!email) {
        alert("No email found in URL. Redirecting to signup...");
        window.location.href = 'signup.html';
        return;
    }

    if (messageDisplay) {
        messageDisplay.innerText = `We've sent a 6-digit code to ${email}.`;
    }

    // Enable/Disable verify button
    const validateOtp = () => {
        const val = otpInput.value.trim();
        if (verifyBtn) verifyBtn.disabled = val.length !== 6 || isNaN(val);
    };

    if (otpInput) {
        otpInput.addEventListener('input', validateOtp);
        // Allow only numbers
        otpInput.addEventListener('keypress', (e) => {
            if (e.which < 48 || e.which > 57) {
                e.preventDefault();
            }
        });
    }

    // OTP Submit
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = otpInput.value.trim();

        try {
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            }

            const BASE_URL = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
                ? "http://localhost:5000"
                : window.location.origin;

            const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            // Success: Store token & user (verify-otp returns token/user)
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (typeof window.showToast === 'function') {
                window.showToast('Email verified successfully! Redirecting...', 'success');
            } else {
                alert('Email verified successfully! Redirecting...');
            }

            setTimeout(() => {
                window.location.href = 'index.html'; // Or profile.html
            }, 1500);

        } catch (error) {
            console.error('Verify Error:', error);
            alert(error.message);
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = 'Verify OTP';
            }
        }
    });

    // Resend OTP
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            try {
                resendBtn.disabled = true;
                resendBtn.innerText = 'Resending...';

                const BASE_URL = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
                    ? "http://localhost:5000"
                    : window.location.origin;

                const res = await fetch(`${BASE_URL}/api/auth/resend-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Resend failed');
                }

                if (typeof window.showToast === 'function') {
                    window.showToast('New OTP sent to your email!', 'success');
                } else {
                    alert('New OTP sent to your email!');
                }

                // Temporary disable resend for 30s
                let timeLeft = 30;
                const timer = setInterval(() => {
                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        resendBtn.disabled = false;
                        resendBtn.innerText = 'Resend OTP';
                    } else {
                        resendBtn.innerText = `Resend in ${timeLeft}s`;
                        timeLeft--;
                    }
                }, 1000);

            } catch (error) {
                console.error('Resend Error:', error);
                alert(error.message);
                resendBtn.disabled = false;
                resendBtn.innerText = 'Resend OTP';
            }
        });
    }
});
