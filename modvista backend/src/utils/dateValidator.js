/**
 * Validates dates for offers and coupons
 */

const isDateValid = (startDate, endDate) => {
    const now = new Date();
    const starts = startDate ? new Date(startDate) : null;
    const ends = endDate ? new Date(endDate) : null;

    if (starts && now < starts) return false;
    if (ends && now > ends) return false;

    return true;
};

const isFutureRangeValid = (startDate, endDate) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const starts = startDate ? new Date(startDate) : null;
    const ends = endDate ? new Date(endDate) : null;

    if (starts && starts < now) return false;
    if (ends && ends < now) return false;
    if (starts && ends && starts > ends) return false;

    return true;
};

module.exports = {
    isDateValid,
    isFutureRangeValid
};
