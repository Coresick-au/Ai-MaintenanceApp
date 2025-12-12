/**
 * Utility functions for Australian Tax Year calculations
 * Australian Tax Year runs from July 1 to June 30
 */

export interface TaxYear {
    startYear: number; // e.g., 2024 for FY 2024-25
    endYear: number;   // e.g., 2025 for FY 2024-25
    label: string;     // e.g., "FY 2024-25"
    startDate: Date;   // July 1, 2024
    endDate: Date;     // June 30, 2025
}

/**
 * Get the Australian tax year for a given date
 */
export function getTaxYearForDate(date: Date): TaxYear {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = January, 6 = July)

    // If month is July (6) or later, tax year starts this year
    // Otherwise, tax year started last year
    const startYear = month >= 6 ? year : year - 1;
    const endYear = startYear + 1;

    return {
        startYear,
        endYear,
        label: `FY ${startYear}-${String(endYear).slice(-2)}`,
        startDate: new Date(startYear, 6, 1), // July 1
        endDate: new Date(endYear, 5, 30, 23, 59, 59) // June 30
    };
}

/**
 * Get the current Australian tax year
 */
export function getCurrentTaxYear(): TaxYear {
    return getTaxYearForDate(new Date());
}

/**
 * Generate a list of tax years from a list of dates
 */
export function getTaxYearsFromDates(dates: Date[]): TaxYear[] {
    if (dates.length === 0) {
        return [getCurrentTaxYear()];
    }

    const taxYearMap = new Map<number, TaxYear>();

    dates.forEach(date => {
        const taxYear = getTaxYearForDate(date);
        if (!taxYearMap.has(taxYear.startYear)) {
            taxYearMap.set(taxYear.startYear, taxYear);
        }
    });

    // Sort by start year (most recent first)
    return Array.from(taxYearMap.values()).sort((a, b) => b.startYear - a.startYear);
}

/**
 * Check if a date falls within a tax year
 */
export function isDateInTaxYear(date: Date, taxYear: TaxYear): boolean {
    return date >= taxYear.startDate && date <= taxYear.endDate;
}

/**
 * Create a tax year from a start year
 */
export function createTaxYear(startYear: number): TaxYear {
    const endYear = startYear + 1;
    return {
        startYear,
        endYear,
        label: `FY ${startYear}-${String(endYear).slice(-2)}`,
        startDate: new Date(startYear, 6, 1),
        endDate: new Date(endYear, 5, 30, 23, 59, 59)
    };
}

/**
 * Get all months in a tax year as Date objects (first day of each month)
 */
export function getMonthsInTaxYear(taxYear: TaxYear): Date[] {
    const months: Date[] = [];
    const current = new Date(taxYear.startDate);

    while (current <= taxYear.endDate) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}
