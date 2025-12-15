
import { Plus, Trash2 } from 'lucide-react';
import type { Shift, CalculatedShift } from '../../types';

interface TimesheetProps {
    shifts: Shift[];
    isLocked: boolean;
    addShift: () => void;
    updateShift: (id: number, field: keyof Shift, value: any) => void;
    removeShift: (id: number) => void;
    calculateShiftBreakdown: (shift: Shift) => CalculatedShift;
    formatMoney: (amount: number) => string;
    technicians: string[];
}

export default function Timesheet({
    shifts,
    isLocked,
    addShift,
    updateShift,
    removeShift,
    calculateShiftBreakdown,
    formatMoney,
    technicians
}: TimesheetProps) {
    const getFormattedDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-AU', { weekday: 'short' });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Timesheet & Hours</h2>
                    <p className="text-xs text-slate-400">Enter Start/Finish + Travel. Site hours are calculated automatically.</p>
                </div>
                {!isLocked && (
                    <button onClick={addShift} className="bg-primary-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-primary-700">
                        <Plus size={16} /> Add Shift
                    </button>
                )}
            </div>

            <table className="w-full min-w-[1100px] text-sm text-left">
                <thead className="bg-gray-700 text-slate-300 font-medium">
                    <tr>
                        <th className="p-3 w-32">Date</th>
                        <th className="p-3 w-32">Tech</th>
                        <th className="p-3 w-24">Start</th>
                        <th className="p-3 w-24">Finish</th>
                        <th className="p-3 w-20 text-center text-primary-400 bg-primary-900/20">Trav In</th>
                        <th className="p-3 w-20 text-center text-primary-400 bg-primary-900/20">Trav Out</th>
                        <th className="p-3 w-20 text-center font-bold">Site Hrs</th>
                        <th className="p-3 w-20 text-center font-bold text-slate-200">Total Hrs</th>
                        <th className="p-3 w-10 text-center">Night?</th>
                        <th className="p-3 w-10 text-center">PH?</th>
                        <th className="p-3 w-10 text-center">Veh?</th>
                        <th className="p-3 w-10 text-center">P.D?</th>
                        <th className="p-3 text-right">Charge</th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                    {shifts.map((shift) => {
                        const { cost, breakdown } = calculateShiftBreakdown(shift);
                        const dayName = getFormattedDate(shift.date);
                        const isWeekend = shift.dayType === 'weekend';
                        const isPublicHoliday = shift.dayType === 'publicHoliday';

                        return (
                            <tr key={shift.id} className="hover:bg-gray-700">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            disabled={isLocked}
                                            type="date"
                                            value={shift.date}
                                            className={`border border-gray-600 rounded p-1 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                            onChange={(e) => {
                                                const newDate = e.target.value;

                                                // Update date first
                                                updateShift(shift.id, 'date', newDate);

                                                // Then calculate and update day type if not a public holiday
                                                if (!isPublicHoliday) {
                                                    const date = new Date(newDate + 'T00:00:00');
                                                    const dayOfWeek = date.getDay();
                                                    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
                                                    updateShift(shift.id, 'dayType', isWeekendDay ? 'weekend' : 'weekday');
                                                }
                                            }}
                                        />
                                        {dayName && (
                                            <div className={`text-[10px] font-bold uppercase whitespace-nowrap ${isWeekend ? 'text-amber-400' : isPublicHoliday ? 'text-purple-400' : 'text-slate-400'
                                                }`}>
                                                {dayName}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <select
                                        disabled={isLocked}
                                        className={`border border-gray-600 rounded p-1 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : 'bg-gray-700 text-slate-100'}`}
                                        value={shift.tech}
                                        onChange={(e) => updateShift(shift.id, 'tech', e.target.value)}
                                    >
                                        {technicians.map((tech, index) => (
                                            <option key={index} value={tech}>{tech}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-3">
                                    <input
                                        disabled={isLocked}
                                        type="time"
                                        value={shift.startTime}
                                        className={`border border-gray-600 rounded p-1 w-full bg-gray-700 text-slate-100 text-center ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                        onChange={(e) => updateShift(shift.id, 'startTime', e.target.value)}
                                    />
                                </td>
                                <td className="p-3">
                                    <input
                                        disabled={isLocked}
                                        type="time"
                                        value={shift.finishTime}
                                        className={`border border-gray-600 rounded p-1 w-full bg-gray-700 text-slate-100 text-center ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                        onChange={(e) => updateShift(shift.id, 'finishTime', e.target.value)}
                                    />
                                </td>
                                <td className="p-3 bg-primary-900/20">
                                    <input
                                        disabled={isLocked}
                                        type="number" step="0.25"
                                        value={shift.travelIn}
                                        className={`border border-primary-600 rounded p-1 w-full text-center bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                        onChange={(e) => updateShift(shift.id, 'travelIn', parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="p-3 bg-primary-900/20">
                                    <input
                                        disabled={isLocked}
                                        type="number" step="0.25"
                                        value={shift.travelOut}
                                        className={`border border-primary-600 rounded p-1 w-full text-center bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                        onChange={(e) => updateShift(shift.id, 'travelOut', parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <div className="font-bold text-slate-200">{breakdown.siteHours.toFixed(2)}</div>
                                    {breakdown.siteOT > 0 && <div className="text-[10px] text-yellow-400">OT: {breakdown.siteOT.toFixed(2)}</div>}
                                </td>
                                <td className="p-3 text-center">
                                    <div className="font-bold text-slate-100 bg-gray-700 rounded px-1">{breakdown.totalHours.toFixed(2)}</div>
                                </td>
                                <td className="p-3 text-center">
                                    <input
                                        disabled={isLocked}
                                        type="checkbox"
                                        checked={shift.isNightShift || false}
                                        onChange={(e) => updateShift(shift.id, 'isNightShift', e.target.checked)}
                                        className="w-4 h-4 accent-primary-600"
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <input
                                        disabled={isLocked}
                                        type="checkbox"
                                        checked={isPublicHoliday}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                updateShift(shift.id, 'dayType', 'publicHoliday');
                                            } else {
                                                // Revert to auto-detected type
                                                const date = new Date(shift.date + 'T00:00:00');
                                                const dayOfWeek = date.getDay();
                                                const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
                                                updateShift(shift.id, 'dayType', isWeekendDay ? 'weekend' : 'weekday');
                                            }
                                        }}
                                        className="w-4 h-4 accent-purple-600"
                                        title="Public Holiday - overrides weekend/weekday detection"
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <input
                                        disabled={isLocked}
                                        type="checkbox"
                                        checked={shift.vehicle}
                                        onChange={(e) => updateShift(shift.id, 'vehicle', e.target.checked)}
                                        className="w-4 h-4 accent-primary-600"
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <input
                                        disabled={isLocked}
                                        type="checkbox"
                                        checked={shift.perDiem}
                                        onChange={(e) => updateShift(shift.id, 'perDiem', e.target.checked)}
                                        className="w-4 h-4 accent-primary-600"
                                    />
                                </td>
                                <td className="p-3 text-right font-mono text-xs">
                                    {formatMoney(cost)}
                                </td>
                                <td className="p-3 text-center">
                                    {!isLocked && (
                                        <button onClick={() => removeShift(shift.id)} className="text-slate-400 hover:text-red-400">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
