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
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            // Handle OTP verification case
            if (response.status === 403) {
                localStorage.setItem("pendingEmail", email);
                alert(data.message || "Please verify OTP first");
                window.location.href = "otp.html";
                return;
            }

            if (data.success) {
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
            alert("An error occurred during login. Please ensure the backend is running.");
            loginBtn.disabled = false;
            loginBtn.textContent = originalBtnText;
        }
    });
});
