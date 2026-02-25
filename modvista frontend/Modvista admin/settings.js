document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    const sections = document.querySelectorAll('.settings-section');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const successToast = document.getElementById('successToast');

    // Tab Switching Logic
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');

            // Update Buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Sections
            sections.forEach(s => {
                s.classList.remove('active');
                if (s.id === target) {
                    s.classList.add('active');
                }
            });
        });
    });

    // Save Logic Simulation
    saveBtn.addEventListener('click', () => {
        const confirmed = confirm('Are you sure you want to apply these system-wide changes?');

        if (confirmed) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;

            setTimeout(() => {
                saveBtn.innerHTML = 'Save Changes';
                saveBtn.disabled = false;
                showToast('System settings updated successfully!');
            }, 1200);
        }
    });

    // Reset Logic
    resetBtn.addEventListener('click', () => {
        const confirmed = confirm('Warning: This will reset all settings to their default values. Proceed?');
        if (confirmed) {
            document.getElementById('settingsForm').reset();
            showToast('Settings reset to default.');
        }
    });

    // Toast Notification
    const showToast = (message) => {
        document.getElementById('toastMessage').textContent = message;
        successToast.style.display = 'block';
        setTimeout(() => {
            successToast.style.display = 'none';
        }, 3000);
    };

    // Maintenance Toggle Behavior
    const maintToggle = document.getElementById('maintToggle');
    maintToggle.addEventListener('change', () => {
        if (maintToggle.checked) {
            alert('Security Alert: Enabling Maintenance Mode will disconnect all active user sessions.');
        }
    });
});
