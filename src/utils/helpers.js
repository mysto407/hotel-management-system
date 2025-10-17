// ==========================================
// FILE: src/utils/helpers.js
// ==========================================

// Calculate number of days between two dates
export const calculateDays = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
};

// Format currency
export const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
};

// Format date
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};