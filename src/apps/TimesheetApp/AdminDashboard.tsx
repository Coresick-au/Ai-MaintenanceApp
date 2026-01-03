/**
 * AdminDashboard - Admin Timesheet Overview
 * 
 * Displays all staff timesheets for a selected week with analytics,
 * search/filter, and export capabilities (CSV/PDF).
 */

import { useState, useEffect, useMemo } from 'react';
import { FileDown, Download, Search, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';
// @ts-ignore
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import { timesheetRepository } from '../../repositories';
// @ts-ignore
import { PageShell, NeonButton } from '../../components/ui/NeonUI';
// @ts-ignore
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { pdf } from '@react-pdf/renderer';

// Components
import { WeekPicker } from './components/WeekPicker';
import { YearlyOverview } from './components/YearlyOverview';
// @ts-ignore
import { AdminTimesheetPDF } from './components/AdminTimesheetPDF';

// Types and Utils
import type { TimesheetEntry, WeeklySummary } from './types';
import { calculateWeeklySummary } from './utils/calculator';
import { getWeekStart, getWeekKey, getWeekEnd } from './utils/weekUtils';

interface StaffSummary {
    userId: string;
    userName: string;
    userEmail: string;
    entries: TimesheetEntry[];
    summary: WeeklySummary;
    isLocked: boolean;
}

interface AdminDashboardProps {
    onBack?: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
    const { userRole } = useAuth();

    // Tab state
    const [activeTab, setActiveTab] = useState<'weekly' | 'yearly'>('weekly');

    // State
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [staffData, setStaffData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const weekKey = getWeekKey(currentWeekStart);

    // Check admin/manager access
    if (userRole !== 'admin' && userRole !== 'manager') {
        return (
            <PageShell title="Access Denied" onBack={onBack}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">Admin or Manager access required</p>
                    </div>
                </div>
            </PageShell>
        );
    }

    // Load entries for current week
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch all timesheet entries for the week
                const weekEntries = await timesheetRepository.getAllByWeek(weekKey);
                setEntries(weekEntries as TimesheetEntry[]);

                // Get unique user IDs
                const userIds = [...new Set(weekEntries.map((e: TimesheetEntry) => e.userId))] as string[];

                // Fetch user data for all users
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
                console.error('Error loading admin timesheet data:', err);
                setError('Failed to load timesheet data');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [weekKey]);

    // Group entries by user and calculate summaries
    const staffSummaries = useMemo((): StaffSummary[] => {
        if (entries.length === 0) return [];

        // Group by userId (filter out any entries without userId)
        const grouped = entries
            .filter(entry => entry.userId) // Type guard
            .reduce((acc, entry) => {
                if (!acc[entry.userId!]) {
                    acc[entry.userId!] = [];
                }
                acc[entry.userId!].push(entry);
                return acc;
            }, {} as Record<string, TimesheetEntry[]>);

        // Create summaries
        return Object.entries(grouped).map(([userId, userEntries]) => {
            const userData = staffData[userId];
            const summary = calculateWeeklySummary(userEntries);
            const isLocked = userEntries.some(e => e.status === 'submitted');

            return {
                userId,
                userName: userData?.name || userData?.displayName || userData?.email?.split('@')[0] || `User ${userId.slice(0, 8)}`,
                userEmail: userData?.email || '',
                entries: userEntries,
                summary,
                isLocked
            };
        }).sort((a, b) => a.userName.localeCompare(b.userName));
    }, [entries, staffData]);

    // Filter by search term
    const filteredStaff = useMemo(() => {
        if (!searchTerm) return staffSummaries;
        const term = searchTerm.toLowerCase();
        return staffSummaries.filter(staff =>
            staff.userName.toLowerCase().includes(term) ||
            staff.userEmail.toLowerCase().includes(term)
        );
    }, [staffSummaries, searchTerm]);

    // Calculate grand totals
    const grandTotals = useMemo(() => {
        return staffSummaries.reduce((acc, staff) => ({
            totalNetHours: acc.totalNetHours + staff.summary.totalNetHours,
            totalBaseHours: acc.totalBaseHours + staff.summary.totalBaseHours,
            totalOT15x: acc.totalOT15x + staff.summary.totalOT15x,
            totalOT20x: acc.totalOT20x + staff.summary.totalOT20x,
            totalPerDiem: acc.totalPerDiem + staff.summary.totalPerDiem,
            totalChargeableHours: acc.totalChargeableHours + staff.summary.totalChargeableHours,
            staffCount: staffSummaries.length
        }), {
            totalNetHours: 0,
            totalBaseHours: 0,
            totalOT15x: 0,
            totalOT20x: 0,
            totalPerDiem: 0,
            totalChargeableHours: 0,
            staffCount: 0
        });
    }, [staffSummaries]);

    // CSV Export
    const handleExportCSV = () => {
        const headers = ['Staff Name', 'Email', 'Total Hours', 'Base Hours', 'OT 1.5x', 'OT 2x', 'Per Diem', 'Status'];
        const rows = filteredStaff.map(staff => [
            staff.userName,
            staff.userEmail,
            staff.summary.totalNetHours.toFixed(2),
            staff.summary.totalBaseHours.toFixed(2),
            staff.summary.totalOT15x.toFixed(2),
            staff.summary.totalOT20x.toFixed(2),
            staff.summary.totalPerDiem.toFixed(2),
            staff.isLocked ? 'LOCKED' : 'DRAFT'
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timesheets-admin-${weekKey}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // PDF Export
    const handleExportPDF = async () => {
        try {
            const weekEnd = getWeekEnd(currentWeekStart);
            const blob = await pdf(
                <AdminTimesheetPDF
                    staffSummaries={filteredStaff}
                    grandTotals={grandTotals}
                    weekStart={currentWeekStart}
                    weekEnd={weekEnd}
                    weekKey={weekKey}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `timesheets-admin-${weekKey}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setError('Failed to export PDF');
        }
    };

    return (
        <PageShell
            title="Timesheet Admin Dashboard"
            onBack={onBack}
            right={
                <div className="flex items-center gap-2">
                    <NeonButton
                        onClick={handleExportCSV}
                        disabled={filteredStaff.length === 0}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </NeonButton>
                    <NeonButton
                        onClick={handleExportPDF}
                        disabled={filteredStaff.length === 0}
                        className="flex items-center gap-2"
                    >
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </NeonButton>
                </div>
            }
        >
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-6 py-3 font-semibold transition-colors border-b-2 ${activeTab === 'weekly'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    Weekly View
                </button>
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`px-6 py-3 font-semibold transition-colors border-b-2 ${activeTab === 'yearly'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    Yearly Overview
                </button>
            </div>

            {activeTab === 'yearly' ? (
                /* Yearly Overview */
                <YearlyOverview />
            ) : (
                /* Weekly View */
                <div className="space-y-6">
                    {/* Week Picker */}
                    <WeekPicker
                        currentWeekStart={currentWeekStart}
                        onWeekChange={setCurrentWeekStart}
                    />

                    {/* Analytics Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <SummaryCard
                            icon={<Users className="w-5 h-5" />}
                            label="Staff Members"
                            value={grandTotals.staffCount.toString()}
                            subValue="With timesheets"
                            accent="cyan"
                        />
                        <SummaryCard
                            icon={<Clock className="w-5 h-5" />}
                            label="Total Hours"
                            value={grandTotals.totalNetHours.toFixed(1)}
                            subValue="All staff combined"
                            accent="green"
                        />
                        <SummaryCard
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Average Hours"
                            value={grandTotals.staffCount > 0 ? (grandTotals.totalNetHours / grandTotals.staffCount).toFixed(1) : '0.0'}
                            subValue="Per staff member"
                            accent="purple"
                        />
                        <SummaryCard
                            icon={<Clock className="w-5 h-5" />}
                            label="Overtime"
                            value={(grandTotals.totalOT15x + grandTotals.totalOT20x).toFixed(1)}
                            subValue={`${grandTotals.totalOT15x.toFixed(1)}h @ 1.5x, ${grandTotals.totalOT20x.toFixed(1)}h @ 2x`}
                            accent="amber"
                        />
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search staff by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-slate-400">Loading timesheet data...</div>
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        /* Empty State */
                        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
                            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-300 mb-2">
                                {searchTerm ? 'No matching staff found' : 'No timesheets for this week'}
                            </h3>
                            <p className="text-slate-500">
                                {searchTerm
                                    ? 'Try adjusting your search terms'
                                    : 'Staff members haven\'t submitted any timesheets for this week yet'
                                }
                            </p>
                        </div>
                    ) : (
                        /* Staff Table */
                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr className="text-xs text-slate-400 uppercase">
                                        <th className="px-4 py-3 text-left">Staff Member</th>
                                        <th className="px-4 py-3 text-right">Total Hours</th>
                                        <th className="px-4 py-3 text-right">Base</th>
                                        <th className="px-4 py-3 text-right">OT 1.5x</th>
                                        <th className="px-4 py-3 text-right">OT 2x</th>
                                        <th className="px-4 py-3 text-right">Per Diem</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map((staff) => (
                                        <tr
                                            key={staff.userId}
                                            className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-200">{staff.userName}</div>
                                                {staff.userEmail && (
                                                    <div className="text-xs text-slate-500">{staff.userEmail}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-200 font-mono font-semibold">
                                                {staff.summary.totalNetHours.toFixed(1)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-400 font-mono">
                                                {staff.summary.totalBaseHours.toFixed(1)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-amber-400 font-mono">
                                                {staff.summary.totalOT15x.toFixed(1)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-400 font-mono">
                                                {staff.summary.totalOT20x.toFixed(1)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-green-400 font-mono">
                                                ${staff.summary.totalPerDiem.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${staff.isLocked
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        }`}
                                                >
                                                    {staff.isLocked ? 'LOCKED' : 'DRAFT'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-700/30 border-t border-slate-600">
                                    <tr className="font-semibold">
                                        <td className="px-4 py-3 text-white">
                                            Total ({grandTotals.staffCount} staff)
                                        </td>
                                        <td className="px-4 py-3 text-right text-white font-mono">
                                            {grandTotals.totalNetHours.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-300 font-mono">
                                            {grandTotals.totalBaseHours.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-amber-400 font-mono">
                                            {grandTotals.totalOT15x.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-400 font-mono">
                                            {grandTotals.totalOT20x.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-400 font-mono">
                                            ${grandTotals.totalPerDiem.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </PageShell>
    );
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

export default AdminDashboard;
