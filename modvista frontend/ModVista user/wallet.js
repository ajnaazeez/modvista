const loadWalletBalance = async () => {
    try {
        const data = await window.ModVistaAPI.apiCall('/wallet/balance');
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl && data && data.success) {
            balanceEl.textContent = `₹${data.balance.toFixed(2)}`;
        }
    } catch (err) {
        console.error('Failed to load wallet balance:', err);
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) balanceEl.textContent = '₹0.00';
    }
};

const loadTransactions = async () => {
    try {
        const data = await window.ModVistaAPI.apiCall('/wallet/transactions?limit=50');
        const listEl = document.getElementById('transaction-list');

        if (!listEl) return;

        // Backend returns data in .data, frontend was expecting .transactions
        const transactions = data.data || [];

        if (transactions.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-dim);">
                    <i class="fas fa-wallet" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p style="font-size: 1.1rem; margin-bottom: 8px;">No transactions yet</p>
                    <p style="font-size: 0.9rem;">Your wallet transaction history will appear here</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = transactions.map(txn => {
            const date = new Date(txn.createdAt);
            const formattedDate = date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const isCredit = txn.type === 'credit' || txn.type === 'refund';
            const amountClass = isCredit ? 'credit' : 'debit';
            const amountSign = isCredit ? '+' : '-';
            const icon = txn.type === 'refund' ? 'fa-undo' : (isCredit ? 'fa-arrow-down' : 'fa-arrow-up');
            const typeLabel = txn.type.charAt(0).toUpperCase() + txn.type.slice(1);

            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${amountClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${txn.description}</h4>
                        <span class="transaction-date">${formattedDate} • ${formattedTime}</span>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        <span class="amount">${amountSign}₹${txn.amount.toFixed(2)}</span>
                        <span class="type-badge">${typeLabel}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load transactions:', err);
        const listEl = document.getElementById('transaction-list');
        if (listEl) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: red;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 12px;"></i>
                    <p>Failed to load transactions</p>
                </div>
            `;
        }
    }
};


const fetchSidebarProfile = async () => {
    try {
        const data = await window.ModVistaAPI.apiCall('/users/me');
        if (data && data.success) {
            const user = data.user;
            if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.fullName || user.name;
            if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email;
            if (document.getElementById('profileAvatar') && user.avatar) {
                let avatarSrc = user.avatar;
                if (window.ModVistaAPI && window.ModVistaAPI.API_BASE && avatarSrc.startsWith('uploads/')) {
                    avatarSrc = `${window.ModVistaAPI.API_BASE.replace('/api', '')}/${avatarSrc}`;
                }
                document.getElementById('profileAvatar').src = avatarSrc;
            }
        }
    } catch (err) {
        console.error("Sidebar profile fetch error:", err);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check login
    if (window.ModVistaAPI && !window.ModVistaAPI.requireLogin()) return;

    loadWalletBalance();
    loadTransactions();
    fetchSidebarProfile();
});
