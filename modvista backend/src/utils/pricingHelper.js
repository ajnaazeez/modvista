/**
 * Helper to compute dynamic pricing for a product
 * @param {Object} product - Product document from MongoDB
 * @returns {Object} Pricing object for frontend
 */
const computePricing = (product) => {
    const now = new Date();
    let offerApplied = false;

    // Logic: Offer is applied only if offerActive=true AND now is within offerStart/offerEnd (if set)
    if (product.offerActive && product.salePrice > 0 && product.salePrice < product.price) {
        const starts = product.offerStart ? new Date(product.offerStart) : null;
        const ends = product.offerEnd ? new Date(product.offerEnd) : null;

        if ((!starts || now >= starts) && (!ends || now <= ends)) {
            offerApplied = true;
        }
    }

    if (offerApplied) {
        const discountPercent = Math.round(((product.price - product.salePrice) / product.price) * 100);
        return {
            displayPrice: product.salePrice,
            originalPrice: product.price,
            discountPercent: discountPercent,
            offerApplied: true
        };
    }

    return {
        displayPrice: product.price,
        originalPrice: null,
        discountPercent: 0,
        offerApplied: false
    };
};

module.exports = { computePricing };
