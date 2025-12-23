// ==========================================
// HELPER: DATE FORMATTER
// ==========================================
export const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let result = `${day}-${month}-${year}`;

    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        result += ` ${hours}:${minutes}`;
    }

    return result;
};

// ==========================================
// HELPER: CURRENCY FORMATTER
// ==========================================
export const formatCurrency = (cents) => {
    if (cents === undefined || cents === null) return '';
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
    }).format(cents / 100);
};
