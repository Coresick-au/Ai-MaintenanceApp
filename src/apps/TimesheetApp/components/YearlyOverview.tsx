/**
 * YearlyOverview - Quarterly Staff Timesheet Matrix with Utilization & Comparison
 * 
 * Displays all staff timesheets for a quarter in a matrix format
 * Rows: Staff members, Columns: Weeks, Cells: Hours (color-coded by status)
 * Features: Utilization %, tech selection, comparison chart
 */

import { useState, useEffect, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, Filter, BarChart2, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
// @ts-ignore
import { useAuth } from '../../../context/AuthContext';
// @ts-ignore
import { timesheetRepository } from '../../../repositories';
// @ts-ignore
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Types and Utils
import type { TimesheetEntry } from '../types';
import { calculateWeeklySummary } from '../utils/calculator';

// Standard weekly hours from calculator.ts
const STANDARD_WEEKLY_HOURS = 37.5;

interface WeekData {
    totalHours: number;
    status: 'locked' | 'draft' | 'empty';
    entryCount: number;
    utilization: number;
    chargeableHours: number;
    overtimeTotal: number;
    perDiem: number;
}

interface StaffYearlyData {
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    weeklyData: Record<string, WeekData>;
    quarterTotal: number;
    quarterUtilization: number;
    quarterOvertime: number;
    quarterPerDiem: number;
    daysWithEntries: number;
    trend: 'up' | 'down' | 'stable';
}

interface YearlyOverviewProps {
    onBack?: () => void;
}

export function YearlyOverview({ onBack }: YearlyOverviewProps) {
    const { userRole } = useAuth();

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [staffData, setStaffData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [excludeAdmins, setExcludeAdmins] = useState(true);

    // Selection state for comparison
    const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
    const [showComparisonChart, setShowComparisonChart] = useState(false);

    // Check admin/manager access
    if (userRole !== 'admin' && userRole !== 'manager') {
        return <div className="text-slate-400">Access denied</div>;
    }

    // Calculate week range for current quarter
    const startWeek = (selectedQuarter - 1) * 13 + 1;
    const endWeek = Math.min(selectedQuarter * 13, 53);
    const weekNumbers = Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i);

    // Load data for selected quarter
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const quarterEntries = await timesheetRepository.getAllByQuarter(selectedYear, selectedQuarter);
                setEntries(quarterEntries as TimesheetEntry[]);

                const userIds = [...new Set(quarterEntries.map((e: TimesheetEntry) => e.userId))] as string[];

                const userDataMap: Record<string, any> = {};
                for (const uid of userIds) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', uid));
                        if (userDoc.exists()) {
                            userDataMap[uid] = userDoc.data();
                        }
                    } catch (err) {
                        console.warn(`Could not fetch user data for ${uid}:`, err);
                    }
                }
                setStaffData(userDataMap);
            } catch (err) {
                console.error('Error loading yearly overview data:', err);
                setError('Failed to load timesheet data');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [selectedYear, selectedQuarter]);

    // Process data into matrix format with utilization
    const staffMatrix = useMemo((): StaffYearlyData[] => {
        if (entries.length === 0) return [];

        const grouped = entries
            .filter(entry => entry.userId)
            .reduce((acc, entry) => {
                if (!acc[entry.userId!]) {
                    acc[entry.userId!] = [];
                }
                acc[entry.userId!].push(entry);
                return acc;
            }, {} as Record<string, TimesheetEntry[]>);

        const matrix = Object.entries(grouped).map(([userId, userEntries]) => {
            const userData = staffData[userId];
            const userName = userData?.name || userData?.displayName || userData?.email?.split('@')[0] || `User ${userId.slice(0, 8)}`;
            const userRoleVal = userData?.role || 'unknown';
            const userEmail = userData?.email || '';

            const weeklyData: Record<string, WeekData> = {};
            let quarterTotal = 0;
            let quarterChargeable = 0;
            let quarterOvertime = 0;
            let quarterPerDiem = 0;
            let daysWithEntries = 0;
            let weeksWithData = 0;
            let firstHalfHours = 0;
            let secondHalfHours = 0;

            weekNumbers.forEach((weekNum, idx) => {
                const weekKey = `${selectedYear}-W${weekNum.toString().padStart(2, '0')}`;
                const weekEntries = userEntries.filter(e => e.weekKey === weekKey);

                if (weekEntries.length > 0) {
                    const summary = calculateWeeklySummary(weekEntries);
                    const isLocked = weekEntries.some(e => e.status === 'submitted');
                    const overtime = summary.totalOT15x + summary.totalOT20x;
                    const utilization = (summary.totalChargeableHours / STANDARD_WEEKLY_HOURS) * 100;

                    weeklyData[weekKey] = {
                        totalHours: summary.totalNetHours,
                        status: isLocked ? 'locked' : 'draft',
                        entryCount: weekEntries.length,
                        utilization: Math.min(utilization, 100),
                        chargeableHours: summary.totalChargeableHours,
                        overtimeTotal: overtime,
                        perDiem: summary.totalPerDiem
                    };

                    quarterTotal += summary.totalNetHours;
                    quarterChargeable += summary.totalChargeableHours;
                    quarterOvertime += overtime;
                    quarterPerDiem += summary.totalPerDiem;
                    weeksWithData++;

                    // Count unique days with entries
                    const uniqueDays = new Set(weekEntries.map(e => e.day)).size;
                    daysWithEntries += uniqueDays;

                    // Track hours for trend calculation
                    if (idx < weekNumbers.length / 2) {
                        firstHalfHours += summary.totalNetHours;
                    } else {
                        secondHalfHours += summary.totalNetHours;
                    }
                } else {
                    weeklyData[weekKey] = {
                        totalHours: 0,
                        status: 'empty',
                        entryCount: 0,
                        utilization: 0,
                        chargeableHours: 0,
                        overtimeTotal: 0,
                        perDiem: 0
                    };
                }
            });

            // Calculate quarterly utilization (average of weeks with data)
            const expectedHours = weeksWithData * STANDARD_WEEKLY_HOURS;
            const quarterUtilization = expectedHours > 0 ? (quarterChargeable / expectedHours) * 100 : 0;

            // Calculate trend
            const trend: 'up' | 'down' | 'stable' =
                secondHalfHours > firstHalfHours * 1.1 ? 'up' :
                    secondHalfHours < firstHalfHours * 0.9 ? 'down' : 'stable';

            return {
                userId,
                userName,
                userEmail,
                role: userRoleVal,
                weeklyData,
                quarterTotal,
                quarterUtilization: Math.min(quarterUtilization, 100),
                quarterOvertime,
                quarterPerDiem,
                daysWithEntries,
                trend
            };
        });

        const filtered = excludeAdmins
            ? matrix.filter(staff => staff.role !== 'admin')
            : matrix;

        return filtered.sort((a, b) => a.userName.localeCompare(b.userName));
    }, [entries, staffData, weekNumbers, selectedYear, excludeAdmins]);

    // Toggle staff selection
    const toggleStaffSelection = (userId: string) => {
        setSelectedStaff(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    // Get selected staff data for comparison
    const comparisonData = useMemo(() =>
        staffMatrix.filter(s => selectedStaff.has(s.userId)),
        [staffMatrix, selectedStaff]
    );

    // Calculate column totals
    const weekTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        weekNumbers.forEach(weekNum => {
            const weekKey = `${selectedYear}-W${weekNum.toString().padStart(2, '0')}`;
            totals[weekKey] = staffMatrix.reduce((sum, staff) =>
                sum + (staff.weeklyData[weekKey]?.totalHours || 0), 0
            );
        });
        return totals;
    }, [staffMatrix, weekNumbers, selectedYear]);

    const grandTotal = useMemo(() =>
        staffMatrix.reduce((sum, staff) => sum + staff.quarterTotal, 0),
        [staffMatrix]
    );

    const avgUtilization = useMemo(() => {
        if (staffMatrix.length === 0) return 0;
        return staffMatrix.reduce((sum, s) => sum + s.quarterUtilization, 0) / staffMatrix.length;
    }, [staffMatrix]);

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Staff Member', 'Role', 'Utilization %', ...weekNumbers.map(w => `W${w.toString().padStart(2, '0')}`), 'Total', 'Overtime', 'Per Diem'];
        const rows = staffMatrix.map(staff => [
            staff.userName,
            staff.role,
            staff.quarterUtilization.toFixed(1) + '%',
            ...weekNumbers.map(weekNum => {
                const weekKey = `${selectedYear}-W${weekNum.toString().padStart(2, '0')}`;
                return staff.weeklyData[weekKey]?.totalHours.toFixed(1) || '0.0';
            }),
            staff.quarterTotal.toFixed(1),
            staff.quarterOvertime.toFixed(1),
            '$' + staff.quarterPerDiem.toFixed(2)
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timesheets-yearly-${selectedYear}-Q${selectedQuarter}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Cell color based on utilization
    const getUtilizationColor = (util: number) => {
        if (util >= 90) return 'text-green-400';
        if (util >= 70) return 'text-amber-400';
        return 'text-red-400';
    };

    // Cell color based on status
    const getCellColor = (weekData: WeekData | undefined) => {
        if (!weekData || weekData.status === 'empty') return 'bg-slate-800 text-slate-600';
        if (weekData.status === 'locked') return 'bg-green-900/30 text-green-400 border-green-800';
        return 'bg-amber-900/30 text-amber-400 border-amber-800';
    };

    // Trend icon component
    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
        return <Minus className="w-4 h-4 text-slate-400" />;
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    {/* Year Selector */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                        {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    {/* Quarter Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedQuarter(Math.max(1, selectedQuarter - 1))}
                            disabled={selectedQuarter === 1}
                            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold min-w-[120px] text-center">
                            Q{selectedQuarter} {selectedYear}
                        </div>
                        <button
                            onClick={() => setSelectedQuarter(Math.min(4, selectedQuarter + 1))}
                            disabled={selectedQuarter === 4}
                            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Filter */}
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={excludeAdmins}
                            onChange={(e) => setExcludeAdmins(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <Filter className="w-4 h-4" />
                        Exclude Admins
                    </label>

                    {/* Compare Button */}
                    <button
                        onClick={() => setShowComparisonChart(true)}
                        disabled={selectedStaff.size < 2}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                    >
                        <BarChart2 className="w-4 h-4" />
                        Compare ({selectedStaff.size})
                    </button>

                    {/* Export */}
                    <button
                        onClick={handleExportCSV}
                        disabled={staffMatrix.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Staff Members</div>
                    <div className="text-2xl font-bold text-white">{staffMatrix.length}</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Total Hours (Quarter)</div>
                    <div className="text-2xl font-bold text-white">{grandTotal.toFixed(1)}</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Avg Utilization</div>
                    <div className={`text-2xl font-bold ${getUtilizationColor(avgUtilization)}`}>
                        {avgUtilization.toFixed(1)}%
                    </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Total Overtime</div>
                    <div className="text-2xl font-bold text-amber-400">
                        {staffMatrix.reduce((sum, s) => sum + s.quarterOvertime, 0).toFixed(1)}h
                    </div>
                </div>
            </div>

            {/* Error/Loading States */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                    Loading quarterly data...
                </div>
            ) : staffMatrix.length === 0 ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
                    <div className="text-slate-400 mb-2">No timesheet data for this quarter</div>
                    <div className="text-sm text-slate-500">Try selecting a different quarter or year</div>
                </div>
            ) : (
                /* Matrix Table */
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-700/50 sticky top-0">
                            <tr>
                                <th className="px-2 py-3 text-center text-xs text-slate-400 uppercase font-semibold w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-600 bg-slate-700 text-cyan-500"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedStaff(new Set(staffMatrix.map(s => s.userId)));
                                            } else {
                                                setSelectedStaff(new Set());
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase font-semibold sticky left-0 bg-slate-700/50 z-10">
                                    Staff Member
                                </th>
                                <th className="px-3 py-3 text-center text-xs text-slate-400 uppercase font-semibold">
                                    Util%
                                </th>
                                {weekNumbers.map(weekNum => (
                                    <th key={weekNum} className="px-2 py-3 text-center text-xs text-slate-400 uppercase font-semibold min-w-[55px]">
                                        W{weekNum.toString().padStart(2, '0')}
                                    </th>
                                ))}
                                <th className="px-3 py-3 text-right text-xs text-slate-400 uppercase font-semibold">
                                    Total
                                </th>
                                <th className="px-3 py-3 text-center text-xs text-slate-400 uppercase font-semibold">
                                    Trend
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffMatrix.map((staff) => (
                                <tr
                                    key={staff.userId}
                                    className={`border-t border-slate-700 hover:bg-slate-700/30 transition-colors ${selectedStaff.has(staff.userId) ? 'bg-purple-900/20' : ''}`}
                                >
                                    <td className="px-2 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedStaff.has(staff.userId)}
                                            onChange={() => toggleStaffSelection(staff.userId)}
                                            className="rounded border-slate-600 bg-slate-700 text-purple-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-slate-800 z-10">
                                        <div>{staff.userName}</div>
                                        <div className="text-xs text-slate-500">{staff.role}</div>
                                    </td>
                                    <td className={`px-3 py-3 text-center font-semibold ${getUtilizationColor(staff.quarterUtilization)}`}>
                                        {staff.quarterUtilization.toFixed(0)}%
                                    </td>
                                    {weekNumbers.map(weekNum => {
                                        const weekKey = `${selectedYear}-W${weekNum.toString().padStart(2, '0')}`;
                                        const weekData = staff.weeklyData[weekKey];
                                        return (
                                            <td
                                                key={weekKey}
                                                className={`px-2 py-3 text-center font-mono text-xs border ${getCellColor(weekData)}`}
                                                title={weekData?.status !== 'empty' ? `${weekData?.totalHours.toFixed(1)}h | Util: ${weekData?.utilization.toFixed(0)}%` : 'No entries'}
                                            >
                                                {weekData?.status !== 'empty' ? weekData?.totalHours.toFixed(0) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 text-right font-mono font-bold text-white">
                                        {staff.quarterTotal.toFixed(1)}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <TrendIcon trend={staff.trend} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-700/30 border-t-2 border-slate-600">
                            <tr className="font-semibold">
                                <td className="px-2 py-3"></td>
                                <td className="px-4 py-3 text-white sticky left-0 bg-slate-700/30 z-10">
                                    Total ({staffMatrix.length} staff)
                                </td>
                                <td className={`px-3 py-3 text-center font-bold ${getUtilizationColor(avgUtilization)}`}>
                                    {avgUtilization.toFixed(0)}%
                                </td>
                                {weekNumbers.map(weekNum => {
                                    const weekKey = `${selectedYear}-W${weekNum.toString().padStart(2, '0')}`;
                                    return (
                                        <td key={weekKey} className="px-2 py-3 text-center font-mono text-xs text-slate-300">
                                            {weekTotals[weekKey]?.toFixed(0) || '0'}
                                        </td>
                                    );
                                })}
                                <td className="px-3 py-3 text-right font-mono text-white">
                                    {grandTotal.toFixed(1)}
                                </td>
                                <td className="px-3 py-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Comparison Modal */}
            {showComparisonChart && comparisonData.length >= 2 && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="text-lg font-bold text-white">Staff Comparison</h3>
                            <button
                                onClick={() => setShowComparisonChart(false)}
                                className="p-1 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Comparison Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {comparisonData.map(staff => (
                                    <div key={staff.userId} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                        <div className="font-semibold text-white mb-3">{staff.userName}</div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Hours</span>
                                                <span className="font-mono text-white">{staff.quarterTotal.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Utilization</span>
                                                <span className={`font-mono ${getUtilizationColor(staff.quarterUtilization)}`}>
                                                    {staff.quarterUtilization.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Overtime</span>
                                                <span className="font-mono text-amber-400">{staff.quarterOvertime.toFixed(1)}h</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Days</span>
                                                <span className="font-mono text-white">{staff.daysWithEntries}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Per Diem</span>
                                                <span className="font-mono text-green-400">${staff.quarterPerDiem.toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">Trend</span>
                                                <TrendIcon trend={staff.trend} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bar Chart */}
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase mb-4">Weekly Hours Comparison</h4>
                                <div className="space-y-4">
                                    {comparisonData.map((staff, idx) => {
                                        const colors = ['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500'];
                                        const color = colors[idx % colors.length];
                                        const maxHours = Math.max(...comparisonData.flatMap(s =>
                                            Object.values(s.weeklyData).map(w => w.totalHours)
                                        ));

                                        return (
                                            <div key={staff.userId}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                                    <span className="text-sm text-slate-300">{staff.userName}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {weekNumbers.map(weekNum => {
                                                        const weekKey = `${selectedYear}-W${weekNum.toString().padStart(2, '0')}`;
                                                        const hours = staff.weeklyData[weekKey]?.totalHours || 0;
                                                        const height = maxHours > 0 ? (hours / maxHours) * 60 : 0;

                                                        return (
                                                            <div
                                                                key={weekKey}
                                                                className="flex-1 flex flex-col justify-end"
                                                                title={`W${weekNum}: ${hours.toFixed(1)}h`}
                                                            >
                                                                <div
                                                                    className={`${color} rounded-t transition-all hover:opacity-80`}
                                                                    style={{ height: `${height}px`, minHeight: hours > 0 ? '4px' : '0' }}
                                                                ></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Week labels */}
                                    <div className="flex gap-1 mt-2 border-t border-slate-700 pt-2">
                                        {weekNumbers.map(weekNum => (
                                            <div key={weekNum} className="flex-1 text-center text-[10px] text-slate-500">
                                                {weekNum}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default YearlyOverview;
