import React, { useState } from 'react';
import { Button, Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { useFilterContext } from '../hooks/useFilterContext';
import { useUIContext } from '../hooks/useUIContext';

// HELPER: Normalize Report Data (The "Cross Fix")
// This makes sure both Old PDF Uploads and New Digital Reports look the same to the charts
const getNormalizedReportData = (report) => {
    // 1. Check if it's a NEW Digital Report (Look for the structured 'calibration' object)
    const isDigital = report.data && report.data.calibration;

    if (isDigital) {
        const cal = report.data.calibration;
        const gen = report.data.general || {};
        return {
            id: report.id,
            date: report.date || gen.date,
            type: 'Digital',
            // Chart Metrics
            zero: parseFloat(cal.newTare || 0),
            span: parseFloat(cal.newSpan || 0),
            speed: parseFloat(cal.newSpeed || 0),
            // Pass-through for existing charts (mapped from new fields if available, or calc logic needed)
            // Assuming newTare is close to tareChange or we use what we have. 
            // User requested mapping zero -> newTare. 
            tareChange: parseFloat(cal.tareChange || 0),
            spanChange: parseFloat(cal.spanChange || 0),
            zeroMV: parseFloat(cal.zero || 0), // Mapping 'zero' signal
            spanMV: parseFloat(cal.span || 0),

            // Display Info
            technician: gen.technicians || 'Unknown',
            comments: gen.comments || '',
            fileName: `Digital Report ${gen.reportId || ''}`
        };
    }

    // 2. Fallback to OLD Uploaded Report (Flat properties)
    return {
        id: report.id,
        date: report.date,
        type: 'Upload',
        // Chart Metrics (Handle legacy field names like zeroMV vs newTare)
        zero: parseFloat(report.newTare || report.zeroMV || 0),
        span: parseFloat(report.newSpan || report.spanMV || 0),
        speed: parseFloat(report.beltSpeed || report.speed || 0),

        // Preserve existing fields for charts
        tareChange: parseFloat(report.tareChange || 0),
        spanChange: parseFloat(report.spanChange || 0),
        zeroMV: parseFloat(report.zeroMV || 0),
        spanMV: parseFloat(report.spanMV || 0),

        // Display Info
        technician: report.technician || 'Unknown',
        comments: (report.comments && report.comments[0] && report.comments[0].text) || '',
        fileName: report.fileName || 'Uploaded PDF'
    };
};

// HELPER: Extract display code from any report format
const getReportDisplayCode = (report) => {
    if (report.data?.general?.reportId) return report.data.general.reportId;
    if (report.fileName) return report.fileName.replace(/\.pdf$/i, '');
    return report.date ? `Report-${report.date}` : 'Unknown Report';
};

// --- REPORT DETAILS MODAL ---
const ReportDetailsModal = ({ report, siteLocation, onClose }) => {

    if (!report) {
        return (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-3xl p-6 text-center text-slate-400">
                    <p className="text-lg mb-4">Report data could not be loaded.</p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        );
    }

    // Safely access report properties with fallback to 'N/A' or default values
    const reportDate = report.date ? formatDate(report.date) : 'N/A';
    const technician = report.technician || 'N/A';
    const fileName = report.fileName || 'N/A';
    const tareChange = typeof report.tareChange === 'number' ? report.tareChange : 0;
    const spanChange = typeof report.spanChange === 'number' ? report.spanChange : 0;
    const zeroMV = typeof report.zeroMV === 'number' ? report.zeroMV : 'N/A';
    const spanMV = typeof report.spanMV === 'number' ? report.spanMV : 'N/A';
    const speed = typeof report.speed === 'number' ? report.speed : 'N/A';
    const totaliser = typeof report.totaliser === 'number' ? report.totaliser : 'N/A';
    const comments = report.comments || [];

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-blue-900/50 to-slate-900/50">
                    <div>
                        <h3 className="font-semibold text-2xl text-slate-100">📄 Service Report Details</h3>
                        <p className="text-sm text-slate-400 mt-1">{fileName}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-2xl">
                        <Icons.X />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Service Date</div>
                            <div className="text-2xl font-bold text-white">{reportDate}</div>

                            {/* Location Section */}
                            {siteLocation && (
                                <div className="mt-3 pt-3 border-t border-slate-800">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <Icons.MapPin size={12} /> Location
                                    </div>
                                    <div className="text-sm font-medium text-slate-200">{siteLocation}</div>
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Technician</div>
                            <div className="text-2xl font-bold text-white">{technician}</div>
                        </div>
                    </div>

                    {/* Calibration Metrics */}
                    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-5 border border-blue-700/50">
                        <h4 className="text-sm font-bold text-blue-300 uppercase mb-4 flex items-center gap-2">
                            🎯 Calibration Metrics
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Tare Change</div>
                                <div className={`text-3xl font-bold ${Math.abs(tareChange) > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
                                    {tareChange > 0 ? '+' : ''}{tareChange}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Span Change</div>
                                <div className={`text-3xl font-bold ${Math.abs(spanChange) > 0.25 ? 'text-yellow-400' : 'text-blue-400'}`}>
                                    {spanChange > 0 ? '+' : ''}{spanChange}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Zero mV/V</div>
                                <div className="text-2xl font-mono text-purple-400">{zeroMV} mV</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Span mV/V</div>
                                <div className="text-2xl font-mono text-pink-400">{spanMV} mV</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Belt Speed</div>
                                <div className="text-2xl font-mono text-green-400">{speed} m/s</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Totaliser</div>
                                <div className="text-2xl font-mono text-orange-400">{totaliser} t</div>
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    {comments.length > 0 && (
                        <div className="bg-amber-900/20 rounded-lg p-5 border border-amber-700/50">
                            <h4 className="text-sm font-bold text-amber-300 uppercase mb-3 flex items-center gap-2">
                                💬 Comments & Issues
                            </h4>
                            {comments.map((comment, idx) => (
                                <div key={idx} className="bg-slate-900/50 rounded p-3 mb-2 last:mb-0">
                                    <div className="text-sm text-slate-200 whitespace-pre-wrap">{comment.text}</div>
                                    {comment.status && (
                                        <div className="text-xs text-slate-400 mt-1">Status: {comment.status}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-700">
                        <Button onClick={onClose} className="flex-1">Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- EXPANDABLE CHART MODAL ---
const ExpandedChartModal = ({ title, description, children, onClose }) => (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-[80vw] max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50">
                <div>
                    <h3 className="font-semibold text-2xl text-slate-100">{title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{description}</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-2xl"><Icons.X /></button>
            </div>
            <div className="p-4">{children}</div> {/* Adjusted padding */}
        </div>
    </div>
);

// --- ENHANCED LINE CHART (with clickable data points) ---
const MiniLineChart = ({ data, dataKeys, colors, min, max, unit, isExpanded = false, showTrendLine = false }) => {
    // If there's no data or only one point, show a message.
    // However, if there's exactly one point, we still want to render it as a dot.
    if (!data || data.length === 0) return <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic">No data available</div>;

    const height = isExpanded ? 'h-[400px]' : 'h-32'; // Fixed height for expanded chart
    const fontSize = isExpanded ? 'text-sm' : 'text-[9px]';
    const dotSize = isExpanded ? 'w-4 h-4' : 'w-3 h-3';

    // Filter out NaN values for min/max calculation to avoid NaN range
    const allVals = data.flatMap(d => dataKeys.map(k => d[k]));
    const allValidVals = allVals.filter(v => typeof v === 'number' && !isNaN(v));

    // Default to 0 and 1 if no valid data points to prevent division by zero or NaN ranges
    const dataMin = min !== undefined ? min : (allValidVals.length > 0 ? Math.min(...allValidVals) : 0);
    const dataMax = max !== undefined ? max : (allValidVals.length > 0 ? Math.max(...allValidVals) : 1);

    const range = dataMax - dataMin || 1; // Ensure range is not zero
    const padding = range * 0.1;

    const normalize = (val) => {
        if (typeof val !== 'number' || isNaN(val)) return 100; // Place NaN values at bottom of chart
        return 100 - ((val - (dataMin - padding)) / (range + padding * 2)) * 100;
    };

    // Determine if x-axis labels need to scroll
    const showScrollableXAxis = data.length > (isExpanded ? 10 : 5);
    const scrollContentWidth = showScrollableXAxis ? `${data.length * (isExpanded ? 100 : 60)}px` : '100%'; // Dynamic width for scrollable content

    // Linear regression for trend line
    const calculateTrendLine = (dataPoints, key) => {
        const validPoints = dataPoints.map((d) => ({
            x: new Date(d.date).getTime(), // Convert date to numeric value
            y: d[key]
        })).filter(p => typeof p.y === 'number' && !isNaN(p.y));

        if (validPoints.length < 2) return null; // Need at least 2 points for a line

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        let n = validPoints.length;

        for (let i = 0; i < n; i++) {
            sumX += validPoints[i].x;
            sumY += validPoints[i].y;
            sumXY += validPoints[i].x * validPoints[i].y;
            sumXX += validPoints[i].x * validPoints[i].x;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Return points for the trend line, using the min/max dates for start/end
        const minX = new Date(dataPoints[0].date).getTime();
        const maxX = new Date(dataPoints[dataPoints.length - 1].date).getTime();

        return [
            { x: minX, y: slope * minX + intercept },
            { x: maxX, y: slope * maxX + intercept }
        ];
    };

    return (
        <div className={`${height} w-full relative mt-4`}>
            {/* Y-axis labels */}
            <div className={`absolute left-0 top-0 ${fontSize} text-slate-400 font-mono text-right w-10`}>{dataMax.toFixed(2)}</div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 ${fontSize} text-slate-400 font-mono text-right w-10`}>{((dataMax + dataMin) / 2).toFixed(2)}</div>
            <div className={`absolute left-0 bottom-8 ${fontSize} text-slate-400 font-mono text-right w-10`}>{dataMin.toFixed(2)}</div>

            {/* Scrollable container for chart content and X-axis labels */}
            <div className={`absolute left-12 right-4 top-4 bottom-8 ${showScrollableXAxis ? 'overflow-x-auto' : ''}`}>
                <div className="relative h-full pb-16" style={{ minWidth: scrollContentWidth }}>
                    {/* Horizontal grid lines */}
                    <div className="absolute w-full h-full z-0">
                        <div className="absolute w-full border-t border-slate-700 opacity-30" style={{ top: '0%' }}></div>
                        <div className="absolute w-full border-t border-slate-700 opacity-30" style={{ top: '25%' }}></div>
                        <div className="absolute w-full border-t border-slate-700 opacity-30" style={{ top: '50%' }}></div>
                        <div className="absolute w-full border-t border-slate-700 opacity-30" style={{ top: '75%' }}></div>
                        <div className="absolute w-full border-t border-slate-700 opacity-30" style={{ top: '100%' }}></div>
                    </div>

                    {/* Zero line */}
                    {dataMin < 0 && dataMax > 0 && (
                        <div className="absolute w-full border-t-2 border-slate-500 border-dashed opacity-50 z-10" style={{ top: `${normalize(0)}%` }}></div>
                    )}

                    {/* Lines */}
                    {data.length >= 2 && ( // Only draw polyline if at least 2 data points
                        <svg
                            className="w-full h-full absolute top-0 left-0 z-20"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            style={{ pointerEvents: 'none' }}
                        >
                            {dataKeys.map((key, idx) => (
                                <polyline
                                    key={key}
                                    fill="none"
                                    stroke={colors[idx]}
                                    strokeWidth={isExpanded ? "0.5" : "1"}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={data.map((d, i) => {
                                        // Only include valid numbers for polyline
                                        if (typeof d[key] !== 'number' || isNaN(d[key])) return '';
                                        // Scale x based on percentage of overall scrollable width
                                        const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
                                        const y = normalize(d[key]);
                                        return `${x},${y}`;
                                    }).filter(Boolean).join(' ')} // Filter out empty strings
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                            {showTrendLine && dataKeys.length === 1 && calculateTrendLine(data, dataKeys[0]) && (
                                <polyline
                                    fill="none"
                                    stroke={colors[0]} // Use the same color as the data line
                                    strokeWidth={isExpanded ? "0.3" : "0.5"}
                                    strokeDasharray="4 4" // Dashed line for trend
                                    points={calculateTrendLine(data, dataKeys[0]).map(p => {
                                        const x = data.length > 1 ? ((p.x - new Date(data[0].date).getTime()) / (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime())) * 100 : 50;
                                        const y = normalize(p.y);
                                        return `${x},${y}`;
                                    }).join(' ')}
                                    vectorEffect="non-scaling-stroke"
                                />
                            )}
                        </svg>
                    )}

                    {/* Data points */}
                    {data.map((d, i) => {
                        // Ensure left calculation is safe for single data points and scales with content width
                        const left = data.length > 1 ? `calc(${(i / (data.length - 1)) * 100}%)` : '50%';
                        return dataKeys.map((key, kIdx) => (
                            <div
                                key={`${i}-${key}`}
                                className={`absolute ${dotSize} rounded-full border-2 border-slate-900 transform -translate-x-1/2 -translate-y-1/2 transition-transform shadow-lg z-30 hover:scale-[2] hover:z-40`}
                                style={{
                                    left: left,
                                    top: `${normalize(d[key])}%`,
                                    backgroundColor: colors[kIdx],
                                    display: (typeof d[key] !== 'number' || isNaN(d[key])) ? 'none' : 'block' // Hide dot if value is NaN
                                }}
                                title={`${key}: ${typeof d[key] === 'number' && !isNaN(d[key]) ? d[key].toFixed(2) : 'N/A'}${unit} (${formatDate(d.date)})`}
                            />
                        ));
                    })}

                    {/* X-axis labels */}
                    <div className={`absolute bottom-0 left-0 right-0 ${fontSize} text-slate-400 font-mono whitespace-nowrap flex justify-between`}> {/* Reverted bottom positioning */}
                        {data.map((d, i) => (
                            <span
                                key={i}
                                className={`
                                    min-w-[80px] text-center
                                    ${isExpanded ? 'transform rotate-90 origin-bottom' : ''} {/* Changed to rotate-90 and origin-bottom */}
                                `}
                                style={isExpanded ? { position: 'absolute', left: `calc(${i} * (100% / ${data.length}))`, width: `calc(100% / ${data.length})`, bottom: '0' } : {}} // Removed pt-6
                            >
                                {isExpanded ? formatDate(d.date) : formatDate(d.date).split('-').slice(1).join('-')}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ENHANCED BAR CHART (much thicker and clickable with proper scaling) ---
const MiniBarChart = ({ data, dataKey, color, isExpanded = false }) => {
    if (!data || data.length === 0) return <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic">No data</div>;

    // Filter out non-numeric or NaN values from allValues
    const allValues = data.map(d => parseFloat(d[dataKey])).filter(v => typeof v === 'number' && !isNaN(v));
    const hasValidData = allValues.some(v => v > 0); // Check for at least one positive value

    if (!hasValidData) {
        return (
            <div className={isExpanded ? 'h-full' : 'h-32'}> {/* Adjusted to h-full for expanded mode */}
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <span className="text-2xl mb-2">📊</span>
                    <span className="italic">No throughput data recorded</span>
                    <span className="text-[10px] text-slate-400 mt-1">Values will appear after service reports are logged</span>
                </div>
            </div>
        );
    }

    // Better scaling: use min and max to show relative growth
    const minVal = Math.min(...allValues.filter(v => v >= 0)); // Ensure minVal is not negative if all values are positive
    const maxVal = Math.max(...allValues); // Corrected to Math.max
    const range = maxVal - minVal;

    // If all values are the same or very close, use simple scaling
    const useSimpleScaling = range < (maxVal * 0.1) || range === 0;

    const height = isExpanded ? 'h-[400px]' : 'h-32'; // Fixed height for expanded chart
    const fontSize = isExpanded ? 'text-sm' : 'text-[9px]';

    // Calculate gap size based on number of bars
    const gapSize = data.length > 10 ? 'gap-1' : data.length > 6 ? 'gap-2' : 'gap-3';

    // Determine if x-axis labels need to scroll
    const showScrollableXAxis = data.length > (isExpanded ? 10 : 5);
    const scrollContentWidth = showScrollableXAxis ? `${data.length * (isExpanded ? 100 : 60)}px` : '100%'; // Dynamic width for scrollable content

    return (
        <div className={`${height} w-full flex items-end ${gapSize} pl-12 pr-4 mt-4 relative`}>
            {/* Y-axis labels */}
            <div className={`absolute left-0 top-0 ${fontSize} text-slate-400 font-mono text-right w-10`}>{maxVal.toLocaleString()}t</div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 ${fontSize} text-slate-400 font-mono text-right w-10`}>
                {useSimpleScaling ? (maxVal / 2).toLocaleString() : ((maxVal + minVal) / 2).toLocaleString()}t
            </div>
            <div className={`absolute left-0 bottom-8 ${fontSize} text-slate-400 font-mono text-right w-10`}>
                {useSimpleScaling ? '0' : minVal.toLocaleString()}t
            </div>

            {/* Bars container with potential for horizontal scroll */}
            <div className={`absolute left-12 right-4 top-4 bottom-8 ${showScrollableXAxis ? 'overflow-x-auto' : ''}`}>
                <div className="flex items-end h-full pb-16" style={{ minWidth: scrollContentWidth, display: 'flex', justifyContent: 'space-between' }}>
                    {data.map((d, i) => {
                        const value = parseFloat(d[dataKey]) || 0; // Ensure value is a number
                        let heightPercent;

                        if (useSimpleScaling) {
                            heightPercent = maxVal > 0 ? Math.max((value / maxVal) * 100, value > 0 ? 5 : 0) : 0;
                        } else {
                            heightPercent = range > 0 ? ((value - minVal) / range) * 100 : 0;
                            if (value > 0 && heightPercent < 10) heightPercent = 10;
                        }

                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end group relative min-w-[20px]"
                                style={{
                                    width: `calc(100% / ${data.length})`, // Distribute width evenly
                                    minWidth: isExpanded ? '30px' : '20px'
                                }}
                            >
                                <div
                                    className={`w-full rounded-t-lg ${color} ${value === 0 ? 'opacity-20' : 'opacity-90'} group-hover:opacity-100 group-hover:scale-105 group-hover:shadow-2xl transition-all shadow-lg cursor-pointer border-t-2 border-slate-600`}
                                    style={{
                                        height: `${heightPercent}%`,
                                        minHeight: value > 0 ? (isExpanded ? '16px' : '12px') : '0px',
                                        // minWidth: isExpanded ? '30px' : '20px' // Removed from here
                                    }}
                                    title={`${value.toLocaleString()}t (${formatDate(d.date)}) - Click for details`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    {/* Value label on hover */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-slate-700">
                                        {value.toLocaleString()}t
                                    </div>
                                </div>
                                <div
                                    className={`
                                        ${fontSize} text-slate-400 text-center mt-2 font-mono 
                                        ${isExpanded ? 'transform rotate-90 origin-bottom' : 'truncate'}
                                    `}
                                    style={isExpanded ? { position: 'absolute', left: `calc(${i} * (100% / ${data.length}))`, width: `calc(100% / ${data.length})`, bottom: '0' } : {}}
                                >
                                    {isExpanded ? formatDate(d.date) : formatDate(d.date).split('-').slice(1).join('-')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- COMING SOON CHART PLACEHOLDER ---
const ComingSoonChart = ({ title, description }) => (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <div className="mb-2">
            <h4 className="text-sm font-bold text-slate-200">{title}</h4>
            <p className="text-xs text-slate-400">{description}</p>
        </div>
        <div className="h-32 flex flex-col items-center justify-center text-slate-500">
            <Icons.Activity size={28} className="mb-2 opacity-30" />
            <span className="text-sm font-medium">Coming Soon</span>
            <span className="text-[10px] text-slate-600 mt-1">Analytics will be available in a future update</span>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export const AssetAnalyticsModal = ({ asset, isOpen, onClose, onSaveReport, siteLocation }) => {
    const [expandedChart, setExpandedChart] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);

    const { selectedReportIds, toggleReportSelection, clearReportSelections } = useFilterContext();
    const { onNavigateTo } = useUIContext();

    if (!isOpen || !asset) return null;

    const reports = [...(asset.reports || [])].filter(r => !r.deleted).sort((a, b) => new Date(a.date) - new Date(b.date));
    const sortedReports = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));

    // --- NEW: Function to generate the AI Context Dump ---
    const handleExportAIContext = async (format = 'txt') => {
        if (!asset || !reports.length) return;

        // 1. Prepare the Data (Filter if selection exists)
        const reportsToAnalyze = selectedReportIds.size > 0
            ? reports.filter(r => selectedReportIds.has(r.id))
            : reports;

        const cleanReports = reportsToAnalyze.map(r => ({
            date: r.date,
            technician: r.technician,
            fileName: r.fileName,

            // Basic Info
            scaleCondition: r.scaleCondition || 'N/A',

            // Tare/Zero
            oldTare: r.oldTare || 'N/A',
            newTare: r.newTare || 'N/A',
            tareChange: `${r.tareChange}%`,
            tareRepeatability: r.tareRepeatability || 'N/A',

            // Span
            oldSpan: r.oldSpan || 'N/A',
            newSpan: r.newSpan || 'N/A',
            spanChange: `${r.spanChange}%`,
            spanRepeatability: r.spanRepeatability || 'N/A',

            // Load Cell
            lcMvZero: r.lcMvZero || 'N/A',
            lcMvSpan: r.lcMvSpan || 'N/A',

            // Belt & Speed
            beltSpeed: `${r.beltSpeed} m/s`,
            beltLength: `${r.beltLength} m`,
            testLength: `${r.testLength} m`,
            testTime: `${r.testTime} s`,
            kgPerMeter: `${r.kgPerMeter} kg/m`,

            // System Tests
            totaliserAsLeft: r.totaliserAsLeft || 'N/A',
            pulsesPerLength: r.pulsesPerLength || 'N/A',
            revTime: `${r.revTime} s`,
            testRevolutions: r.testRevolutions || 'N/A',
            pulses: r.pulses || 'N/A',
            targetWeight: `${r.targetWeight} kg`,
            totaliser: `${r.totaliser} t`,

            // Comments and Recommendations
            comments: r.comments ? r.comments.map(c => c.text).join(' | ') : '',
            recommendations: r.recommendations || 'N/A',

            // File naming
            jobNumber: r.jobNumber || 'N/A',
            jobCode: r.jobCode || 'N/A',

            // Legacy fields for compatibility
            zeroSignal: `${r.zeroMV || r.lcMvZero || 'N/A'} mV/V`,
            spanSignal: `${r.spanMV || r.lcMvSpan || 'N/A'} mV/V`,
            speed: `${r.speed || r.beltSpeed || 'N/A'} m/s`,
            throughput: `${r.throughput || r.totaliser || 'N/A'} t`
        }));

        // 2. The New AI System Prompt
        const systemPrompt = `You are a senior belt-scale specialist and reliability engineer with expert-level knowledge of:
Conveyor belt weighers (Schenck, SRO BA44, multi-idler)
Tare/span drift physics
Vibration and mechanical influences
Load-cell signal degradation and moisture effects
Environmental impacts including humidity and temperature
I will provide multiple calibration reports for the same conveyor. Analyse them as a unified time-series dataset.

1️⃣ Data Extraction & Time-Series Summary
Extract per service date:
Tare & Span (old/new, % changes, repeatability)
Load-cell Zero/Span mV/V signals
Belt length/speed data
Key technician comments
Deliver:
A combined chronological dataset
Trend charts for tare, span, and LC drift
Highlight tolerance exceedances

2️⃣ Mechanical & Environmental Diagnostics
Evaluate:
Roller/return-roller effects on signal noise
Buildup-driven tare lift
Frame/alignment stability
Categorise:
Resolved
Outstanding
Emerging

3️⃣ Signal Health Review
Track load-cell signal movement to detect:
Creep, moisture, wiring degradation
Noise from belt splices or mechanical vibration
Chart signals and flag risk points.

4️⃣ Integrator Configuration Validation
Check:
Pulses per metre
Angle & platform length
Auto-zero behaviour
Circuit/belt time
Parameter consistency between services
Report any deviations that could bias measurement.

5️⃣ Comment Log Intelligence
Cluster comments to identify:
Recurring failure patterns
Missed corrective actions
Housekeeping changes over time

6️⃣ Forward Reliability & Maintenance Plan
Provide:
Predictive risk of sensing instability
Recommended physical adjustments
Spare parts technician should bring to next service
Traffic-light severity rating

7️⃣ Weather Correlation Analysis
If weather data is provided or retrievable:
Compare drift patterns to humidity/rainfall/temp changes
Explain mechanical or signal physics linking the two
Place weather trend overlay on calibration graphs if applicable
Note if correlation is weak or non-existent

🔹 Additional Output Options (if requested)
A. Visual Dashboard
KPI tiles + trend visuals
Fault recurrence index
Issue status matrix
B. PowerPoint-Ready Slides
Key findings in bullets
1–2 charts per topic
A final "Call to Action" slide

8️⃣ Executive Summary
Provide two versions:
Technical engineer focus
Business leader focus (accuracy & cost-risk)

9️⃣ Long-Term Drift Model (Predictive Analytics)
Forecast tare/span values for next 2–4 services using historical trend
Estimate time-to-breach of ±1% accuracy limits
Include forecast curve on graphs
Provide engineering cause likelihoods & recommended intervention window

🔟 Final Formatting Rule — TLDR Must Be LAST
Regardless of any additional sections, the report must always end with a TLDR section formatted as follows:
TLDR:
• Two short, direct insights (risk + cause)
Next Actions:
1) Highest priority
2) Second highest priority

The TLDR must appear after all charts, summaries, tables, and predictions.`;

        if (format === 'ai-ready') {
            // Generate AI-ready JSON file for drag-and-drop to ChatGPT/Gemini
            const aiData = {
                instruction: systemPrompt,
                context: {
                    asset: `${asset.name} (${asset.code})`,
                    location: siteLocation || 'Unknown',
                    generatedOn: new Date().toISOString().split('T')[0],
                    reportCount: cleanReports.length
                },
                calibrationData: cleanReports,
                request: "Please analyze this calibration data according to the instruction above."
            };

            const blob = new Blob([JSON.stringify(aiData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${asset.name}_AI_Analysis.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Generate Text file for copying (notepad format)
            const fileContent = `# AI Maintenance Analysis Context
**Generated on:** ${new Date().toISOString().split('T')[0]}
**Asset:** ${asset.name} (${asset.code})
**Location:** ${siteLocation || 'Unknown'}

---

## 🤖 SYSTEM PROMPT (Copy this to AI)
${systemPrompt}

---

## 📊 DATASET (JSON Format)
\`\`\`json
${JSON.stringify(cleanReports, null, 2)}
\`\`\`
`;

            const blob = new Blob([fileContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${asset.name}_Prompt.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <>
            <Modal title={`Analytics / Reports: ${asset.name}`} onClose={onClose} size="max">

                <div className="space-y-6">
                    {/* Action Bar */}
                    <div className="flex gap-3 items-center">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (onNavigateTo) onNavigateTo('reporting');
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 backdrop-blur-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:border-cyan-400"
                        >
                            <Icons.FileText size={16} />
                            New Service Report
                        </button>
                        <div className="flex-1" />
                        {/* AI Export Buttons - Coming Soon */}
                        <div className="flex gap-2">
                            <button
                                disabled
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-500 rounded font-medium border border-slate-700 cursor-not-allowed opacity-60"
                                title="Coming soon"
                            >
                                AI Insight - Coming Soon
                            </button>
                            <button
                                disabled
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-slate-500 rounded font-medium border border-slate-700 cursor-not-allowed opacity-60"
                                title="Coming soon"
                            >
                                <Icons.FileText size={16} /> Prompt - Coming Soon
                            </button>
                        </div>
                    </div>

                    {/* TOP ROW: Analytics Coming Soon */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ComingSoonChart title="Tare Change Analysis" description="Tracking percentage change in Tare over time." />
                        <ComingSoonChart title="Span Change Analysis" description="Tracking percentage change in Span over time." />
                    </div>
                    {/* BOTTOM ROW: Analytics Coming Soon */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ComingSoonChart title="Load Cell Signal Health (mV/V)" description="Raw signal voltage drift indicates load cell degradation." />
                        <ComingSoonChart title="Belt Speed Stability" description="Tracking belt speed consistency over service intervals." />
                    </div>

                    {/* REPORTS TABLE */}
                    <div className="border-t border-slate-700 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold text-slate-100">Service Reports</h3>
                            <div className="bg-gradient-to-br from-blue-900/30 to-blue-700/30 rounded-lg p-2 border border-blue-700">
                                <div className="text-xs text-blue-300 uppercase font-bold mb-1">Total Reports</div>
                                <div className="text-xl font-bold text-white text-center">{reports.length}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {sortedReports.map((report) => {
                                const norm = getNormalizedReportData(report);
                                const reportCode = getReportDisplayCode(report);
                                const hasPdf = !!report.storageUrl;
                                const isSelected = selectedReportIds.has(report.id);

                                return (
                                    <div
                                        key={norm.id}
                                        className={`flex justify-between items-center p-3 border rounded-lg transition-all cursor-pointer ${isSelected
                                            ? 'bg-blue-900/20 border-blue-500/50'
                                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                            }`}
                                        onClick={() => toggleReportSelection(report.id)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Checkbox for AI export */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleReportSelection(report.id)}
                                                    className="rounded border-slate-600 bg-slate-800 text-[var(--accent-primary)] focus:ring-0 focus:ring-offset-0"
                                                />
                                            </div>

                                            {/* Icon */}
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${norm.type === 'Digital' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {norm.type === 'Digital' ? <Icons.Zap size={16} /> : <Icons.FileText size={16} />}
                                            </div>

                                            {/* Report Info */}
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-100 font-mono text-sm truncate">{reportCode}</div>
                                                <div className="text-xs text-slate-500 flex gap-2 items-center mt-0.5">
                                                    <span>{formatDate(norm.date)}</span>
                                                    <span className="text-slate-700">|</span>
                                                    <span>{norm.technician}</span>
                                                    <span className={`px-1.5 rounded text-[10px] uppercase font-bold border ${norm.type === 'Digital' ? 'border-cyan-800 text-cyan-500' : 'border-slate-600 text-slate-500'}`}>
                                                        {norm.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            {/* View PDF */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (hasPdf) window.open(report.storageUrl, '_blank');
                                                }}
                                                disabled={!hasPdf}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${hasPdf
                                                    ? 'bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-900/50 hover:border-green-500'
                                                    : 'bg-slate-800/50 text-slate-600 border border-slate-700/30 cursor-not-allowed'
                                                    }`}
                                                title={hasPdf ? 'Open PDF in new tab' : 'No PDF available'}
                                            >
                                                <Icons.ExternalLink size={13} />
                                                PDF
                                            </button>

                                            {/* View Details */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReport(report);
                                                }}
                                                className="text-blue-400 hover:text-blue-300 p-1"
                                                title="View Details"
                                            >
                                                <Icons.Eye size={16} />
                                            </button>

                                        </div>
                                    </div>
                                );
                            })}
                            {sortedReports.length === 0 && <div className="p-8 text-center text-slate-500 italic">No service reports found. Create one in the Reporting app.</div>}
                        </div>
                    </div>

                </div>
            </Modal>

            {/* Report Details Modal */}
            {selectedReport && (
                <ReportDetailsModal
                    report={selectedReport}
                    siteLocation={siteLocation}
                    onClose={() => setSelectedReport(null)}
                />
            )}


            {/* EXPANDED CHART MODALS */}
            {expandedChart === 'tareChange' && (
                <ExpandedChartModal
                    title="Tare Change Analysis - Detailed View"
                    description="Tracking percentage change in Tare over time. Values outside ±0.5% may indicate calibration issues."
                    onClose={() => setExpandedChart(null)}
                >
                    <MiniLineChart
                        data={reports}
                        dataKeys={['tareChange']}
                        colors={['#60a5fa']}
                        unit="%"
                        isExpanded={true}
                        showTrendLine={true}
                    />
                    <div className="flex justify-center gap-6 mt-6 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-400"></span> Tare Change %</span>
                    </div>
                </ExpandedChartModal>
            )}

            {expandedChart === 'spanChange' && (
                <ExpandedChartModal
                    title="Span Change Analysis - Detailed View"
                    description="Tracking percentage change in Span over time. Values outside ±0.25% may indicate calibration issues."
                    onClose={() => setExpandedChart(null)}
                >
                    <MiniLineChart
                        data={reports}
                        dataKeys={['spanChange']}
                        colors={['#f97316']}
                        unit="%"
                        isExpanded={true}
                        showTrendLine={true}
                    />
                    <div className="flex justify-center gap-6 mt-6 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-orange-500"></span> Span Change %</span>
                    </div>
                </ExpandedChartModal>
            )}

            {expandedChart === 'signal' && (
                <ExpandedChartModal
                    title="Load Cell Signal Health - Detailed View"
                    description="Raw signal voltage drift indicates load cell degradation. Consistent readings show healthy sensors."
                    onClose={() => setExpandedChart(null)}
                >
                    <MiniLineChart
                        data={reports}
                        dataKeys={['zeroMV', 'spanMV']}
                        colors={['#a78bfa', '#f472b6']}
                        unit=" mV"
                        isExpanded={true}
                    />
                    <div className="flex justify-center gap-6 mt-6 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-purple-400"></span> Zero mV/V</span>
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-pink-400"></span> Span mV/V</span>
                    </div>
                </ExpandedChartModal>
            )}


            {expandedChart === 'speed' && (
                <ExpandedChartModal
                    title="Belt Speed Stability - Detailed View"
                    description="Tracking belt speed consistency over service intervals. Variations may indicate mechanical issues."
                    onClose={() => setExpandedChart(null)}
                >
                    <MiniLineChart
                        data={reports}
                        dataKeys={['speed']}
                        colors={['#34d399']}
                        unit=" m/s"
                        isExpanded={true}
                    />
                    <div className="flex justify-center gap-6 mt-6 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-green-400"></span> Belt Speed (m/s)</span>
                    </div>
                </ExpandedChartModal>
            )}
        </>
    );
};
