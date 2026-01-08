/**
 * TimesheetApp - Main Timesheet Application
 * 
 * Orchestrates the timesheet functionality with Firebase integration.
 * Handles data loading, saving, and state management.
 * 
 * FIREBASE ADAPTATION: Uses userId and weekKey for multi-user, week-based storage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import { timesheetRepository } from '../../repositories';
// @ts-ignore
import { PageShell, NeonButton } from '../../components/ui/NeonUI';
import { FileDown, BarChart3, Send, RefreshCw, CheckCircle, Lock, Unlock, AlertCircle, Minimize2, Maximize2 } from 'lucide-react';

// Components
import { WeekPicker } from './components/WeekPicker';
import { Summary } from './components/Summary';
import { DayGroup } from './components/DayGroup';
import { YearlySummaryModal } from './components/YearlySummary';

// Types and Utils
import { TimesheetEntry, DayOfWeek, DAYS_OF_WEEK, WeeklySummary, JobOption } from './types';
import { calculateWeeklySummary, hasTimeConflict, validateEntry } from './utils/calculator';
import { getWeekStart, getWeekKey, getWeekEnd } from './utils/weekUtils';

// PDF Export
import { pdf } from '@react-pdf/renderer';
import { TimesheetPDF } from './components/TimesheetPDF';

/**
 * Creates a new empty entry for a given day with default times
 * DEFAULT: 08:00 to 16:00 with 0.5h break (standard 7.5h day)
 */
function createNewEntry(day: DayOfWeek, userId: string, weekKey: string): TimesheetEntry {
    return {
        id: crypto.randomUUID(),
        userId,
        weekKey,
        day,
        date: '', // Will be calculated based on weekKey and day
        startTime: '08:00', // Will be overwritten
        finishTime: '', // Empty until duration added
        breakDuration: 0, // No auto-break
        activity: 'Site',
        jobNo: '',
        isNightshift: false,
        isPublicHoliday: false,
        isOvernight: false,
        notes: '',
        status: 'draft',
        entryMode: 'simplified',
        hoursOnly: 0,
    };
}

interface TimesheetAppProps {
    onBack?: () => void;
}

/**
 * TimesheetApp - Main component
 */
export function TimesheetApp({ onBack }: TimesheetAppProps) {
    const { currentUser, userData } = useAuth();

    // State
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [showYearlySummary, setShowYearlySummary] = useState(false);

    // Collapse state for days (persisted to localStorage)
    const COLLAPSED_STORAGE_KEY = 'timesheet:collapsedDays';
    const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    // Load jobs from Job Sheet storage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("ai-maintenanceapp:jobsheet:v1");
            if (raw) {
                const allJobs = JSON.parse(raw);
                const validStatuses = ["Ready for Invoicing", "PO Received", "Job in Progress", "Parts Required", "Job Completed"];
                const filtered = allJobs
                    .filter((j: any) => validStatuses.includes(j.status))
                    .map((j: any) => ({
                        jobNumber: j.jobNumber,
                        customer: j.customer,
                        description: j.jobDescription,
                        status: j.status
                    }))
                    .sort((a: any, b: any) => b.jobNumber.localeCompare(a.jobNumber)); // Sort by job# desc
                setJobs(filtered);
            }
        } catch (e) {
            console.error("Failed to load jobs from storage", e);
        }
    }, []);

    // Derived values
    const userId = currentUser?.uid || '';
    const weekKey = getWeekKey(currentWeekStart);

    // Initialize collapse state when entries loaded
    useEffect(() => {
        if (!isLoading) {
            setCollapsedDays(prev => {
                // Determine new state based on current entries
                // Preserve existing state for other weeks/days
                const newState = { ...prev };
                DAYS_OF_WEEK.forEach(day => {
                    const key = `${weekKey}_${day}`;
                    // Only initialize if not already set (preserve user interactions)
                    if (newState[key] === undefined) {
                        const hasEntries = entries.some(e => e.day === day);
                        // Default: Collapsed if no entries, Expanded if entries exist
                        newState[key] = !hasEntries;
                    }
                });
                return newState;
            });
        }
    }, [isLoading, weekKey, entries]); // Added 'entries' to ensure re-initialization when entries load

    // Actions
    const handleToggleDay = (day: string) => {
        const key = `${weekKey}_${day}`;
        setCollapsedDays(prev => {
            const newState = {
                ...prev,
                [key]: !prev[key]
            };
            // Persist to localStorage
            try {
                localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(newState));
            } catch (e) {
                console.warn('Failed to save collapsed state:', e);
            }
            return newState;
        });
    };

    const handleCollapseAll = () => {
        setCollapsedDays(prev => {
            const newState = { ...prev };
            DAYS_OF_WEEK.forEach(day => {
                newState[`${weekKey}_${day}`] = true;
            });
            // Persist to localStorage
            try {
                localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(newState));
            } catch (e) {
                console.warn('Failed to save collapsed state:', e);
            }
            return newState;
        });
    };

    const handleExpandAll = () => {
        setCollapsedDays(prev => {
            const newState = { ...prev };
            DAYS_OF_WEEK.forEach(day => {
                newState[`${weekKey}_${day}`] = false;
            });
            // Persist to localStorage
            try {
                localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(newState));
            } catch (e) {
                console.warn('Failed to save collapsed state:', e);
            }
            return newState;
        });
    };

    const summary: WeeklySummary = useMemo(() => calculateWeeklySummary(entries), [entries]);

    // ... (rest of logic)

    // Check for validation errors or time conflicts
    const hasErrors = useMemo(() => {
        // Group entries by day for conflict detection
        const entriesByDayForValidation: Record<string, TimesheetEntry[]> = {};
        for (const entry of entries) {
            if (!entriesByDayForValidation[entry.day]) {
                entriesByDayForValidation[entry.day] = [];
            }
            entriesByDayForValidation[entry.day].push(entry);
        }

        // Check each entry for validation errors or conflicts
        for (const entry of entries) {
            // Check for validation errors
            const validationError = validateEntry(entry);
            if (validationError) {
                return true;
            }

            // Check for time conflicts
            const otherEntriesOnDay = entriesByDayForValidation[entry.day].filter(e => e.id !== entry.id);
            if (hasTimeConflict(entry, otherEntriesOnDay)) {
                return true;
            }
        }

        return false;
    }, [entries]);

    // Group entries by day
    const entriesByDay = useMemo(() => {
        const grouped: Record<DayOfWeek, TimesheetEntry[]> = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: [],
        };

        entries.forEach(entry => {
            if (grouped[entry.day]) {
                grouped[entry.day].push(entry);
            }
        });

        return grouped;
    }, [entries]);

    // Load entries for current week
    const loadEntries = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await timesheetRepository.getByUserAndWeek(userId, weekKey);
            setEntries(data as TimesheetEntry[]);
        } catch (err) {
            console.error('Error loading timesheet entries:', err);
            setError('Failed to load timesheet entries');
        } finally {
            setIsLoading(false);
        }
    }, [userId, weekKey]);

    // Load on mount and week change
    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    // Add a new entry
    const handleAddEntry = useCallback(async (
        day: DayOfWeek,
        initialStartTime?: string,
        daySummaryValues?: { dayStart: string; dayFinish: string; dayBreak: number }
    ) => {
        if (!userId) return;

        // Auto-expand the day when adding an entry
        const key = `${weekKey}_${day}`;
        setCollapsedDays(prev => ({
            ...prev,
            [key]: false
        }));

        // Find existing entries for this day to determine start time
        const dayEntries = entries.filter(e => e.day === day);
        let startTime = initialStartTime || '08:00';

        if (dayEntries.length > 0) {
            // Sort by finish time to find the latest entry
            const sortedEntries = [...dayEntries].sort((a, b) => {
                const timeA = (a.finishTime || '00:00').split(':').map(Number);
                const timeB = (b.finishTime || '00:00').split(':').map(Number);
                const minutesA = (timeA[0] || 0) * 60 + (timeA[1] || 0);
                const minutesB = (timeB[0] || 0) * 60 + (timeB[1] || 0);
                return minutesB - minutesA; // Descending order
            });

            // Use the finish time of the latest entry as the start time for the new entry
            startTime = sortedEntries[0]?.finishTime || sortedEntries[0]?.startTime || '08:00';
        }

        const newEntry = createNewEntry(day, userId, weekKey);
        newEntry.startTime = startTime;

        // Propagate day summary info - prioritize passed daySummaryValues to preserve user input
        if (daySummaryValues) {
            // Use the values passed from DayGroup's local state (user input)
            newEntry.dayStart = daySummaryValues.dayStart || startTime || '08:00';
            newEntry.dayFinish = daySummaryValues.dayFinish || '16:00';
            newEntry.dayBreak = daySummaryValues.dayBreak ?? 0.5;
        } else if (dayEntries.length > 0) {
            // Copy from existing entries, with fallbacks for undefined values
            newEntry.dayStart = dayEntries[0].dayStart || startTime || '08:00';
            newEntry.dayFinish = dayEntries[0].dayFinish || '16:00';
            newEntry.dayBreak = dayEntries[0].dayBreak ?? 0.5;
        } else {
            // First entry without daySummaryValues: set day summary defaults
            newEntry.dayStart = initialStartTime || startTime || '08:00';
            newEntry.dayFinish = '16:00'; // Default 8-hour day
            newEntry.dayBreak = 0.5; // Default break for day summary
        }

        // Optimistic update
        setEntries(prev => [...prev, newEntry]);

        try {
            await timesheetRepository.save(newEntry);
        } catch (err) {
            console.error('Error adding entry:', err);
            setError('Failed to add entry');
            // Rollback
            setEntries(prev => prev.filter(e => e.id !== newEntry.id));
        }
    }, [userId, weekKey, entries]);

    // Update an entry
    const handleUpdateEntry = useCallback(async (id: string, updates: Partial<TimesheetEntry>) => {
        // Optimistic update
        setEntries(prev => prev.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
        ));

        try {
            const entry = entries.find(e => e.id === id);
            if (entry) {
                await timesheetRepository.save({ ...entry, ...updates });
            }
        } catch (err) {
            console.error('Error updating entry:', err);
            setError('Failed to update entry');
            // Reload to get correct state
            loadEntries();
        }
    }, [entries, loadEntries]);

    // Delete an entry
    const handleDeleteEntry = useCallback(async (id: string) => {
        const entryToDelete = entries.find(e => e.id === id);

        // Optimistic update
        setEntries(prev => prev.filter(e => e.id !== id));

        try {
            await timesheetRepository.delete(id);
        } catch (err) {
            console.error('Error deleting entry:', err);
            setError('Failed to delete entry');
            // Rollback
            if (entryToDelete) {
                setEntries(prev => [...prev, entryToDelete]);
            }
        }
    }, [entries]);

    // Submit week
    const handleSubmitWeek = useCallback(async () => {
        if (entries.length === 0) {
            setError('No entries to lock');
            return;
        }

        if (!window.confirm('Are you sure you want to lock this week? This will lock your entries.')) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Mark all entries as submitted
            const updatedEntries = entries.map(entry => ({
                ...entry,
                status: 'submitted' as const,
            }));

            // Save all entries
            await Promise.all(updatedEntries.map(entry => timesheetRepository.save(entry)));

            setEntries(updatedEntries);
            setSuccessMessage('Week locked successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Error locking week:', err);
            setError('Failed to lock week');
        } finally {
            setIsSaving(false);
        }
    }, [entries]);

    // Unlock week
    const handleUnlockWeek = useCallback(async () => {
        if (!window.confirm('Do you want to unlock this week to make changes?')) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Mark all entries as draft
            const updatedEntries = entries.map(entry => ({
                ...entry,
                status: 'draft' as const,
            }));

            // Save all entries
            await Promise.all(updatedEntries.map(entry => timesheetRepository.save(entry)));

            setEntries(updatedEntries);
            setSuccessMessage('Week unlocked for editing.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Error unlocking week:', err);
            setError('Failed to unlock week');
        } finally {
            setIsSaving(false);
        }
    }, [entries]);

    // PDF Export handler
    const handleExportPDF = useCallback(async () => {
        try {
            const weekEnd = getWeekEnd(currentWeekStart);
            const blob = await pdf(
                <TimesheetPDF
                    entries={entries}
                    summary={summary}
                    weekStart={currentWeekStart}
                    weekEnd={weekEnd}
                    employeeName={currentUser?.displayName || currentUser?.email || 'User'}
                />
            ).toBlob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `timesheet-${getWeekKey(currentWeekStart)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setSuccessMessage('PDF exported successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setError('Failed to export PDF');
        }
    }, [entries, summary, currentWeekStart, currentUser]);

    // Derived: Is the week locked? 
    // We consider it locked if at least one entry is 'submitted'
    const isLocked = useMemo(() => entries.some(e => e.status === 'submitted'), [entries]);

    // Check feature access
    if (!userData?.features?.timesheetsEnabled) {
        return (
            <PageShell title="My Timesheets" onBack={() => window.history.back()}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <p className="text-slate-400 text-lg">Timesheet access is not enabled for your account.</p>
                        <p className="text-slate-500 text-sm mt-2">Please contact an administrator.</p>
                    </div>
                </div>
            </PageShell>
        );
    }

    const dbName = userData?.name; // 'name' field from Firestore/UserManagement
    const displayName = userData?.displayName;
    const fullName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : '';
    const emailName = currentUser?.email?.split('@')[0] || 'My';

    const userName = dbName || displayName || fullName || emailName;

    return (
        <PageShell title={`${userName}'s Timesheets`} onBack={onBack} right={
            <div className="flex items-center gap-3">
                {isLocked && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20 text-xs font-bold uppercase tracking-wider">
                        <Lock className="w-4 h-4" />
                        WEEK LOCKED
                    </div>
                )}
                {isLocked ? (
                    <NeonButton
                        onClick={handleUnlockWeek}
                        disabled={isSaving}
                        className="!bg-slate-800 !text-slate-300 hover:!bg-slate-700"
                    >
                        <Unlock className="w-4 h-4 mr-2" />
                        Unlock for Changes
                    </NeonButton>
                ) : (
                    <NeonButton
                        onClick={handleSubmitWeek}
                        disabled={isSaving || entries.length === 0 || hasErrors}
                        className="!bg-cyan-600 !text-white hover:!bg-cyan-500"
                        title={hasErrors ? 'Cannot lock: Please fix validation errors or time conflicts' : ''}
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        {isSaving ? 'Locking...' : 'Lock Week'}
                    </NeonButton>
                )}
            </div>
        }>
            <div className="space-y-6">
                {/* Week Picker */}
                <WeekPicker
                    currentWeekStart={currentWeekStart}
                    onWeekChange={setCurrentWeekStart}
                />

                {/* Summary */}
                <Summary summary={summary} />

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <NeonButton
                            onClick={loadEntries}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                            title="Reload entries from the database. Use this to discard local changes or sync with latest saved data."
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </NeonButton>

                        <div className="h-6 w-px bg-slate-700 mx-1"></div>

                        <NeonButton
                            onClick={handleCollapseAll}
                            className="flex items-center gap-2 !bg-slate-800 hover:!bg-slate-700 text-slate-400"
                            title="Collapse all days"
                        >
                            <Minimize2 className="w-4 h-4" />
                            Collapse All
                        </NeonButton>
                        <NeonButton
                            onClick={handleExpandAll}
                            className="flex items-center gap-2 !bg-slate-800 hover:!bg-slate-700 text-slate-400"
                            title="Expand all days"
                        >
                            <Maximize2 className="w-4 h-4" />
                            Expand All
                        </NeonButton>
                    </div>

                    <div className="flex items-center gap-2">
                        <NeonButton
                            onClick={handleExportPDF}
                            className="flex items-center gap-2"
                            title="Export this week's timesheet as a PDF with detailed breakdown and notes."
                        >
                            <FileDown className="w-4 h-4" />
                            Export PDF
                        </NeonButton>

                        <NeonButton
                            onClick={() => setShowYearlySummary(true)}
                            className="flex items-center gap-2"
                            title="View yearly hours summary with charts and statistics"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Yearly Summary
                        </NeonButton>
                    </div>
                </div>

                {/* Success/Error Alerts */}
                {successMessage && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{successMessage}</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-slate-400">Loading entries...</div>
                    </div>
                ) : (
                    /* Daily Groups */
                    <div className="space-y-4">
                        {DAYS_OF_WEEK.map((day) => (
                            <DayGroup
                                key={day}
                                day={day}
                                weekStart={currentWeekStart}
                                entries={entriesByDay[day]}
                                onAddEntry={handleAddEntry}
                                onUpdateEntry={handleUpdateEntry}
                                onDeleteEntry={handleDeleteEntry}
                                jobs={jobs}
                                isLocked={isLocked}
                                isCollapsed={!!collapsedDays[`${weekKey}_${day}`]}
                                onToggleCollapse={() => handleToggleDay(day)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Yearly Summary Modal */}
            <YearlySummaryModal
                isOpen={showYearlySummary}
                onClose={() => setShowYearlySummary(false)}
            />
        </PageShell>
    );
}

export default TimesheetApp;
