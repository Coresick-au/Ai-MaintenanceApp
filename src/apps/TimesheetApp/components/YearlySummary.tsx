/**
 * YearlySummary Component
 * 
 * Displays aggregated timesheet data for an entire year with
 * charts, statistics, and monthly breakdown.
 */

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, TrendingUp, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { timesheetRepository } from '../../../repositories';
import type { TimesheetEntry, YearlySummary as YearlySummaryType } from '../types';
import { calculateWeeklySummary } from '../utils/calculator';

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
}

export function YearlySummaryModal({ isOpen, onClose }: YearlySummaryProps) {
    const { currentUser } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load all entries for the selected year
    useEffect(() => {
        if (!isOpen || !currentUser?.uid) return;

        const loadYearData = async () => {
            setIsLoading(true);
            try {
                // Load all entries for the user
                const allEntries = await timesheetRepository.getByUserId(currentUser.uid);

                // Filter to selected year based on weekKey (format: YYYY-WXX)
                const yearEntries = allEntries.filter((entry: TimesheetEntry) => {
                    if (!entry.weekKey) return false;
                    const yearFromKey = parseInt(entry.weekKey.split('-')[0] || '0');
                    return yearFromKey === selectedYear;
                });

                setEntries(yearEntries);
            } catch (error) {
                console.error('Error loading year data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadYearData();
    }, [isOpen, currentUser?.uid, selectedYear]);

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

    // Calculate monthly breakdown
    const monthlyData = useMemo((): MonthlyData[] => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return months.map((month, idx) => {
            // Filter entries for this month
            // weekKey format: YYYY-WXX - we need to map week numbers to months
            const monthEntries = entries.filter(entry => {
                if (!entry.weekKey) return false;
                const weekNum = parseInt(entry.weekKey.split('-W')[1] || '0');
                // Check first day of week to determine month
                const weekStart = getFirstDayOfISOWeek(selectedYear, weekNum);
                return weekStart.getMonth() === idx;
            });

            if (monthEntries.length === 0) {
                return {
                    month,
                    monthIndex: idx,
                    totalHours: 0,
                    baseHours: 0,
                    ot15Hours: 0,
                    ot20Hours: 0,
                    perDiem: 0,
                    weeksWorked: 0
                };
            }

            // Group by week
            const weekGroups = new Set(monthEntries.map(e => e.weekKey));
            const summary = calculateWeeklySummary(monthEntries);

            return {
                month,
                monthIndex: idx,
                totalHours: summary.totalNetHours,
                baseHours: summary.totalBaseHours,
                ot15Hours: summary.totalOT15x,
                ot20Hours: summary.totalOT20x,
                perDiem: summary.totalPerDiem,
                weeksWorked: weekGroups.size
            };
        });
    }, [entries, selectedYear]);

    // Calculate equivalent normal hours (for display)
    const equivalentHours = yearlySummary.totalBaseHours +
        (yearlySummary.totalOT15x * 1.5) +
        (yearlySummary.totalOT20x * 2);

    // Get max hours for chart scaling
    const maxMonthlyHours = Math.max(...monthlyData.map(m => m.totalHours), 1);

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

                    {/* Year Navigation */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-semibold text-white min-w-[80px] text-center">
                            {selectedYear}
                        </span>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            disabled={selectedYear >= new Date().getFullYear()}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            No timesheet data for {selectedYear}
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                            {/* Monthly Chart */}
                            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Monthly Hours</h3>
                                <div className="flex items-end gap-2 h-48">
                                    {monthlyData.map((month) => (
                                        <div key={month.month} className="flex-1 flex flex-col items-center">
                                            <div className="w-full flex flex-col items-center flex-1 justify-end">
                                                {/* Stacked bar */}
                                                <div
                                                    className="w-full max-w-[40px] flex flex-col-reverse rounded-t overflow-hidden"
                                                    style={{ height: `${(month.totalHours / maxMonthlyHours) * 100}%`, minHeight: month.totalHours > 0 ? '4px' : '0' }}
                                                >
                                                    <div
                                                        className="bg-slate-400"
                                                        style={{ height: `${(month.baseHours / (month.totalHours || 1)) * 100}%` }}
                                                    />
                                                    <div
                                                        className="bg-amber-500"
                                                        style={{ height: `${(month.ot15Hours / (month.totalHours || 1)) * 100}%` }}
                                                    />
                                                    <div
                                                        className="bg-red-500"
                                                        style={{ height: `${(month.ot20Hours / (month.totalHours || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-2">
                                                {month.month.slice(0, 3)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Legend */}
                                <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-slate-400" />
                                        <span className="text-slate-400">Base</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-amber-500" />
                                        <span className="text-slate-400">OT 1.5x</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-red-500" />
                                        <span className="text-slate-400">OT 2x</span>
                                    </div>
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

// Helper: Get first day of ISO week
function getFirstDayOfISOWeek(year: number, week: number): Date {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday;
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
    accent: 'cyan' | 'green' | 'amber' | 'purple'
}) {
    const accentColors = {
        cyan: 'text-cyan-400 bg-cyan-900/30 border-cyan-800',
        green: 'text-green-400 bg-green-900/30 border-green-800',
        amber: 'text-amber-400 bg-amber-900/30 border-amber-800',
        purple: 'text-purple-400 bg-purple-900/30 border-purple-800',
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
