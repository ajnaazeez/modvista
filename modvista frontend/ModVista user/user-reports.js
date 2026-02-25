document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const fetchUserReports = async () => {
        try {
            // Using global apiFetch if available, else direct fetch
            let data;
            if (typeof apiFetch === 'function') {
                data = await apiFetch('/api/analytics/user');
            } else {
                const res = await fetch('http://localhost:5000/api/analytics/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                data = await res.json();
            }

            if (data.success) {
                renderReports(data.data);
            }
        } catch (err) {
            console.error("Failed to load user reports:", err);
        }
    };

    const renderReports = (data) => {
        const kpis = data.kpis;
        document.getElementById('totalSpent').textContent = `$${kpis.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('totalOrders').textContent = kpis.totalOrders;
        document.getElementById('avgOrderValue').textContent = `$${kpis.avgSpending}`;

        // Render Monthly Trend
        const trendContainer = document.getElementById('monthlyTrend');
        if (trendContainer) {
            const maxSpent = Math.max(...data.monthlyTrend.map(t => t.spent), 1);
            trendContainer.innerHTML = data.monthlyTrend.map(t => {
                const height = (t.spent / maxSpent) * 100;
                const monthName = new Date(t._id + "-01").toLocaleString('default', { month: 'short' });
                return `
                    <div class="trend-bar" style="height: ${height}%" data-month="${monthName}"></div>
                `;
            }).join('');
        }

        // Render Category Stats
        const categoryContainer = document.getElementById('categoryStats');
        if (categoryContainer) {
            const totalCount = data.categoryStats.reduce((acc, curr) => acc + curr.count, 0);
            categoryContainer.innerHTML = data.categoryStats.map(c => {
                const percentage = totalCount > 0 ? (c.count / totalCount) * 100 : 0;
                return `
                    <div class="category-item">
                        <span class="category-name">${c.name}</span>
                        <div class="category-progress">
                            <div class="category-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span style="font-size: 0.8rem; opacity: 0.6">${Math.round(percentage)}%</span>
                    </div>
                `;
            }).join('');
        }
    };

    fetchUserReports();
});
