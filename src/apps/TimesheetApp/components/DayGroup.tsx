/**
 * DayGroup Component
 * 
 * Groups timesheet entries by day with add entry functionality.
 * Displays day header with totals and allows adding new entries.
 */

import { useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { TimesheetEntry, DayOfWeek, DAYS_OF_WEEK, JobOption } from '../types';
import { EntryRow } from './EntryRow';
import { DaySummary } from './DaySummary';
import { calculateWeeklySummary, getDaySummaryFromEntries } from '../utils/calculator';

interface DayGroupProps {
    day: DayOfWeek;
    weekStart: Date;
    entries: TimesheetEntry[];
    onAddEntry: (day: DayOfWeek, initialStart?: string) => void;
    onUpdateEntry: (id: string, updates: Partial<TimesheetEntry>) => void;
    onDeleteEntry: (id: string) => void;
    jobs?: JobOption[];
    isLocked?: boolean;
}

/**
 * DayGroup - Container for a single day's entries
 * 
 * Features:
 * - Day header with running totals
 * - Add entry button
 * - List of entry rows
 */
export function DayGroup({
    day,
    weekStart,
    entries,
    onAddEntry,
    onUpdateEntry,
    onDeleteEntry,
    jobs = [],
    isLocked = false
}: DayGroupProps) {
    // Get day summary
    const daySummary = getDaySummaryFromEntries(entries);

    // Calculate day totals
    const dayTotals = calculateWeeklySummary(entries);

    // Get day index for styling weekend differently
    const dayIndex = DAYS_OF_WEEK.indexOf(day);
    const isWeekend = dayIndex >= 5; // Saturday = 5, Sunday = 6

    // Calculate the actual date for this day
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + dayIndex);
    const formattedDate = dayDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

    // Calculate total hours used (sum of hoursOnly)
    const totalHoursUsed = useMemo(() => {
        return entries.reduce((sum, entry) => sum + (entry.hoursOnly || 0), 0);
    }, [entries]);

    // Handle day summary update
    const handleDaySummaryUpdate = (summary: { dayStart: string; dayFinish: string; dayBreak: number }) => {
        // If there are entries, update them all
        if (entries.length > 0) {
            entries.forEach(entry => {
                onUpdateEntry(entry.id, {
                    dayStart: summary.dayStart,
                    dayFinish: summary.dayFinish,
                    dayBreak: summary.dayBreak,
                    entryMode: 'simplified',
                });
            });
        }
    };

    return (
        <div className={`rounded-lg border ${isWeekend
            ? 'border-amber-500/30 bg-amber-900/10'
            : 'border-slate-700 bg-slate-900'
            }`}>
            {/* Day Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${isWeekend ? 'bg-amber-900/20' : 'bg-slate-800'
                }`}>
                <div className="flex items-center gap-4">
                    <h3 className={`font-semibold ${isWeekend ? 'text-amber-300' : 'text-white'
                        }`}>
                        {day} - {formattedDate}
                    </h3>



                    {/* Day Totals */}
                    {entries.length > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                            <span className={`font-mono ${dayTotals.totalNetHours > 0 ? 'text-green-400' : 'text-slate-500'
                                }`}>
                                {dayTotals.totalNetHours.toFixed(1)}h
                            </span>
                            <span className={`font-mono ${dayTotals.totalPerDiem > 0 ? 'text-amber-400' : 'text-slate-600'
                                }`}>
                                ${dayTotals.totalPerDiem.toFixed(0)}
                            </span>
                            <span className={`font-mono ${dayTotals.totalChargeableHours > 0 ? 'text-cyan-400' : 'text-slate-600'
                                }`}>
                                {dayTotals.totalChargeableHours.toFixed(1)}h chargeable
                            </span>
                        </div>
                    )}
                </div>

                {/* Add Entry Button */}
                {!isLocked && (
                    <button
                        type="button"
                        onClick={() => {
                            const defaultStart = isWeekend ? '' : '08:00';
                            const startToPass = daySummary?.dayStart || defaultStart;
                            onAddEntry(day, startToPass);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Entry
                    </button>
                )}
            </div>

            {/* Day Summary (Simplified Mode) */}
            <div className="px-4 pb-2">
                <DaySummary
                    dayStart={daySummary?.dayStart}
                    dayFinish={daySummary?.dayFinish}
                    dayBreak={daySummary?.dayBreak}
                    totalHoursUsed={totalHoursUsed}
                    onUpdate={handleDaySummaryUpdate}
                    isLocked={isLocked}
                    isWeekend={isWeekend}
                />
            </div>

            {/* Entries Table */}
            {entries.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-700">
                            <tr className="text-xs text-slate-400 uppercase">
                                <th className="px-3 py-2 text-left">Start</th>
                                <th className="px-3 py-2 text-left">Finish</th>
                                <th className="px-3 py-2 text-center">Duration</th>
                                <th className="px-3 py-2 text-left">Break</th>
                                <th className="px-3 py-2 text-left">Activity</th>
                                <th className="px-3 py-2 text-left">Job #</th>
                                <th className="px-3 py-2 text-center">Nightshift</th>
                                <th className="px-3 py-2 text-center">Per Diem</th>
                                <th className="px-3 py-2 text-center">Hours</th>
                                <th className="px-3 py-2 text-center">Allowance</th>
                                <th className="px-3 py-2 text-center">Notes</th>
                                <th className="px-3 py-2 text-center">Valid</th>
                                <th className="px-3 py-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => (
                                <EntryRow
                                    key={entry.id}
                                    entry={entry}
                                    allDayEntries={entries}
                                    entryIndex={index}
                                    isSimplifiedMode={true}
                                    onUpdate={onUpdateEntry}
                                    onDelete={onDeleteEntry}
                                    jobs={jobs}
                                    isLocked={isLocked}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                    No entries for {day}. Click "Add Entry" to get started.
                </div>
            )}
        </div>
    );
}
