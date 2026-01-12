/**
 * Calculator Engine for Timesheet Calculations
 * 
 * This module contains all business logic for calculating:
 * - Net hours worked
 * - Overtime splitting (7.5h base → 2h @ 1.5x → remainder @ 2.0x)
 * - Per diem amounts
 * - Utilization rates
 * 
 * IMPORTANT: All calculations are real-time and recalculated on every input change.
 */

import {
    TimesheetEntry,
    EntryCalculations,
    WeeklySummary,
    ActivityType,
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Per diem for overnight stays */
const PER_DIEM_OVERNIGHT = 85.0;

/** Per diem for travel activities finishing before 18:00 */
const PER_DIEM_TRAVEL = 42.5;

/** Base hours threshold before overtime kicks in */
const BASE_HOURS_THRESHOLD = 7.5;

/** 
 * Threshold for 1.5x overtime (hours 7.5 to 9.5)
 * WHY: Company policy dictates first 2 hours of OT are at 1.5x
 */
const OT_15X_THRESHOLD = 2.0;

/** Standard weekly hours for utilization calculation */
const STANDARD_WEEKLY_HOURS = 37.5;

// ============================================================================
// TIME PARSING UTILITIES
// ============================================================================

/**
 * Parses a time string (HH:MM) into total minutes from midnight.
 * 
 * @param timeStr - Time in HH:MM format (24-hour)
 * @returns Minutes from midnight, or NaN if invalid
 * 
 * @example
 * parseTimeToMinutes("09:00") // returns 540 (9 * 60)
 * parseTimeToMinutes("17:30") // returns 1050 (17 * 60 + 30)
 */
export function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr || !timeStr.includes(':')) return NaN;

    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr ?? '', 10);
    const minutes = parseInt(minutesStr ?? '', 10);

    if (isNaN(hours) || isNaN(minutes)) return NaN;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return NaN;

    return hours * 60 + minutes;
}

/**
 * Extracts the hour portion from a time string.
 * 
 * @param timeStr - Time in HH:MM format
 * @returns Hour as number (0-23), or NaN if invalid
 */
export function getHourFromTimeStr(timeStr: string): number {
    const minutes = parseTimeToMinutes(timeStr);
    if (isNaN(minutes)) return NaN;
    return Math.floor(minutes / 60);
}

// ============================================================================
// NET HOURS CALCULATION
// ============================================================================

/**
 * Calculates net hours worked for an entry.
 * 
 * Formula: (Finish Time - Start Time) - Break Duration
 * 
 * WHY this handles negative values:
 * - If start > finish and NOT overnight, this is a validation error (returns 0)
 * - If overnight is true and start > finish, we assume the shift spans midnight
 * 
 * FIX: Handle midnight span by adding 24 hours (1440 minutes) when finish < start
 * and the overnight flag is set. This allows shifts like 22:00 - 06:00 to work correctly.
 * 
 * @param entry - The timesheet entry to calculate
 * @returns Net hours worked (never negative, returns 0 for invalid entries)
 */
export function calculateNetHours(entry: TimesheetEntry): number {
    const startMinutes = parseTimeToMinutes(entry.startTime);
    const finishMinutes = parseTimeToMinutes(entry.finishTime);

    // If times are invalid, return 0
    if (isNaN(startMinutes) || isNaN(finishMinutes)) return 0;

    let durationMinutes = finishMinutes - startMinutes;

    // FIX: Handle midnight span by adding 24 hours when shift crosses midnight
    // This is common for nightshifts like 22:00 - 06:00
    if (durationMinutes < 0) {
        if (entry.isNightshift || entry.isOvernight) {
            // Shift spans midnight, add 24 hours (1440 minutes)
            durationMinutes += 1440;
        } else {
            // Invalid: start > finish without overnight flag
            return 0;
        }
    }

    // Convert to hours and subtract break
    const grossHours = durationMinutes / 60;
    const netHours = grossHours - entry.breakDuration;

    // Never return negative hours
    return Math.max(0, netHours);
}

// ============================================================================
// OVERTIME SPLITTING
// ============================================================================

/**
 * Overtime Split Result
 */
export interface OvertimeSplit {
    baseHours: number;
    overtimeHours15x: number;
    overtimeHours20x: number;
}

/**
 * Splits net hours into base and overtime tiers.
 * 
 * Business Logic (Weekdays Mon-Fri):
 * - First 7.5 hours: Base rate (1.0x multiplier)
 * - Next 2.0 hours (7.5 - 9.5): 1.5x multiplier
 * - Remaining hours (9.5+): 2.0x multiplier
 * 
 * Weekend/Nightshift Rules:
 * - Saturday OR Nightshift: First 2 hours @ 1.5x, remainder @ 2.0x (NO base rate)
 * - Sunday: All hours @ 2.0x (NO base or 1.5x rate)
 * 
 * Public Holiday Rules:
 * - ONLY applies when isPublicHoliday=true AND activity is actual work (Site, Travel, etc.)
 * - If activity = "Public Holiday" (taking day off), normal hours are used
 * - When working on a PH: First 2 hours @ 1.5x, remainder @ 2.0x (NO base rate)
 * 
 * @param netHours - Total net hours worked
 * @param day - Day of week (affects weekend rate calculation)
 * @param isNightshift - Whether shift is a nightshift (treats Mon-Fri like Saturday)
 * @param isPublicHoliday - Whether shift is actual work on a public holiday (already filtered by caller)
 * @returns Object with hours split into each tier
 */
export function splitOvertimeHours(
    netHours: number,
    day: string = 'Monday',
    isNightshift: boolean = false,
    isPublicHoliday: boolean = false
): OvertimeSplit {
    if (netHours <= 0) {
        return { baseHours: 0, overtimeHours15x: 0, overtimeHours20x: 0 };
    }

    // SUNDAY: All hours at 2.0x rate
    if (day === 'Sunday') {
        return {
            baseHours: 0,
            overtimeHours15x: 0,
            overtimeHours20x: roundToTwoDecimals(netHours),
        };
    }

    // SATURDAY, NIGHTSHIFT, OR PUBLIC HOLIDAY: First 2 hours at 1.5x, rest at 2.0x
    // Nightshift effectively converts weekday hours to Saturday OT rates
    // Public holidays also get the same treatment
    if (day === 'Saturday' || isNightshift || isPublicHoliday) {
        const ot15xThreshold = 2.0; // First 2 hours at 1.5x
        const overtimeHours15x = Math.min(netHours, ot15xThreshold);
        const overtimeHours20x = Math.max(0, netHours - ot15xThreshold);

        return {
            baseHours: 0,
            overtimeHours15x: roundToTwoDecimals(overtimeHours15x),
            overtimeHours20x: roundToTwoDecimals(overtimeHours20x),
        };
    }

    // WEEKDAYS (Mon-Fri) - Standard Day Shift:
    // Calculate base hours (capped at 7.5)
    const baseHours = Math.min(netHours, BASE_HOURS_THRESHOLD);

    // Calculate remaining hours after base
    const remainingAfterBase = Math.max(0, netHours - BASE_HOURS_THRESHOLD);

    // Calculate 1.5x overtime (capped at 2 hours)
    const overtimeHours15x = Math.min(remainingAfterBase, OT_15X_THRESHOLD);

    // Calculate 2.0x overtime (everything beyond 9.5 hours)
    const overtimeHours20x = Math.max(0, remainingAfterBase - OT_15X_THRESHOLD);

    return {
        baseHours: roundToTwoDecimals(baseHours),
        overtimeHours15x: roundToTwoDecimals(overtimeHours15x),
        overtimeHours20x: roundToTwoDecimals(overtimeHours20x),
    };
}

// ============================================================================
// PER DIEM CALCULATION
// ============================================================================

/**
 * Calculates per diem amount for an entry.
 * 
 * Business Logic:
 * - Overnight stay: $85.00 flat rate
 * - Travel activity finishing before 18:00: $42.50
 * - Otherwise: $0
 * 
 * WHY the travel per diem exists:
 * Workers traveling for less than a full day still incur meal expenses.
 * The $42.50 covers lunch when returning before dinner time (18:00).
 * Full overnight stays cover all meals with the higher $85 rate.
 * 
 * @param entry - The timesheet entry to calculate
 * @returns Per diem amount in dollars
 */
export function calculatePerDiem(entry: TimesheetEntry): number {
    // 1. Check for explicit manual selection (New behavior)
    if (entry.perDiemType === 'full') {
        return PER_DIEM_OVERNIGHT;
    }
    if (entry.perDiemType === 'half') {
        return PER_DIEM_TRAVEL;
    }
    if (entry.perDiemType === 'none') {
        return 0;
    }

    // 2. Fallback to existing logic for backward compatibility
    // Overnight always gets full per diem (if not manually overridden)
    if (entry.isOvernight) {
        return PER_DIEM_OVERNIGHT;
    }

    // No automatic per diem for Travel or any other activity
    // Per diems must be manually selected using the buttons
    return 0;
}

// ============================================================================
// CHARGEABILITY
// ============================================================================

/**
 * Determines if an entry is chargeable (billable to a customer).
 * 
 * Business Logic:
 * - Entry MUST have a job number (any activity with a job number is billable)
 * - EXCEPT: Leave-related activities are NEVER chargeable (Sick Leave, Annual Leave, Public Holiday, N/A)
 * 
 * NOTE: Chargeable is separate from Utilization:
 * - Chargeable = billable to a customer (includes weekends)
 * - Utilization = percentage of 37.5h weekday target that is chargeable (weekdays only)
 * 
 * WHY these rules:
 * - Job number indicates billable work to a customer, regardless of activity type or day
 * - Leave activities are paid time off, not billable work
 * - Weekend work IS chargeable (billed to customer) but doesn't count toward utilization
 * 
 * @param entry - The timesheet entry to check
 * @returns true if chargeable, false otherwise
 */
export function isEntryChargeable(entry: TimesheetEntry): boolean {
    // Leave activities are NEVER chargeable, even with a job number
    const nonChargeableLeaveActivities: ActivityType[] = ['Sick Leave', 'Annual Leave', 'Public Holiday', 'N/A'];
    if (nonChargeableLeaveActivities.includes(entry.activity)) {
        return false;
    }

    // Must have a job number to be chargeable
    if (!entry.jobNo || entry.jobNo.trim() === '') {
        return false;
    }

    return true;
}

// ============================================================================
// ENTRY VALIDATION
// ============================================================================

/**
 * Validates an entry and returns any error message.
 * 
 * @param entry - The entry to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateEntry(entry: TimesheetEntry): string {
    const startMinutes = parseTimeToMinutes(entry.startTime);
    const finishMinutes = parseTimeToMinutes(entry.finishTime);

    // Check if times are set
    if (!entry.startTime || !entry.finishTime) {
        return ''; // Not an error, just incomplete
    }

    // Check if times are valid format
    if (isNaN(startMinutes) || isNaN(finishMinutes)) {
        return 'Invalid time format';
    }

    // Check if start > finish without overnight/nightshift flag
    if (startMinutes > finishMinutes && !entry.isNightshift && !entry.isOvernight) {
        return 'Start time is after finish time';
    }

    // Check for negative net hours (break too long)
    const netHours = calculateNetHours(entry);
    if (netHours <= 0 && entry.startTime && entry.finishTime) {
        return 'Break duration exceeds work hours';
    }

    return '';
}

/**
 * Checks if an entry has a time conflict with other entries on the same day.
 * 
 * @param entry - The entry to check
 * @param otherEntriesOnSameDay - Other entries on the same day (excluding this entry)
 * @returns true if there's a time conflict, false otherwise
 */
export function hasTimeConflict(entry: TimesheetEntry, otherEntriesOnSameDay: TimesheetEntry[]): boolean {
    const entryStart = parseTimeToMinutes(entry.startTime);
    const entryFinish = parseTimeToMinutes(entry.finishTime);

    // Invalid times can't conflict
    if (isNaN(entryStart) || isNaN(entryFinish)) {
        return false;
    }

    // Handle midnight span for this entry
    let entryFinishAdjusted = entryFinish;
    if (entryFinish < entryStart && (entry.isNightshift || entry.isOvernight)) {
        entryFinishAdjusted = entryFinish + 1440; // Add 24 hours
    }

    // Check against each other entry
    for (const other of otherEntriesOnSameDay) {
        const otherStart = parseTimeToMinutes(other.startTime);
        const otherFinish = parseTimeToMinutes(other.finishTime);

        if (isNaN(otherStart) || isNaN(otherFinish)) {
            continue;
        }

        // Handle midnight span for other entry
        let otherFinishAdjusted = otherFinish;
        if (otherFinish < otherStart && (other.isNightshift || other.isOvernight)) {
            otherFinishAdjusted = otherFinish + 1440;
        }

        // Check for overlap
        // Two time ranges overlap if: (StartA < EndB) AND (EndA > StartB)
        const overlaps = (entryStart < otherFinishAdjusted) && (entryFinishAdjusted > otherStart);

        if (overlaps) {
            return true;
        }
    }

    return false;
}

// ============================================================================
// FULL ENTRY CALCULATIONS
// ============================================================================

/**
 * Calculates all derived values for a single entry.
 * This is the main function called by the UI for real-time updates.
 * 
 * @param entry - The timesheet entry to calculate
 * @returns Complete calculation results
 */
export function calculateEntry(entry: TimesheetEntry): EntryCalculations {
    const validationMessage = validateEntry(entry);
    const hasValidationError = validationMessage !== '';

    const netHours = calculateNetHours(entry);

    // Public holiday overtime logic:
    // - If activity = "Public Holiday" → person is taking the day off, normal hours (no OT)
    // - If isPublicHoliday flag = true AND activity is actual work (Site, Travel, etc.) → overtime rates
    const isActualWorkOnPublicHoliday = entry.isPublicHoliday && entry.activity !== 'Public Holiday';

    const { baseHours, overtimeHours15x, overtimeHours20x } = splitOvertimeHours(
        netHours,
        entry.day,
        entry.isNightshift,
        isActualWorkOnPublicHoliday
    );
    const perDiem = calculatePerDiem(entry);
    const isChargeable = isEntryChargeable(entry);

    return {
        netHours: roundToTwoDecimals(netHours),
        baseHours,
        overtimeHours15x,
        overtimeHours20x,
        perDiem,
        isChargeable,
        hasValidationError,
        validationMessage,
    };
}

// ============================================================================
// WEEKLY SUMMARY
// ============================================================================

/**
 * Calculates weekly summary totals from all entries.
 * 
 * IMPORTANT: Overtime is calculated PER DAY, not per entry.
 * Multiple entries on the same day are aggregated first, then overtime tiers are applied.
 * 
 * @param entries - Array of all timesheet entries for the week
 * @returns Aggregated weekly totals
 */
export function calculateWeeklySummary(entries: TimesheetEntry[]): WeeklySummary {
    let totalNetHours = 0;
    let totalBaseHours = 0;
    let totalOT15x = 0;
    let totalOT20x = 0;
    let totalPerDiem = 0;
    let totalChargeableHours = 0;
    let totalChargeableBaseHours = 0; // Only base hours from chargeable entries

    // Group entries by day using a unique key (date or weekKey + day)
    const entriesByDay: Record<string, TimesheetEntry[]> = {};
    for (const entry of entries) {
        // Use date if available, otherwise fallback to weekKey + day
        const dateKey = entry.date || `${entry.weekKey || 'no-week'}-${entry.day}`;
        if (!entriesByDay[dateKey]) {
            entriesByDay[dateKey] = [];
        }
        entriesByDay[dateKey].push(entry);
    }

    // Process each unique day
    for (const [, dayEntries] of Object.entries(entriesByDay)) {
        const firstEntry = dayEntries[0];
        if (!firstEntry) continue;

        const dayName = firstEntry.day;

        // Calculate total net hours for the day
        let dayNetHours = 0;
        let dayPerDiem = 0;
        let dayChargeableHours = 0;
        let isNightshift = false;
        let isPublicHoliday = false;
        let hasPublicHolidayActivity = false;

        for (const entry of dayEntries) {
            const calc = calculateEntry(entry);
            dayNetHours += calc.netHours;
            dayPerDiem += calc.perDiem;

            if (calc.isChargeable) {
                dayChargeableHours += calc.netHours;
            }

            // If ANY entry on this day is a nightshift, treat the whole day as nightshift
            if (entry.isNightshift) {
                isNightshift = true;
            }

            // Track public holiday flag
            if (entry.isPublicHoliday) {
                isPublicHoliday = true;
            }

            // Track if anyone has "Public Holiday" as their activity (taking day off)
            if (entry.activity === 'Public Holiday') {
                hasPublicHolidayActivity = true;
            }
        }

        // Only apply PH overtime if there's actual work on a public holiday
        // (not just someone taking the day off with activity = "Public Holiday")
        const isActualWorkOnPublicHoliday = isPublicHoliday && !hasPublicHolidayActivity;

        // Apply overtime logic to the DAY's total hours
        const { baseHours, overtimeHours15x, overtimeHours20x } = splitOvertimeHours(
            dayNetHours,
            dayName,
            isNightshift,
            isActualWorkOnPublicHoliday
        );

        // Calculate chargeable BASE hours for utilization
        // Only the base portion (max 7.5h per weekday) of chargeable work counts toward utilization
        // Overtime doesn't count toward utilization target
        if (dayName !== 'Saturday' && dayName !== 'Sunday') {
            // Cap chargeable hours at base hours for utilization purposes
            const chargeableBaseForDay = Math.min(dayChargeableHours, baseHours);
            totalChargeableBaseHours += chargeableBaseForDay;
        }

        // Accumulate daily totals into weekly totals
        totalNetHours += dayNetHours;
        totalBaseHours += baseHours;
        totalOT15x += overtimeHours15x;
        totalOT20x += overtimeHours20x;
        totalPerDiem += dayPerDiem;
        totalChargeableHours += dayChargeableHours;
    }

    // Calculate utilization as chargeable BASE hours vs standard weekly hours (37.5)
    // 100% utilization = 37.5 hours of chargeable BASE work in the week
    // Overtime doesn't count - only the first 7.5h per day that is chargeable
    const utilizationPercent = (totalChargeableBaseHours / STANDARD_WEEKLY_HOURS) * 100;

    return {
        totalNetHours: roundToTwoDecimals(totalNetHours),
        totalBaseHours: roundToTwoDecimals(totalBaseHours),
        totalOT15x: roundToTwoDecimals(totalOT15x),
        totalOT20x: roundToTwoDecimals(totalOT20x),
        totalPerDiem: roundToTwoDecimals(totalPerDiem),
        totalChargeableHours: roundToTwoDecimals(totalChargeableHours),
        utilizationPercent: roundToTwoDecimals(utilizationPercent),
    };
}

// ============================================================================
// SIMPLIFIED ENTRY MODE HELPERS
// ============================================================================

/**
 * Auto-calculates start/finish times for simplified entries based on day summary and entry order.
 * 
 * @param dayStart - Overall day start time (e.g., "08:00")
 * @param entries - All entries for the day (in order)
 * @param entryIndex - Index of the current entry
 * @returns Calculated start and finish times for this entry
 */
export function calculateSimplifiedEntryTimes(
    dayStart: string,
    entries: Array<{ hoursOnly?: number }>,
    entryIndex: number
): { startTime: string; finishTime: string } {
    // Parse day start time to minutes
    const dayStartMinutes = parseTimeToMinutes(dayStart);

    // Calculate cumulative hours from previous entries
    let cumulativeMinutes = 0;
    for (let i = 0; i < entryIndex; i++) {
        const hours = entries[i]?.hoursOnly || 0;
        cumulativeMinutes += hours * 60;
    }

    // Calculate start time for this entry
    const startMinutes = dayStartMinutes + cumulativeMinutes;
    const startTime = formatMinutesToTime(startMinutes);

    // Calculate finish time for this entry
    const currentHours = entries[entryIndex]?.hoursOnly || 0;
    const finishMinutes = startMinutes + (currentHours * 60);
    const finishTime = formatMinutesToTime(finishMinutes);

    return { startTime, finishTime };
}

/**
 * Extracts day-level summary from entries (for simplified mode).
 * Returns the first entry's day summary values if they exist.
 * 
 * @param entries - All entries for a day
 * @returns Day summary object or null if not in simplified mode
 */
export function getDaySummaryFromEntries(entries: TimesheetEntry[]): {
    dayStart: string;
    dayFinish: string;
    dayBreak: number;
} | null {
    const firstEntry = entries[0];
    if (!firstEntry || !firstEntry.dayStart || !firstEntry.dayFinish) {
        return null;
    }

    return {
        dayStart: firstEntry.dayStart,
        dayFinish: firstEntry.dayFinish,
        dayBreak: firstEntry.dayBreak || 0,
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Rounds a number to two decimal places.
 * WHY: Prevents floating-point precision issues in display (e.g., 7.5000000001)
 */
function roundToTwoDecimals(num: number): number {
    return Math.round(num * 100) / 100;
}

/**
 * Formats minutes since midnight to HH:MM time string.
 * 
 * @param minutes - Minutes since midnight (0-1439, or higher for next day)
 * @returns Time string in HH:MM format
 */
export function formatMinutesToTime(minutes: number): string {
    // Handle overflow to next day
    const normalizedMinutes = minutes % 1440;
    const hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Gets the default break duration for an activity type.
 * 
 * WHY Site defaults to 0:
 * Site workers often take breaks at irregular times or not at all.
 * The 0 default allows flexibility while other activities assume
 * a standard 30-minute lunch break.
 * 
 * @param activity - The activity type
 * @returns Default break duration in hours
 */
export function getDefaultBreakForActivity(activity: string): number {
    return activity === 'Site' ? 0 : 0.5;
}
