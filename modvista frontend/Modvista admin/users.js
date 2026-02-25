const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";
const adminToken = localStorage.getItem("adminToken");

if (!adminToken) {
    window.location.href = "admin-login.html";
}

let allUsers = [];
let currentPage = 1;
let itemsLimit = 10;
let totalResults = 0;

/**
 * Helper: Format Date to "Feb 4, 2026"
 */
function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(text) {
    if (!text) return "—";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Generate HTML for a single user row
 * Order: User ID | Full Name | Email | Phone | Role | Joined Date | Wallet | Status | Actions
 */
function rowHTML(user) {
    const shortId = user._id.substring(user._id.length - 6).toUpperCase();
    const isBlocked = user.isBlocked === true;

    return `
        <tr class="${isBlocked ? 'blocked-row' : ''}">
            <td>#USR-${shortId}</td>
            <td style="font-weight: 500;">${user.name}</td>
            <td style="color: var(--text-dim);">${user.email}</td>
            <td>${user.phone || '—'}</td>
            <td style="font-weight: 500;">${capitalize(user.role)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <span class="status-badge ${isBlocked ? 'status-blocked' : (user.isActive === false ? 'status-inactive' : 'status-active')}">
                    ${isBlocked ? 'Blocked' : (user.isActive === false ? 'Inactive' : 'Active')}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <i class="fas fa-eye view-user" style="cursor: pointer; color: var(--text-dim);"
                        title="View Profile" data-id="${user._id}"></i>
                    
                    ${isBlocked
            ? `<i class="fas fa-unlock-alt unblock-user" style="cursor: pointer; color: var(--status-delivered);" title="Unblock User" data-id="${user._id}"></i>`
            : `<i class="fas fa-ban block-user" style="cursor: pointer; color: var(--status-cancelled);" title="Block User" data-id="${user._id}"></i>`
        }

                    ${user.isActive === false
            ? `<i class="fas fa-check-circle activate-user" style="cursor: pointer; color: var(--status-delivered); font-size: 0.9rem;" title="Activate User" data-id="${user._id}"></i>`
            : `<i class="fas fa-power-off deactivate-user" style="cursor: pointer; color: var(--status-cancelled); font-size: 0.9rem;" title="Deactivate User" data-id="${user._id}"></i>`
        }
                    
                    <i class="fas fa-trash delete-user" style="cursor: pointer; color: var(--status-cancelled); font-size: 0.9rem;"
                        title="Delete User" data-id="${user._id}"></i>
                </div>
            </td>
        </tr>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const usersTbody = document.getElementById('usersTbody');
    const userSearch = document.getElementById('userSearch');
    const userModal = document.getElementById('userModal');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const closeModalIcon = document.getElementById('closeModal');
    const modalBlockBtn = document.getElementById('modalBlockBtn');

    const statusFilter = document.getElementById('statusFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    const applyAllFilters = () => {
        currentPage = 1; // Reset to page 1 on filter change
        fetchUsers();
    };

    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchUsers();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(totalResults / itemsLimit);
            if (currentPage < totalPages) {
                currentPage++;
                fetchUsers();
            }
        });
    }

    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsLimit = parseInt(e.target.value);
            currentPage = 1;
            fetchUsers();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', applyAllFilters);
    }

    if (startDate) {
        startDate.addEventListener('change', applyAllFilters);
    }

    if (endDate) {
        endDate.addEventListener('change', applyAllFilters);
    }

    const resetFiltersBtn = document.getElementById('resetFilters');

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (userSearch) userSearch.value = "";
            if (statusFilter) statusFilter.value = "all";
            if (startDate) startDate.value = "";
            if (endDate) endDate.value = "";
            currentPage = 1;
            fetchUsers();
        });
    }

    // Initial Load
    fetchUsers();

    // Event Listeners
    if (userSearch) {
        userSearch.addEventListener('input', applyAllFilters);
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => hideModal());
    }

    if (closeModalIcon) {
        closeModalIcon.addEventListener('click', () => hideModal());
    }

    // Event Delegation for Table Actions
    if (usersTbody) {
        usersTbody.addEventListener('click', (e) => {
            const actionTarget = e.target.closest('[data-id]');
            if (!actionTarget) return;

            const userId = actionTarget.getAttribute('data-id');
            const target = e.target; // Keep original target for class detection

            if (target.classList.contains('view-user') || actionTarget.classList.contains('view-user')) {
                showUserProfile(userId);
            } else if (target.classList.contains('block-user') || target.classList.contains('unblock-user') || actionTarget.classList.contains('block-user') || actionTarget.classList.contains('unblock-user')) {
                const isBlocked = target.classList.contains('unblock-user') || actionTarget.classList.contains('unblock-user');
                confirmToggleBlock(userId, isBlocked);
            } else if (target.classList.contains('deactivate-user') || target.classList.contains('activate-user') || actionTarget.classList.contains('deactivate-user') || actionTarget.classList.contains('activate-user')) {
                const isActive = target.classList.contains('activate-user') || actionTarget.classList.contains('activate-user');
                confirmToggleActive(userId, isActive);
            } else if (target.classList.contains('delete-user') || target.classList.contains('fa-trash') || actionTarget.classList.contains('delete-user')) {
                confirmDeleteUser(userId);
            }
        });
    }

    if (modalBlockBtn) {
        modalBlockBtn.addEventListener('click', () => {
            const userId = modalBlockBtn.getAttribute('data-user-id');
            const isCurrentlyBlocked = modalBlockBtn.getAttribute('data-is-blocked') === 'true';
            toggleBlockUser(userId, isCurrentlyBlocked);
            hideModal();
        });
    }

    const modalActiveBtn = document.getElementById('modalActiveBtn');
    if (modalActiveBtn) {
        modalActiveBtn.addEventListener('click', () => {
            const userId = modalActiveBtn.getAttribute('data-user-id');
            const isCurrentlyActive = modalActiveBtn.getAttribute('data-is-active') === 'true';
            toggleActiveUser(userId, isCurrentlyActive);
            hideModal();
        });
    }

    // Modal click outside
    window.addEventListener('click', (e) => {
        if (e.target === userModal) hideModal();
    });
});

async function fetchUsers() {
    const userSearch = document.getElementById('userSearch');
    const statusFilter = document.getElementById('statusFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    const query = userSearch ? userSearch.value : "";
    const status = statusFilter ? statusFilter.value : "all";
    const start = startDate ? startDate.value : "";
    const end = endDate ? endDate.value : "";

    // Construct Query String for Server-Side Filtering & Pagination
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (status !== 'all') params.append('status', status);
    if (start) params.append('startDate', start);
    if (end) params.append('endDate', end);
    params.append('page', currentPage);
    params.append('limit', itemsLimit);

    const usersTbody = document.getElementById('usersTbody');
    if (usersTbody) {
        usersTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--accent);"></i><p style="margin-top: 12px; color: var(--text-dim);">Fetching users...</p></td></tr>';
    }

    try {
        const response = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            alert("Session expired or unauthorized. Redirecting to login...");
            localStorage.removeItem("adminToken");
            window.location.href = "admin-login.html";
            return;
        }

        const data = await response.json();

        if (data.success) {
            // Robust check for data location
            totalResults = data.total || 0;
            allUsers = data.data || data.users || (Array.isArray(data) ? data : []);

            if (!Array.isArray(allUsers)) {
                console.error("Fetched data.data is not an array:", allUsers);
                allUsers = [];
            }

            renderUsers(allUsers);
            renderPagination();
        } else {
            console.error("API Error Message:", data.message);
            alert(data.message || "Failed to load users");
        }
    } catch (error) {
        console.error("CRITICAL Error fetching users:", error);
    }
}

function renderUsers(users) {
    const usersTbody = document.getElementById('usersTbody');
    if (!usersTbody) {
        console.warn("DOM element #usersTbody not found!");
        return;
    }

    if (!Array.isArray(users) || users.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No users found or error loading data.</td></tr>';
        return;
    }

    try {
        usersTbody.innerHTML = users.map(user => {
            try {
                return rowHTML(user);
            } catch (err) {
                console.error("Error rendering user row:", err, user);
                return `<tr><td colspan="8" style="color:red">Error rendering user ${user._id || 'unknown'}</td></tr>`;
            }
        }).join("");
    } catch (error) {
        console.error("Fatal error in renderUsers loop:", error);
        usersTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Fatal error during rendering.</td></tr>';
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const totalPages = Math.ceil(totalResults / itemsLimit);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="pagination">
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-info">
            Showing ${(currentPage - 1) * itemsLimit + 1} to ${Math.min(currentPage * itemsLimit, totalResults)} of ${totalResults} users
        </div>
    `;
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    fetchUsers();
}

// Client-side filter is no longer needed as we use server-side now
// But we keep the function signature empty to avoid errors if called elsewhere
function filterUsers() {
    fetchUsers();
}

function showUserProfile(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;

    const shortId = user._id.substring(user._id.length - 6).toUpperCase();
    document.getElementById('targetUserId').textContent = `#USR-${shortId} (${capitalize(user.role)})`;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profilePhone').textContent = user.phone || '—';

    const modalStatus = document.getElementById('profileStatus');
    modalStatus.textContent = user.isBlocked ? 'Blocked' : (user.isActive === false ? 'Inactive' : 'Active');
    modalStatus.className = `status-badge ${user.isBlocked ? 'status-blocked' : (user.isActive === false ? 'status-inactive' : 'status-active')}`;

    const blockNote = document.getElementById('blockNote');
    const modalBlockBtn = document.getElementById('modalBlockBtn');

    if (user.isBlocked) {
        blockNote.style.display = 'block';
        modalBlockBtn.textContent = 'Unblock User';
        modalBlockBtn.style.background = 'var(--status-shipped)';
        modalBlockBtn.style.borderColor = 'var(--status-shipped)';
    } else {
        blockNote.style.display = 'none';
        modalBlockBtn.textContent = 'Block User';
        modalBlockBtn.style.background = 'var(--accent)';
        modalBlockBtn.style.borderColor = 'var(--accent)';
    }

    modalBlockBtn.setAttribute('data-user-id', user._id);
    modalBlockBtn.setAttribute('data-is-blocked', user.isBlocked);

    const modalActiveBtn = document.getElementById('modalActiveBtn');
    if (modalActiveBtn) {
        if (user.isActive === false) {
            modalActiveBtn.textContent = 'Activate User';
            modalActiveBtn.style.background = 'var(--status-delivered)';
            modalActiveBtn.style.borderColor = 'var(--status-delivered)';
        } else {
            modalActiveBtn.textContent = 'Deactivate User';
            modalActiveBtn.style.background = 'var(--status-cancelled)';
            modalActiveBtn.style.borderColor = 'var(--status-cancelled)';
        }
        modalActiveBtn.setAttribute('data-user-id', user._id);
        modalActiveBtn.setAttribute('data-is-active', user.isActive !== false);
    }

    document.getElementById('userModal').classList.add('show');
    document.body.style.overflow = 'hidden';

    // Fetch and display real statistics
    fetchUserVehicles(userId);
    fetchUserOrders(userId);
}

async function fetchUserOrders(userId) {
    const orderCountEl = document.getElementById('profileOrderCount');
    if (!orderCountEl) return;

    try {
        const response = await fetch(`${API_BASE}/admin/orders?user=${userId}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();

        if (data.success) {
            orderCountEl.textContent = data.total || 0;
        }
    } catch (error) {
        console.error("Error fetching user orders count:", error);
    }
}

async function fetchUserVehicles(userId) {
    const vehiclesList = document.getElementById('userVehiclesList');
    const vehiclesSection = document.getElementById('userVehiclesSection');
    const vehicleCountEl = document.getElementById('profileVehicleCount');

    if (!vehiclesList || !vehiclesSection) return;

    vehiclesList.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem;">Loading vehicles...</p>';
    vehiclesSection.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/vehicles/admin/users/${userId}/vehicles`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();

        if (data.success) {
            if (vehicleCountEl) vehicleCountEl.textContent = data.count || 0;

            if (data.count === 0) {
                vehiclesList.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem;">No vehicles saved.</p>';
            } else {
                vehiclesList.innerHTML = data.vehicles.map(v => `
                    <div style="background: var(--bg-hover); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-weight: 500; font-size: 0.9rem;">${v.make} ${v.model} ${v.isDefault ? '<span style="font-size: 0.7rem; color: var(--accent); margin-left: 4px;">[DEFAULT]</span>' : ''}</p>
                            <p style="font-size: 0.75rem; color: var(--text-dim);">${v.year} • ${v.variant || 'Standard'} • ${v.color || 'Default'}</p>
                        </div>
                        <i class="fas fa-car-side" style="color: var(--text-dim); opacity: 0.3;"></i>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error("Error fetching user vehicles:", error);
        vehiclesList.innerHTML = '<p style="color: var(--status-cancelled); font-size: 0.85rem;">Failed to load vehicles.</p>';
    }
}

function hideModal() {
    document.getElementById('userModal').classList.remove('show');
    document.body.style.overflow = '';
}

function confirmToggleBlock(userId, isBlocked) {
    const user = allUsers.find(u => u._id === userId);
    const action = isBlocked ? 'unblock' : 'block';
    if (confirm(`Are you sure you want to ${action} ${user.name}?`)) {
        toggleBlockUser(userId, !isBlocked); // Passing the intended status
    }
}

async function toggleBlockUser(userId, currentlyBlocked) {
    // Optimistic Update
    const user = allUsers.find(u => u._id === userId);
    const originalStatus = user ? user.isBlocked : null;
    if (user) {
        user.isBlocked = !currentlyBlocked;
        renderUsers(allUsers);
    }

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/block`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            showToast(data.message);
            fetchUsers();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error blocking user:", error);
        alert("Failed to update user status");
    }
}

function confirmToggleActive(userId, isActive) {
    const user = allUsers.find(u => u._id === userId);
    const action = isActive ? 'activate' : 'deactivate';
    if (confirm(`Are you sure you want to ${action} ${user.name}?`)) {
        toggleActiveUser(userId, isActive);
    }
}

async function toggleActiveUser(userId, currentlyActive) {
    // Optimistic Update
    const user = allUsers.find(u => u._id === userId);
    if (user) {
        user.isActive = !user.isActive;
        renderUsers(allUsers);
    }

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/active`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            showToast(data.message);
            fetchUsers();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error updating user active status:", error);
        alert("Failed to update user status");
    }
}

async function confirmDeleteUser(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (confirm(`CRITICAL: Are you sure you want to DELETE user ${user.name}? This cannot be undone.`)) {
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                showToast("User deleted successfully");
                fetchUsers();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    }
}

function showToast(message) {
    const toast = document.getElementById('successToast');
    if (!toast) return;
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
