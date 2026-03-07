document.addEventListener('DOMContentLoaded', () => {
    // API CONFIG
    const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
        ? "http://localhost:5000/api"
        : window.location.origin + "/api";
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
        window.location.href = "admin-login.html";
        return;
    }

    // Chart Instances
    let salesOverviewChart = null;
    let paymentMethodsChart = null;
    let orderStatusChart = null;

    // Current analytics data (cached for period changes)
    let allData = null;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const authHeaders = () => ({ 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' });

    const fmt = (n) => Number(n).toLocaleString('en-IN');

    // ─── Fetch + Bootstrap ──────────────────────────────────────────────────────

    const fetchAnalytics = async (days = 30) => {
        try {
            const [mainRes, dashRes] = await Promise.all([
                fetch(`${API_BASE}/analytics/admin`, { headers: authHeaders() }),
                fetch(`${API_BASE}/admin/dashboard/stats`, { headers: authHeaders() })
            ]);

            if (mainRes.status === 401 || mainRes.status === 403) {
                localStorage.removeItem("adminToken");
                window.location.href = "admin-login.html";
                return;
            }

            const mainData = await mainRes.json();
            const dashData = dashRes.ok ? await dashRes.json() : null;

            if (mainData.success) {
                allData = mainData.data;

                // Enrich KPIs with dashboard data (more accurate)
                if (dashData) {
                    allData.kpis.totalRevenue = dashData.totalRevenue;
                    allData.kpis.totalOrders = dashData.totalOrders;
                }

                updateKPIs(allData.kpis);
                renderSalesOverviewChart(filterByDays(allData.salesTrend, days));
                renderPaymentMethodsChart(allData.paymentDistribution);
                renderOrderStatusChart(dashData);
                renderProductTable(allData.productPerformance);
                animateEntrance();
            }

        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    const filterByDays = (trend, days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return (trend || []).filter(item => new Date(item._id) >= cutoff);
    };

    // ─── KPIs ───────────────────────────────────────────────────────────────────

    const updateKPIs = (kpis) => {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('totalRevenue', `₹${fmt(kpis.totalRevenue)}`);
        set('totalOrders', fmt(kpis.totalOrders));
        set('avgOrderValue', `₹${fmt(Number(kpis.avgOrderValue).toFixed(2))}`);
        set('activeUsers', fmt(kpis.activeUsers));
        set('conversionRate', kpis.conversionRate || '—');
    };

    // ─── Sales Overview Chart ───────────────────────────────────────────────────

    const renderSalesOverviewChart = (trendData, type = 'daily') => {
        const ctx = document.getElementById('salesOverviewChart');
        if (!ctx) return;

        if (salesOverviewChart) salesOverviewChart.destroy();

        // Ensure data is sorted
        trendData.sort((a, b) => new Date(a._id) - new Date(b._id));

        salesOverviewChart = new Chart(ctx.getContext('2d'), {
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
                        backgroundColor: 'rgba(255, 31, 31, 0.08)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#ff1f1f',
                        pointBorderColor: '#fff',
                        pointHoverRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Orders',
                        data: trendData.map(item => item.orders),
                        borderColor: '#00a8ff',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#00a8ff',
                        yAxisID: 'y1'
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
                        labels: { color: '#888', usePointStyle: true }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20,20,20,0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888', callback: v => '₹' + fmt(v) }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: { display: false },
                        ticks: { color: '#00a8ff', stepSize: 1 },
                        title: { display: true, text: 'Orders', color: '#00a8ff' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#888', maxRotation: 45 }
                    }
                }
            }
        });
    };

    // ─── Payment Methods Donut ──────────────────────────────────────────────────

    const renderPaymentMethodsChart = (paymentData) => {
        const ctx = document.getElementById('paymentMethodsChart');
        if (!ctx || !paymentData || paymentData.length === 0) return;

        if (paymentMethodsChart) paymentMethodsChart.destroy();

        // Normalize: merge mock_razorpay → razorpay, mock_wallet → wallet
        const normalized = {};
        paymentData.forEach(p => {
            let key = (p._id || 'unknown').toLowerCase();
            if (key === 'mock_razorpay') key = 'razorpay';
            if (key === 'mock_wallet') key = 'wallet';
            normalized[key] = (normalized[key] || 0) + (p.count || 0);
        });

        const readableLabels = { razorpay: 'Razorpay', cod: 'Cash on Delivery', wallet: 'Wallet' };
        const colorMap = { razorpay: '#7c3aed', cod: '#f59e0b', wallet: '#10b981' };

        const keys = Object.keys(normalized);
        const labels = keys.map(k => readableLabels[k] || k.toUpperCase());
        const values = keys.map(k => normalized[k]);
        const colors = keys.map(k => colorMap[k] || '#888');

        paymentMethodsChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, borderColor: '#141414', borderWidth: 3, hoverOffset: 8 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#888', padding: 16, usePointStyle: true }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20,20,20,0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orders`
                        }
                    }
                }
            }
        });
    };

    // ─── Order Status Bar Chart ─────────────────────────────────────────────────

    const renderOrderStatusChart = (dashData) => {
        const ctx = document.getElementById('orderStatusChart');
        if (!ctx || !dashData || !dashData.orderStatusBreakdown) return;

        if (orderStatusChart) orderStatusChart.destroy();

        const statusColors = {
            pending: '#ffab00',
            confirmed: '#0095ff',
            shipped: '#3366ff',
            delivered: '#00d68f',
            cancelled: '#ff3d71',
            returned: '#828282',
            return_requested: '#f2994a',
            out_for_delivery: '#9b51e0'
        };

        const breakdown = dashData.orderStatusBreakdown;
        const labels = breakdown.map(s => s._id.charAt(0).toUpperCase() + s._id.slice(1).replace(/_/g, ' '));
        const values = breakdown.map(s => s.count);
        const colors = breakdown.map(s => statusColors[s._id?.toLowerCase()] || '#888');

        orderStatusChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Orders',
                    data: values,
                    backgroundColor: colors.map(c => c + '99'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(20,20,20,0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888', stepSize: 1 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
    };

    // ─── Product Performance Table ──────────────────────────────────────────────

    const renderProductTable = (products) => {
        const tbody = document.getElementById('productPerformanceTbody');
        if (!tbody) return;

        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:24px; color: var(--text-dim);">No product data available</td></tr>';
            return;
        }

        tbody.innerHTML = products.map((p, i) => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${i === 0 ? '#ff1f1f' : i === 1 ? '#00a8ff' : i === 2 ? '#00d68f' : '#888'}; flex-shrink: 0;"></div>
                        <span style="font-weight: 500;">${p.name}</span>
                    </div>
                </td>
                <td style="color: var(--text-dim);">${fmt(p.unitsSold)}</td>
                <td style="color: #00d68f; font-weight: 600;">₹${fmt(p.revenue)}</td>
            </tr>
        `).join('');
    };

    // ─── PDF Export ──────────────────────────────────────────────────────────────

    const wireExports = () => {
        document.querySelectorAll('.export-btn-group button, .action-btn').forEach(btn => {
            const text = btn.textContent.trim().toLowerCase();
            if (text.includes('pdf') && btn.id !== 'generateSalesReportBtn') {
                btn.addEventListener('click', () => {
                    const original = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                    btn.disabled = true;
                    setTimeout(() => {
                        window.print();
                        btn.innerHTML = '<i class="fas fa-check"></i> Done';
                        btn.style.background = '#00d68f';
                        setTimeout(() => {
                            btn.innerHTML = original;
                            btn.disabled = false;
                            btn.style.background = '';
                        }, 2000);
                    }, 400);
                });
            }
        });
    };

    // ─── Date Range Selector ─────────────────────────────────────────────────────

    const dateRangeSelect = document.getElementById('dateRangeSelect');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', () => {
            const days = parseInt(dateRangeSelect.value);
            if (allData?.salesTrend) {
                renderSalesOverviewChart(filterByDays(allData.salesTrend, days));
            }
        });
    }

    // ─── Daily/Monthly Toggle ────────────────────────────────────────────────────

    const setupSalesToggles = () => {
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
            renderSalesOverviewChart(allData.salesTrend, 'daily');
        };

        if (btns.monthly) btns.monthly.onclick = () => {
            updateActive('monthly');
            renderSalesOverviewChart(allData.monthlySales, 'monthly');
        };

        if (btns.yearly) btns.yearly.onclick = () => {
            updateActive('yearly');
            renderSalesOverviewChart(allData.yearlySales, 'yearly');
        };

        // Default to daily as active initially from HTML? No, analytics.html has Monthly as active.
        // Let's set monthly as default if it has the active class.
        if (btns.monthly && btns.monthly.classList.contains('active')) {
            // Wait for data load though
        }
    };

    // Override the old toggle loop
    // document.querySelectorAll('.section-container .action-btn').forEach...

    // ─── Entrance Animation ──────────────────────────────────────────────────────

    function animateEntrance() {
        document.querySelectorAll('.kpi-card').forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 80 * i);
        });
    }

    // ─── Dynamic Reports ────────────────────────────────────────────────────────

    const setupDynamicReports = () => {
        const modal = document.getElementById('reportModal');
        const closeModal = document.getElementById('closeModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const printBtn = document.getElementById('printReportBtn');

        const showReportModal = (title, html) => {
            modalTitle.textContent = title;
            modalBody.innerHTML = html;
            modal.style.display = 'block';
        };

        if (closeModal) {
            closeModal.onclick = () => { if (modal) modal.style.display = 'none'; };
        }

        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
        };

        if (printBtn) {
            printBtn.onclick = () => {
                const content = modalBody.innerHTML;
                const win = window.open('', '', 'height=700,width=900');
                win.document.write('<html><head><title>Report</title>');
                win.document.write('<style>body{font-family:Inter,sans-serif;padding:40px;color:#333} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #ddd;padding:12px;text-align:left} th{background:#f8f9fa}</style>');
                win.document.write('</head><body>');
                win.document.write(`<h1>${modalTitle.textContent}</h1>`);
                win.document.write(content);
                win.document.write('</body></html>');
                win.document.close();
                win.print();
            };
        }

        // Sales Report
        const generateSalesBtn = document.getElementById('generateSalesReportBtn');
        const salesMonthInput = document.getElementById('salesReportMonth');

        if (generateSalesBtn && salesMonthInput) {
            // Set default month to current
            const now = new Date();
            salesMonthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            generateSalesBtn.onclick = async () => {
                const month = salesMonthInput.value;
                if (!month) return alert("Please select a month");

                generateSalesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    const res = await fetch(`${API_BASE}/analytics/sales-report?month=${month}`, { headers: authHeaders() });
                    const result = await res.json();

                    if (result.success) {
                        const orders = result.data;
                        let html = '';
                        if (orders.length === 0) {
                            html = '<p style="text-align:center; padding:40px;">No sales found for this month.</p>';
                        } else {
                            html = `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${orders.map(o => `
                                            <tr>
                                                <td>#${o._id.slice(-6).toUpperCase()}</td>
                                                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                                                <td>${o.user ? o.user.name : 'Guest'}</td>
                                                <td>${o.items.length}</td>
                                                <td>₹${fmt(o.total)}</td>
                                                <td>${o.status}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            `;
                        }
                        showReportModal(`Sales Report: ${month}`, html);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Failed to generate report");
                } finally {
                    generateSalesBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
                }
            };
        }

        // User Activity
        const viewActivityBtn = document.getElementById('viewUserActivityBtn');
        if (viewActivityBtn) {
            viewActivityBtn.onclick = async () => {
                viewActivityBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    const res = await fetch(`${API_BASE}/analytics/user-activity`, { headers: authHeaders() });
                    const result = await res.json();

                    if (result.success) {
                        const logs = result.data;
                        const html = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>User</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs.map(l => `
                                        <tr>
                                            <td>${new Date(l.date).toLocaleString()}</td>
                                            <td>${l.user}</td>
                                            <td><span class="badge" style="background: ${l.type === 'registration' ? '#7c3aed' : '#10b981'}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${l.type}</span></td>
                                            <td>${l.description}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `;
                        showReportModal("Recent User Activity", html);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Failed to fetch activity");
                } finally {
                    viewActivityBtn.innerHTML = '<i class="fas fa-eye"></i> View';
                }
            };
        }
    };

    // ─── Init ────────────────────────────────────────────────────────────────────

    fetchAnalytics(30).then(() => {
        setupSalesToggles();
        setupDynamicReports();
        // Sync initial active state
        if (document.getElementById('btnDaily')?.classList.contains('active')) {
            renderSalesOverviewChart(allData.salesTrend, 'daily');
        } else if (document.getElementById('btnMonthly')?.classList.contains('active')) {
            renderSalesOverviewChart(allData.monthlySales, 'monthly');
        } else if (document.getElementById('btnYearly')?.classList.contains('active')) {
            renderSalesOverviewChart(allData.yearlySales, 'yearly');
        } else {
            renderSalesOverviewChart(allData.salesTrend, 'daily');
        }
    });
    wireExports();
});
