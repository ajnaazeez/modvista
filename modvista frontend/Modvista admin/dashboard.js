const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

// --- Helpers ---
function getToken() {
    return localStorage.getItem("adminToken");
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        window.location.href = "admin-login.html";
        throw new Error("Admin session expired / not authorized");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

// --- Global Instances ---
let salesOverviewChart = null;
let allSalesData = null;

// --- Load Dashboard Data ---
async function loadDashboardStats() {
    try {
        const stats = await apiFetch('/admin/dashboard/stats');

        // Update metric cards
        if (document.getElementById('statTotalUsers')) document.getElementById('statTotalUsers').textContent = stats.totalUsers.toLocaleString();
        if (document.getElementById('statTotalOrders')) document.getElementById('statTotalOrders').textContent = stats.totalOrders.toLocaleString();
        if (document.getElementById('statTotalRevenue')) document.getElementById('statTotalRevenue').textContent = `₹${stats.totalRevenue.toLocaleString()}`;
        if (document.getElementById('statActiveProducts')) document.getElementById('statActiveProducts').textContent = stats.activeProducts.toLocaleString();

        // Also fetch analytics for the chart
        fetchSalesTrend();

    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}

async function fetchSalesTrend() {
    try {
        const data = await apiFetch('/analytics/admin');
        if (data.success) {
            allSalesData = {
                daily: data.data.salesTrend,
                monthly: data.data.monthlySales,
                yearly: data.data.yearlySales
            };

            // Check initial active button
            let initialType = 'daily';
            if (document.getElementById('btnMonthly')?.classList.contains('active')) initialType = 'monthly';
            if (document.getElementById('btnYearly')?.classList.contains('active')) initialType = 'yearly';

            renderSalesOverviewChart(allSalesData[initialType], initialType);
            setupToggles();
        }
    } catch (error) {
        console.error("Error fetching sales trend for dashboard:", error);
    }
}

function setupToggles() {
    const btns = {
        daily: document.getElementById('btnDaily'),
        monthly: document.getElementById('btnMonthly'),
        yearly: document.getElementById('btnYearly')
    };

    const updateActive = (type) => {
        Object.values(btns).forEach(b => {
            if (b) {
                b.classList.remove('active');
                b.style.background = 'var(--bg-card)';
            }
        });
        if (btns[type]) {
            btns[type].classList.add('active');
            btns[type].style.background = 'var(--accent)';
        }
    };

    if (btns.daily) btns.daily.onclick = () => {
        updateActive('daily');
        renderSalesOverviewChart(allSalesData.daily, 'daily');
    };
    if (btns.monthly) btns.monthly.onclick = () => {
        updateActive('monthly');
        renderSalesOverviewChart(allSalesData.monthly, 'monthly');
    };
    if (btns.yearly) btns.yearly.onclick = () => {
        updateActive('yearly');
        renderSalesOverviewChart(allSalesData.yearly, 'yearly');
    };
}

function renderSalesOverviewChart(trendData, type = 'daily') {
    const ctxEl = document.getElementById('salesOverviewChart');
    if (!ctxEl) return;
    const ctx = ctxEl.getContext('2d');
    if (salesOverviewChart) salesOverviewChart.destroy();

    // Sort by date
    trendData.sort((a, b) => new Date(a._id) - new Date(b._id));

    salesOverviewChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(item => {
                const d = new Date(item._id);
                if (type === 'yearly') return d.getFullYear().toString();
                if (type === 'monthly') return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            }),
            datasets: [
                {
                    label: 'Revenue (₹)',
                    data: trendData.map(item => item.revenue),
                    borderColor: '#ff1f1f',
                    backgroundColor: 'rgba(255, 31, 31, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#ff1f1f',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 5
                },
                {
                    label: 'Orders',
                    data: trendData.map(item => item.orders),
                    borderColor: '#00a8ff',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    tension: 0.3,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#888', boxWidth: 12, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                    padding: 10,
                    titleColor: '#fff',
                    bodyColor: '#ddd'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#888', callback: v => '₹' + v.toLocaleString() }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                }
            }
        }
    });
}

async function loadRecentOrders() {
    try {
        const orders = await apiFetch('/admin/dashboard/recent-orders?limit=5');
        const tbody = document.querySelector('.table-wrapper tbody');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No recent orders</td></tr>';
            return;
        }

        orders.forEach(order => {
            const statusClass = getStatusClass(order.status);
            const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${order.shortId || 'N/A'}</td>
                <td>${order.user?.name || 'Unknown User'}</td>
                <td>${orderDate}</td>
                <td>₹${order.totalAmount.toLocaleString()}</td>
                <td>${order.paymentMethod || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button onclick="window.location.href='orders.html'" 
                        style="background:none; border:none; color: var(--accent); cursor: pointer;">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Failed to load recent orders:', err);
        const tbody = document.querySelector('.table-wrapper tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading orders</td></tr>';
        }
    }
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'shipped': 'status-shipped',
        'out_for_delivery': 'status-out-for-delivery',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled',
        'returned': 'status-returned',
        'return_requested': 'status-return-requested'
    };
    return statusMap[status.toLowerCase()] || 'status-pending';
}

// --- Initialize Dashboard ---
document.addEventListener('DOMContentLoaded', () => {
    // Load dashboard data
    loadDashboardStats();
    loadRecentOrders();

    // Setup quick action buttons
    const quickActions = document.querySelectorAll('.quick-actions .action-btn');
    if (quickActions.length >= 2) {
        if (quickActions[0]) quickActions[0].addEventListener('click', () => window.location.href = 'products.html');
        if (quickActions[1]) quickActions[1].addEventListener('click', () => window.location.href = 'orders.html');
    }
});
