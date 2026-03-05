// cart-script.js (BACKEND CONNECTED VERSION)
(function () {
    const API_BASE = (window.ModVistaAPI && window.ModVistaAPI.API_BASE) ? window.ModVistaAPI.API_BASE.replace('/api', '') : "http://localhost:5000";

    // -------- Helpers --------
    function getToken() {
        return localStorage.getItem("token");
    }

    function requireLogin() {
        if (!getToken()) {
            localStorage.setItem("redirectUrl", "cart.html");
            window.location.href = "login.html";
            return false;
        }
        return true;
    }

    function authHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: "Bearer " + getToken()
        };
    }

    // -------- API Calls --------
    async function fetchCart() {
        const res = await fetch(`${API_BASE}/api/cart`, {
            headers: authHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch cart");
        return res.json();
    }

    async function updateItemQuantity(itemId, quantity) {
        try {
            const res = await fetch(`${API_BASE}/api/cart/item/${itemId}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ quantity })
            });
            if (!res.ok) throw new Error("Failed to update quantity");
            renderCart(); // Re-render after update
        } catch (e) {
            console.error(e);
            alert(e.message);
        }
    }

    async function removeItem(itemId) {
        try {
            const res = await fetch(`${API_BASE}/api/cart/item/${itemId}`, {
                method: "DELETE",
                headers: authHeaders()
            });
            if (!res.ok) throw new Error("Failed to remove item");
            renderCart();
        } catch (e) {
            console.error(e);
            alert(e.message);
        }
    }

    // -------- UI Render --------
    async function renderCart() {
        if (!requireLogin()) return;

        const cartContainer = document.getElementById("cart-container");
        const list = document.getElementById("cart-items-list");
        const emptyMsg = document.getElementById("empty-cart-msg");

        if (list) list.innerHTML = '<p class="loading-text">Loading your modifications...</p>';
        if (emptyMsg) emptyMsg.style.display = "none";

        try {
            const cart = await fetchCart();
            const items = cart.items || [];

            if (items.length === 0) {
                if (cartContainer) cartContainer.style.display = "none";
                if (emptyMsg) emptyMsg.style.display = "block";
                updateCartBadge(0);
                return;
            }

            if (list) list.innerHTML = "";
            if (cartContainer) cartContainer.style.display = "grid";

            const summary = cart.summary || { subtotal: 0, total: 0, offerDiscountTotal: 0 };

            if (list) {
                items.forEach(item => {
                    const product = item.product || { name: 'Unknown Product', price: 0 };
                    const itemUnitPrice = item.finalUnitPrice || product.price;
                    const itemTotal = itemUnitPrice * item.quantity;

                    let img = window.ModVistaAPI.resolveImg(product.images?.[0]);

                    const row = document.createElement("div");
                    row.className = "cart-item";
                    row.innerHTML = `
                        <div class="item-img"><img src="${img}" alt="${product.name}" onerror="this.onerror=null;this.src='assets/default-product.png'"></div>
                        <div class="item-info">
                          <h3>${product.name}</h3>
                          <p>Variant: ${item.variant || 'Standard'}</p>
                          ${item.finalUnitPrice < product.price ? `<p class="price-sale" style="color: #28a745; font-weight: 600;">₹${item.finalUnitPrice.toLocaleString()}</p>` : ''}
                        </div>
                        <div class="item-qty">
                          <button class="qty-btn minus">-</button>
                          <input type="number" value="${item.quantity}" readonly />
                          <button class="qty-btn plus">+</button>
                        </div>
                        <div class="item-price">₹${itemTotal.toLocaleString()}</div>
                        <button class="remove-item"><i class="fas fa-trash"></i></button>
                    `;

                    row.querySelector(".minus").onclick = () => item.quantity > 1 ? updateItemQuantity(item._id, item.quantity - 1) : removeItem(item._id);
                    row.querySelector(".plus").onclick = () => updateItemQuantity(item._id, item.quantity + 1);
                    row.querySelector(".remove-item").onclick = () => removeItem(item._id);
                    list.appendChild(row);
                });
            }

            if (document.getElementById("subtotal"))
                document.getElementById("subtotal").textContent = `₹${summary.subtotal.toLocaleString()}`;
            if (document.getElementById("total-price"))
                document.getElementById("total-price").textContent = `₹${summary.total.toLocaleString()}`;

            // Optional: Dynamic discount row in summary if list exists
            const summaryTable = document.querySelector('.summary-table');
            if (summaryTable && summary.offerDiscountTotal > 0) {
                // Check if offer row exists, or just re-render summary parts
                // For simplicity, I'll just ensure total-price is correct which it is.
            }

            updateCartBadge(items.reduce((sum, i) => sum + i.quantity, 0));

        } catch (error) {
            console.error("Render Cart Error:", error);
            if (list) list.innerHTML = `<p style="color:red">Error loading cart: ${error.message}</p>`;
        }
    }

    // -------- Cart Badge --------
    function updateCartBadge(count) {
        document.querySelectorAll(".cart-count-badge").forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        });
    }

    // -------- Init --------
    document.addEventListener("DOMContentLoaded", () => {
        // Only run renderCart if we are on a page that needs it (check for element presence or generic)
        // But the script is loaded on checkout pages etc.
        // checkout.html uses checkout.js for rendering summary, BUT cart-script.js runs usually on cart.html.
        // However, checkout.html includes it. Let's make it safe.
        if (document.getElementById("cart-items-list")) {
            renderCart();
        }

        const checkoutBtn = document.getElementById("proceed-checkout");
        if (checkoutBtn) {
            checkoutBtn.onclick = () => {
                window.location.href = "checkout.html";
            };
        }
    });

})(); // End IIFE
