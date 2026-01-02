/**
 * Yearly Data Utilities (Firebase Adapted)
 * 
 * Functions for aggregating timesheet data across an entire year
 * and preparing data for charts.
 * 
 * FIREBASE ADAPTATION: Fetches data from Firestore instead of localStorage.
 */

import type { TimesheetEntry, WeeklySummary, WeeklyDataPoint, YearlySummary } from '../types';
import { calculateWeeklySummary } from './calculator';
import { timesheetRepository } from '../../../repositories';

/**
 * Get the Monday of a specific ISO week in a year
 */
function getWeekStartFromWeekNumber(year: number, weekNumber: number): Date {
    // January 4th is always in week 1
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // Sunday = 7
    const weekOneStart = new Date(jan4);
    weekOneStart.setDate(jan4.getDate() - dayOfWeek + 1);

    // Add weeks
    const result = new Date(weekOneStart);
    result.setDate(weekOneStart.getDate() + (weekNumber - 1) * 7);
    return result;
}

/**
 * Calculate yearly summary from Firestore data
 * 
 * @param userId - The user ID to fetch data for
 * @param year - The year to calculate summary for
 * @returns Promise with yearly summary data
 */
export async function calculateYearlySummary(userId: string, year: number): Promise<YearlySummary> {
    const weeklyData: WeeklyDataPoint[] = [];

    let totalNetHours = 0;
    let totalBaseHours = 0;
    let totalOT15x = 0;
    let totalOT20x = 0;
    let totalPerDiem = 0;
    let totalChargeableHours = 0;
    let weeksWorked = 0;
    let totalUtilization = 0;

    try {
        // Fetch all entries for the user
        const allEntries = await timesheetRepository.getByUserId(userId);

        // Filter to only entries from the specified year
        const yearEntries = (allEntries as TimesheetEntry[]).filter(e =>
            e.weekKey && e.weekKey.startsWith(year.toString())
        );

        // Iterate through all 53 weeks of the year (covers all possibilities)
        for (let week = 1; week <= 53; week++) {
            const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
            const weekEntries = yearEntries.filter(e => e.weekKey === weekKey);
            const weekStart = getWeekStartFromWeekNumber(year, week);
            const summary = calculateWeeklySummary(weekEntries);
            const hasData = weekEntries.length > 0;

            weeklyData.push({
                weekNumber: week,
                weekStart,
                summary,
                hasData,
            });

            if (hasData) {
                weeksWorked++;
                totalNetHours += summary.totalNetHours;
                totalBaseHours += summary.totalBaseHours;
                totalOT15x += summary.totalOT15x;
                totalOT20x += summary.totalOT20x;
                totalPerDiem += summary.totalPerDiem;
                totalChargeableHours += summary.totalChargeableHours;
                totalUtilization += summary.utilizationPercent;
            }
        }
    } catch (error) {
        console.error('Error calculating yearly summary:', error);
    }

    const averageUtilization = weeksWorked > 0 ? totalUtilization / weeksWorked : 0;

    return {
        year,
        totalNetHours: Math.round(totalNetHours * 100) / 100,
        totalBaseHours: Math.round(totalBaseHours * 100) / 100,
        totalOT15x: Math.round(totalOT15x * 100) / 100,
        totalOT20x: Math.round(totalOT20x * 100) / 100,
        totalPerDiem: Math.round(totalPerDiem * 100) / 100,
        totalChargeableHours: Math.round(totalChargeableHours * 100) / 100,
        averageUtilization: Math.round(averageUtilization * 10) / 10,
        weeksWorked,
        weeklyData,
    };
}

/**
 * Get available years from stored data
 * Returns current year plus any years with data
 */
export async function getAvailableYears(userId: string): Promise<number[]> {
    const years = new Set<number>();

    // Always include current year
    years.add(new Date().getFullYear());

    try {
        const allEntries = await timesheetRepository.getByUserId(userId);

        for (const entry of allEntries as TimesheetEntry[]) {
            if (entry.weekKey) {
                const match = entry.weekKey.match(/^(\d{4})-W\d{2}$/);
                if (match) {
                    years.add(parseInt(match[1]!, 10));
                }
            }
        }
    } catch (error) {
        console.error('Error getting available years:', error);
    }

    return Array.from(years).sort((a, b) => b - a);
}
