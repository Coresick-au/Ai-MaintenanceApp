/**
 * WeekPicker Component
 * 
 * Navigation controls for selecting different weeks.
 * Displays ISO week number and date range.
 */

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getWeekStart, getWeekEnd, formatDateRange, navigateWeek, getISOWeekNumber, getISOWeekYear } from '../utils/weekUtils';

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
 */
export function WeekPicker({ currentWeekStart, onWeekChange, disabled = false }: WeekPickerProps) {
    const weekEnd = getWeekEnd(currentWeekStart);
    const weekNumber = getISOWeekNumber(currentWeekStart);
    const weekYear = getISOWeekYear(currentWeekStart);
    const dateRange = formatDateRange(currentWeekStart, weekEnd);

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

    return (
        <div className="flex items-center justify-between bg-slate-800 rounded-lg border border-slate-700 p-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
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

            {/* Week Display */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <span className="text-lg font-semibold text-white">
                        Week {weekNumber}, {weekYear}
                    </span>
                </div>
                <span className="text-slate-400">
                    {dateRange}
                </span>
            </div>

            {/* Current Week Indicator */}
            {isCurrentWeek() && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Current Week
                </span>
            )}
        </div>
    );
}
