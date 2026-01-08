/**
 * Time Period Utilities for AU Financial Year (Jul-Jun) and Calendar Year (Jan-Dec)
 */

/**
 * Get the Financial Year for a given date
 * AU FY runs July 1 to June 30
 * @param {Date} date - The date to check
 * @returns {number} The ending year of the FY (e.g., 2025 for FY24-25)
 */
export const getFinancialYear = (date) => {
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // July (6) onwards = next calendar year's FY
    return month >= 6 ? year + 1 : year;
};

/**
 * Get FY label string in format "FY24-25"
 * @param {Date} date - The date to get FY label for
 * @returns {string} FY label (e.g., "FY24-25")
 */
export const getFYLabel = (date) => {
    const fyEndYear = getFinancialYear(date);
    const fyStartYear = fyEndYear - 1;
    const startShort = String(fyStartYear).slice(-2);
    const endShort = String(fyEndYear).slice(-2);
    return `FY${startShort}-${endShort}`;
};

/**
 * Get a sortable key for FY ordering
 * @param {Date} date - The date
 * @returns {string} Sort key (e.g., "2025" for FY24-25)
 */
export const getFYSortKey = (date) => {
    return String(getFinancialYear(date));
};

/**
 * Get month sort key based on year type
 * @param {Date} date - The date
 * @param {string} yearType - "financial" or "calendar"
 * @returns {string} Sort key (YYYY-MM format adjusted for FY)
 */
export const getMonthSortKey = (date, yearType) => {
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();

    if (yearType === "financial") {
        // FY: Jul=01, Aug=02, ..., Jun=12
        const fy = month < 6 ? year : year + 1;
        const fyMonth = month < 6 ? month + 7 : month - 5;
        return `${fy}-${String(fyMonth).padStart(2, '0')}`;
    }
    // Calendar: Jan=01, ..., Dec=12
    return `${year}-${String(month + 1).padStart(2, '0')}`;
};

/**
 * Get month display label
 * @param {Date} date - The date
 * @returns {string} Display label (e.g., "Jan 24")
 */
export const getMonthLabel = (date) => {
    const monthName = date.toLocaleDateString('en-AU', { month: 'short' });
    const yearShort = String(date.getFullYear()).slice(-2);
    return `${monthName} ${yearShort}`;
};

/**
 * Get month key for drill-down (YYYY-MM format)
 * @param {Date} date - The date
 * @returns {string} Month key (e.g., "2024-07")
 */
export const getMonthKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Check if a date falls within a specific Financial Year
 * @param {Date} date - The date to check
 * @param {number} fyEndYear - The ending year of the FY to check against
 * @returns {boolean} True if date is in that FY
 */
export const isInFinancialYear = (date, fyEndYear) => {
    return getFinancialYear(date) === fyEndYear;
};

/**
 * Get the date range for a Financial Year
 * @param {number} fyEndYear - The ending year of the FY
 * @returns {{ start: Date, end: Date }} Start and end dates of the FY
 */
export const getFYDateRange = (fyEndYear) => {
    const startYear = fyEndYear - 1;
    return {
        start: new Date(startYear, 6, 1), // July 1
        end: new Date(fyEndYear, 5, 30, 23, 59, 59) // June 30
    };
};
