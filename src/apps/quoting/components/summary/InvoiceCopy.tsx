import { Copy, Eye, X } from 'lucide-react';
import { useState } from 'react';
import type { Shift, Rates, ExtraItem, JobDetails, CalculatedShift } from '../../types';
import { formatMoney, getFormattedDate, copyText } from '../../utils/formatters';
import type { CopyTemplateSettings } from '../../types';
import { useToast } from '../Toast';

const DEFAULTS: CopyTemplateSettings = {
    quoteIntro: '',
    quoteIncludeSchedule: true,
    quoteIncludeLineItems: true,
    quoteIncludeTechNotes: false,
    quoteOutro: '',
    invoiceGreeting: 'Hi Admin,',
    invoiceIncludeSchedule: true,
    invoiceIncludeBreakdown: true,
    invoiceIncludeVariance: true,
};

interface InvoiceCopyProps {
    shifts: Shift[];
    rates: Rates;
    extras: ExtraItem[];
    jobDetails: JobDetails;
    totalNTHrs: number;
    totalOTHrs: number;
    totalCost: number;
    reportingCost: number;
    travelChargeCost: number;
    calculateShiftBreakdown: (shift: Shift) => CalculatedShift;
}

export default function InvoiceCopy({
    shifts, rates, extras, jobDetails,
    totalNTHrs, totalOTHrs, totalCost,
    reportingCost, travelChargeCost, calculateShiftBreakdown
}: InvoiceCopyProps) {
    const { showToast } = useToast();
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    const [showFullBreakdown, setShowFullBreakdown] = useState(false);

    const getAggregatedShifts = () => {
        const aggregated = new Map();
        shifts.forEach(shift => {
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
                aggregated.set(key, { ...shift, techCount: 1, techs: [shift.tech] });
            }
        });
        return Array.from(aggregated.values());
    };

    const generateShiftSummary = () => {
        const aggregatedShifts = getAggregatedShifts();
        const uniqueDates = new Set(shifts.map(s => s.date));
        const totalDays = uniqueDates.size;

        let summary = 'SHIFT SUMMARY\n\n';
        summary += `Total Shifts: ${aggregatedShifts.length}\n`;
        summary += `Total Days Worked: ${totalDays}\n`;
        summary += `Total Hours: ${totalNTHrs.toFixed(2)}h NT + ${totalOTHrs.toFixed(2)}h OT = ${(totalNTHrs + totalOTHrs).toFixed(2)}h\n\n`;

        summary += 'Daily Breakdown:\n';
        const shiftsByDate = new Map();
        shifts.forEach(shift => {
            if (!shiftsByDate.has(shift.date)) {
                shiftsByDate.set(shift.date, []);
            }
            shiftsByDate.get(shift.date).push(shift);
        });

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

        const vehicleCount = shifts.filter(s => s.vehicle).length;
        const perDiemCount = shifts.filter(s => s.perDiem).length;
        const hasExtras = extras.filter(e => (e.cost || 0) > 0).length > 0;
        const hasAllowances = vehicleCount > 0 || perDiemCount > 0 || reportingCost > 0 || travelChargeCost > 0;

        if (hasAllowances || hasExtras) {
            summary += '\nExtras & Expenses:\n';
            if (vehicleCount > 0) summary += `  Vehicle Allowance: ${vehicleCount}x @ ${formatMoney(rates.vehicle)} = ${formatMoney(vehicleCount * rates.vehicle)}\n`;
            if (perDiemCount > 0) summary += `  Per Diem: ${perDiemCount}x @ ${formatMoney(rates.perDiem)} = ${formatMoney(perDiemCount * rates.perDiem)}\n`;
            if (reportingCost > 0) summary += `  Reporting Time: ${jobDetails.reportingTime}h @ ${formatMoney(rates.siteNormal)} = ${formatMoney(reportingCost)}\n`;
            if (travelChargeCost > 0) summary += `  Travel Charge: ${jobDetails.technicians.length}x @ ${formatMoney(rates.travelChargeExBrisbane)}/tech = ${formatMoney(travelChargeCost)}\n`;
            extras.filter(e => (e.cost || 0) > 0).forEach(extra => {
                summary += `  ${extra.description || 'Extra Item'}: ${formatMoney(parseFloat(extra.cost as any) || 0)}\n`;
            });
        }

        summary += '\nClick "See Full Breakdown" for detailed hour-by-hour breakdown.';
        return summary;
    };

    const generateShiftBreakdown = () => {
        let breakdown = 'SHIFT BREAKDOWN\n\n';
        const aggregatedShifts = getAggregatedShifts();

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

    const settings = { ...DEFAULTS, ...rates.copyTemplateSettings };

    const generateInvoiceString = () => {
        const billableShifts = shifts.filter(s => !s.isTravelDay);

        const totalNTCost = billableShifts.reduce((acc, s) => {
            const { breakdown } = calculateShiftBreakdown(s);
            const siteNTCost = Math.round(breakdown.siteNT * 100) / 100 * rates.siteNormal;
            const travelNTCost = (Math.round(breakdown.travelInNT * 100) / 100 + Math.round(breakdown.travelOutNT * 100) / 100) * rates.siteNormal;
            return acc + siteNTCost + travelNTCost;
        }, 0);

        const totalOTCost = billableShifts.reduce((acc, s) => {
            const { breakdown } = calculateShiftBreakdown(s);
            const rate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
            const siteOTCost = Math.round(breakdown.siteOT * 100) / 100 * rate;
            const travelOTCost = (Math.round(breakdown.travelInOT * 100) / 100 + Math.round(breakdown.travelOutOT * 100) / 100) * rate;
            return acc + siteOTCost + travelOTCost;
        }, 0);

        const vehicleCost = shifts.filter(s => s.vehicle).length * rates.vehicle;
        const perDiemCost = shifts.filter(s => s.perDiem).length * rates.perDiem;

        const greeting = settings.invoiceGreeting || 'Hi Admin,';
        let body = `${greeting}\n\nSee draft invoice details for ${jobDetails.jobNo} - ${jobDetails.customer}.\n\nTotal to Invoice: ${formatMoney(totalCost)}\n`;

        // Variance notes
        if (settings.invoiceIncludeVariance) {
            const compareAmount = jobDetails.poAmount || jobDetails.originalQuoteAmount || 0;
            const variance = totalCost - compareAmount;
            const hasVariance = compareAmount > 0 && Math.abs(variance) > 0.01;

            if (hasVariance) {
                const compareLabel = jobDetails.poAmount ? 'PO' : 'original quote';
                body += `\nNote: The final value is ${formatMoney(Math.abs(variance))} ${variance > 0 ? 'higher' : 'lower'} than the ${compareLabel} of ${formatMoney(compareAmount)}.`;
                if (jobDetails.varianceReason) {
                    body += `\nReason: ${jobDetails.varianceReason}`;
                }
                body += '\n';
            }
        }

        // Day schedule
        if (settings.invoiceIncludeSchedule) {
            const shiftsByDate = new Map<string, typeof shifts>();
            shifts.forEach(shift => {
                if (!shiftsByDate.has(shift.date)) {
                    shiftsByDate.set(shift.date, []);
                }
                shiftsByDate.get(shift.date)!.push(shift);
            });

            const sortedDates = Array.from(shiftsByDate.keys()).sort();
            if (sortedDates.length > 0) {
                body += '\n';
                let dayNumber = 1;
                sortedDates.forEach(dateStr => {
                    const dayShifts = shiftsByDate.get(dateStr)!;
                    const date = new Date(dateStr + 'T00:00:00');
                    const dayName = date.toLocaleDateString('en-AU', { weekday: 'long' });
                    const monthName = date.toLocaleDateString('en-AU', { month: 'long' });
                    const dayOfMonth = date.getDate();

                    const isTravelDay = dayShifts.some(s => s.isTravelDay);
                    const dayLabel = isTravelDay ? 'Travel' : 'Site works';

                    body += `Day ${dayNumber} - ${dayName} ${monthName} ${dayOfMonth} - ${dayLabel}\n`;
                    dayNumber++;
                });
            }
        }

        // Financial breakdown
        if (settings.invoiceIncludeBreakdown) {
            body += `\n---\nFinancial Breakdown:\n`;
            body += `Labor (Normal): ${formatMoney(totalNTCost)}\n`;
            body += `Labor (Overtime): ${formatMoney(totalOTCost)}\n`;

            if (vehicleCost > 0) body += `Vehicle Allowances: ${formatMoney(vehicleCost)}\n`;
            if (perDiemCost > 0) body += `Per Diems: ${formatMoney(perDiemCost)}\n`;
            if (reportingCost > 0) body += `Reporting Time: ${formatMoney(reportingCost)}\n`;
            if (travelChargeCost > 0) body += `Travel Charge (${jobDetails.technicians.length}x @ ${formatMoney(rates.travelChargeExBrisbane)}/tech): ${formatMoney(travelChargeCost)}\n`;

            extras.filter(e => (e.cost || 0) > 0).forEach(extra => {
                body += `${extra.description}: ${formatMoney(extra.cost || 0)}\n`;
            });

            body += `\nTotal: ${formatMoney(totalCost)}`;
        }

        if (jobDetails.externalLink) {
            body += `\n\nLink to Xero Quote: ${jobDetails.externalLink}`;
        }

        if (jobDetails.adminComments) {
            body += `\n\nComments: ${jobDetails.adminComments}`;
        }

        return body;
    };

    const handleCopyToClipboard = () => {
        copyText(generateInvoiceString()).then(() => showToast("Copied to clipboard!"));
    };

    const handleCopyBreakdown = () => {
        const textToCopy = showFullBreakdown ? generateShiftBreakdown() : generateShiftSummary();
        copyText(textToCopy).then(() =>
            showToast(showFullBreakdown ? "Detailed shift breakdown copied!" : "Shift summary copied!")
        );
    };

    return (
        <>
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
                            onClick={handleCopyToClipboard}
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
                                    onClick={handleCopyBreakdown}
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
        </>
    );
}
