import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface ProfitabilityChartProps {
    revenue: number;
    cost: number;
    profit: number;
}

const ProfitabilityChart: React.FC<ProfitabilityChartProps> = ({ revenue, cost, profit }) => {
    const data = [
        {
            name: 'Revenue',
            value: revenue,
            color: '#10b981' // emerald-500
        },
        {
            name: 'Cost',
            value: cost, // Cost should be positive for the chart height, but we'll display it as negative in tooltip if needed
            color: '#ef4444' // red-500
        },
        {
            name: 'Profit',
            value: profit,
            color: profit >= 0 ? '#34d399' : '#f87171' // emerald-400 or red-400
        }
    ];

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="h-64 w-full mt-4 bg-gray-900/30 rounded border border-gray-700 p-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8" // slate-400
                        tick={{ fill: '#94a3b8' }}
                        axisLine={{ stroke: '#475569' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        tickFormatter={(val) => `$${val / 1000}k`}
                        axisLine={{ stroke: '#475569' }}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#475569',
                            color: '#e2e8f0'
                        }}
                        formatter={(value: number) => [formatMoney(value), '']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProfitabilityChart;
