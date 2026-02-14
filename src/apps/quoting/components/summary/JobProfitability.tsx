import { X, Plus } from 'lucide-react';
import type { useQuote } from '../../hooks/useQuote';
import { formatMoney } from '../../utils/formatters';
import ProfitabilityChart from '../ProfitabilityChart';

interface JobProfitabilityProps {
    quote: ReturnType<typeof useQuote>;
}

export default function JobProfitability({ quote }: JobProfitabilityProps) {
    const { totalCost, totalNTHrs, totalOTHrs, rates, internalExpenses } = quote;

    const totalRevenue = totalCost;
    const totalLaborHours = totalNTHrs + totalOTHrs;
    const internalLaborCost = totalLaborHours * (rates.costOfLabour || 0);
    const totalInternalExpenses = (internalExpenses || []).reduce((acc, e) => acc + (e.cost || 0), 0);
    const grossProfit = totalRevenue - (internalLaborCost + totalInternalExpenses);
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const addInternalExpense = () => {
        const newExpense = { id: crypto.randomUUID(), description: '', cost: 0 };
        quote.setInternalExpenses([...(internalExpenses || []), newExpense]);
    };

    const updateInternalExpense = (id: string, field: any, value: any) => {
        const newExpenses = (internalExpenses || []).map(e =>
            e.id === id ? { ...e, [field]: value } : e
        );
        quote.setInternalExpenses(newExpenses);
    };

    const removeInternalExpense = (id: string) => {
        const newExpenses = (internalExpenses || []).filter(e => e.id !== id);
        quote.setInternalExpenses(newExpenses);
    };

    return (
        <div>
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
                        {(internalExpenses || []).length === 0 && (
                            <p className="text-sm text-slate-600 italic py-2 text-center">No extra internal costs added.</p>
                        )}

                        {(internalExpenses || []).map((item) => (
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

            {/* Visualization Graph */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                <ProfitabilityChart
                    revenue={totalCost}
                    cost={internalLaborCost + totalInternalExpenses}
                    profit={grossProfit}
                />
            </div>
        </div>
    );
}
