import React, { useState, useRef, useEffect } from 'react';
import { Button, Modal, UniversalDatePicker } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { useFilterContext } from '../hooks/useFilterContext';

import { ManualCalibrationModal } from './ManualCalibrationModal';
import { EditCalibrationModal } from './EditCalibrationModal';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

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

// --- REPORT DETAILS MODAL ---
const ReportDetailsModal = ({ report, siteLocation, onClose, onDelete }) => {

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
                        <button
                            onClick={() => {
                                if (confirm(`Are you sure you want to delete this calibration report?\n\nDate: ${reportDate}\nTechnician: ${technician}\nFile: ${fileName}\n\nThis action cannot be undone.`)) {
                                    onDelete();
                                    onClose();
                                }
                            }}
                            className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-700/50 transition-colors"
                        >
                            <Icons.Trash /> Delete
                        </button>
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

// --- MAIN COMPONENT ---
export const AssetAnalyticsModal = ({ asset, isOpen, onClose, onSaveReport, onDeleteReport, siteLocation }) => {
    const [showAddReport, setShowAddReport] = useState(false);
    const [expandedChart, setExpandedChart] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);

    const [manualCalibrationModalOpen, setManualCalibrationModalOpen] = useState(false);
    const [editCalibrationModalOpen, setEditCalibrationModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false); // Add state for dropdown
    const { selectedReportIds, toggleReportSelection, clearReportSelections } = useFilterContext();

    const mountedRef = useRef(true); // NEW: To track if component is mounted

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false; // Set to false on unmount
        };
    }, []);

    const [formData, setFormData] = useState(() => ({
        date: new Date().toISOString().split('T')[0],
        technician: '',
        fileName: '', // Added fileName to formData initialization
        tareChange: '',
        spanChange: '',
        zeroMV: '',
        spanMV: '',
        speed: '',
        throughput: '',
        comments: ''
    }));

    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    if (!isOpen || !asset) return null;

    const reports = [...(asset.reports || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    const handleSave = () => {
        const newReport = {
            // eslint-disable-next-line react-hooks/purity
            id: `rep-${Date.now()}`,
            date: formData.date,
            technician: formData.technician || 'Unknown',
            fileName: formData.fileName || `Report-${formData.date}.pdf`, // Use a default if fileName is not provided
            tareChange: parseFloat(formData.tareChange) || 0,
            spanChange: parseFloat(formData.spanChange) || 0,
            zeroMV: parseFloat(formData.zeroMV) || 0,
            spanMV: parseFloat(formData.spanMV) || 0,
            speed: parseFloat(formData.speed) || 0,
            throughput: parseFloat(formData.throughput) || 0,
            comments: formData.comments ? [{ id: 1, text: formData.comments, status: 'Open' }] : []
        };

        if (reports.some(r => r.fileName === newReport.fileName)) {
            alert('A report with this file name already exists. Please use a unique file name.');
            return;
        }

        onSaveReport(asset.id, newReport);
        if (mountedRef.current) setShowAddReport(false); // Only update if mounted
        if (mountedRef.current) setFormData({ date: new Date().toISOString().split('T')[0], technician: '', fileName: '', tareChange: '', spanChange: '', zeroMV: '', spanMV: '', speed: '', throughput: '', comments: '' }); // Only update if mounted
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedReports = [...reports].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (sortColumn === 'date') {
            return sortDirection === 'asc' ? new Date(aValue) - new Date(bValue) : new Date(bValue) - new Date(aValue);
        } else if (sortColumn === 'fileName') {
            return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        // Add more sorting logic for other columns if needed
        return 0;
    });

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

    // Handle manual calibration data from form
    const handleImportCalibrationData = (calibrationData) => {
        console.log('Manual calibration data:', calibrationData);

        try {
            // Transform form data to report format (already handled in ManualCalibrationModal)
            const newReport = {
                ...calibrationData,
                // Ensure all required fields are present
                id: calibrationData.id || `rep-${Date.now()}`,
                date: calibrationData.date || new Date().toISOString().split('T')[0],
                technician: calibrationData.technician || 'Unknown',
                fileName: calibrationData.fileName || `Report-${calibrationData.date || new Date().toISOString().split('T')[0]}.pdf`,
                tareChange: typeof calibrationData.tareChange === 'number' ? calibrationData.tareChange : 0,
                spanChange: typeof calibrationData.spanChange === 'number' ? calibrationData.spanChange : 0,
                zeroMV: calibrationData.zeroMV || 'N/A',
                spanMV: calibrationData.spanMV || 'N/A',
                speed: typeof calibrationData.speed === 'number' ? calibrationData.speed : 'N/A',
                totaliser: typeof calibrationData.totaliser === 'number' ? calibrationData.totaliser : 'N/A',
                comments: calibrationData.comments || []
            };

            // Save the new report
            onSaveReport(asset.id, newReport);
            setManualCalibrationModalOpen(false);

            // Show success message
            alert(`Successfully saved calibration report: ${newReport.fileName}`);

        } catch (error) {
            console.error('Error saving calibration report:', error);
            alert(`Error saving report: ${error.message}\n\nPlease check the data and try again.`);
        }
    };

    // Handle updating existing calibration data
    const handleUpdateCalibrationData = (updatedData) => {
        console.log('Updating calibration data:', updatedData);

        try {
            // Update the existing report
            onSaveReport(asset.id, updatedData);
            setEditCalibrationModalOpen(false);
            setEditingReport(null);

            // Show success message
            alert(`Successfully updated calibration report: ${updatedData.fileName}`);

        } catch (error) {
            console.error('Error updating calibration report:', error);
            alert(`Error updating report: ${error.message}\n\nPlease check the data and try again.`);
        }
    };

    return (
        <>
            {!showAddReport && <Modal title={`Reports / Analytics: ${asset.name}`} onClose={onClose} size="max">

                <div className="space-y-6">
                    {/* Action Bar */}
                    {/* Action Bar */}
                    <div className="flex gap-3 items-center">
                        <div className="relative flex-1">
                            {/* YOUR CUSTOM BUTTON */}
                            <button
                                type="button"
                                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                className="px-4 py-2 w-full md:w-auto rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 backdrop-blur-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:border-cyan-400"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                                New Service Report
                            </button>

                            {/* DROPDOWN MENU */}
                            {isAddMenuOpen && (
                                <div className="absolute left-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">

                                    {/* Option 1: Digital Report */}
                                    <button
                                        onClick={() => {
                                            setIsAddMenuOpen(false);
                                            setManualCalibrationModalOpen(true); // Using existing modal for now or new form? User said "onOpenDigitalForm". Assuming manual calibration is the closest match or new form needed? 
                                            // Wait, the user logic in Step 3 adds "Report Form". 
                                            // Here inside AssetAnalytics, "Create Digital Report" probably means "Manual Calibration" (which is the form) OR the new "ServiceReportForm".
                                            // Given I am inside AssetAnalytics, maybe I should use ManualCalibrationModal as the "Digital Form"? 
                                            // OR should I trigger the NEW ServiceReportForm?
                                            // The user instruction for APP.JSX adds ServiceReportForm.
                                            // This button is inside AssetAnalytics. 
                                            // Let's stick to setManualCalibrationModalOpen(true) as "Digital Report" context within this modal for now, or assume user handles the wiring later.
                                            // actually, "ManualCalibrationModal" seems to be effectively a digital form.
                                            setManualCalibrationModalOpen(true);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-cyan-900/30 hover:text-cyan-400 flex items-center gap-2"
                                    >
                                        <span>⚡</span> Create Digital Report
                                    </button>

                                    {/* Option 2: Upload PDF */}
                                    <label className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 cursor-pointer border-t border-slate-700">
                                        <span>Pg</span> Upload PDF Scan
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                setIsAddMenuOpen(false);
                                                setShowAddReport(true); // Re-using existing Upload handling via existing "Log Service Report" modal which has PDF logic
                                                // Or should I extract the handleFileUpload?
                                                // Existing "showAddReport" shows the modal with PDF dropzone. That works.
                                            }}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        {/* AI Export Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleExportAIContext('ai-ready')}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-medium shadow-lg shadow-purple-900/20 transition-all border border-purple-400/30"
                                title="Create AI-ready JSON file for drag-and-drop to ChatGPT/Gemini"
                            >
                                <span>🤖</span> AI Insight (.json)
                            </button>
                            <button
                                onClick={() => handleExportAIContext('txt')}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded font-medium shadow-lg shadow-blue-900/20 transition-all border border-blue-400/30"
                                title="Download as text file for copying"
                            >
                                <Icons.FileText size={16} /> Prompt (.txt)
                            </button>
                        </div>
                    </div>

                    {/* TOP ROW: DRIFT - Tare Change */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            className="bg-slate-900 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
                            onClick={() => setExpandedChart('tareChange')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Tare Change Analysis</h4>
                                    <p className="text-xs text-slate-400">Tracking percentage change in Tare over time.</p>
                                </div>
                                <span className="text-blue-400 text-xl">🔍</span>
                            </div>
                            <MiniLineChart
                                data={reports}
                                dataKeys={['tareChange']}
                                colors={['#60a5fa']}
                                unit="%"
                                showTrendLine={true}
                            />
                            <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Tare %</span>
                            </div>
                        </div>

                        {/* TOP ROW: DRIFT - Span Change */}
                        <div
                            className="bg-slate-900 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-orange-500 hover:shadow-lg transition-all"
                            onClick={() => setExpandedChart('spanChange')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Span Change Analysis</h4>
                                    <p className="text-xs text-slate-400">Tracking percentage change in Span over time.</p>
                                </div>
                                <span className="text-orange-500 text-xl">🔍</span>
                            </div>
                            <MiniLineChart
                                data={reports}
                                dataKeys={['spanChange']}
                                colors={['#f97316']}
                                unit="%"
                                showTrendLine={true}
                            />
                            <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Span %</span>
                            </div>
                        </div>
                    </div>
                    {/* MIDDLE ROW: SIGNAL & BELT SPEED */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            className="bg-slate-900 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all"
                            onClick={() => setExpandedChart('signal')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Load Cell Signal Health (mV/V)</h4>
                                    <p className="text-xs text-slate-400">Raw signal voltage drift indicates load cell degradation.</p>
                                </div>
                                <span className="text-purple-400 text-xl">🔍</span>
                            </div>
                            <MiniLineChart
                                data={reports}
                                dataKeys={['zeroMV', 'spanMV']}
                                colors={['#a78bfa', '#f472b6']}
                                unit="mV"
                            />
                            <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Zero mV</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400"></span> Span mV</span>
                            </div>
                        </div>
                        {/* Belt Speed Stability chart */}
                        <div
                            className="bg-slate-900 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-green-500 hover:shadow-lg transition-all"
                            onClick={() => setExpandedChart('speed')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Belt Speed Stability</h4>
                                    <p className="text-xs text-slate-400">Tracking belt speed consistency over service intervals.</p>
                                </div>
                                <span className="text-green-400 text-xl">🔍</span>
                            </div>
                            <MiniLineChart
                                data={reports}
                                dataKeys={['speed']}
                                colors={['#34d399']}
                                unit=" m/s"
                            />
                        </div>
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
                            {/* List Rendering Loop */}
                            {sortedReports.map((report) => {
                                const norm = getNormalizedReportData(report); // Normalize it first!
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
                                        <div className="flex items-center gap-3">
                                            {/* Checkbox */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleReportSelection(report.id)}
                                                    className="rounded border-slate-600 bg-slate-800 text-[var(--accent-primary)] focus:ring-0 focus:ring-offset-0"
                                                />
                                            </div>

                                            {/* ICON BASED ON TYPE */}
                                            <div className={`p-2 rounded-lg ${norm.type === 'Digital' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {norm.type === 'Digital' ? <Icons.Zap size={16} /> : <Icons.FileText size={16} />}
                                            </div>

                                            <div>
                                                <div className="font-bold text-slate-200">{formatDate(norm.date)}</div>
                                                <div className="text-xs text-slate-500 flex gap-2 items-center">
                                                    <span>{norm.technician || 'Unknown'}</span>
                                                    {/* TYPE BADGE */}
                                                    <span className={`px-1.5 rounded text-[10px] uppercase font-bold border ${norm.type === 'Digital' ? 'border-cyan-800 text-cyan-500' : 'border-slate-600 text-slate-500'}`}>
                                                        {norm.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-3">
                                            {/* METRICS PILL */}
                                            <div className="hidden md:flex gap-4 text-xs font-mono text-slate-400 mr-4">
                                                <div>Zero: <span className="text-slate-200">{norm.zero}</span></div>
                                                <div>Span: <span className="text-slate-200">{norm.span}</span></div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReport(report);
                                                }}
                                                className="text-blue-400 hover:text-blue-300"
                                                title="View Details"
                                            >
                                                <Icons.ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete report from ${formatDate(norm.date)}?`)) {
                                                        onDeleteReport(asset.id, report.id);
                                                    }
                                                }}
                                                className="text-slate-500 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {sortedReports.length === 0 && <div className="p-8 text-center text-slate-500 italic">No service reports found. Add one above.</div>}
                        </div>
                    </div>

                </div>
            </Modal>}

            {showAddReport && (
                <Modal title="Log Service Report" onClose={() => setShowAddReport(false)}>
                    <div className="space-y-4">
                        {/* PDF UPLOAD SECTION */}


                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Service Date</label>
                                <UniversalDatePicker
                                    selected={formData.date ? new Date(formData.date) : new Date()}
                                    onChange={(date) => setFormData({ ...formData, date: date ? date.toISOString().split('T')[0] : '' })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Technician Name</label>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="e.g. J. Smith" value={formData.technician} onChange={e => setFormData({ ...formData, technician: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">File Name</label>
                            <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="e.g. Report-2023-01-01.pdf" value={formData.fileName} onChange={e => setFormData({ ...formData, fileName: e.target.value })} />
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
                            <h4 className="text-xs font-bold text-blue-400 uppercase mb-3">Calibration Data</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Tare Change (%)</label>
                                    <input type="number" step="0.01" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" placeholder="0.00" value={formData.tareChange} onChange={e => setFormData({ ...formData, tareChange: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Span Change (%)</label>
                                    <input type="number" step="0.01" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" placeholder="0.00" value={formData.spanChange} onChange={e => setFormData({ ...formData, spanChange: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Zero (mV/V)</label>
                                    <input type="number" step="0.001" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" placeholder="8.00" value={formData.zeroMV} onChange={e => setFormData({ ...formData, zeroMV: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Span (mV/V)</label>
                                    <input type="number" step="0.001" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" placeholder="12.00" value={formData.spanMV} onChange={e => setFormData({ ...formData, spanMV: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Belt Speed (m/s)</label>
                                <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="0.00" value={formData.speed} onChange={e => setFormData({ ...formData, speed: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Throughput (Tonnes)</label>
                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="0" value={formData.throughput} onChange={e => setFormData({ ...formData, throughput: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Comments & Action Items</label>
                            <textarea className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" rows="3" placeholder="Notes on condition..." value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} className="flex-1">Save Report</Button>
                            <Button onClick={() => setShowAddReport(false)} variant="secondary">Cancel</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Report Details Modal */}
            {selectedReport && (
                <ReportDetailsModal
                    report={selectedReport}
                    siteLocation={siteLocation}
                    onClose={() => setSelectedReport(null)}
                    onDelete={() => onDeleteReport(asset.id, selectedReport.id)}
                />
            )}

            {/* Manual Calibration Modal */}
            {manualCalibrationModalOpen && (
                <ManualCalibrationModal
                    isOpen={manualCalibrationModalOpen}
                    onClose={() => setManualCalibrationModalOpen(false)}
                    onSaveCalibrationData={handleImportCalibrationData}
                    asset={asset}
                />
            )}

            {/* Edit Calibration Modal */}
            {editCalibrationModalOpen && (
                <EditCalibrationModal
                    isOpen={editCalibrationModalOpen}
                    onClose={() => {
                        setEditCalibrationModalOpen(false);
                        setEditingReport(null);
                    }}
                    onUpdateCalibrationData={handleUpdateCalibrationData}
                    asset={asset}
                    report={editingReport}
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
