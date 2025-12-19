import React, { useMemo, useState } from "react";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    Label,
} from "recharts";
import { TrendingUp, DollarSign, Clock, CheckCircle, FileText, Users, X } from "lucide-react";
import { Card, NeonButton } from "../components/ui/NeonUI";

// Status color mapping for charts
const STATUS_COLORS = {
    "Ready for Invoicing": "#eab308",
    "Parts Ordered": "#facc15",
    "Parts Required": "#fde047",
    "Paid": "#10b981",
    "Job Completed": "#34d399",
    "Shipped": "#0ea5e9",
    "Invoiced": "#38bdf8",
    "Job In Progress": "#7dd3fc",
    "PO Received": "#67e8f9",
    "Quoted": "#a5f3fc",
};

const TYPE_COLORS = {
    "Service": "#06b6d4",
    "Parts": "#8b5cf6",
    "Projects": "#f59e0b",
};

const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "8px",
        color: "#ffffff"
    },
    itemStyle: { color: "#ffffff" }
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, color = "cyan" }) => {
    const colors = {
        cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
        emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
        amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
        violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 backdrop-blur-sm`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                    {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
                </div>
                <Icon className="opacity-50" size={24} />
            </div>
        </div>
    );
};

// Job Types Bar Chart
const TypeBarChart = ({ data, onDrillDown }) => {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-violet-400" />
                Job Types
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#334155" }} />
                        <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('type', data.name)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={TYPE_COLORS[entry.name] || "#64748b"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// PO Value by Customer Chart (Key Accounts)
const CustomerValueChart = ({ data, onDrillDown }) => {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-400" />
                PO Value by Customer
            </h3>
            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            width={130}
                        />
                        <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(value) => [`$${value.toLocaleString()}`, "PO Value"]}
                            cursor={{ fill: "#334155" }}
                        />
                        <Bar
                            dataKey="value"
                            fill="#10b981"
                            radius={[0, 4, 4, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('customer', data.name)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Year-over-Year Performance Chart
const YearlyPerformanceChart = ({ data, onDrillDown }) => {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-cyan-400" />
                Year-over-Year Performance
            </h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="year"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(value, name) => {
                                if (name === "PO Value") return [`$${value.toLocaleString()}`, name];
                                return [value, name];
                            }}
                            cursor={{ fill: "#334155" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar
                            yAxisId="left"
                            dataKey="value"
                            name="PO Value"
                            fill="#06b6d4"
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('year', data.year)}
                        />
                        <Bar
                            yAxisId="right"
                            dataKey="jobs"
                            name="Total Jobs"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('year', data.year)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Monthly Revenue Bar Chart
const MonthlyRevenueChart = ({ data, onDrillDown }) => {
    // Calculate dynamic interval for X-axis labels
    const interval = data.length > 24 ? Math.floor(data.length / 12) : data.length > 12 ? 1 : 0;

    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-400" />
                Monthly PO Value
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            interval={interval}
                            angle={data.length > 12 ? -45 : 0}
                            textAnchor={data.length > 12 ? "end" : "middle"}
                            height={data.length > 12 ? 60 : 30}
                        />
                        <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(value) => [`$${value.toLocaleString()}`, "PO Value"]}
                            cursor={{ fill: "#334155" }}
                        />
                        <Bar
                            dataKey="value"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('month', data.monthKey)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Customer Jobs Bar Chart
const CustomerJobsChart = ({ data, onDrillDown }) => {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-amber-400" />
                Jobs by Customer
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            width={100}
                        />
                        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#334155" }} />
                        <Bar
                            dataKey="jobs"
                            fill="#f59e0b"
                            radius={[0, 4, 4, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('customer', data.name)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Lead Time PO to Invoice Chart
const LeadTimeChart = ({ data, onDrillDown }) => {
    // Calculate dynamic interval for X-axis labels
    const interval = data.length > 24 ? Math.floor(data.length / 12) : data.length > 12 ? 1 : 0;

    return (
        <Card className="p-6 col-span-full lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-amber-400" />
                Lead Time: PO to Invoice (Days)
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            interval={interval}
                            angle={data.length > 12 ? -45 : 0}
                            textAnchor={data.length > 12 ? "end" : "middle"}
                            height={data.length > 12 ? 60 : 30}
                        />
                        <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                            label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                        />
                        <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(value) => [`${value.toFixed(1)} days`, "Avg Lead Time"]}
                            cursor={{ fill: "#334155" }}
                        />
                        <Bar
                            dataKey="avgDays"
                            fill="#f59e0b"
                            radius={[4, 4, 0, 0]}
                            name="Avg Lead Time"
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('month', data.monthKey)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Monthly Revenue by Job Type (Line Chart - not stacked for clarity)
const RevenueByTypeChart = ({ data }) => {
    // Calculate dynamic interval for X-axis labels
    const interval = data.length > 24 ? Math.floor(data.length / 12) : data.length > 12 ? 1 : 0;

    return (
        <Card className="p-6 col-span-full">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-violet-400" />
                Monthly Revenue Trend by Job Type
            </h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="projectsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="serviceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="partsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            interval={interval}
                            angle={data.length > 12 ? -45 : 0}
                            textAnchor={data.length > 12 ? "end" : "middle"}
                            height={data.length > 12 ? 60 : 30}
                        />
                        <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                            cursor={{ stroke: "#64748b", strokeWidth: 1 }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Area
                            type="monotone"
                            dataKey="Projects"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            fill="url(#projectsGradient)"
                        />
                        <Area
                            type="monotone"
                            dataKey="Service"
                            stroke="#eab308"
                            strokeWidth={2}
                            fill="url(#serviceGradient)"
                        />
                        <Area
                            type="monotone"
                            dataKey="Parts"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fill="url(#partsGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Jobs Over Time Bar Chart
const JobsTrendChart = ({ data, onDrillDown }) => {
    // Calculate dynamic interval for X-axis labels
    const interval = data.length > 24 ? Math.floor(data.length / 12) : data.length > 12 ? 1 : 0;

    return (
        <Card className="p-6 col-span-full">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-sky-400" />
                Jobs Over Time
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            interval={interval}
                            angle={data.length > 12 ? -45 : 0}
                            textAnchor={data.length > 12 ? "end" : "middle"}
                            height={data.length > 12 ? 60 : 30}
                        />
                        <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#334155" }} />
                        <Bar
                            dataKey="jobs"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('month', data.monthKey)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Monthly Jobs Bar Chart
const MonthlyJobsChart = ({ data, onDrillDown }) => {
    // Calculate dynamic interval for X-axis labels
    const interval = data.length > 24 ? Math.floor(data.length / 12) : data.length > 12 ? 1 : 0;

    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-cyan-400" />
                Monthly Jobs
            </h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            axisLine={{ stroke: "#475569" }}
                            interval={interval}
                            angle={data.length > 12 ? -45 : 0}
                            textAnchor={data.length > 12 ? "end" : "middle"}
                            height={data.length > 12 ? 60 : 30}
                        />
                        <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={{ stroke: "#475569" }}
                        />
                        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#334155" }} />
                        <Bar
                            dataKey="jobs"
                            fill="#22d3d1"
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => onDrillDown && onDrillDown('month', data.monthKey)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default function JobSheetDashboard({ filteredData, allData, onDrillDown, drillDownFilter, yearType, onYearTypeChange }) {
    // Helper: Get month sort key based on year type
    const getMonthSortKey = (date, yearType) => {
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();
        if (yearType === "financial") {
            // FY: Jul=01, Aug=02, ..., Jun=12
            const fy = month < 6 ? year : year + 1;
            const fyMonth = month < 6 ? month + 7 : month - 5;
            return `${fy}-${String(fyMonth).padStart(2, '0')}`;
        }
        // Calendar: Jan=01, ..., Dec=12
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    };

    // Helper: Get month display label
    const getMonthLabel = (date, yearType) => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthName = date.toLocaleDateString('en-AU', { month: 'short' });
        const yearShort = String(year).slice(-2);
        return `${monthName} ${yearShort}`;
    };

    // Helper: Get month key for drill-down (YYYY-MM format)
    const getMonthKey = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // Calculate stats from filtered data (total overview)
    const stats = useMemo(() => {
        const totalJobs = filteredData.length;
        const totalPOValue = filteredData.reduce((sum, r) => sum + (parseFloat(r.poValueExGst) || 0), 0);
        const totalInvValue = filteredData.reduce((sum, r) => sum + (parseFloat(r.invValueExGst) || 0), 0);
        const pendingInvoicing = filteredData.filter(r => r.status === "Ready for Invoicing").length;
        const completedJobs = filteredData.filter(r => ["Paid", "Job Completed"].includes(r.status)).length;
        const inProgress = filteredData.filter(r => ["Job In Progress", "Shipped", "PO Received"].includes(r.status)).length;

        return { totalJobs, totalPOValue, totalInvValue, pendingInvoicing, completedJobs, inProgress };
    }, [filteredData]);

    // Type distribution
    const typeData = useMemo(() => {
        const counts = {};
        filteredData.forEach(r => {
            counts[r.type] = (counts[r.type] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    // Monthly PO Value data
    const monthlyData = useMemo(() => {
        const months = {};
        filteredData.forEach(r => {
            if (r.poDate && r.poDate !== 'Invalid Date') {
                const date = new Date(r.poDate);
                if (isNaN(date.getTime())) return;

                const sortKey = getMonthSortKey(date, yearType);
                const monthKey = getMonthKey(date);
                const displayLabel = getMonthLabel(date, yearType);
                const value = parseFloat(r.poValueExGst) || 0;

                if (!months[sortKey]) months[sortKey] = { value: 0, monthKey, displayLabel, sortKey };
                months[sortKey].value += value;
            }
        });
        return Object.values(months)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(data => ({
                month: data.displayLabel,
                monthKey: data.monthKey,
                value: data.value
            }));
    }, [filteredData, yearType]);

    // Customer PO value data (for key accounts)
    const customerValueData = useMemo(() => {
        const values = {};
        filteredData.forEach(r => {
            if (r.customer) {
                const val = parseFloat(r.poValueExGst) || 0;
                values[r.customer] = (values[r.customer] || 0) + val;
            }
        });
        return Object.entries(values)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Jobs trend by month (Jobs Over Time)
    const trendData = useMemo(() => {
        const months = {};
        filteredData.forEach(r => {
            if (r.poDate && r.poDate !== 'Invalid Date') {
                const date = new Date(r.poDate);
                if (isNaN(date.getTime())) return;

                const sortKey = getMonthSortKey(date, yearType);
                const monthKey = getMonthKey(date);
                const displayLabel = getMonthLabel(date, yearType);

                if (!months[sortKey]) months[sortKey] = { jobs: 0, monthKey, displayLabel, sortKey };
                months[sortKey].jobs += 1;
            }
        });
        return Object.values(months)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(data => ({
                month: data.displayLabel,
                monthKey: data.monthKey,
                jobs: data.jobs
            }));
    }, [filteredData, yearType]);

    // Year-over-year performance data
    const yearlyData = useMemo(() => {
        const years = {};
        filteredData.forEach(r => {
            if (r.poDate) {
                const date = new Date(r.poDate);
                if (isNaN(date.getTime())) return;

                let yearKey;
                if (yearType === "financial") {
                    const month = date.getMonth();
                    const year = date.getFullYear();
                    yearKey = month < 6 ? `FY${year}` : `FY${year + 1}`;
                } else {
                    yearKey = String(date.getFullYear());
                }

                const value = parseFloat(r.poValueExGst) || 0;
                if (!years[yearKey]) years[yearKey] = { jobs: 0, value: 0 };
                years[yearKey].jobs += 1;
                years[yearKey].value += value;
            }
        });
        return Object.entries(years)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([year, data]) => ({
                year,
                jobs: data.jobs,
                value: data.value
            }));
    }, [filteredData, yearType]);

    // Customer jobs count data
    const customerData = useMemo(() => {
        const counts = {};
        filteredData.forEach(r => {
            if (r.customer) {
                counts[r.customer] = (counts[r.customer] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, jobs]) => ({ name, jobs }))
            .sort((a, b) => b.jobs - a.jobs);
    }, [filteredData]);

    // Lead Time: PO to Invoice (average days per month)
    // Cap at 365 days to filter out data errors/outliers
    const leadTimeData = useMemo(() => {
        const months = {};
        filteredData.forEach(r => {
            if (r.poDate && r.invDate && r.poDate !== 'Invalid Date' && r.invDate !== 'Invalid Date') {
                const poDate = new Date(r.poDate);
                const invDate = new Date(r.invDate);
                if (isNaN(poDate.getTime()) || isNaN(invDate.getTime())) return;

                const daysDiff = (invDate - poDate) / (1000 * 60 * 60 * 24);
                // Skip invalid data: negative days or more than 365 days (likely data errors)
                if (daysDiff < 0 || daysDiff > 365) return;

                const sortKey = getMonthSortKey(poDate, yearType);
                const monthKey = getMonthKey(poDate);
                const displayLabel = getMonthLabel(poDate, yearType);

                if (!months[sortKey]) months[sortKey] = { totalDays: 0, count: 0, monthKey, displayLabel, sortKey };
                months[sortKey].totalDays += daysDiff;
                months[sortKey].count += 1;
            }
        });
        return Object.values(months)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(data => ({
                month: data.displayLabel,
                monthKey: data.monthKey,
                avgDays: data.count > 0 ? data.totalDays / data.count : 0
            }));
    }, [filteredData, yearType]);

    // Monthly Revenue by Job Type (for stacked area chart)
    const revenueByTypeData = useMemo(() => {
        const months = {};
        filteredData.forEach(r => {
            if (r.poDate && r.poDate !== 'Invalid Date') {
                const date = new Date(r.poDate);
                if (isNaN(date.getTime())) return;

                const sortKey = getMonthSortKey(date, yearType);
                const monthKey = getMonthKey(date);
                const displayLabel = getMonthLabel(date, yearType);
                const value = parseFloat(r.poValueExGst) || 0;
                const type = r.type || 'Other';

                if (!months[sortKey]) months[sortKey] = { Service: 0, Parts: 0, Projects: 0, monthKey, displayLabel, sortKey };
                if (type === 'Service') months[sortKey].Service += value;
                else if (type === 'Parts') months[sortKey].Parts += value;
                else if (type === 'Projects') months[sortKey].Projects += value;
            }
        });
        return Object.values(months)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(data => ({
                month: data.displayLabel,
                monthKey: data.monthKey,
                Service: data.Service,
                Parts: data.Parts,
                Projects: data.Projects
            }));
    }, [filteredData, yearType]);

    // Monthly Jobs count data (new chart)
    const monthlyJobsData = useMemo(() => {
        const months = {};
        filteredData.forEach(r => {
            if (r.poDate && r.poDate !== 'Invalid Date') {
                const date = new Date(r.poDate);
                if (isNaN(date.getTime())) return;

                const sortKey = getMonthSortKey(date, yearType);
                const monthKey = getMonthKey(date);
                const displayLabel = getMonthLabel(date, yearType);

                if (!months[sortKey]) months[sortKey] = { jobs: 0, monthKey, displayLabel, sortKey };
                months[sortKey].jobs += 1;
            }
        });
        return Object.values(months)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(data => ({
                month: data.displayLabel,
                monthKey: data.monthKey,
                jobs: data.jobs
            }));
    }, [filteredData, yearType]);

    return (
        <div className="space-y-6">
            {/* Drill Down Filter Badge */}
            {drillDownFilter && (
                <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-amber-400" />
                            <span className="text-sm text-slate-200">
                                Chart Filter: <span className="font-bold text-amber-300">{drillDownFilter.type}</span> = <span className="font-bold">{drillDownFilter.value}</span>
                            </span>
                        </div>
                        <NeonButton
                            variant="slate"
                            className="text-xs px-2 py-1"
                            onClick={() => onDrillDown && onDrillDown(null, null)}
                        >
                            <X size={12} /> Clear
                        </NeonButton>
                    </div>
                </Card>
            )}

            {/* Dashboard Heading with Year Type Toggle */}
            <Card className="p-4 bg-slate-900/50 border-slate-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">
                        {yearType === "calendar" ? "Calendar Year Data" : "Financial Year Data (AU)"}
                    </h2>
                    <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                        <button
                            onClick={() => onYearTypeChange && onYearTypeChange("calendar")}
                            className={`px-4 py-2 text-sm transition ${yearType === "calendar"
                                ? "bg-cyan-500/20 text-cyan-300 font-bold"
                                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            Calendar Year
                        </button>
                        <button
                            onClick={() => onYearTypeChange && onYearTypeChange("financial")}
                            className={`px-4 py-2 text-sm transition ${yearType === "financial"
                                ? "bg-cyan-500/20 text-cyan-300 font-bold"
                                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            Financial Year (AU)
                        </button>
                    </div>
                </div>
            </Card>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={FileText}
                    label="Total Jobs"
                    value={stats.totalJobs}
                    color="cyan"
                />
                <StatCard
                    icon={DollarSign}
                    label="Total PO Value"
                    value={`$${stats.totalPOValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    color="emerald"
                />
                <StatCard
                    icon={DollarSign}
                    label="Invoice Value"
                    value={`$${stats.totalInvValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    color="violet"
                />
                <StatCard
                    icon={Clock}
                    label="Pending Invoicing"
                    value={stats.pendingInvoicing}
                    subValue="Ready for invoice"
                    color="amber"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Completed"
                    value={stats.completedJobs}
                    subValue="Paid or completed"
                    color="emerald"
                />
                <StatCard
                    icon={TrendingUp}
                    label="In Progress"
                    value={stats.inProgress}
                    subValue="Active jobs"
                    color="cyan"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <CustomerValueChart data={customerValueData} onDrillDown={onDrillDown} />
                <TypeBarChart data={typeData} onDrillDown={onDrillDown} />
                <MonthlyRevenueChart data={monthlyData} onDrillDown={onDrillDown} />
                <CustomerJobsChart data={customerData} onDrillDown={onDrillDown} />
                <YearlyPerformanceChart data={yearlyData} onDrillDown={onDrillDown} />
                <MonthlyJobsChart data={monthlyJobsData} onDrillDown={onDrillDown} />
                <LeadTimeChart data={leadTimeData} onDrillDown={onDrillDown} />
            </div>

            {/* Full Width Jobs Over Time */}
            <JobsTrendChart data={trendData} onDrillDown={onDrillDown} />

            {/* Monthly Revenue by Job Type */}
            <RevenueByTypeChart data={revenueByTypeData} />
        </div>
    );
}
