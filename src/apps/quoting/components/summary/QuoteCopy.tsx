import { Copy, FileText } from 'lucide-react';
import type { Shift, Rates, ExtraItem, JobDetails, CalculatedShift } from '../../types';
import { formatMoney, copyText } from '../../utils/formatters';
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

interface QuoteCopyProps {
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

export default function QuoteCopy({
    shifts, rates, extras, jobDetails,
    totalNTHrs, totalOTHrs, totalCost,
    reportingCost, travelChargeCost, calculateShiftBreakdown
}: QuoteCopyProps) {
    const { showToast } = useToast();
    const settings = { ...DEFAULTS, ...rates.copyTemplateSettings };

    const generateQuoteCopyString = () => {
        const parts: string[] = [];

        // Intro text
        if (settings.quoteIntro) {
            parts.push(settings.quoteIntro);
        }

        // Scope of works
        if (jobDetails.description) {
            parts.push(jobDetails.description);
        }

        // Tech notes
        if (settings.quoteIncludeTechNotes && jobDetails.techNotes) {
            parts.push(jobDetails.techNotes);
        }

        // Schedule from shifts
        if (settings.quoteIncludeSchedule && shifts.length > 0) {
            const shiftsByDate = new Map<string, typeof shifts>();
            shifts.forEach(shift => {
                if (!shiftsByDate.has(shift.date)) {
                    shiftsByDate.set(shift.date, []);
                }
                shiftsByDate.get(shift.date)!.push(shift);
            });

            const sortedDates = Array.from(shiftsByDate.keys()).sort();
            if (sortedDates.length > 0) {
                let schedule = '';
                let dayNumber = 1;
                sortedDates.forEach(dateStr => {
                    const dayShifts = shiftsByDate.get(dateStr)!;
                    const date = new Date(dateStr + 'T00:00:00');
                    const dayName = date.toLocaleDateString('en-AU', { weekday: 'long' });
                    const monthName = date.toLocaleDateString('en-AU', { month: 'long' });
                    const dayOfMonth = date.getDate();

                    const isTravelDay = dayShifts.some(s => s.isTravelDay);
                    const techCount = dayShifts.length;
                    const dayLabel = isTravelDay ? 'Travel' : 'Site works';
                    const techSuffix = !isTravelDay && techCount > 1 ? ` (${techCount} techs)` : '';

                    schedule += `Day ${dayNumber} - ${dayName} ${monthName} ${dayOfMonth} - ${dayLabel}${techSuffix}\n`;
                    dayNumber++;
                });
                parts.push(schedule.trimEnd());
            }
        }

        // Line items breakdown
        if (settings.quoteIncludeLineItems) {
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

            const vehicleCount = shifts.filter(s => s.vehicle).length;
            const vehicleCost = vehicleCount * rates.vehicle;
            const perDiemCount = shifts.filter(s => s.perDiem).length;
            const perDiemCost = perDiemCount * rates.perDiem;

            let lineItems = '---\nLINE ITEMS\n';
            lineItems += `Labor (Normal): ${totalNTHrs.toFixed(2)}h @ ${formatMoney(rates.siteNormal)}/hr = ${formatMoney(totalNTCost)}\n`;
            if (totalOTHrs > 0) {
                lineItems += `Labor (Overtime): ${totalOTHrs.toFixed(2)}h = ${formatMoney(totalOTCost)}\n`;
            }
            if (vehicleCost > 0) lineItems += `Vehicle Allowance: ${vehicleCount}x @ ${formatMoney(rates.vehicle)} = ${formatMoney(vehicleCost)}\n`;
            if (perDiemCost > 0) lineItems += `Per Diem: ${perDiemCount}x @ ${formatMoney(rates.perDiem)} = ${formatMoney(perDiemCost)}\n`;
            if (reportingCost > 0) lineItems += `Reporting Time: ${jobDetails.reportingTime}h @ ${formatMoney(rates.officeReporting)}/hr = ${formatMoney(reportingCost)}\n`;
            if (travelChargeCost > 0) lineItems += `Travel Charge: ${jobDetails.technicians.length}x @ ${formatMoney(rates.travelChargeExBrisbane)}/tech = ${formatMoney(travelChargeCost)}\n`;

            extras.filter(e => (e.cost || 0) > 0).forEach(extra => {
                lineItems += `${extra.description || 'Extra Item'}: ${formatMoney(extra.cost || 0)}\n`;
            });

            lineItems += `\nTOTAL: ${formatMoney(totalCost)}`;
            parts.push(lineItems);
        }

        // Outro text
        if (settings.quoteOutro) {
            parts.push(settings.quoteOutro);
        }

        return parts.join('\n\n');
    };

    const copyScope = () => {
        copyText(jobDetails.description || '').then(() => showToast('Scope copied to clipboard!'));
    };

    const copyFullQuote = () => {
        copyText(generateQuoteCopyString()).then(() => showToast('Full quote copied to clipboard!'));
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Quote Copy</h2>
                <div className="flex gap-2">
                    <button
                        onClick={copyScope}
                        className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-gray-600"
                    >
                        <FileText size={16} /> Copy Scope
                    </button>
                    <button
                        onClick={copyFullQuote}
                        className="bg-primary-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-primary-700"
                    >
                        <Copy size={16} /> Copy Full Quote
                    </button>
                </div>
            </div>
            <p className="text-sm text-slate-400 mb-2">
                Copy scope for Xero description, or the full quote with schedule and line items.
            </p>
            <textarea
                readOnly
                className="w-full h-64 p-3 font-mono text-sm bg-gray-700 text-slate-100 border border-gray-600 rounded focus:outline-none"
                value={generateQuoteCopyString()}
            />
        </div>
    );
}
