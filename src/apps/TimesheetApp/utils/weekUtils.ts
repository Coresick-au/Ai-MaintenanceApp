/**
 * Week Utilities
 * 
 * Functions for ISO week calculations and week-based data management.
 */

/**
 * Gets the Monday of the week containing a given date.
 * 
 * @param date - Any date within the week
 * @returns Date object set to Monday 00:00:00 of that week
 */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    // Sunday = 0, so we need to go back 6 days; Monday = 1, go back 0 days
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Gets the Sunday (end) of the week containing a given date.
 * 
 * @param date - Any date within the week
 * @returns Date object set to Sunday 23:59:59 of that week
 */
export function getWeekEnd(date: Date): Date {
    const monday = getWeekStart(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
}

/**
 * Gets the ISO week number for a date.
 * ISO weeks start on Monday; Week 1 is the week with the first Thursday.
 * 
 * @param date - Date to get week number for
 * @returns Week number (1-53)
 */
export function getISOWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday day 7
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    // Get first day of year
    const yearStart = new Date(d.getFullYear(), 0, 1);
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * Gets the ISO week year (may differ from calendar year at year boundaries).
 * 
 * @param date - Date to get week year for
 * @returns Year that the ISO week belongs to
 */
export function getISOWeekYear(date: Date): number {
    const d = new Date(date);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    return d.getFullYear();
}

/**
 * Generates a week key for database storage/lookup.
 * Format: YYYY-WXX (e.g., 2026-W01)
 * 
 * @param weekStart - Monday date of the week
 * @returns Week key string
 */
export function getWeekKey(weekStart: Date): string {
    const year = getISOWeekYear(weekStart);
    const week = getISOWeekNumber(weekStart);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Formats a date range for display.
 * Example: "Dec 30 - Jan 5, 2026"
 * 
 * @param start - Start date (Monday)
 * @param end - End date (Sunday)
 * @returns Formatted date range string
 */
export function formatDateRange(start: Date, end: Date): string {
    const startMonth = start.toLocaleDateString('en-AU', { month: 'short' });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString('en-AU', { month: 'short' });
    const endDay = end.getDate();
    const year = end.getFullYear();

    // Same month
    if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }

    // Different months
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Navigate to a different week.
 * 
 * @param currentWeekStart - Current Monday date
 * @param direction - 'prev' or 'next'
 * @returns New Monday date
 */
export function navigateWeek(currentWeekStart: Date, direction: 'prev' | 'next'): Date {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    return newDate;
}

/**
 * Formats a Date to ISO date string (YYYY-MM-DD) for storage.
 */
export function toISODateString(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
}

/**
 * Parses an ISO date string back to a Date.
 */
export function fromISODateString(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}

/**
 * Gets the Monday of a specific ISO week.
 * 
 * @param year - The ISO week year
 * @param week - The ISO week number (1-53)
 * @returns Date object set to Monday of that week
 */
export function getFirstDayOfISOWeek(year: number, week: number): Date {
    // January 4th is always in week 1 of the year
    const jan4 = new Date(year, 0, 4);
    // Get the day of week for Jan 4 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const jan4Day = jan4.getDay() || 7; // Convert 0 (Sunday) to 7
    // Calculate the Monday of week 1
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (jan4Day - 1));
    // Add the weeks offset
    const targetMonday = new Date(week1Monday);
    targetMonday.setDate(week1Monday.getDate() + (week - 1) * 7);
    targetMonday.setHours(0, 0, 0, 0);
    return targetMonday;
}
