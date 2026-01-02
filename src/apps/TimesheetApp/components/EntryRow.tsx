/**
 * EntryRow Component
 * 
 * Individual timesheet entry row with inline editing capabilities.
 * Displays real-time calculations and validation status.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Trash2, Moon, Bed, AlertCircle, StickyNote } from 'lucide-react';
import type { TimesheetEntry, ActivityType, DayOfWeek, JobOption } from '../types';
import { ACTIVITY_TYPES, DAYS_OF_WEEK } from '../types';
import { calculateEntry, hasTimeConflict, calculateSimplifiedEntryTimes, getDaySummaryFromEntries, parseTimeToMinutes, formatMinutesToTime } from '../utils/calculator';
import { JobSelect } from './JobSelect';

interface EntryRowProps {
    entry: TimesheetEntry;
    allDayEntries?: TimesheetEntry[];
    entryIndex?: number;
    isSimplifiedMode?: boolean;
    onUpdate: (id: string, updates: Partial<TimesheetEntry>) => void;
    onDelete: (id: string) => void;
    showDayColumn?: boolean;
    jobs?: JobOption[];
    isLocked?: boolean;
}

/**
 * EntryRow - Editable row for a single timesheet entry
 * 
 * Features:
 * - Inline editing for all fields
 * - Real-time calculation display
 * - Visual validation (red border on errors)
 * - Delete with confirmation
 * - Activity-aware break defaults
 * - Expandable notes section
 */
export function EntryRow({
    entry,
    allDayEntries = [],
    entryIndex = 0,
    isSimplifiedMode = false,
    onUpdate,
    onDelete,
    showDayColumn = false,
    jobs = [],
    isLocked = false
}: EntryRowProps) {
    const calculations = calculateEntry(entry);
    const [showNotes, setShowNotes] = useState(!!entry.notes);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Check for time conflicts with other entries on the same day
    const otherEntries = allDayEntries.filter(e => e.id !== entry.id);
    const hasConflict = hasTimeConflict(entry, otherEntries);

    // Get day summary for simplified mode
    const daySummary = getDaySummaryFromEntries(allDayEntries);

    // Calculate auto-times for simplified mode
    const autoCalculatedTimes = isSimplifiedMode && daySummary
        ? calculateSimplifiedEntryTimes(daySummary.dayStart, allDayEntries, entryIndex)
        : null;

    // Fallback: Calculate finish time from start + duration even without day summary
    const calculatedFinishTime = useMemo(() => {
        if (!entry.startTime || !entry.hoursOnly) return null;

        const startMinutes = parseTimeToMinutes(entry.startTime);
        if (isNaN(startMinutes)) return null;

        const durationMinutes = entry.hoursOnly * 60;
        const finishMinutes = startMinutes + durationMinutes;

        return formatMinutesToTime(finishMinutes);
    }, [entry.startTime, entry.hoursOnly]);

    // Sync auto-calculated times to entry
    useEffect(() => {
        if (autoCalculatedTimes) {
            const hasChanged =
                entry.startTime !== autoCalculatedTimes.startTime ||
                entry.finishTime !== autoCalculatedTimes.finishTime;

            if (hasChanged) {
                onUpdate(entry.id, {
                    startTime: autoCalculatedTimes.startTime,
                    finishTime: autoCalculatedTimes.finishTime
                });
            }
        } else if (calculatedFinishTime && entry.finishTime !== calculatedFinishTime) {
            // Fallback: Update finish time based on simple calculation
            onUpdate(entry.id, {
                finishTime: calculatedFinishTime
            });
        }
    }, [autoCalculatedTimes, calculatedFinishTime, entry.startTime, entry.finishTime, onUpdate, entry.id]);

    // Auto-resize textarea when content changes
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [entry.notes, showNotes]);

    // Handle field updates
    const handleChange = (field: keyof TimesheetEntry, value: string | number | boolean) => {
        const updates: Partial<TimesheetEntry> = { [field]: value };
        onUpdate(entry.id, updates);
    };



    // Handle delete with confirmation
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            onDelete(entry.id);
        }
    };

    // Toggle notes visibility
    const toggleNotes = () => {
        setShowNotes(!showNotes);
    };

    // Base input class for consistent styling - adapted for dark theme
    const inputBaseClass = `
        w-full px-2 py-1.5 rounded-md border text-sm
        bg-slate-800 text-slate-100
        focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
        transition-colors
    `;

    // Error state styling - show red border for validation errors OR time conflicts
    const errorClass = (calculations.hasValidationError || hasConflict)
        ? 'border-red-500'
        : 'border-slate-600';

    // Count columns for notes row colspan
    const columnCount = showDayColumn ? 12 : 11;

    return (
        <>
            <tr className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                {/* Day Column (optional) */}
                {showDayColumn && (
                    <td className="px-3 py-2">
                        <select
                            value={entry.day}
                            disabled={isLocked}
                            onChange={(e) => handleChange('day', e.target.value as DayOfWeek)}
                            className={`${inputBaseClass} ${errorClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {DAYS_OF_WEEK.map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </td>
                )}

                {/* Start Time (Read Only) */}
                <td className="px-3 py-2">
                    <div className="text-sm font-mono text-slate-300">
                        {autoCalculatedTimes?.startTime || entry.startTime || '-'}
                    </div>
                </td>

                {/* Finish Time (Read Only) */}
                <td className="px-3 py-2">
                    <div className="text-sm font-mono text-slate-300">
                        {autoCalculatedTimes?.finishTime || entry.finishTime || '-'}
                    </div>
                </td>

                {/* Duration / Hours (Input) */}
                <td className="px-3 py-2">
                    <input
                        type="number"
                        value={entry.hoursOnly || 0}
                        disabled={isLocked}
                        onChange={(e) => {
                            const hours = parseFloat(e.target.value) || 0;
                            // Update hours first
                            const updates: Partial<TimesheetEntry> = { hoursOnly: hours };

                            // If we have valid Calculation context, try to predict the times
                            // Note: The real calculation happens on the next render or via parent update
                            // checking autoCalculatedTimes here uses OLD props, but we can try to anticipate
                            /* 
                               Ideally, we just update 'hoursOnly' and the parent/effect handles the rest.
                               However, to ensure 'startTime' and 'finishTime' are saved to the DB,
                               we need to calculate them. 
                               But we can't easily do it here without the FULL day context updating first.
                               
                               Solution: We'll rely on DayGroup's handleDaySummaryUpdate or a useEffect 
                               in DayGroup to recalculate all entries when one changes? 
                               
                               Actually, let's trust the 'autoCalculatedTimes' derived from PROPS on the NEXT render?
                               No, we need to save to DB.
                               
                               Let's just save hoursOnly for now, and let a useEffect in EntryRow 
                               update start/finish if they change?
                            */
                            onUpdate(entry.id, updates);
                        }}
                        min="0"
                        max="24"
                        step="0.5"
                        className={`${inputBaseClass} ${errorClass} w-20 text-cyan-400 font-bold ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Hours"
                        placeholder="0"
                    />
                </td>

                {/* Break Duration */}
                <td className="px-3 py-2">
                    <input
                        type="number"
                        value={entry.breakDuration}
                        disabled={isLocked}
                        onChange={(e) => handleChange('breakDuration', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="4"
                        step="0.25"
                        className={`${inputBaseClass} ${errorClass} w-16 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Break duration in hours"
                    />
                </td>

                {/* Activity Type */}
                <td className="px-3 py-2">
                    <select
                        value={entry.activity}
                        disabled={isLocked}
                        onChange={(e) => handleChange('activity', e.target.value as ActivityType)}
                        className={`${inputBaseClass} ${errorClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {ACTIVITY_TYPES.map(activity => (
                            <option key={activity} value={activity}>{activity}</option>
                        ))}
                    </select>
                </td>

                {/* Job Number - Premium Select */}
                <td className="px-3 py-2">
                    {jobs.length > 0 ? (
                        <JobSelect
                            jobs={jobs}
                            value={entry.jobNo}
                            disabled={isLocked}
                            onChange={(val) => handleChange('jobNo', val)}
                            placeholder="Select job..."
                            error={calculations.hasValidationError}
                        />
                    ) : (
                        <input
                            type="text"
                            value={entry.jobNo}
                            disabled={isLocked}
                            onChange={(e) => handleChange('jobNo', e.target.value)}
                            placeholder="Job #"
                            className={`${inputBaseClass} ${errorClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Job number"
                        />
                    )}
                </td>

                {/* Nightshift Toggle */}
                <td className="px-3 py-2 text-center">
                    <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => handleChange('isNightshift', !entry.isNightshift)}
                        className={`w-8 h-8 rounded-lg transition-colors flex items-center justify-center ${entry.isNightshift
                            ? 'bg-indigo-900 text-indigo-300'
                            : 'bg-slate-700 text-slate-500'
                            } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Toggle nightshift"
                        title="Nightshift"
                    >
                        <Moon className="w-4 h-4" />
                    </button>
                </td>

                {/* Per Diem Selection (None, Half, Full) */}
                <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                        {/* Half Per Diem ($42.50) */}
                        <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                                const newType = entry.perDiemType === 'half' ? 'none' : 'half';
                                onUpdate(entry.id, { perDiemType: newType, isOvernight: false });
                            }}
                            className={`w-8 h-8 rounded-lg transition-colors flex items-center justify-center ${entry.perDiemType === 'half'
                                ? 'bg-amber-900 text-amber-300'
                                : 'bg-slate-700 text-slate-500'
                                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Half per diem"
                            title="Manual Half Per Diem ($42.50)"
                        >
                            <span className="text-sm font-bold">½</span>
                        </button>

                        {/* Full Per Diem ($85.00) */}
                        <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                                const newType = entry.perDiemType === 'full' ? 'none' : 'full';
                                onUpdate(entry.id, {
                                    perDiemType: newType,
                                    isOvernight: newType === 'full'
                                });
                            }}
                            className={`w-8 h-8 rounded-lg transition-colors flex items-center justify-center ${entry.perDiemType === 'full' || (entry.isOvernight && !entry.perDiemType)
                                ? 'bg-amber-900 text-amber-300'
                                : 'bg-slate-700 text-slate-500'
                                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Toggle full per diem"
                            title="Overnight / Full Per Diem ($85.00)"
                        >
                            <Bed className="w-4 h-4" />
                        </button>
                    </div>
                </td>

                {/* Calculated: Net Hours */}
                <td className="px-3 py-2 text-center">
                    <span className={`font-mono font-semibold ${calculations.netHours > 0
                        ? 'text-green-400'
                        : 'text-slate-500'
                        }`}>
                        {calculations.netHours.toFixed(2)}h
                    </span>
                </td>

                {/* Calculated: Per Diem */}
                <td className="px-3 py-2 text-center">
                    {calculations.perDiem > 0 ? (
                        <span className="font-mono text-amber-400">
                            ${calculations.perDiem.toFixed(2)}
                        </span>
                    ) : (
                        <span className="text-slate-500">—</span>
                    )}
                </td>

                {/* Notes Toggle Button */}
                <td className="px-3 py-2 text-center">
                    <button
                        type="button"
                        onClick={toggleNotes}
                        disabled={isLocked && !entry.notes}
                        className={`w-8 h-8 rounded-lg transition-colors flex items-center justify-center ${entry.notes
                            ? 'bg-cyan-900 text-cyan-300'
                            : showNotes
                                ? 'bg-slate-600 text-slate-300'
                                : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                            } ${isLocked && !entry.notes ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Toggle notes"
                        title={entry.notes ? 'View/Edit notes' : 'Add notes'}
                    >
                        <StickyNote className="w-4 h-4" />
                    </button>
                </td>

                {/* Validation Error Indicator */}
                <td className="px-3 py-2 text-center">
                    {calculations.hasValidationError && (
                        <div className="flex items-center justify-center" title={calculations.validationMessage}>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                    )}
                </td>

                {/* Delete Button */}
                <td className="px-3 py-2 text-center">
                    {!isLocked && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                            aria-label="Delete entry"
                            title="Delete entry"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </td>
            </tr>

            {/* Expandable Notes Row */}
            {showNotes && (
                <tr className="bg-slate-800/30 border-b border-slate-700">
                    <td colSpan={columnCount} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                            <StickyNote className="w-4 h-4 text-cyan-400 mt-2 flex-shrink-0" />
                            <textarea
                                ref={textareaRef}
                                value={entry.notes || ''}
                                disabled={isLocked}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Add notes for this entry..."
                                rows={1}
                                className={`
                                    flex-1 px-3 py-2 rounded-lg border text-sm resize-none overflow-hidden
                                    bg-slate-800 text-slate-100 border-slate-600
                                    focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
                                    placeholder:text-slate-500
                                    ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                style={{ minHeight: '38px' }}
                                aria-label="Entry notes"
                            />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
