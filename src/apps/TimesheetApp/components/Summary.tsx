/**
 * Summary Component
 * 
 * Displays weekly summary totals in a card layout.
 * Shows net hours, per diem, and utilization percentage.
 */

import { Clock, DollarSign, Target, TrendingUp } from 'lucide-react';
import { WeeklySummary } from '../types';

interface SummaryProps {
    summary: WeeklySummary;
}

/**
 * Summary - Weekly totals display
 * 
 * Features:
 * - Total hours with overtime breakdown
 * - Per diem totals
 * - Utilization percentage with visual indicator
 */
export function Summary({ summary }: SummaryProps) {
    // Determine utilization color
    const getUtilizationColor = (percent: number) => {
        if (percent >= 100) return 'text-green-400';
        if (percent >= 80) return 'text-cyan-400';
        if (percent >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Hours */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Clock className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-slate-400 text-sm">Total Hours</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                    {summary.totalNetHours.toFixed(2)}h
                </div>
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                        <span>Base (1.0×)</span>
                        <span className="font-mono">{summary.totalBaseHours.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>OT (1.5×)</span>
                        <span className="font-mono text-amber-400">{summary.totalOT15x.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>OT (2.0×)</span>
                        <span className="font-mono text-red-400">{summary.totalOT20x.toFixed(2)}h</span>
                    </div>
                </div>
            </div>

            {/* Chargeable Hours */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-500/20">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-slate-400 text-sm">Chargeable</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                    {summary.totalChargeableHours.toFixed(2)}h
                </div>
                <div className="mt-2 text-xs text-slate-500">
                    Hours billable to customers (Site/Travel with Job #)
                </div>
            </div>

            {/* Per Diem */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                        <DollarSign className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-slate-400 text-sm">Per Diem</span>
                </div>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                    ${summary.totalPerDiem.toFixed(2)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                    Overnight ($85) + Travel ($42.50)
                </div>
            </div>

            {/* Utilization */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-slate-400 text-sm">Utilization</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${getUtilizationColor(summary.utilizationPercent)}`}>
                    {summary.utilizationPercent.toFixed(1)}%
                </div>
                <div className="mt-2">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all ${summary.utilizationPercent >= 100 ? 'bg-green-500' :
                                summary.utilizationPercent >= 80 ? 'bg-cyan-500' :
                                    summary.utilizationPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${Math.min(summary.utilizationPercent, 100)}%` }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        Target: 37.5h/week
                    </div>
                </div>
            </div>
        </div>
    );
}
