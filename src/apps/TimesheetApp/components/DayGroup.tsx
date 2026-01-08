/**
 * DayGroup Component
 * 
 * Groups timesheet entries by day with add entry functionality.
 * Displays day header with totals and allows adding new entries.
 */

import { useMemo } from 'react';
import { PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
    isCollapsed: boolean;
    onToggleCollapse: () => void;
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
    isLocked = false,
    isCollapsed,
    onToggleCollapse
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

    // Calculate overflow hours
    const overflowHours = useMemo(() => {
        if (!daySummary?.dayStart || !daySummary?.dayFinish) return 0;

        const [startH, startM] = daySummary.dayStart.split(':').map(Number);
        const [finishH, finishM] = daySummary.dayFinish.split(':').map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(finishH) || isNaN(finishM)) return 0;

        let availableHours = (finishH + finishM / 60) - (startH + startM / 60);
        if (availableHours < 0) availableHours += 24;
        availableHours -= daySummary.dayBreak || 0;

        const overflow = totalHoursUsed - availableHours;
        return overflow > 0 ? overflow : 0;
    }, [daySummary, totalHoursUsed]);

    // Calculate available and remaining hours for minimized view
    const availableHours = useMemo(() => {
        if (!daySummary?.dayStart || !daySummary?.dayFinish) return 0;

        const [startH, startM] = daySummary.dayStart.split(':').map(Number);
        const [finishH, finishM] = daySummary.dayFinish.split(':').map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(finishH) || isNaN(finishM)) return 0;

        let hours = (finishH + finishM / 60) - (startH + startM / 60);
        if (hours < 0) hours += 24;
        hours -= daySummary.dayBreak || 0;

        return hours;
    }, [daySummary]);

    const remainingHours = useMemo(() => {
        return availableHours - totalHoursUsed;
    }, [availableHours, totalHoursUsed]);

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
                    {/* Collapse/Expand Button */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label={isCollapsed ? 'Expand day' : 'Collapse day'}
                    >
                        {isCollapsed ? (
                            <ChevronDown className="w-5 h-5" />
                        ) : (
                            <ChevronUp className="w-5 h-5" />
                        )}
                    </button>

                    <h3 className={`font-semibold w-56 flex-none ${isWeekend ? 'text-amber-300' : 'text-white'
                        }`}>
                        {day} - {formattedDate}
                    </h3>



                    {/* Day Totals */}
                    {entries.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`font-mono w-12 text-right ${dayTotals.totalNetHours > 0 ? 'text-green-400' : 'text-slate-500'
                                }`}>
                                {dayTotals.totalNetHours.toFixed(1)}h
                            </span>
                            <span className={`font-mono w-10 text-right ${dayTotals.totalPerDiem > 0 ? 'text-amber-400' : 'text-slate-600'
                                }`}>
                                ${dayTotals.totalPerDiem.toFixed(0)}
                            </span>
                            <span className={`font-mono w-32 text-right ${dayTotals.totalChargeableHours > 0 ? 'text-cyan-400' : 'text-slate-600'
                                }`}>
                                {dayTotals.totalChargeableHours.toFixed(1)}h chargeable
                            </span>
                            {overflowHours > 0 && (
                                <span className="font-mono text-red-400 font-semibold ml-2">
                                    ({overflowHours.toFixed(1)}h over)
                                </span>
                            )}
                        </div>
                    )}

                    {/* Available/Remaining Hours (shown when collapsed) */}
                    {isCollapsed && daySummary && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono w-32 text-right text-cyan-400">
                                {availableHours.toFixed(2)}h available
                            </span>
                            <span className={`font-mono w-32 text-right ${remainingHours >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {remainingHours.toFixed(2)}h remaining
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

            {/* Day Summary and Entries - Only shown when expanded */}
            {!isCollapsed && (
                <>
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
                                        <th className="px-3 py-2 text-center">PH</th>
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
                </>
            )}
        </div>
    );
}
