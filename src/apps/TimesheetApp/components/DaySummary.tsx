/**
 * DaySummary Component
 * 
 * Displays day-level summary with inline-editable start/finish/break times.
 * Shows available hours and remaining hours as user adds entries.
 */

import { useState, useEffect } from 'react';

interface DaySummaryProps {
    dayStart?: string;
    dayFinish?: string;
    dayBreak?: number;
    totalHoursUsed: number;
    onUpdate: (summary: { dayStart: string; dayFinish: string; dayBreak: number }) => void;
    isLocked?: boolean;
    isWeekend?: boolean;
}

export function DaySummary({
    dayStart,
    dayFinish,
    dayBreak = 0.5,
    totalHoursUsed,
    onUpdate,
    isLocked = false,
    isWeekend = false
}: DaySummaryProps) {
    // Default times: Weekdays 08:00-16:00, Weekends empty (manual)
    const defaultStart = isWeekend ? '' : '08:00';
    const defaultFinish = isWeekend ? '' : '16:00';

    const [localStart, setLocalStart] = useState(dayStart || defaultStart);
    const [localFinish, setLocalFinish] = useState(dayFinish || defaultFinish);
    const [localBreak, setLocalBreak] = useState(dayBreak);

    // Sync local state with props when they change (e.g. week change or external update)
    useEffect(() => {
        if (dayStart !== undefined) setLocalStart(dayStart);
    }, [dayStart]);

    useEffect(() => {
        if (dayFinish !== undefined) setLocalFinish(dayFinish);
    }, [dayFinish]);

    useEffect(() => {
        if (dayBreak !== undefined) setLocalBreak(dayBreak);
    }, [dayBreak]);

    // Calculate total available hours
    const calculateAvailableHours = (start: string, finish: string, breakHours: number): number => {
        // Return 0 if start or finish are empty (e.g., weekends not yet configured)
        if (!start || !finish) return 0;

        const [startH, startM] = start.split(':').map(Number);
        const [finishH, finishM] = finish.split(':').map(Number);

        // Check for NaN values
        if (isNaN(startH) || isNaN(startM) || isNaN(finishH) || isNaN(finishM)) return 0;

        let hours = (finishH + finishM / 60) - (startH + startM / 60);
        if (hours < 0) hours += 24; // Handle overnight

        return Math.max(0, hours - breakHours);
    };

    const availableHours = calculateAvailableHours(localStart, localFinish, localBreak);
    const remainingHours = Math.max(0, availableHours - totalHoursUsed);
    const hasOverflow = totalHoursUsed > availableHours && availableHours > 0;

    const handleUpdate = (field: 'dayStart' | 'dayFinish' | 'dayBreak', value: string | number) => {
        const updates = {
            dayStart: field === 'dayStart' ? value as string : localStart,
            dayFinish: field === 'dayFinish' ? value as string : localFinish,
            dayBreak: field === 'dayBreak' ? value as number : localBreak,
        };

        if (field === 'dayStart') setLocalStart(value as string);
        if (field === 'dayFinish') setLocalFinish(value as string);
        if (field === 'dayBreak') setLocalBreak(value as number);

        onUpdate(updates);
    };

    const inputClass = `
        px-2 py-1 rounded border bg-slate-800 text-slate-100 text-sm
        focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500
        border-slate-600
    `;

    const finishInputClass = `
        px-2 py-1 rounded border bg-slate-800 text-slate-100 text-sm
        focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500
        ${hasOverflow ? 'border-red-500 bg-red-500/10' : 'border-slate-600'}
    `;

    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-5 gap-3 items-center">
                {/* Start Time */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Start</label>
                    <input
                        type="time"
                        value={localStart}
                        onChange={(e) => handleUpdate('dayStart', e.target.value)}
                        disabled={isLocked}
                        className={`${inputClass} w-full ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                </div>

                {/* Finish Time */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Finish</label>
                    <input
                        type="time"
                        value={localFinish}
                        onChange={(e) => handleUpdate('dayFinish', e.target.value)}
                        disabled={isLocked}
                        className={`${finishInputClass} w-full ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                </div>

                {/* Break */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Break (h)</label>
                    <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="4"
                        value={localBreak}
                        onChange={(e) => handleUpdate('dayBreak', parseFloat(e.target.value) || 0)}
                        disabled={isLocked}
                        className={`${inputClass} w-full ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                </div>

                {/* Available Hours */}
                <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Available</div>
                    <div className="font-mono text-cyan-400 font-semibold">{availableHours.toFixed(2)}h</div>
                </div>

                {/* Remaining Hours */}
                <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Remaining</div>
                    <div className={`font-mono font-semibold ${remainingHours < 0 ? 'text-red-400' : remainingHours === 0 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {remainingHours.toFixed(2)}h
                    </div>
                </div>
            </div>
        </div>
    );
}
