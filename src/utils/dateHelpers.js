/**
 * Date helper utilities for effective cost queries
 * @description Provides functions for date manipulation, formatting, and querying
 * cost history based on effective dates.
 */

/**
 * Find the effective cost for a given target date
 * @description Searches through cost history to find the most recent cost entry
 * where effectiveDate <= targetDate. Handles unsorted arrays.
 * @param {Array<{effectiveDate: string, costPrice: number}>} costHistory - Array of cost entries
 * @param {Date|string} targetDate - The date to find the effective cost for
 * @returns {Object|null} The effective cost entry or null if none found
 * @example
 * const cost = findEffectiveCost(history, new Date('2025-12-13'));
 * // returns { effectiveDate: '2025-12-01T00:00:00.000Z', costPrice: 1250 }
 */
export function findEffectiveCost(costHistory, targetDate) {
    if (!costHistory || costHistory.length === 0) {
        return null;
    }

    const targetTimestamp = targetDate instanceof Date
        ? targetDate.getTime()
        : new Date(targetDate).getTime();

    // Filter costs that are effective on or before target date
    const validCosts = costHistory.filter(entry => {
        const effectiveTimestamp = new Date(entry.effectiveDate).getTime();
        return effectiveTimestamp <= targetTimestamp;
    });

    if (validCosts.length === 0) {
        return null;
    }

    // Sort by effective date descending and return the most recent
    validCosts.sort((a, b) => {
        const dateA = new Date(a.effectiveDate).getTime();
        const dateB = new Date(b.effectiveDate).getTime();
        return dateB - dateA;
    });

    return validCosts[0];
}

/**
 * Format a date for Firestore storage
 * @description Converts various date formats to ISO 8601 string format for
 * consistent Firestore storage. Normalizes date-only strings to start of day UTC.
 * @param {Date|string} date - Date to format
 * @returns {string} ISO 8601 formatted date string
 * @throws {Error} If date is invalid
 * @example
 * formatDateForFirestore('2025-12-13');
 * // returns '2025-12-13T00:00:00.000Z'
 */
export function formatDateForFirestore(date) {
    let dateObj;

    if (date instanceof Date) {
        dateObj = date;
    } else if (typeof date === 'string') {
        // Check if it's a date-only string (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            // Parse as UTC to avoid timezone issues
            dateObj = new Date(date + 'T00:00:00.000Z');
        } else {
            dateObj = new Date(date);
        }
    } else {
        throw new Error('Invalid date input');
    }

    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date: unable to parse');
    }

    return dateObj.toISOString();
}

/**
 * Parse an effective date string to a Date object
 * @description Converts various date string formats to Date objects with validation.
 * Handles ISO strings, date-only strings, and natural language dates.
 * @param {Date|string} dateInput - Date string or Date object
 * @returns {Date} Parsed Date object
 * @throws {Error} If date cannot be parsed
 * @example
 * parseEffectiveDate('2025-12-13');
 * // returns Date object for December 13, 2025
 */
export function parseEffectiveDate(dateInput) {
    if (dateInput instanceof Date) {
        return dateInput;
    }

    if (typeof dateInput !== 'string') {
        throw new Error('Date input must be a string or Date object');
    }

    const dateObj = new Date(dateInput);

    if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date string: ${dateInput}`);
    }

    return dateObj;
}
