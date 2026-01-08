/**
 * YearlySummary Component
 * 
 * Displays aggregated timesheet data for an entire year with
 * charts, statistics, and monthly breakdown.
 */

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, TrendingUp, Clock, DollarSign, BarChart3, Calendar } from 'lucide-react';
// @ts-ignore
import { useAuth } from '../../../context/AuthContext';
// @ts-ignore
import { timesheetRepository } from '../../../repositories';
import type { TimesheetEntry, YearlySummary as YearlySummaryType } from '../types';
import { calculateWeeklySummary, formatMinutesToTime } from '../utils/calculator';
import {
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart
} from 'recharts';

interface YearlySummaryProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MonthlyData {
    month: string;
    monthIndex: number;
    totalHours: number;
    baseHours: number;
    ot15Hours: number;
    ot20Hours: number;
    perDiem: number;
    weeksWorked: number;
    averageUtilization: number;
    saturdaysWorked: number;
    sundaysWorked: number;
}

// ============================================================================
// AUSTRALIAN FINANCIAL YEAR HELPERS
// ============================================================================

/**
 * Gets the current Australian Financial Year end year.
 * FY runs from July 1 to June 30.
 * If today is July 1 2025 or later, we're in FY2025-26 (end year = 2026).
 * If today is before July 1 2025, we're in FY2024-25 (end year = 2025).
 */
function getCurrentFinancialYear(): number {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 6 = July)

    // If we're in July (6) or later, FY end year is next calendar year
    return currentMonth >= 6 ? currentYear + 1 : currentYear;
}

/**
 * Formats a FY end year to display format.
 * @param fyEndYear - e.g., 2026 becomes "FY 2025-26"
 */
function formatFYDisplay(fyEndYear: number): string {
    const startYear = fyEndYear - 1;
    const endYearShort = fyEndYear.toString().slice(-2);
    return `FY ${startYear}-${endYearShort}`;
}

/**
 * Gets the ISO week number for a given date.
 */
function getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Gets the ISO week year for a given date.
 * The ISO week year may differ from the calendar year for dates near Jan 1.
 */
function getISOWeekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
}

// FY-ordered months (July → June)
const FY_MONTHS = [
    'July', 'August', 'September', 'October', 'November', 'December',
    'January', 'February', 'March', 'April', 'May', 'June'
];

// Calendar year months (January → December)
const CALENDAR_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function YearlySummaryModal({ isOpen, onClose }: YearlySummaryProps) {
    const { currentUser } = useAuth();
    const [yearType, setYearType] = useState<'financial' | 'calendar'>(() => {
        const saved = localStorage.getItem('timesheet_year_type');
        return (saved === 'calendar' || saved === 'financial') ? saved : 'financial';
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = localStorage.getItem('timesheet_year_type');
        return (saved === 'calendar') ? new Date().getFullYear() : getCurrentFinancialYear();
    });
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [useMockData, setUseMockData] = useState(() => {
        const saved = localStorage.getItem('timesheet_use_mock_data');
        return saved === 'true';
    });

    // Save preferences
    useEffect(() => {
        localStorage.setItem('timesheet_year_type', yearType);
    }, [yearType]);

    // Save mock data preference
    useEffect(() => {
        localStorage.setItem('timesheet_use_mock_data', useMockData.toString());
    }, [useMockData]);

    // Mock data generator for Financial Year
    // fyEndYear: e.g., 2026 generates data for July 2025 - June 2026
    const generateMockData = (fyEndYear: number): TimesheetEntry[] => {
        const mockEntries: TimesheetEntry[] = [];
        const techId = currentUser?.uid || 'mock-user';
        const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        // FY spans from July 1 of (fyEndYear - 1) to June 30 of (fyEndYear)
        const fyStartYear = fyEndYear - 1;

        // Generate entries for each FY month (July -> June)
        FY_MONTHS.forEach((_monthName, fyMonthIdx) => {
            // Calculate the actual calendar month and year
            const calendarMonthIndex = fyMonthIdx < 6 ? fyMonthIdx + 6 : fyMonthIdx - 6;
            const calendarYear = fyMonthIdx < 6 ? fyStartYear : fyEndYear;

            // Get the number of days in this month
            const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();

            // Generate entries for each weekday in the month
            for (let day = 1; day <= daysInMonth; day++) {
                const entryDate = new Date(calendarYear, calendarMonthIndex, day);
                const dayOfWeek = entryDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                // Only generate for weekdays (Mon-Fri)
                if (dayOfWeek === 0 || dayOfWeek === 6) continue;

                const dayName = workDays[dayOfWeek - 1];
                const dateStr = entryDate.toISOString().split('T')[0];

                // Calculate ISO week key
                const weekNum = getISOWeekNumber(entryDate);
                const weekYear = getISOWeekYear(entryDate);
                const weekKey = `${weekYear}-W${weekNum.toString().padStart(2, '0')}`;

                // 30% chance for holiday
                const isHoliday = Math.random() < 0.3;

                if (isHoliday) {
                    mockEntries.push({
                        id: `mock-${dateStr}-holiday`,
                        userId: techId,
                        weekKey,
                        day: dayName,
                        date: dateStr,
                        startTime: '08:00',
                        finishTime: '16:00',
                        breakDuration: 0.5,
                        activity: Math.random() > 0.5 ? 'Public Holiday' : 'Holiday',
                        jobNo: 'ADMIN',
                        isChargeable: false,
                        isOvernight: false
                    } as any);
                } else {
                    const baseHours = 7.5;
                    let ot15 = 0;
                    let ot20 = 0;
                    if (Math.random() < 0.4) {
                        if (Math.random() < 0.7) {
                            ot20 = 2 + Math.random() * 4;
                        } else {
                            ot15 = 1 + Math.random() * 2;
                        }
                    }
                    const totalHours = baseHours + ot15 + ot20;
                    const isSiteWork = Math.random() < 0.7;

                    mockEntries.push({
                        id: `mock-${dateStr}-work`,
                        userId: techId,
                        weekKey,
                        day: dayName,
                        date: dateStr,
                        startTime: '08:00',
                        finishTime: formatMinutesToTime(480 + (totalHours + 0.5) * 60),
                        breakDuration: 0.5,
                        activity: isSiteWork ? 'Site' : (Math.random() > 0.5 ? 'Office' : 'Travel'),
                        jobNo: isSiteWork ? `JOB-${Math.floor(Math.random() * 1000)}` : 'ADMIN',
                        isChargeable: isSiteWork,
                        isOvernight: Math.random() > 0.9
                    } as any);
                }
            }
        });
        return mockEntries;
    };

    // Load all entries for the selected year
    useEffect(() => {
        if (!isOpen || (!currentUser?.uid && !useMockData)) return;

        const loadYearData = async () => {
            setIsLoading(true);
            try {
                if (useMockData) {
                    setEntries(generateMockData(selectedYear));
                    setIsLoading(false);
                    return;
                }

                // Load all entries for the user
                const allEntries = await timesheetRepository.getByUserId(currentUser.uid);

                // Filter to entries that MIGHT contain days in the selected year/FY
                // For Calendar Year: include entries from selectedYear only
                // For Financial Year: include entries from BOTH (selectedYear-1) and selectedYear
                // e.g., FY 2025-26 runs July 2025 - June 2026, so we need entries from both 2025 and 2026
                const yearEntries = allEntries.filter((entry: TimesheetEntry) => {
                    if (!entry.weekKey || !entry.day) return false;

                    // Parse year and week from weekKey
                    const [yearStr, weekStr] = entry.weekKey.split('-W');
                    const weekYear = parseInt(yearStr);
                    const weekNum = parseInt(weekStr || '0');

                    // Calculate the actual date of this entry
                    const weekStart = getFirstDayOfISOWeek(weekYear, weekNum);
                    const dayOffset = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(entry.day);
                    const entryDate = new Date(weekStart);
                    entryDate.setDate(weekStart.getDate() + dayOffset);

                    const entryYear = entryDate.getFullYear();
                    const entryMonth = entryDate.getMonth(); // 0-indexed

                    // For Financial Year: include entries from July (selectedYear-1) to June (selectedYear)
                    // For Calendar Year: include entries from selectedYear only
                    if (yearType === 'financial') {
                        const fyStartYear = selectedYear - 1;
                        // Include if:
                        // - Entry is in July-Dec of (selectedYear-1), OR
                        // - Entry is in Jan-June of selectedYear
                        return (
                            (entryYear === fyStartYear && entryMonth >= 6) || // July-Dec of start year
                            (entryYear === selectedYear && entryMonth < 6)     // Jan-June of end year
                        );
                    } else {
                        // Calendar year: include entry if its actual date falls in the selected year
                        return entryYear === selectedYear;
                    }
                });

                // DEBUG: Log loaded entries for diagnosis
                console.log(`[YearlySummary] Loaded ${yearEntries.length} entries for ${selectedYear} from ${allEntries.length} total entries`);
                if (yearEntries.length > 0) {
                    const sampleEntry = yearEntries[0];
                    console.log('[YearlySummary] Sample entry:', {
                        weekKey: sampleEntry.weekKey,
                        day: sampleEntry.day,
                        date: sampleEntry.date
                    });
                }

                setEntries(yearEntries);
            } catch (error) {
                console.error('Error loading year data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadYearData();
    }, [isOpen, currentUser?.uid, selectedYear, yearType, useMockData]);

    // Calculate yearly summary
    const yearlySummary = useMemo((): YearlySummaryType => {
        if (entries.length === 0) {
            return {
                year: selectedYear,
                totalNetHours: 0,
                totalBaseHours: 0,
                totalOT15x: 0,
                totalOT20x: 0,
                totalPerDiem: 0,
                totalChargeableHours: 0,
                averageUtilization: 0,
                weeksWorked: 0,
                weeklyData: []
            };
        }

        // Group entries by week
        const weekGroups = new Map<string, TimesheetEntry[]>();
        entries.forEach(entry => {
            const key = entry.weekKey || 'unknown';
            if (!weekGroups.has(key)) {
                weekGroups.set(key, []);
            }
            weekGroups.get(key)?.push(entry);
        });

        // Calculate summary for each week
        let totalNetHours = 0;
        let totalBaseHours = 0;
        let totalOT15x = 0;
        let totalOT20x = 0;
        let totalPerDiem = 0;
        let totalChargeableHours = 0;
        let totalUtilization = 0;

        weekGroups.forEach((weekEntries) => {
            const weekSummary = calculateWeeklySummary(weekEntries);
            totalNetHours += weekSummary.totalNetHours;
            totalBaseHours += weekSummary.totalBaseHours;
            totalOT15x += weekSummary.totalOT15x;
            totalOT20x += weekSummary.totalOT20x;
            totalPerDiem += weekSummary.totalPerDiem;
            totalChargeableHours += weekSummary.totalChargeableHours;
            totalUtilization += weekSummary.utilizationPercent;
        });

        const weeksWorked = weekGroups.size;

        return {
            year: selectedYear,
            totalNetHours,
            totalBaseHours,
            totalOT15x,
            totalOT20x,
            totalPerDiem,
            totalChargeableHours,
            averageUtilization: weeksWorked > 0 ? totalUtilization / weeksWorked : 0,
            weeksWorked,
            weeklyData: []
        };
    }, [entries, selectedYear]);

    // Calculate monthly breakdown for Financial Year or Calendar Year
    const monthlyData = useMemo((): MonthlyData[] => {
        const months = yearType === 'financial' ? FY_MONTHS : CALENDAR_MONTHS;

        return months.map((month, monthIdx) => {
            // Calculate the actual calendar month index and year for this month
            let calendarMonthIndex: number;
            let calendarYear: number;

            if (yearType === 'financial') {
                // FY months: Jul(0), Aug(1), ..., Dec(5), Jan(6), ..., Jun(11)
                // Calendar months: Jul=6, Aug=7, ..., Dec=11, Jan=0, ..., Jun=5
                calendarMonthIndex = monthIdx < 6 ? monthIdx + 6 : monthIdx - 6;
                calendarYear = monthIdx < 6 ? selectedYear - 1 : selectedYear;
            } else {
                // Calendar year: Jan(0), Feb(1), ..., Dec(11)
                calendarMonthIndex = monthIdx;
                calendarYear = selectedYear;
            }

            // Filter entries for this month by calculating the actual date of each entry
            const monthEntries = entries.filter(entry => {
                if (!entry.weekKey || !entry.day) return false;

                // Parse BOTH year and week number from weekKey (format: YYYY-WXX)
                const [yearStr, weekStr] = entry.weekKey.split('-W');
                const weekYear = parseInt(yearStr);
                const weekNum = parseInt(weekStr || '0');

                // Get the Monday of this ISO week using the YEAR FROM THE WEEKKEY
                const weekStart = getFirstDayOfISOWeek(weekYear, weekNum);

                // Calculate the actual date of this entry based on the day
                const dayOffset = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(entry.day);
                const entryDate = new Date(weekStart);
                entryDate.setDate(weekStart.getDate() + dayOffset);

                // Check if this entry's actual date falls in this month AND year
                return entryDate.getMonth() === calendarMonthIndex && entryDate.getFullYear() === calendarYear;
            });

            if (monthEntries.length === 0) {
                return {
                    month,
                    monthIndex: monthIdx,
                    totalHours: 0,
                    baseHours: 0,
                    ot15Hours: 0,
                    ot20Hours: 0,
                    perDiem: 0,
                    weeksWorked: 0,
                    averageUtilization: 0,
                    saturdaysWorked: 0,
                    sundaysWorked: 0
                };
            }

            // Group by week
            const weekGroups = new Set(monthEntries.map(e => e.weekKey));
            const summary = calculateWeeklySummary(monthEntries);

            // Count weekend days worked (unique dates)
            const saturdayDates = new Set(monthEntries.filter(e => e.day === 'Saturday').map(e => e.date || e.weekKey + e.day));
            const sundayDates = new Set(monthEntries.filter(e => e.day === 'Sunday').map(e => e.date || e.weekKey + e.day));

            return {
                month,
                monthIndex: monthIdx,
                totalHours: summary.totalNetHours,
                baseHours: summary.totalBaseHours,
                ot15Hours: summary.totalOT15x,
                ot20Hours: summary.totalOT20x,
                perDiem: summary.totalPerDiem,
                weeksWorked: weekGroups.size,
                averageUtilization: summary.utilizationPercent,
                saturdaysWorked: saturdayDates.size,
                sundaysWorked: sundayDates.size
            };
        });
    }, [entries, selectedYear, yearType]);

    // DEBUG: Log monthly breakdown
    useEffect(() => {
        if (monthlyData.length > 0) {
            const monthsWithData = monthlyData.filter(m => m.totalHours > 0);
            console.log(`[YearlySummary] Monthly breakdown: ${monthsWithData.length}/12 months have data`);
            monthsWithData.forEach(m => {
                console.log(`  ${m.month}: ${m.totalHours.toFixed(1)}h`);
            });
        }
    }, [monthlyData]);

    // Calculate equivalent normal hours (for display)
    const equivalentHours = yearlySummary.totalBaseHours +
        (yearlySummary.totalOT15x * 1.5) +
        (yearlySummary.totalOT20x * 2);

    // Calculate total weekend days worked
    const totalSaturdaysWorked = monthlyData.reduce((sum, m) => sum + m.saturdaysWorked, 0);
    const totalSundaysWorked = monthlyData.reduce((sum, m) => sum + m.sundaysWorked, 0);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        <BarChart3 className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">Yearly Summary</h2>
                    </div>

                    {/* Year Type Toggle */}
                    <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-600">
                        <button
                            onClick={() => {
                                setYearType('financial');
                                setSelectedYear(getCurrentFinancialYear());
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${yearType === 'financial'
                                ? 'bg-cyan-600 text-white'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Financial
                        </button>
                        <button
                            onClick={() => {
                                setYearType('calendar');
                                setSelectedYear(new Date().getFullYear());
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${yearType === 'calendar'
                                ? 'bg-cyan-600 text-white'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Calendar
                        </button>
                    </div>

                    {/* Year Navigation */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-semibold text-white min-w-[120px] text-center">
                            {yearType === 'financial' ? formatFYDisplay(selectedYear) : selectedYear}
                        </span>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            disabled={yearType === 'financial'
                                ? selectedYear >= getCurrentFinancialYear()
                                : selectedYear >= new Date().getFullYear()}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setUseMockData(!useMockData)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${useMockData
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                : 'bg-slate-700 text-slate-400 border border-slate-600'
                                }`}
                        >
                            {useMockData ? 'Mock Data ON' : 'Mock Data OFF'}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            No timesheet data for {formatFYDisplay(selectedYear)}
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <SummaryCard
                                    icon={<Clock className="w-5 h-5" />}
                                    label="Total Hours Worked"
                                    value={yearlySummary.totalNetHours.toFixed(1)}
                                    subValue={`${yearlySummary.weeksWorked} weeks`}
                                    accent="cyan"
                                />
                                <SummaryCard
                                    icon={<TrendingUp className="w-5 h-5" />}
                                    label="Equivalent Hours"
                                    value={equivalentHours.toFixed(1)}
                                    subValue="Including OT rates"
                                    accent="green"
                                />
                                <SummaryCard
                                    icon={<DollarSign className="w-5 h-5" />}
                                    label="Total Per Diem"
                                    value={`$${yearlySummary.totalPerDiem.toFixed(2)}`}
                                    subValue="Allowances earned"
                                    accent="amber"
                                />
                                <SummaryCard
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    label="Avg Utilisation"
                                    value={`${yearlySummary.averageUtilization.toFixed(0)}%`}
                                    subValue="Weekly average"
                                    accent="purple"
                                />
                                <SummaryCard
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="Saturdays Worked"
                                    value={String(totalSaturdaysWorked)}
                                    subValue="Weekend days"
                                    accent="orange"
                                />
                                <SummaryCard
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="Sundays Worked"
                                    value={String(totalSundaysWorked)}
                                    subValue="Weekend days"
                                    accent="red"
                                />
                            </div>

                            {/* Hours Breakdown */}
                            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Hours Breakdown</h3>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-slate-100">
                                            {yearlySummary.totalBaseHours.toFixed(1)}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1">Base Rate Hours</div>
                                        <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-slate-400 rounded-full"
                                                style={{ width: `${(yearlySummary.totalBaseHours / yearlySummary.totalNetHours) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-amber-400">
                                            {yearlySummary.totalOT15x.toFixed(1)}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1">Overtime 1.5x</div>
                                        <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500 rounded-full"
                                                style={{ width: `${(yearlySummary.totalOT15x / yearlySummary.totalNetHours) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-red-400">
                                            {yearlySummary.totalOT20x.toFixed(1)}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1">Overtime 2x</div>
                                        <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full"
                                                style={{ width: `${(yearlySummary.totalOT20x / yearlySummary.totalNetHours) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Hours & Utilisation Trend Chart */}
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-6">Monthly Hours & Utilisation Trend</h3>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                tickFormatter={(val) => val.slice(0, 3)}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#06b6d4', fontSize: 12 }}
                                                domain={[0, 120]}
                                                tickFormatter={(val) => `${val}%`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    color: '#f8fafc'
                                                }}
                                            />
                                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />

                                            {/* Stacked Bars for Hours */}
                                            <Bar yAxisId="left" dataKey="baseHours" name="Base" stackId="a" fill="#94a3b8" barSize={32} />
                                            <Bar yAxisId="left" dataKey="ot15Hours" name="OT 1.5x" stackId="a" fill="#f59e0b" barSize={32} />
                                            <Bar yAxisId="left" dataKey="ot20Hours" name="OT 2x" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />

                                            {/* Line for Utilisation */}
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="averageUtilization"
                                                name="Utilisation %"
                                                stroke="#06b6d4"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#0f172a' }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>


                            {/* Monthly Table */}
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-700/50">
                                        <tr className="text-xs text-slate-400 uppercase">
                                            <th className="px-4 py-3 text-left">Month</th>
                                            <th className="px-4 py-3 text-right">Weeks</th>
                                            <th className="px-4 py-3 text-right">Total Hours</th>
                                            <th className="px-4 py-3 text-right">Base</th>
                                            <th className="px-4 py-3 text-right">OT 1.5x</th>
                                            <th className="px-4 py-3 text-right">OT 2x</th>
                                            <th className="px-4 py-3 text-right">Sat</th>
                                            <th className="px-4 py-3 text-right">Sun</th>
                                            <th className="px-4 py-3 text-right">Per Diem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyData.map((month) => (
                                            <tr
                                                key={month.month}
                                                className={`border-t border-slate-700 ${month.totalHours === 0 ? 'opacity-40' : ''}`}
                                            >
                                                <td className="px-4 py-3 text-slate-200 font-medium">{month.month}</td>
                                                <td className="px-4 py-3 text-right text-slate-400">{month.weeksWorked}</td>
                                                <td className="px-4 py-3 text-right text-slate-200 font-mono">{month.totalHours.toFixed(1)}</td>
                                                <td className="px-4 py-3 text-right text-slate-400 font-mono">{month.baseHours.toFixed(1)}</td>
                                                <td className="px-4 py-3 text-right text-amber-400 font-mono">{month.ot15Hours.toFixed(1)}</td>
                                                <td className="px-4 py-3 text-right text-red-400 font-mono">{month.ot20Hours.toFixed(1)}</td>
                                                <td className="px-4 py-3 text-right text-orange-400 font-mono">{month.saturdaysWorked || 0}</td>
                                                <td className="px-4 py-3 text-right text-rose-400 font-mono">{month.sundaysWorked || 0}</td>
                                                <td className="px-4 py-3 text-right text-green-400 font-mono">${month.perDiem.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-700/30 border-t border-slate-600">
                                        <tr className="font-semibold">
                                            <td className="px-4 py-3 text-white">Total</td>
                                            <td className="px-4 py-3 text-right text-slate-300">{yearlySummary.weeksWorked}</td>
                                            <td className="px-4 py-3 text-right text-white font-mono">{yearlySummary.totalNetHours.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right text-slate-300 font-mono">{yearlySummary.totalBaseHours.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right text-amber-400 font-mono">{yearlySummary.totalOT15x.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right text-red-400 font-mono">{yearlySummary.totalOT20x.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right text-orange-400 font-mono">{totalSaturdaysWorked}</td>
                                            <td className="px-4 py-3 text-right text-rose-400 font-mono">{totalSundaysWorked}</td>
                                            <td className="px-4 py-3 text-right text-green-400 font-mono">${yearlySummary.totalPerDiem.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper: Get first day (Monday) of ISO week
// ISO week 1 is the week containing Jan 4th (or the first Thursday of the year)
function getFirstDayOfISOWeek(year: number, week: number): Date {
    // Start with Jan 4th of the given year (always in ISO week 1)
    const jan4 = new Date(Date.UTC(year, 0, 4));

    // Get the day of week for Jan 4 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Convert to ISO day (1 = Monday, 7 = Sunday)
    const jan4Day = jan4.getUTCDay() || 7;

    // Calculate the Monday of week 1
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

    // Calculate the Monday of the requested week
    const targetMonday = new Date(week1Monday);
    targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

    // Return as local date
    return new Date(targetMonday.getUTCFullYear(), targetMonday.getUTCMonth(), targetMonday.getUTCDate());
}

// Summary card component
function SummaryCard({
    icon,
    label,
    value,
    subValue,
    accent
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue: string;
    accent: 'cyan' | 'green' | 'amber' | 'purple' | 'orange' | 'red'
}) {
    const accentColors = {
        cyan: 'text-cyan-400 bg-cyan-900/30 border-cyan-800',
        green: 'text-green-400 bg-green-900/30 border-green-800',
        amber: 'text-amber-400 bg-amber-900/30 border-amber-800',
        purple: 'text-purple-400 bg-purple-900/30 border-purple-800',
        orange: 'text-orange-400 bg-orange-900/30 border-orange-800',
        red: 'text-rose-400 bg-rose-900/30 border-rose-800',
    };

    return (
        <div className={`rounded-xl p-4 border ${accentColors[accent]}`}>
            <div className={`${accentColors[accent].split(' ')[0]} mb-2`}>{icon}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{subValue}</div>
        </div>
    );
}
