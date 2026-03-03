document.addEventListener('DOMContentLoaded', async () => {
    // ====== 1. AUTH GUARD (JWT Token Check) ======
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to continue');
        window.location.href = 'login.html';
        return;
    }

    // ====== 2. GET ORDER ID ======
    const orderId = localStorage.getItem('orderId');
    if (!orderId) {
        alert('No order found. Redirecting to cart...');
        window.location.href = 'cart.html';
        return;
    }

    // ====== 3. ELEMENTS ======
    const paymentCards = document.querySelectorAll('.payment-method-card');
    const finalPayBtn = document.getElementById('final-pay-btn');
    const codCheckbox = document.getElementById('confirm-cod');
    const loadingOverlay = document.getElementById('loading-overlay');
    const statusText = document.getElementById('status-text');
    const finalSummaryItems = document.getElementById('final-summary-items');

    // ====== 4. STATE ======
    let selectedMethod = 'razorpay';
    let order = null;
    let userWalletBalance = 0; // Will be fetched from backend
    let isWalletApplied = false;
    let currentTotal = 0;
    const COD_LIMIT = 50000;

    // ====== 5. LOAD ORDER & WALLET FROM BACKEND ======
    async function loadInitialData() {
        try {
            // Fetch Order and Wallet Balance in parallel
            const [orderRes, walletRes] = await Promise.all([
                window.ModVistaAPI.apiCall(`/orders/${orderId}`),
                window.ModVistaAPI.apiCall('/wallet/balance')
            ]);

            if (!orderRes || !orderRes.success) throw new Error('Failed to load order');
            order = orderRes.data;

            if (walletRes && walletRes.success) {
                userWalletBalance = walletRes.balance || 0;
            }

            console.log('Data loaded:', { order, userWalletBalance });

            renderOrderSummary();
            initWalletUI();
        } catch (error) {
            console.error('Load data error:', error);
            alert('Failed to load required data: ' + error.message);
            window.location.href = 'cart.html';
        }
    }

    // ====== 6. RENDER ORDER SUMMARY ======
    function renderOrderSummary() {
        if (!order) return;

        // Display Address
        const addr = order.shippingAddress;
        document.getElementById('display-name').textContent = addr.fullName || 'N/A';
        document.getElementById('display-address').textContent =
            `${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}`;

        // Display Items
        finalSummaryItems.innerHTML = '';
        order.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'summary-item';
            row.style.marginBottom = '15px';

            // Use unified image resolver
            const imgSrc = window.ModVistaAPI && typeof window.ModVistaAPI.resolveImg === 'function'
                ? window.ModVistaAPI.resolveImg(item.image)
                : 'assets/default-product.png';

            row.innerHTML = `
                <img src="${imgSrc}" alt="${item.name}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;">
                <div class="summary-item-info">
                    <h4 style="font-size: 0.85rem;">${item.name}</h4>
                    <p style="font-size: 0.75rem;">Qty: ${item.quantity}</p>
                </div>
                <div class="summary-item-price" style="font-size: 0.85rem;">₹${(item.price * item.quantity).toFixed(2)}</div>
            `;
            finalSummaryItems.appendChild(row);
        });

        // Display Totals from Backend Order
        const subtotal = parseFloat(order.subtotal || 0);
        const tax = parseFloat(order.tax || 0);
        const total = parseFloat(order.total || 0);
        const offerDiscount = parseFloat(order.offerDiscount || 0);
        const couponDiscount = order.coupon ? parseFloat(order.coupon.discount || 0) : 0;

        currentTotal = total;

        document.getElementById('final-subtotal').textContent = `₹${subtotal.toFixed(2)}`;

        const offerRow = document.getElementById('final-offer-discount-row');
        if (offerDiscount > 0) {
            offerRow.style.display = 'flex';
            document.getElementById('final-offer-discount').textContent = `-₹${offerDiscount.toFixed(2)}`;
        } else {
            offerRow.style.display = 'none';
        }

        const couponRow = document.getElementById('final-coupon-discount-row');
        if (couponDiscount > 0) {
            couponRow.style.display = 'flex';
            document.getElementById('final-coupon-discount').textContent = `-₹${couponDiscount.toFixed(2)}`;
        } else {
            couponRow.style.display = 'none';
        }

        document.getElementById('final-tax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('final-total').textContent = `₹${total.toFixed(2)}`;

        // Check COD limit
        checkCODLimit(subtotal);
    }

    // ====== 7. WALLET UI ======
    function initWalletUI() {
        const walletSection = document.getElementById('wallet-section');
        const balanceDisplay = document.getElementById('wallet-balance-amount');
        const walletToggle = document.getElementById('wallet-toggle');

        if (userWalletBalance > 0) {
            walletSection.style.display = 'block';
            balanceDisplay.textContent = `₹${userWalletBalance.toFixed(2)}`;

            // Auto-apply if wallet covers full amount
            if (userWalletBalance >= currentTotal) {
                walletToggle.checked = true;
                isWalletApplied = true;
                calculateTotals();
            }
        }

        walletToggle.addEventListener('change', (e) => {
            isWalletApplied = e.target.checked;
            calculateTotals();
        });
    }

    // ====== 8. CALCULATE TOTALS WITH WALLET ======
    function calculateTotals() {
        if (!order) return;

        // Start from order.total which already accounts for coupon + offer discounts
        const baseTotal = parseFloat(order.total || 0);
        let payableAmount = baseTotal;

        let walletDeduction = 0;
        let isFullCoverage = false;

        if (isWalletApplied) {
            walletDeduction = Math.min(payableAmount, userWalletBalance);
            payableAmount -= walletDeduction;

            if (payableAmount <= 0) {
                payableAmount = 0;
                isFullCoverage = true;
            }
        }

        updateUIForCoverage(isFullCoverage, walletDeduction);

        // Update Wallet Discount Row
        const walletRow = document.getElementById('wallet-discount-row');
        if (walletDeduction > 0) {
            walletRow.style.display = 'flex';
            document.getElementById('wallet-discount').textContent = `-₹${walletDeduction.toFixed(2)}`;

            const msgContainer = document.getElementById('wallet-applied-msg');
            const msgText = document.getElementById('wallet-msg-text');
            msgContainer.style.display = 'block';
            document.getElementById('wallet-deduction').textContent = `-₹${walletDeduction.toFixed(2)}`;

            if (isFullCoverage) {
                msgText.innerHTML = 'Full amount covered by wallet.';
            } else {
                msgText.innerHTML = `Wallet Applied: <span class="neon-text">-₹${walletDeduction.toFixed(2)}</span>`;
            }
        } else {
            walletRow.style.display = 'none';
            document.getElementById('wallet-applied-msg').style.display = 'none';
        }

        document.getElementById('final-total').textContent = `₹${payableAmount.toFixed(2)}`;
        currentTotal = payableAmount;

        // Update Button State
        updateButtonState(payableAmount, isFullCoverage);
    }


    // ====== 9. UI COVERAGE HANDLING ======
    function updateUIForCoverage(isFullCoverage, deduction) {
        const paymentGrid = document.getElementById('payment-methods-grid');
        const fullCoverageMsg = document.getElementById('full-wallet-coverage-msg');
        const totalLabel = document.querySelector('.summary-row.total span:first-child');

        if (isFullCoverage) {
            paymentGrid.classList.add('disabled');
            fullCoverageMsg.style.display = 'block';
            totalLabel.textContent = 'Total Payable';

            // Add COD block message
            const codCard = document.querySelector('.payment-method-card[data-method="cod"]');
            if (codCard && !codCard.querySelector('.wallet-block-msg')) {
                const details = codCard.querySelector('.method-details');
                const msg = document.createElement('p');
                msg.className = 'wallet-block-msg';
                msg.style = 'color: var(--neon-red); font-size: 0.75rem; margin-top: 5px; font-weight: 600;';
                msg.innerHTML = '<i class="fas fa-ban"></i> Cash on Delivery is unavailable because this order is fully paid using wallet balance';
                details.appendChild(msg);
            }
        } else {
            paymentGrid.classList.remove('disabled');
            fullCoverageMsg.style.display = 'none';

            // Remove COD message
            const codCard = document.querySelector('.payment-method-card[data-method="cod"]');
            if (codCard) {
                const msg = codCard.querySelector('.wallet-block-msg');
                if (msg) msg.remove();
            }

            if (isWalletApplied) {
                totalLabel.textContent = 'Remaining Amount';
            } else {
                totalLabel.textContent = 'Total Amount';
            }
        }
    }

    // ====== 10. COD LIMIT CHECK ======
    function checkCODLimit(subtotal) {
        if (subtotal > COD_LIMIT) {
            const codCard = document.querySelector('.payment-method-card[data-method="cod"]');
            if (codCard) {
                codCard.style.opacity = '0.5';
                codCard.style.pointerEvents = 'none';
                const details = codCard.querySelector('.method-details p');
                details.innerHTML += ` <br><span style="color: var(--neon-red); font-weight: bold; font-size: 0.75rem;">Unavailable for orders above ₹${COD_LIMIT}</span>`;
            }
        }
    }

    // ====== 11. BUTTON STATE UPDATE ======
    function updateButtonState(payableAmount, isFullCoverage) {
        if (isFullCoverage) {
            finalPayBtn.textContent = 'Place Order (Paid by Wallet)';
            finalPayBtn.disabled = false;
            finalPayBtn.style.opacity = '1';
            finalPayBtn.style.cursor = 'pointer';
        } else {
            if (selectedMethod === 'cod') {
                finalPayBtn.textContent = `Confirm COD Order (₹${payableAmount.toFixed(2)})`;
                checkButtonStatus();
            } else {
                finalPayBtn.textContent = `Pay ₹${payableAmount.toFixed(2)} with Razorpay`;
                finalPayBtn.disabled = false;
                finalPayBtn.style.opacity = '1';
                finalPayBtn.style.cursor = 'pointer';
            }
        }
    }

    // ====== 12. PAYMENT METHOD SELECTION ======
    paymentCards.forEach(card => {
        card.addEventListener('click', async () => {
            // Disable selection if full wallet coverage
            if (isWalletApplied && currentTotal <= 0 && document.getElementById('payment-methods-grid').classList.contains('disabled')) return;

            const method = card.dataset.method;
            selectedMethod = method;

            // Update UI
            paymentCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input').checked = true;

            // Map to backend payment method format
            let backendMethod = method === 'razorpay' ? 'mock_razorpay' : 'cod';

            // Call backend to set payment method
            try {
                await window.ModVistaAPI.apiCall(`/orders/${orderId}/method`, {
                    method: 'PATCH',
                    body: JSON.stringify({ paymentMethod: backendMethod })
                });
            } catch (error) {
                console.error('Failed to set payment method:', error);
            }

            const total = currentTotal;

            // Update Button Text
            if (method === 'razorpay') {
                finalPayBtn.textContent = `Pay ₹${total.toFixed(2)} with Razorpay`;
            } else {
                finalPayBtn.textContent = `Confirm COD Order (₹${total.toFixed(2)})`;
            }

            checkButtonStatus();
        });
    });

    // ====== 13. BUTTON STATUS CHECK ======
    function checkButtonStatus() {
        if (selectedMethod === 'cod') {
            if (currentTotal > 0) {
                finalPayBtn.disabled = !codCheckbox.checked;
            } else {
                finalPayBtn.disabled = false;
            }
        } else {
            finalPayBtn.disabled = false;
        }
    }

    codCheckbox.addEventListener('change', checkButtonStatus);

    // ====== 14. PAYMENT PROCESSING ======
    finalPayBtn.addEventListener('click', async () => {
        const amountToPay = currentTotal;

        if (selectedMethod === 'razorpay' && amountToPay > 0) {
            startRazorpayPayment(amountToPay);
            return;
        }

        document.getElementById('wallet-toggle').disabled = true;
        loadingOverlay.style.display = 'flex';

        let msg = 'Processing...';
        if (amountToPay === 0) {
            msg = 'Debiting Wallet...';
        } else {
            msg = 'Placing Order...';
        }

        statusText.textContent = msg;

        // Determine payment method to send
        let paymentMethodToBackend = amountToPay === 0 ? 'wallet' : 'cod';

        try {
            if (selectedMethod === 'cod' && amountToPay > 0) {
                // COD: Call /pay endpoint to ensure cart is cleared on backend
                await new Promise(resolve => setTimeout(resolve, 1000));
                await processPayment('cod');
            } else {
                // Wallet full coverage or other method
                await new Promise(resolve => setTimeout(resolve, 1000));
                await processPayment(paymentMethodToBackend);
            }
        } catch (error) {
            console.error('Payment initiation error:', error);
            alert('Error: ' + error.message);
            loadingOverlay.style.display = 'none';
            document.getElementById('wallet-toggle').disabled = false;
            finalPayBtn.disabled = false;
            updateButtonState(currentTotal, currentTotal <= 0);
        }
    });

    // ====== 15. START RAZORPAY PAYMENT ======
    async function startRazorpayPayment(amount) {
        try {
            loadingOverlay.style.display = 'flex';
            statusText.textContent = 'Preparing Payment...';

            // 1. Get Razorpay Key Id
            const keyRes = await window.ModVistaAPI.apiCall('/public/razorpay-key');
            if (!keyRes || !keyRes.success) throw new Error('Failed to fetch Razorpay key');
            const keyId = keyRes.key_id;

            // 2. Create Razorpay Order
            const orderRes = await window.ModVistaAPI.apiCall('/razorpay/create-order', {
                method: 'POST',
                body: JSON.stringify({ amount, receipt: `order_${orderId}` })
            });

            if (!orderRes || !orderRes.success) throw new Error('Failed to create Razorpay order');
            const rpOrderId = orderRes.order_id;

            loadingOverlay.style.display = 'none';

            const options = {
                key: keyId,
                amount: orderRes.amount,
                currency: "INR",
                name: "ModVista",
                description: "Modification Payment",
                order_id: rpOrderId,
                handler: async function (response) {
                    loadingOverlay.style.display = 'flex';
                    statusText.textContent = 'Verifying Payment...';

                    try {
                        // 3. Verify Signature
                        const verifyRes = await window.ModVistaAPI.apiCall('/razorpay/verify', {
                            method: 'POST',
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (verifyRes && verifyRes.success) {
                            // 4. Mark ModVista order as paid
                            statusText.textContent = 'Finalizing Order...';
                            await processPayment('razorpay', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            });
                        } else {
                            throw new Error('Verification failed');
                        }
                    } catch (err) {
                        alert('Verification failed: ' + err.message);
                        loadingOverlay.style.display = 'none';
                    }
                },
                prefill: {
                    name: order.shippingAddress.fullName,
                    contact: order.shippingAddress.phone
                },
                theme: {
                    color: "#ff1f1f"
                }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert('Payment Failed: ' + response.error.description);
            });
            rzp.open();

        } catch (error) {
            console.error('Razorpay Init error:', error);
            alert('Error initializing Razorpay: ' + error.message);
            loadingOverlay.style.display = 'none';
        }
    }

    // ====== 16. PROCESS PAYMENT (Call backend) ======
    async function processPayment(paymentMethod, extraData = {}) {
        try {
            statusText.textContent = 'Finalizing payment...';

            const res = await window.ModVistaAPI.apiCall(`/orders/${orderId}/pay`, {
                method: 'PATCH',
                body: JSON.stringify({
                    paymentMethod,
                    ...extraData
                })
            });

            if (res && res.success) {
                await processSuccess(paymentMethod);
            } else {
                throw new Error('Payment failed');
            }
        } catch (error) {
            console.error('Process payment error:', error);
            alert('Payment processing failed: ' + error.message);
            loadingOverlay.style.display = 'none';
            document.getElementById('wallet-toggle').disabled = false;
        }
    }

    // ====== 16. PROCESS SUCCESS ======
    async function processSuccess(paymentMethod) {
        statusText.textContent = 'Order Placed Successfully!';

        // Ensure orderId exists before redirecting
        if (!orderId) {
            alert("OrderId missing. Please go back to checkout and place order again.");
            window.location.href = "checkout.html";
            return;
        }

        // Save order info for backup (optional)
        localStorage.setItem('lastOrderId', orderId);

        // DO NOT clear orderId yet - keep it for potential refresh/back navigation
        // localStorage.removeItem('orderId'); // REMOVED - causes issues

        // Redirect with orderId in URL for reliability
        setTimeout(() => {
            window.location.href = `order-success.html?orderId=${orderId}`;
        }, 1000);
    }

    // ====== 17. INITIALIZE ======
    await loadInitialData();
});
