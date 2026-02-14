import { TrendingUp } from 'lucide-react';
import { useQuote } from '../hooks/useQuote';
import { formatMoney } from '../utils/formatters';
import StatusHeader from './summary/StatusHeader';
import FinancialSummary from './summary/FinancialSummary';
import QuoteCopy from './summary/QuoteCopy';
import InvoiceCopy from './summary/InvoiceCopy';
import AdminCommunication from './summary/AdminCommunication';
import JobProfitability from './summary/JobProfitability';
import CollapsibleSection from './summary/CollapsibleSection';

interface SummaryProps {
    quote: ReturnType<typeof useQuote>;
}

export default function Summary({ quote }: SummaryProps) {
    const {
        shifts, extras, rates, calculateShiftBreakdown, totalCost, jobDetails,
        reportingCost, travelChargeCost, totalNTHrs, totalOTHrs
    } = quote;

    // Profitability summary for collapsed state
    const totalLaborHours = totalNTHrs + totalOTHrs;
    const internalLaborCost = totalLaborHours * (rates.costOfLabour || 0);
    const totalInternalExpenses = (quote.internalExpenses || []).reduce((acc, e) => acc + (e.cost || 0), 0);
    const grossProfit = totalCost - (internalLaborCost + totalInternalExpenses);
    const grossMargin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

    return (
        <div className="space-y-6">
            <StatusHeader quote={quote} />

            <FinancialSummary
                shifts={shifts}
                rates={rates}
                extras={extras}
                jobDetails={jobDetails}
                totalNTHrs={totalNTHrs}
                totalOTHrs={totalOTHrs}
                totalCost={totalCost}
                reportingCost={reportingCost}
                travelChargeCost={travelChargeCost}
                calculateShiftBreakdown={calculateShiftBreakdown}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QuoteCopy
                    shifts={shifts}
                    rates={rates}
                    extras={extras}
                    jobDetails={jobDetails}
                    totalNTHrs={totalNTHrs}
                    totalOTHrs={totalOTHrs}
                    totalCost={totalCost}
                    reportingCost={reportingCost}
                    travelChargeCost={travelChargeCost}
                    calculateShiftBreakdown={calculateShiftBreakdown}
                />
                <InvoiceCopy
                    shifts={shifts}
                    rates={rates}
                    extras={extras}
                    jobDetails={jobDetails}
                    totalNTHrs={totalNTHrs}
                    totalOTHrs={totalOTHrs}
                    totalCost={totalCost}
                    reportingCost={reportingCost}
                    travelChargeCost={travelChargeCost}
                    calculateShiftBreakdown={calculateShiftBreakdown}
                />
            </div>

            <CollapsibleSection
                title="Admin Communication"
                defaultCollapsed={false}
            >
                <AdminCommunication quote={quote} />
            </CollapsibleSection>

            <CollapsibleSection
                title="Job Profitability"
                icon={<span className="text-amber-500"><TrendingUp size={20} /></span>}
                badge={
                    <span className="bg-amber-900/40 text-amber-500 text-xs px-2 py-0.5 rounded font-medium tracking-wider ml-2">
                        INTERNAL
                    </span>
                }
                defaultCollapsed={true}
                borderColor="border-amber-600/50"
                collapsedSummary={
                    <span className="flex items-center gap-4">
                        <span className={grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            Profit: {formatMoney(grossProfit)}
                        </span>
                        <span className={`font-bold ${grossMargin >= 30 ? 'text-emerald-400' : grossMargin > 15 ? 'text-amber-400' : 'text-red-500'}`}>
                            {grossMargin.toFixed(1)}%
                        </span>
                    </span>
                }
            >
                <JobProfitability quote={quote} />
            </CollapsibleSection>
        </div>
    );
}
