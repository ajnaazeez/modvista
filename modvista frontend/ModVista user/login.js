document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');

    // Password Visibility Toggle
    const toggleBtn = loginForm.querySelector('.toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            toggleBtn.classList.toggle('fa-eye');
            toggleBtn.classList.toggle('fa-eye-slash');
        });
    }

    // Function to check if inputs are valid to enable/disable login button
    const toggleButtonState = () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        loginBtn.disabled = !(email && password);
    };

    emailInput.addEventListener('input', toggleButtonState);
    passwordInput.addEventListener('input', toggleButtonState);

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) return;

        loginBtn.disabled = true;
        const originalBtnText = loginBtn.textContent;
        loginBtn.textContent = 'Authenticating...';

        try {
            const data = await window.ModVistaAPI.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            // Handle successful login
            if (data && data.success) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                // Redirect to profile or home
                window.location.href = "profile.html";
            } else {
                alert(data.message || "Login failed. Please check your credentials.");
                loginBtn.disabled = false;
                loginBtn.textContent = originalBtnText;
            }

        } catch (error) {
            console.error('Login error:', error);

            // Handle OTP verification case (special check for 403 in apiCall is handled by redirecting to login, 
            // but here we might need to catch it specifically if apiCall throws for 403)
            // Actually, based on login.js original code, it checked response.status === 403.
            // Let's check how api.js handles it.

            if (error.message.includes('verify OTP')) {
                localStorage.setItem("pendingEmail", email);
                window.location.href = "otp.html";
                return;
            }

            alert(error.message || "An error occurred during login.");
            loginBtn.disabled = false;
            loginBtn.textContent = originalBtnText;
        }
    });
});
