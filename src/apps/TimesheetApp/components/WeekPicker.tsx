/**
 * WeekPicker Component
 * 
 * Navigation controls for selecting different weeks.
 * Displays ISO week number and date range.
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Search, X } from 'lucide-react';
import { getWeekStart, getWeekEnd, formatDateRange, navigateWeek, getISOWeekNumber, getISOWeekYear, getFirstDayOfISOWeek } from '../utils/weekUtils';

interface WeekPickerProps {
    currentWeekStart: Date;
    onWeekChange: (newWeekStart: Date) => void;
    disabled?: boolean;
}

/**
 * WeekPicker - Week navigation component
 * 
 * Features:
 * - Previous/Next week buttons
 * - Current week indicator
 * - ISO week number display
 * - Date range display
 * - Click week to jump to specific week/year
 */
export function WeekPicker({ currentWeekStart, onWeekChange, disabled = false }: WeekPickerProps) {
    const weekEnd = getWeekEnd(currentWeekStart);
    const weekNumber = getISOWeekNumber(currentWeekStart);
    const weekYear = getISOWeekYear(currentWeekStart);
    const dateRange = formatDateRange(currentWeekStart, weekEnd);

    // Week jump popup state
    const [showJumpPopup, setShowJumpPopup] = useState(false);
    const [jumpYear, setJumpYear] = useState(weekYear);
    const [jumpWeek, setJumpWeek] = useState(weekNumber);

    // Check if this is the current week
    const isCurrentWeek = () => {
        const today = new Date();
        const todayWeekStart = getWeekStart(today);
        return currentWeekStart.getTime() === todayWeekStart.getTime();
    };

    const handlePrev = () => {
        onWeekChange(navigateWeek(currentWeekStart, 'prev'));
    };

    const handleNext = () => {
        onWeekChange(navigateWeek(currentWeekStart, 'next'));
    };

    const handleToday = () => {
        onWeekChange(getWeekStart(new Date()));
    };

    const handleJumpToWeek = () => {
        if (jumpWeek >= 1 && jumpWeek <= 53 && jumpYear >= 2020 && jumpYear <= 2100) {
            const targetMonday = getFirstDayOfISOWeek(jumpYear, jumpWeek);
            onWeekChange(targetMonday);
            setShowJumpPopup(false);
        }
    };

    const openJumpPopup = () => {
        setJumpYear(weekYear);
        setJumpWeek(weekNumber);
        setShowJumpPopup(true);
    };

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-800 rounded-lg border border-slate-700 p-4 relative">
            {/* Navigation (Left) */}
            <div className="flex items-center gap-2 justify-start">
                <button
                    type="button"
                    onClick={handlePrev}
                    disabled={disabled}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous week"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                    type="button"
                    onClick={handleNext}
                    disabled={disabled}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next week"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                {!isCurrentWeek() && (
                    <button
                        type="button"
                        onClick={handleToday}
                        disabled={disabled}
                        className="ml-2 px-3 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Today
                    </button>
                )}
            </div>

            {/* Week Display (Center) - Clickable to open jump popup */}
            <button
                type="button"
                onClick={openJumpPopup}
                disabled={disabled}
                className="flex items-center gap-4 justify-center px-4 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
                title="Click to jump to a specific week"
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <span className="text-lg font-semibold text-white">
                        Week {weekNumber}, {weekYear}
                    </span>
                    <Search className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <span className="text-slate-400">
                    {dateRange}
                </span>
            </button>

            {/* Current Week Indicator (Right) */}
            <div className="flex items-center justify-end">
                {isCurrentWeek() && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        Current Week
                    </span>
                )}
            </div>

            {/* Week Jump Popup */}
            {showJumpPopup && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 min-w-[280px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white">Jump to Week</h3>
                        <button
                            type="button"
                            onClick={() => setShowJumpPopup(false)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Year</label>
                            <input
                                type="number"
                                value={jumpYear}
                                onChange={(e) => setJumpYear(parseInt(e.target.value) || weekYear)}
                                min={2020}
                                max={2100}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Week</label>
                            <input
                                type="number"
                                value={jumpWeek}
                                onChange={(e) => setJumpWeek(parseInt(e.target.value) || 1)}
                                min={1}
                                max={53}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div className="pt-5">
                            <button
                                type="button"
                                onClick={handleJumpToWeek}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Go
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
