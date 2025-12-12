import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import type { Quote } from '../types';
import { getTaxYearsFromDates, getCurrentTaxYear, isDateInTaxYear, type TaxYear } from '../utils/taxYearUtils';

interface QuoteValueChartProps {
    quotes: Quote[];
    calculateQuoteTotal: (quote: Quote) => number;
}

interface ChartDataPoint {
    date: string;
    displayDate: string;
    quotedValue: number;
    invoicedValue: number;
    quotedCount: number;
    invoicedCount: number;
}

export default function QuoteValueChart({ quotes, calculateQuoteTotal }: QuoteValueChartProps) {
    // Filter quotes by status
    const quotedQuotes = useMemo(() =>
        quotes.filter(q => q.status === 'quoted'),
        [quotes]
    );

    const invoicedQuotes = useMemo(() =>
        quotes.filter(q => q.status === 'invoice' || q.status === 'closed'),
        [quotes]
    );

    // Get available tax years from all quotes
    const availableTaxYears = useMemo(() => {
        const dates = quotes.map(q => new Date(q.lastModified));
        return getTaxYearsFromDates(dates);
    }, [quotes]);

    const [selectedTaxYear, setSelectedTaxYear] = useState<TaxYear>(() => {
        // Default to current tax year or first available
        const current = getCurrentTaxYear();
        return availableTaxYears.find(ty => ty.startYear === current.startYear) || availableTaxYears[0] || current;
    });

    // Generate chart data
    const chartData = useMemo(() => {
        if (!selectedTaxYear) return [];

        // Filter quotes for selected tax year
        const filteredQuoted = quotedQuotes.filter(q =>
            isDateInTaxYear(new Date(q.lastModified), selectedTaxYear)
        );

        const filteredInvoiced = invoicedQuotes.filter(q =>
            isDateInTaxYear(new Date(q.lastModified), selectedTaxYear)
        );

        // Combine all quotes and get unique dates
        const allQuotes = [...filteredQuoted, ...filteredInvoiced];
        if (allQuotes.length === 0) return [];

        // Sort all quotes by date
        const sortedQuotes = [...allQuotes].sort((a, b) => a.lastModified - b.lastModified);

        // Create data points
        const dataPoints: ChartDataPoint[] = [];
        let quotedCumulative = 0;
        let invoicedCumulative = 0;
        let quotedCountCumulative = 0;
        let invoicedCountCumulative = 0;

        // Track which quotes we've processed
        const processedQuoted = new Set<string>();
        const processedInvoiced = new Set<string>();

        sortedQuotes.forEach((quote) => {
            const date = new Date(quote.lastModified);
            const value = calculateQuoteTotal(quote);

            // Update cumulative values based on status
            if (quote.status === 'quoted' && !processedQuoted.has(quote.id)) {
                quotedCumulative += value;
                quotedCountCumulative++;
                processedQuoted.add(quote.id);
            } else if ((quote.status === 'invoice' || quote.status === 'closed') && !processedInvoiced.has(quote.id)) {
                invoicedCumulative += value;
                invoicedCountCumulative++;
                processedInvoiced.add(quote.id);
            }

            dataPoints.push({
                date: date.toISOString(),
                displayDate: date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
                quotedValue: quotedCumulative,
                invoicedValue: invoicedCumulative,
                quotedCount: quotedCountCumulative,
                invoicedCount: invoicedCountCumulative
            });
        });

        return dataPoints;
    }, [quotedQuotes, invoicedQuotes, selectedTaxYear, calculateQuoteTotal]);

    const totalQuotedValue = chartData.length > 0 ? chartData[chartData.length - 1].quotedValue : 0;
    const totalInvoicedValue = chartData.length > 0 ? chartData[chartData.length - 1].invoicedValue : 0;
    const quotedCount = chartData.length > 0 ? chartData[chartData.length - 1].quotedCount : 0;
    const invoicedCount = chartData.length > 0 ? chartData[chartData.length - 1].invoicedCount : 0;

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-400" />
                        Quote Value Growth
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Cumulative quoted vs invoiced values over time
                    </p>
                </div>

                {/* Tax Year Selector */}
                <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-slate-400" />
                    <select
                        value={selectedTaxYear?.startYear || ''}
                        onChange={(e) => {
                            const year = parseInt(e.target.value);
                            const taxYear = availableTaxYears.find(ty => ty.startYear === year);
                            if (taxYear) setSelectedTaxYear(taxYear);
                        }}
                        className="bg-gray-700 text-slate-200 px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    >
                        {availableTaxYears.map(ty => (
                            <option key={ty.startYear} value={ty.startYear}>
                                {ty.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <p className="text-xs text-amber-400 uppercase tracking-wide mb-1 font-semibold">Quoted Value</p>
                    <p className="text-2xl font-bold text-amber-400">
                        {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(totalQuotedValue)}
                    </p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <p className="text-xs text-amber-300 uppercase tracking-wide mb-1">Quotes</p>
                    <p className="text-2xl font-bold text-amber-300">
                        {quotedCount}
                    </p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <p className="text-xs text-purple-400 uppercase tracking-wide mb-1 font-semibold">Invoiced Value</p>
                    <p className="text-2xl font-bold text-purple-400">
                        {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(totalInvoicedValue)}
                    </p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">Invoices</p>
                    <p className="text-2xl font-bold text-purple-300">
                        {invoicedCount}
                    </p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorQuoted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#e5e7eb'
                            }}
                            formatter={(value: number, name: string) => [
                                new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value),
                                name === 'quotedValue' ? 'Quoted' : 'Invoiced'
                            ]}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => value === 'quotedValue' ? 'Quoted Value' : 'Invoiced Value'}
                        />
                        <Area
                            type="monotone"
                            dataKey="quotedValue"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fill="url(#colorQuoted)"
                            name="quotedValue"
                        />
                        <Area
                            type="monotone"
                            dataKey="invoicedValue"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fill="url(#colorInvoiced)"
                            name="invoicedValue"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[350px] flex flex-col items-center justify-center text-slate-400">
                    <TrendingUp size={48} className="opacity-20 mb-4" />
                    <p className="text-lg font-medium">No data for {selectedTaxYear?.label}</p>
                    <p className="text-sm mt-2">Create quotes to see the chart</p>
                </div>
            )}
        </div>
    );
}
