document.addEventListener('DOMContentLoaded', () => {
    const cancelForm = document.getElementById('cancel-form');
    const reasonRadios = document.querySelectorAll('input[name="cancel-reason"]');
    const otherInputContainer = document.getElementById('other-input-container');
    const otherRadio = document.getElementById('reason-other');
    const confirmCheckbox = document.getElementById('confirm-undo');
    const confirmBtn = document.getElementById('confirm-cancel-btn');
    const successOverlay = document.getElementById('success-overlay');

    // Function to check if form is valid
    const validateForm = () => {
        const isReasonSelected = Array.from(reasonRadios).some(radio => radio.checked);
        const isCheckboxChecked = confirmCheckbox.checked;

        confirmBtn.disabled = !(isReasonSelected && isCheckboxChecked);
    };

    // Listen for radio changes
    reasonRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // Show/Hide "Other" input
            if (otherRadio.checked) {
                otherInputContainer.classList.add('active');
                document.getElementById('other-reason-text').setAttribute('required', 'true');
            } else {
                otherInputContainer.classList.remove('active');
                document.getElementById('other-reason-text').removeAttribute('required');
            }
            validateForm();
        });
    });

    // Listen for checkbox changes
    confirmCheckbox.addEventListener('change', validateForm);

    // Form Submission
    cancelForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Disable button during "processing"
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Simulate API call
        setTimeout(() => {
            successOverlay.classList.add('active');

            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 3000);
        }, 1500);
    });

    // Mobile Menu Toggle (Consistency with other pages)
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Scroll Header Effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Update Cart Count Badge
    const updateCartBadge = () => {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const badge = document.getElementById('cart-count');
        if (badge) {
            const count = cart.reduce((total, item) => total + item.quantity, 0);
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    };

    updateCartBadge();
});
