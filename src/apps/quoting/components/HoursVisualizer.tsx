import { useState, useMemo } from 'react';
import type { Shift, CalculatedShift } from '../types';

interface HoursVisualizerProps {
    shifts: Shift[];
    calculateShiftBreakdown: (shift: Shift) => CalculatedShift;
}

export default function HoursVisualizer({ shifts, calculateShiftBreakdown }: HoursVisualizerProps) {
    const [selectedTech, setSelectedTech] = useState<string>('ALL');

    // Get unique technicians from shifts
    const uniqueTechs = useMemo(() => {
        const techs = Array.from(new Set(shifts.map(s => s.tech))).sort();
        return ['ALL', ...techs];
    }, [shifts]);

    // Aggregate shifts by date and technician
    const aggregatedData = useMemo(() => {
        const filteredShifts = selectedTech === 'ALL' 
            ? shifts 
            : shifts.filter(s => s.tech === selectedTech);

        const aggregated = new Map();
        
        filteredShifts.forEach(shift => {
            const { breakdown } = calculateShiftBreakdown(shift);
            const key = shift.date;
            
            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    date: key,
                    normalHours: 0,
                    overtimeHours: 0,
                    cost: 0,
                    techs: new Set()
                });
            }
            
            const dayData = aggregated.get(key);
            dayData.normalHours += breakdown.siteNT + breakdown.travelInNT + breakdown.travelOutNT;
            dayData.overtimeHours += breakdown.siteOT + breakdown.travelInOT + breakdown.travelOutOT;
            dayData.techs.add(shift.tech);
            
            // Calculate cost based on day type
            // Note: Cost calculation would require rates to be passed in
            // For now, just aggregating hours without cost calculation
        });
        
        return Array.from(aggregated.values()).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [shifts, selectedTech, calculateShiftBreakdown]);

    // Calculate totals
    const totals = useMemo(() => {
        return aggregatedData.reduce((acc, day) => ({
            normalHours: acc.normalHours + day.normalHours,
            overtimeHours: acc.overtimeHours + day.overtimeHours,
            techCount: Math.max(acc.techCount, day.techs.size)
        }), { normalHours: 0, overtimeHours: 0, techCount: 0 });
    }, [aggregatedData]);

    if (shifts.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider mb-4">Hours Visualization</h2>
                <div className="flex items-center justify-center h-64 text-slate-400">
                    <p>No shifts to visualize. Add shifts in the Timesheet to see hours breakdown.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Hours Visualization</h2>
                <div className="text-sm text-slate-400">
                    Total: <span className="font-semibold text-slate-200">
                        {(totals.normalHours + totals.overtimeHours).toFixed(2)}h
                    </span> (Normal: {totals.normalHours.toFixed(2)}h, Overtime: {totals.overtimeHours.toFixed(2)}h)
                </div>
            </div>

            {/* Technician Filter */}
            <div className="mb-6">
                <label className="block text-sm text-slate-300 mb-2">Filter by Technician:</label>
                <div className="flex flex-wrap gap-2">
                    {uniqueTechs.map(tech => (
                        <button
                            key={tech}
                            onClick={() => setSelectedTech(tech)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                selectedTech === tech
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-700 text-slate-400 hover:bg-gray-600 border border-gray-600'
                            }`}
                        >
                            {tech === 'ALL' ? 'All Technicians' : tech}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="space-y-3">
                <div className="text-sm text-slate-400 mb-2">Daily Hours Breakdown:</div>
                {aggregatedData.map(day => (
                    <div key={day.date} className="bg-gray-700 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-200">
                                {new Date(day.date).toLocaleDateString('en-AU', { 
                                    weekday: 'short', 
                                    day: 'numeric', 
                                    month: 'short' 
                                })}
                            </span>
                            <span className="text-xs text-slate-400">
                                {day.normalHours.toFixed(2)}h NT + {day.overtimeHours.toFixed(2)}h OT = {(day.normalHours + day.overtimeHours).toFixed(2)}h total
                            </span>
                        </div>
                        
                        {/* Visual bar chart */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-600 rounded-full h-6 overflow-hidden flex">
                                {day.normalHours > 0 && (
                                    <div 
                                        className="bg-blue-500 h-full flex items-center justify-center text-xs text-white font-medium"
                                        style={{ width: `${(day.normalHours / (day.normalHours + day.overtimeHours)) * 100}%` }}
                                    >
                                        {day.normalHours > 0.5 && `${day.normalHours.toFixed(1)}h`}
                                    </div>
                                )}
                                {day.overtimeHours > 0 && (
                                    <div 
                                        className="bg-amber-500 h-full flex items-center justify-center text-xs text-white font-medium"
                                        style={{ width: `${(day.overtimeHours / (day.normalHours + day.overtimeHours)) * 100}%` }}
                                    >
                                        {day.overtimeHours > 0.5 && `${day.overtimeHours.toFixed(1)}h`}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {selectedTech !== 'ALL' && (
                            <div className="text-xs text-slate-400 mt-1">
                                Technician: {selectedTech}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm text-slate-400">Normal Time</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span className="text-sm text-slate-400">Overtime</span>
                </div>
            </div>
        </div>
    );
}
