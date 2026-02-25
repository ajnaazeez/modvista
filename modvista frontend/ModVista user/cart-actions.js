/**
 * cart-actions.js
 * Handles "Add to Cart" globally for Shop and Product pages.
 * Integrates with Backend: POST /api/cart
 */

// Use centralized API tools from api.js
const getModVistaAPI = () => {
  return window.ModVistaAPI || {
    API_BASE: "http://localhost:5000/api",
    getToken: () => localStorage.getItem("token"),
    authHeaders: () => ({ "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") })
  };
};

const API_CART_BASE = `${getModVistaAPI().API_BASE}/cart`;

function redirectToLogin() {
  localStorage.setItem("redirectUrl", window.location.href);
  window.location.href = "login.html";
}

// ---------- API ----------
async function addToCartGlobal(productId, quantity = 1, variant = "Standard") {
  const token = getModVistaAPI().getToken();

  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const res = await fetch(API_CART_BASE, {
      method: "POST",
      headers: getModVistaAPI().authHeaders(),
      body: JSON.stringify({ productId, quantity, variant }),
    });

    if (res.status === 401) {
      redirectToLogin();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Failed to add to cart");

    showCartToast("Item added to cart ✅");
    updateGlobalCartBadge();
  } catch (err) {
    console.error("Add to cart failed:", err);
    showCartToast("Add to cart failed ❌");
  }
}

async function updateGlobalCartBadge() {
  const token = getModVistaAPI().getToken();
  if (!token) {
    // if logged out, hide badge
    document.querySelectorAll(".cart-count-badge").forEach((el) => {
      el.style.display = "none";
      el.textContent = "0";
    });
    return;
  }

  try {
    const res = await fetch(API_CART_BASE, { headers: getModVistaAPI().authHeaders() });
    if (res.status === 401) {
      // token expired
      localStorage.removeItem("token");
      updateGlobalCartBadge();
      return;
    }

    if (!res.ok) return;

    const data = await res.json();
    const items = data.items || [];
    const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    document.querySelectorAll(".cart-count-badge").forEach((el) => {
      el.textContent = count;
      el.style.display = count > 0 ? "flex" : "none";
    });
  } catch (err) {
    console.error("Badge update failed:", err);
  }
}

// ---------- UI Toast ----------
function showCartToast(msg) {
  const existing = document.querySelector(".cart-toast-global");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "cart-toast-global";
  toast.textContent = msg;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "var(--neon-red, #ff3b30)",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    zIndex: "9999",
    animation: "fadeInUp 0.3s ease",
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  updateGlobalCartBadge();

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-cart-btn");
    if (!btn) return;

    e.preventDefault();

    // ✅ IMPORTANT: get productId from button OR from nearest .product-card
    const card = btn.closest(".product-card");
    const productId = btn.dataset.productId || card?.dataset?.productId;

    if (!productId) {
      console.error("No productId found (add data-product-id on button or product-card)");
      showCartToast("Product ID missing ❌");
      return;
    }

    const variant = btn.dataset.variant || "Standard";
    const quantity = Number(btn.dataset.qty || 1);

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    addToCartGlobal(productId, quantity, variant).finally(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    });
  });
});

// Toast animation
const style = document.createElement("style");
style.textContent = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}`;
document.head.appendChild(style);
