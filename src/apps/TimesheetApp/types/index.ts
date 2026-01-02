/**
 * Type definitions for the Technician Timesheet Application
 * 
 * These types define the core data structures used throughout the app
 * for tracking work entries, calculating overtime, and managing state.
 */

/** Days of the week for timesheet entries */
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** 
 * Activity types for timesheet entries.
 * - Site: Chargeable work at customer site (default break = 0h)
 * - Travel: Traveling to/from site (eligible for travel per diem)
 * - Workshop: Non-chargeable internal work
 * - Office: Non-chargeable office work
 * - Training: Non-chargeable training activities
 */
export type ActivityType =
    | 'Site'
    | 'Travel'
    | 'Workshop'
    | 'Office'
    | 'Training'
    | 'Site Induction'
    | 'Sales'
    | 'Recovery Time'
    | 'Reporting'
    | 'Annual Leave'
    | 'Public Holiday'
    | 'Sick Leave'
    | 'N/A';

/** Array of all activity types for UI dropdowns */
export const ACTIVITY_TYPES: ActivityType[] = [
    'Site',
    'Travel',
    'Workshop',
    'Office',
    'Training',
    'Site Induction',
    'Sales',
    'Recovery Time',
    'Reporting',
    'Annual Leave',
    'Public Holiday',
    'Sick Leave',
    'N/A'
];

/** Array of all days for UI iteration */
export const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Non-chargeable activity types.
 * Workshop and Office hours do NOT count toward utilization calculation.
 */
export const NON_CHARGEABLE_ACTIVITIES: ActivityType[] = [
    'Workshop',
    'Office',
    'Training',
    'Site Induction',
    'Reporting',
    'Annual Leave',
    'Public Holiday',
    'Sick Leave',
    'Recovery Time',
    'N/A'
];

/**
 * Core timesheet entry data structure.
 * Represents a single work activity for a specific day.
 * 
 * FIREBASE ADAPTATION: Added userId and weekKey for multi-user storage.
 */
export interface TimesheetEntry {
    /** Unique identifier (UUID or Firestore ID) */
    id: string;
    /** User ID for Firebase multi-user support */
    userId?: string;
    /** ISO Week Key (e.g., 2026-W01) for grouping and efficient queries */
    weekKey?: string;
    /** Day of the week */
    day: DayOfWeek;
    /** Start time in HH:MM format (24-hour) */
    startTime: string;
    /** Finish time in HH:MM format (24-hour) */
    finishTime: string;
    /** Break duration in hours (default: 0.5, Site activity: 0) */
    breakDuration: number;
    /** Type of activity performed */
    activity: ActivityType;
    /** Job number for tracking/billing */
    jobNo: string;
    /** Whether this is a nightshift (affects pay calculations) */
    isNightshift: boolean;
    /** Whether this involves an overnight stay (triggers $85 per diem) */
    isOvernight: boolean;
    /** Explicit per diem selection: 'none', 'half' ($42.50), or 'full' ($85.00) */
    perDiemType?: 'none' | 'half' | 'full';
    /** Optional notes for the entry */
    notes?: string;
    /** Submission status for Firebase */
    status?: 'draft' | 'submitted';
    /** Auto-timestamps for Firebase */
    createdAt?: Date;
    updatedAt?: Date;

    // ========== SIMPLIFIED ENTRY MODE ==========
    /** Entry mode: 'detailed' (start/finish per entry) or 'simplified' (hours only) */
    entryMode?: 'detailed' | 'simplified';
    /** For simplified mode: just the hours for this activity */
    hoursOnly?: number;

    // ========== DAY-LEVEL SUMMARY (for simplified mode) ==========
    /** Overall day start time (shared across all entries on this day in simplified mode) */
    dayStart?: string;
    /** Overall day finish time (shared across all entries on this day in simplified mode) */
    dayFinish?: string;
    /** Overall day break duration (shared across all entries on this day in simplified mode) */
    dayBreak?: number;
}

/**
 * Calculated values for a single entry.
 * These are computed in real-time based on entry inputs.
 */
export interface EntryCalculations {
    /** Net hours worked: (Finish - Start) - Break */
    netHours: number;
    /** Hours at base rate (1.0x), max 7.5h */
    baseHours: number;
    /** Hours at 1.5x rate (hours 7.5-9.5) */
    overtimeHours15x: number;
    /** Hours at 2.0x rate (hours beyond 9.5) */
    overtimeHours20x: number;
    /** Per diem amount: $85 (overnight) or $42.50 (travel+early finish) */
    perDiem: number;
    /** Whether this entry's hours are chargeable for utilization */
    isChargeable: boolean;
    /** Whether the entry has a validation error (start > finish without overnight) */
    hasValidationError: boolean;
    /** Validation error message if any */
    validationMessage: string;
}

/**
 * Weekly summary calculations.
 * Aggregated totals across all entries.
 */
export interface WeeklySummary {
    /** Total net hours worked */
    totalNetHours: number;
    /** Total hours at base rate */
    totalBaseHours: number;
    /** Total hours at 1.5x rate */
    totalOT15x: number;
    /** Total hours at 2.0x rate */
    totalOT20x: number;
    /** Total per diem amount */
    totalPerDiem: number;
    /** Total chargeable hours (for utilization) */
    totalChargeableHours: number;
    /** Utilization percentage: (chargeableHours / 37.5) * 100 */
    utilizationPercent: number;
}

/**
 * Weekly data point for charts/history
 */
export interface WeeklyDataPoint {
    weekNumber: number;
    weekStart: Date;
    summary: WeeklySummary;
    hasData: boolean;
}

/**
 * Yearly summary aggregation
 */
export interface YearlySummary {
    year: number;
    totalNetHours: number;
    totalBaseHours: number;
    totalOT15x: number;
    totalOT20x: number;
    totalPerDiem: number;
    totalChargeableHours: number;
    averageUtilization: number;
    weeksWorked: number;
    weeklyData: WeeklyDataPoint[];
}

/**
 * Job data from the Job Sheet application.
 * Filtered for display in the Timesheet entry dropdown.
 */
export interface JobOption {
    jobNumber: string;
    customer: string;
    description: string;
    status: string;
}
