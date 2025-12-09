import { Copy, Eye, ExternalLink, X, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useQuote } from '../hooks/useQuote';

interface SummaryProps {
    quote: ReturnType<typeof useQuote>;
}

export default function Summary({ quote }: SummaryProps) {
    const {
        shifts, extras, rates, calculateShiftBreakdown, totalCost, jobDetails, status,
        reportingCost, travelChargeCost, isLocked, totalNTHrs, totalOTHrs
    } = quote;

    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    const [showFullBreakdown, setShowFullBreakdown] = useState(false);

    const getAggregatedShifts = () => {
        const aggregated = new Map();

        shifts.forEach(shift => {
            // Create a unique key based on all fields except tech
            const key = JSON.stringify({
                date: shift.date,
                dayType: shift.dayType,
                startTime: shift.startTime,
                finishTime: shift.finishTime,
                travelIn: shift.travelIn,
                travelOut: shift.travelOut,
                vehicle: shift.vehicle,
                perDiem: shift.perDiem,
                isNightShift: shift.isNightShift
            });

            if (aggregated.has(key)) {
                const existing = aggregated.get(key);
                existing.techCount++;
                existing.techs.push(shift.tech);
            } else {
                aggregated.set(key, {
                    ...shift,
                    techCount: 1,
                    techs: [shift.tech]
                });
            }
        });

        return Array.from(aggregated.values());
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

    const getFormattedDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return dateStr;
        const weekday = date.toLocaleDateString('en-AU', { weekday: 'short' });
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${weekday} ${day}/${month}`;
    };

    const generateShiftSummary = () => {
        const aggregatedShifts = getAggregatedShifts();
        const uniqueDates = new Set(shifts.map(s => s.date));
        const totalDays = uniqueDates.size;

        let summary = 'SHIFT SUMMARY\n\n';
        summary += `Total Shifts: ${aggregatedShifts.length}\n`;
        summary += `Total Days Worked: ${totalDays}\n`;
        summary += `Total Hours: ${totalNTHrs.toFixed(2)}h NT + ${totalOTHrs.toFixed(2)}h OT = ${(totalNTHrs + totalOTHrs).toFixed(2)}h\n\n`;

        // Per-day breakdown
        summary += 'Daily Breakdown:\n';
        const shiftsByDate = new Map();
        shifts.forEach(shift => {
            if (!shiftsByDate.has(shift.date)) {
                shiftsByDate.set(shift.date, []);
            }
            shiftsByDate.get(shift.date).push(shift);
        });

        // Sort dates
        const sortedDates = Array.from(shiftsByDate.keys()).sort();
        sortedDates.forEach(date => {
            const dayShifts = shiftsByDate.get(date);
            const techCount = dayShifts.length;
            const dateObj = new Date(date + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('en-AU', { weekday: 'long' });
            const day = dateObj.getDate();
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                day === 2 || day === 22 ? 'nd' :
                    day === 3 || day === 23 ? 'rd' : 'th';

            summary += `  ${dayName} ${day}${suffix} - ${techCount} tech${techCount > 1 ? 's' : ''}\n`;
        });

        summary += '\nClick "See Full Breakdown" for detailed hour-by-hour breakdown.';

        return summary;
    };

    const generateInvoiceString = () => {
        // Calculate Totals - Unified labor costs
        const totalNTCost = shifts.reduce((acc, s) => {
            const { breakdown } = calculateShiftBreakdown(s);
            return acc + ((breakdown.siteNT + breakdown.travelInNT + breakdown.travelOutNT) * rates.siteNormal);
        }, 0);

        const totalOTCost = shifts.reduce((acc, s) => {
            const { breakdown } = calculateShiftBreakdown(s);
            const rate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
            return acc + ((breakdown.siteOT + breakdown.travelInOT + breakdown.travelOutOT) * rate);
        }, 0);

        const vehicleCost = shifts.filter(s => s.vehicle).length * rates.vehicle;
        const perDiemCost = shifts.filter(s => s.perDiem).length * rates.perDiem;

        // Admin Header
        const variance = totalCost - (jobDetails.quotedAmount || 0);
        const hasVariance = (jobDetails.quotedAmount || 0) > 0 && Math.abs(variance) > 0.01;

        let body = `Hi Admin,\n\nSee draft invoice details for ${jobDetails.jobNo} - ${jobDetails.customer}.\n\nTotal to Invoice: ${formatMoney(totalCost)}\n`;

        if (hasVariance) {
            body += `\nNote: The final value is ${formatMoney(Math.abs(variance))} ${variance > 0 ? 'higher' : 'lower'} than the original quote of ${formatMoney(jobDetails.quotedAmount || 0)}.`;
            if (jobDetails.varianceReason) {
                body += `\nReason: ${jobDetails.varianceReason}`;
            }
            body += '\n';
        }

        // Financial Breakdown - Consolidated Labor
        body += `\n---\nFinancial Breakdown:\n`;
        body += `Labor (Normal): ${formatMoney(totalNTCost)}\n`;
        body += `Labor (Overtime): ${formatMoney(totalOTCost)}\n`;

        if (vehicleCost > 0) body += `Vehicle Allowances: ${formatMoney(vehicleCost)}\n`;
        if (perDiemCost > 0) body += `Per Diems: ${formatMoney(perDiemCost)}\n`;
        if (reportingCost > 0) body += `Reporting Time: ${formatMoney(reportingCost)}\n`;
        if (travelChargeCost > 0) body += `Travel Charge: ${formatMoney(travelChargeCost)}\n`;

        // Break down extras individually
        extras.filter(e => (e.cost || 0) > 0).forEach(extra => {
            body += `${extra.description}: ${formatMoney(extra.cost || 0)}\n`;
        });

        body += `\nTotal: ${formatMoney(totalCost)}`;

        // Append Xero link if exists
        if (jobDetails.externalLink) {
            body += `\n\nLink to Xero Quote: ${jobDetails.externalLink}`;
        }

        // Append comments if exist
        if (jobDetails.adminComments) {
            body += `\n\nComments: ${jobDetails.adminComments}`;
        }

        return body;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateInvoiceString());
        alert("Copied to clipboard!");
    };

    const generateShiftBreakdown = () => {
        let breakdown = 'SHIFT BREAKDOWN\n\n';
        const aggregatedShifts = getAggregatedShifts();

        // Group by date to get proper day counting
        const shiftsByDate = new Map();
        aggregatedShifts.forEach(shift => {
            if (!shiftsByDate.has(shift.date)) {
                shiftsByDate.set(shift.date, []);
            }
            shiftsByDate.get(shift.date).push(shift);
        });

        let dayNumber = 1;
        shiftsByDate.forEach((dayShifts, date) => {
            const formattedDate = getFormattedDate(date);
            breakdown += `Day ${dayNumber} - ${formattedDate}:\n`;
            breakdown += `${'='.repeat(40)}\n`;

            dayShifts.forEach((shift: any, shiftIndex: number) => {
                const { breakdown: b } = calculateShiftBreakdown(shift);
                const shiftLabel = dayShifts.length > 1 ? `Shift ${shiftIndex + 1}` : 'Shift';

                breakdown += `\n${shiftLabel}:\n`;
                breakdown += `  Time: ${shift.startTime} - ${shift.finishTime}\n`;
                breakdown += `  Day Type: ${shift.dayType}${shift.isNightShift ? ' (Night Shift)' : ''}\n`;
                breakdown += `  Technicians: ${shift.techCount > 1 ? `${shift.techCount}x (${shift.techs.join(', ')})` : shift.tech}\n`;
                breakdown += `\n  Hours Breakdown:\n`;
                breakdown += `    Travel In NT: ${b.travelInNT.toFixed(2)}h | OT: ${b.travelInOT.toFixed(2)}h\n`;
                breakdown += `    Site NT: ${b.siteNT.toFixed(2)}h | OT: ${b.siteOT.toFixed(2)}h\n`;
                breakdown += `    Travel Out NT: ${b.travelOutNT.toFixed(2)}h | OT: ${b.travelOutOT.toFixed(2)}h\n`;
                breakdown += `    Total Hours: ${b.totalHours.toFixed(2)}h (Site: ${b.siteHours.toFixed(2)}h)\n`;

                if (shift.vehicle) breakdown += `    Vehicle: Yes\n`;
                if (shift.perDiem) breakdown += `    Per Diem: Yes\n`;
            });

            breakdown += `\n`;
            dayNumber++;
        });

        return breakdown;
    };

    const copyBreakdown = () => {
        navigator.clipboard.writeText(generateShiftBreakdown());
        alert("Shift breakdown copied to clipboard!");
    };

    // Calculate individual allowances
    const vehicleCount = shifts.filter(s => s.vehicle).length;
    const perDiemCount = shifts.filter(s => s.perDiem).length;

    // 1. HELPER FUNCTIONS
    const addInternalExpense = () => {
        const newExpense = { id: crypto.randomUUID(), description: '', cost: 0 };
        const newExpenses = [...(quote.internalExpenses || []), newExpense];
        quote.setInternalExpenses(newExpenses);
    };

    const updateInternalExpense = (id: string, field: any, value: any) => {
        const newExpenses = (quote.internalExpenses || []).map(e =>
            e.id === id ? { ...e, [field]: value } : e
        );
        quote.setInternalExpenses(newExpenses);
    };

    const removeInternalExpense = (id: string) => {
        const newExpenses = (quote.internalExpenses || []).filter(e => e.id !== id);
        quote.setInternalExpenses(newExpenses);
    };

    // 2. CALCULATIONS
    // Revenue is now the Total Invoice Amount
    const totalRevenue = totalCost;

    // Costs
    const totalLaborHours = totalNTHrs + totalOTHrs;
    const internalLaborCost = totalLaborHours * (rates.costOfLabour || 0);
    const totalInternalExpenses = (quote.internalExpenses || []).reduce((acc, e) => acc + (e.cost || 0), 0);

    // Profit
    const totalInternalCost = internalLaborCost + totalInternalExpenses;
    const grossProfit = totalRevenue - totalInternalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header with Finalize Buttons */}
            {status === 'invoice' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-purple-900/20 px-3 py-1.5 rounded border border-purple-700 text-purple-300">
                        <span className="text-sm font-medium">Invoice Mode - Ready to Finalize</span>
                    </div>
                    <button
                        onClick={() => quote.setStatus('closed')}
                        disabled={isLocked}
                        className="bg-emerald-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Finalize & Close
                    </button>
                </div>
            )}
            {status === 'closed' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <span className="text-sm font-medium">✓ Invoice Closed</span>
                    </div>
                    <button
                        onClick={() => quote.setStatus('invoice')}
                        className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-amber-700 font-medium"
                    >
                        Unlock to Edit
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700 h-fit">
                    <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider mb-4">Financial Summary</h2>

                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-700">
                            <span className="text-slate-300">Labor (Normal) ({totalNTHrs.toFixed(2)}h)</span>
                            <span className="font-mono">
                                {formatMoney(shifts.reduce((acc, s) => {
                                    const { breakdown } = calculateShiftBreakdown(s);
                                    const siteNTCost = breakdown.siteNT * rates.siteNormal;
                                    const travelNTCost = (breakdown.travelInNT + breakdown.travelOutNT) * rates.siteNormal;
                                    return acc + siteNTCost + travelNTCost;
                                }, 0))}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-700">
                            <span className="text-slate-300">Labor (Overtime) ({totalOTHrs.toFixed(2)}h)</span>
                            <span className="font-mono">
                                {formatMoney(shifts.reduce((acc, s) => {
                                    const { breakdown } = calculateShiftBreakdown(s);
                                    const siteOTRate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
                                    const siteOTCost = breakdown.siteOT * siteOTRate;
                                    const travelOTRate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
                                    const travelOTCost = (breakdown.travelInOT + breakdown.travelOutOT) * travelOTRate;
                                    return acc + siteOTCost + travelOTCost;
                                }, 0))}
                            </span>
                        </div>

                        {vehicleCount > 0 && (
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-slate-300">Vehicle Allowance ({vehicleCount}x)</span>
                                <span className="font-mono">
                                    {formatMoney(vehicleCount * rates.vehicle)}
                                </span>
                            </div>
                        )}

                        {perDiemCount > 0 && (
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-slate-300">Per Diem ({perDiemCount}x)</span>
                                <span className="font-mono">
                                    {formatMoney(perDiemCount * rates.perDiem)}
                                </span>
                            </div>
                        )}

                        {reportingCost > 0 && (
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-slate-300">Reporting Time ({jobDetails.reportingTime}h)</span>
                                <span className="font-mono">
                                    {formatMoney(reportingCost)}
                                </span>
                            </div>
                        )}

                        {travelChargeCost > 0 && (
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-slate-300">Travel Charge</span>
                                <span className="font-mono">
                                    {formatMoney(travelChargeCost)}
                                </span>
                            </div>
                        )}

                        {extras.filter(e => e.cost > 0).map((extra) => (
                            <div key={extra.id} className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-slate-300">{extra.description || 'Extra Item'}</span>
                                <span className="font-mono">
                                    {formatMoney(parseFloat(extra.cost as any) || 0)}
                                </span>
                            </div>
                        ))}

                        <div className="flex justify-between pt-4 text-xl font-bold text-slate-100">
                            <span>Grand Total</span>
                            <span>{formatMoney(totalCost)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-amber-600/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-900/40 text-amber-500 text-xs px-3 py-1 rounded-bl border-b border-l border-amber-900/50 font-medium tracking-wider">
                        INTERNAL MARGIN ANALYSIS
                    </div>

                    <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider mb-6 flex items-center gap-2">
                        <span className="text-amber-500"><TrendingUp size={20} /></span> Job Profitability
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT: Revenue & Labor */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Total Job Revenue</p>
                                <p className="text-2xl font-mono text-slate-100">{formatMoney(totalRevenue)}</p>
                                <p className="text-[10px] text-slate-500">Includes all billables (Labor, Travel, Extras)</p>
                            </div>

                            <div className="p-4 bg-gray-900/30 rounded border border-gray-700">
                                <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Internal Labor Cost</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-lg font-mono text-red-400">-{formatMoney(internalLaborCost)}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {totalLaborHours.toFixed(2)} hrs @ {formatMoney(rates.costOfLabour)}/hr
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Variable Internal Expenses */}
                        <div className="bg-gray-900/30 rounded border border-gray-700 p-4 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-xs text-slate-400 uppercase font-semibold">Additional Internal Costs</p>
                                <button
                                    onClick={addInternalExpense}
                                    className="text-xs flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-slate-200 px-2 py-1 rounded transition-colors"
                                >
                                    <Plus size={12} /> Add Cost
                                </button>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
                                {(quote.internalExpenses || []).length === 0 && (
                                    <p className="text-sm text-slate-600 italic py-2 text-center">No extra internal costs added.</p>
                                )}

                                {(quote.internalExpenses || []).map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            placeholder="Description (e.g. Fuel, Flights)"
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded text-xs p-1.5 text-slate-200 focus:border-amber-500 outline-none"
                                            value={item.description}
                                            onChange={(e) => updateInternalExpense(item.id, 'description', e.target.value)}
                                        />
                                        <div className="relative w-24">
                                            <span className="absolute left-2 top-1.5 text-slate-500 text-xs">$</span>
                                            <input
                                                type="number"
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-xs p-1.5 pl-5 text-right text-red-300 focus:border-amber-500 outline-none"
                                                value={item.cost}
                                                onChange={(e) => updateInternalExpense(item.id, 'cost', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeInternalExpense(item.id)}
                                            className="text-slate-500 hover:text-red-400"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 italic">
                                        *Note: Est. Fuel/Wear based on annual avg.
                                    </span>
                                    <span className="text-sm font-mono text-red-400 font-bold">
                                        -{formatMoney(totalInternalExpenses)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: Final Results */}
                    <div className="border-t border-gray-700 mt-6 pt-4 flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold">Net Profit</p>
                            <div className={`text-3xl font-bold ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                {formatMoney(grossProfit)}
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <p className="text-xs text-slate-400 uppercase font-semibold">Profit Margin</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-black ${grossMargin >= 30 ? 'text-emerald-400' :
                                    grossMargin > 15 ? 'text-amber-400' : 'text-red-500'
                                    }`}>
                                    {grossMargin.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-32 h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${grossMargin >= 30 ? 'bg-emerald-500' :
                                        grossMargin > 15 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${Math.max(0, Math.min(100, grossMargin))}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Admin Communication Section */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Admin Communication</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Job Number
                                </label>
                                <input
                                    type="text"
                                    value={jobDetails.jobNo || ''}
                                    onChange={(e) => quote.setJobDetails({ ...jobDetails, jobNo: e.target.value })}
                                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="e.g. J123456"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    External Link
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={jobDetails.externalLink || ''}
                                        onChange={(e) => quote.setJobDetails({ ...jobDetails, externalLink: e.target.value })}
                                        className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="https://..."
                                    />
                                    {jobDetails.externalLink && (
                                        <button
                                            onClick={() => window.open(jobDetails.externalLink, '_blank')}
                                            className="p-2 bg-gray-700 text-slate-300 rounded hover:bg-gray-600"
                                            title="Open Link"
                                        >
                                            <ExternalLink size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Additional Comments
                            </label>
                            <textarea
                                value={jobDetails.adminComments || ''}
                                onChange={(e) => quote.setJobDetails({ ...jobDetails, adminComments: e.target.value })}
                                disabled={isLocked}
                                className={`w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none h-20 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                placeholder="Additional notes for admin..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Original Quote / PO Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={jobDetails.quotedAmount || ''}
                                        onChange={(e) => quote.setJobDetails({ ...jobDetails, quotedAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Variance Reason
                                </label>
                                <input
                                    type="text"
                                    value={jobDetails.varianceReason || ''}
                                    onChange={(e) => quote.setJobDetails({ ...jobDetails, varianceReason: e.target.value })}
                                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="e.g. Extra site time requested..."
                                />
                            </div>
                        </div>

                        <div className="bg-gray-700 p-3 rounded border border-gray-600 flex justify-between items-center mb-4">
                            <span className="text-sm font-medium text-slate-300">Total to Invoice: {formatMoney(totalCost)}</span>
                            {(jobDetails.quotedAmount || 0) > 0 && (
                                <span className={`text-sm font-bold ${totalCost > (jobDetails.quotedAmount || 0) ? 'text-red-400' : 'text-green-400'}`}>
                                    Difference vs. Original Quote Snapshot: {formatMoney(totalCost - (jobDetails.quotedAmount || 0))}
                                    {Math.abs(totalCost - (jobDetails.quotedAmount || 0)) > 0.01 ? (totalCost > (jobDetails.quotedAmount || 0) ? ' (Higher)' : ' (Lower)') : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Invoice Copy</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBreakdownModal(true)}
                                    className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-gray-600"
                                >
                                    <Eye size={16} /> See Shift Breakdown Hours
                                </button>
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-primary-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-primary-700"
                                >
                                    <Copy size={16} /> Copy Email
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">
                            Copy this block and paste it directly into your email or accounting software.
                        </p>
                        <textarea
                            readOnly
                            className="w-full h-64 p-3 font-mono text-sm bg-gray-700 text-slate-100 border border-gray-600 rounded focus:outline-none"
                            value={generateInvoiceString()}
                        />
                    </div>
                </div>

                {/* Shift Breakdown Modal */}
                {showBreakdownModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowBreakdownModal(false); setShowFullBreakdown(false); }}>
                        <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center p-6 border-b">
                                <h2 className="text-xl font-semibold text-slate-100">Shift Breakdown Hours</h2>
                                <button
                                    onClick={() => { setShowBreakdownModal(false); setShowFullBreakdown(false); }}
                                    className="text-slate-400 hover:text-slate-200"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                                <textarea
                                    readOnly
                                    className="w-full h-96 p-3 font-mono text-sm bg-gray-700 text-slate-100 border border-gray-600 rounded focus:outline-none"
                                    value={showFullBreakdown ? generateShiftBreakdown() : generateShiftSummary()}
                                />
                            </div>
                            <div className="flex justify-between items-center gap-2 p-6 border-t bg-gray-700">
                                <button
                                    onClick={() => setShowFullBreakdown(!showFullBreakdown)}
                                    className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-500"
                                >
                                    <Eye size={16} /> {showFullBreakdown ? 'Show Summary' : 'See Full Breakdown'}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={copyBreakdown}
                                        className="bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-primary-700"
                                    >
                                        <Copy size={16} /> Copy Breakdown
                                    </button>
                                    <button
                                        onClick={() => { setShowBreakdownModal(false); setShowFullBreakdown(false); }}
                                        className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
