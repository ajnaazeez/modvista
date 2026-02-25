/**
 * Pricing Engine to handle consistent price calculations
 */

const calculatePriceBreakdown = (items, coupon = null, offer = null, shippingFee = 0) => {
    let subtotal = 0;
    let offerBreakdown = [];
    let offerDiscountTotal = 0;

    const { computePricing } = require('./pricingHelper');

    // 1. Process Items and Apply Product-Specific Offers (if applicable)
    const orderItems = items.map(item => {
        const product = item.product;
        const pricing = computePricing(product);
        const basePrice = product.price;
        const finalUnitPrice = pricing.displayPrice;

        const itemTotal = basePrice * item.quantity;
        const itemFinalTotal = finalUnitPrice * item.quantity;

        subtotal += itemTotal;
        offerDiscountTotal += (itemTotal - itemFinalTotal);

        return {
            product: product._id,
            name: product.name,
            basePrice: basePrice,
            price: parseFloat(finalUnitPrice.toFixed(2)), // Added for Order model validation
            finalUnitPrice: parseFloat(finalUnitPrice.toFixed(2)),
            quantity: item.quantity,
            image: product.images && product.images[0] ? product.images[0] : '',
            variant: item.variant || 'Standard',
            itemSubtotal: parseFloat(itemTotal.toFixed(2)),
            itemFinalTotal: parseFloat(itemFinalTotal.toFixed(2))
        };
    });

    const discountedSubtotal = subtotal - offerDiscountTotal;

    // 2. Apply Coupon Discount on the discounted subtotal
    let couponDiscount = 0;
    const now = new Date();
    if (coupon && coupon.isActive) {
        const start = coupon.startDate ? new Date(coupon.startDate) : null;
        const end = coupon.endDate ? new Date(coupon.endDate) : null;

        if ((!start || now >= start) && (!end || now <= end)) {
            const hasQualifyingProduct = orderItems.some(item => {
                const itemPrice = item.basePrice || 0;
                return itemPrice >= (coupon.minProductPrice || 0);
            });

            if (hasQualifyingProduct && discountedSubtotal >= (coupon.minOrderAmount || 0)) {
                if (coupon.discountType === 'FLAT') {
                    couponDiscount = coupon.discountValue;
                } else if (coupon.discountType === 'PERCENT') {
                    couponDiscount = discountedSubtotal * (coupon.discountValue / 100);
                    if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
                        couponDiscount = coupon.maxDiscount;
                    }
                }
            }
        }

        // Cap discount to discountedSubtotal
        if (couponDiscount > discountedSubtotal) {
            couponDiscount = discountedSubtotal;
        }
    }

    const taxRate = 0; // GST removed as per user request
    const taxableAmount = Math.max(0, discountedSubtotal - couponDiscount);
    const tax = 0;
    const finalTotal = taxableAmount + shippingFee;

    return {
        orderItems,
        summary: {
            subtotal: parseFloat(subtotal.toFixed(2)),
            offerDiscountTotal: parseFloat(offerDiscountTotal.toFixed(2)),
            discountedSubtotal: parseFloat(discountedSubtotal.toFixed(2)),
            couponDiscount: parseFloat(couponDiscount.toFixed(2)),
            tax: parseFloat(tax.toFixed(2)),
            shipping: parseFloat(shippingFee.toFixed(2)),
            total: parseFloat(finalTotal.toFixed(2))
        }
    };
};

module.exports = { calculatePriceBreakdown };
