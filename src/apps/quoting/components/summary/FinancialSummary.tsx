import type { Shift, Rates, ExtraItem, JobDetails, CalculatedShift } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface FinancialSummaryProps {
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

export default function FinancialSummary({
    shifts, rates, extras, jobDetails,
    totalNTHrs, totalOTHrs, totalCost,
    reportingCost, travelChargeCost, calculateShiftBreakdown
}: FinancialSummaryProps) {
    const vehicleCount = shifts.filter(s => s.vehicle).length;
    const perDiemCount = shifts.filter(s => s.perDiem).length;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
            <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider mb-4">Financial Summary</h2>

            <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-slate-300">Labor (Normal) ({totalNTHrs.toFixed(2)}h @ {formatMoney(rates.siteNormal)}/hr)</span>
                    <span className="font-mono">
                        {formatMoney(shifts.reduce((acc, s) => {
                            const { breakdown } = calculateShiftBreakdown(s);
                            const siteNTCost = Math.round(breakdown.siteNT * 100) / 100 * rates.siteNormal;
                            const travelNTCost = (Math.round(breakdown.travelInNT * 100) / 100 + Math.round(breakdown.travelOutNT * 100) / 100) * rates.siteNormal;
                            return acc + siteNTCost + travelNTCost;
                        }, 0))}
                    </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-slate-300">
                        Labor (Overtime) ({totalOTHrs.toFixed(2)}h{
                            (() => {
                                const otRates = new Set();
                                shifts.forEach(s => {
                                    const { breakdown } = calculateShiftBreakdown(s);
                                    const otHours = breakdown.siteOT + breakdown.travelInOT + breakdown.travelOutOT;
                                    if (otHours > 0.01) {
                                        const rate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
                                        otRates.add(rate);
                                    }
                                });
                                if (otRates.size === 1) {
                                    const rate = Array.from(otRates)[0] as number;
                                    return ` @ ${formatMoney(rate)}/hr`;
                                } else if (otRates.size > 1) {
                                    const sortedRates = Array.from(otRates).sort((a, b) => (a as number) - (b as number));
                                    const rateString = sortedRates.map(r => formatMoney(r as number)).join(', ');
                                    return ` @ Mixed (${rateString})`;
                                }
                                return '';
                            })()
                        })
                    </span>
                    <span className="font-mono">
                        {formatMoney(shifts.reduce((acc, s) => {
                            const { breakdown } = calculateShiftBreakdown(s);
                            const siteOTRate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
                            const siteOTCost = Math.round(breakdown.siteOT * 100) / 100 * siteOTRate;
                            const travelOTRate = s.dayType === 'publicHoliday' ? rates.publicHoliday : (s.dayType === 'weekend' ? rates.weekend : rates.siteOvertime);
                            const travelOTCost = (Math.round(breakdown.travelInOT * 100) / 100 + Math.round(breakdown.travelOutOT * 100) / 100) * travelOTRate;
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
                        <span className="text-slate-300">Travel Charge ({jobDetails.technicians.length}x @ {formatMoney(rates.travelChargeExBrisbane)}/tech)</span>
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
    );
}
