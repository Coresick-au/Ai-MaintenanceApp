import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Icons, formatDate } from './UIComponents';
import { parseServiceReport } from '../utils/pdfParser';
import { useFilterContext } from '../context/FilterContext';

// --- REPORT DETAILS MODAL ---
const ReportDetailsModal = ({ report, onClose, onDelete, siteLocation }) => {
    const [showWeatherTip, setShowWeatherTip] = useState(false);
    const [weather, setWeather] = useState(null);
    const [loadingWeather, setLoadingWeather] = useState(false);

    useEffect(() => {
        if (report?.date && siteLocation) {
            fetchWeather(report.date, siteLocation);
        }
    }, [report, siteLocation]);

    const fetchWeather = async (date, location) => {
        setLoadingWeather(true);
        try {
            // 1. Geocode
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                setWeather({ error: 'Location not found' });
                return;
            }

            const { latitude, longitude } = geoData.results[0];

            // 2. Weather Archive
            const weatherRes = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
            const weatherData = await weatherRes.json();

            if (weatherData.daily) {
                setWeather({
                    maxTemp: weatherData.daily.temperature_2m_max[0],
                    minTemp: weatherData.daily.temperature_2m_min[0],
                    code: weatherData.daily.weathercode[0]
                });
            }
        } catch (e) {
            console.error("Weather fetch failed", e);
            setWeather({ error: 'Failed to load' });
        } finally {
            setLoadingWeather(false);
        }
    };

    const getWeatherIcon = (code) => {
        if (code === 0) return '☀️';
        if (code <= 3) return '⛅';
        if (code <= 48) return '🌫️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '❄️';
        if (code <= 82) return '🌧️';
        if (code <= 99) return '⛈️';
        return '❓';
    };

    if (!report) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-3xl p-6 text-center text-slate-400">
                    <p className="text-lg mb-4">Report data could not be loaded.</p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        );
    }

    const copyDateForWeather = () => {
        navigator.clipboard.writeText(report.date);
        setShowWeatherTip(true);
        setTimeout(() => setShowWeatherTip(false), 3000);
    };

    // Safely access report properties with fallback to 'N/A' or default values
    const reportDate = report.date ? formatDate(report.date) : 'N/A';
    const technician = report.technician || 'N/A';
    const fileName = report.fileName || 'N/A';
    const tareChange = typeof report.tareChange === 'number' ? report.tareChange : 0;
    const spanChange = typeof report.spanChange === 'number' ? report.spanChange : 0;
    const zeroMV = typeof report.zeroMV === 'number' ? report.zeroMV : 'N/A';
    const spanMV = typeof report.spanMV === 'number' ? report.spanMV : 'N/A';
    const speed = typeof report.speed === 'number' ? report.speed : 'N/A';
    const throughput = typeof report.throughput === 'number' ? report.throughput : 'N/A';
    const comments = report.comments || [];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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

                            {/* Weather Section */}
                            {siteLocation && (
                                <div className="mt-3 pt-3 border-t border-slate-800">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        Weather in {siteLocation}
                                    </div>
                                    {loadingWeather ? (
                                        <div className="text-xs text-slate-400 animate-pulse">Loading history...</div>
                                    ) : weather ? (
                                        weather.error ? (
                                            <div className="text-xs text-red-400">{weather.error}</div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl" title="Weather Condition">{getWeatherIcon(weather.code)}</div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-200">{weather.maxTemp}°C / {weather.minTemp}°C</div>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-xs text-slate-400">No data available</div>
                                    )}
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
                                if (confirm('Delete this report?')) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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
        const validPoints = dataPoints.map((d, i) => ({
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
    const [isProcessingPDF, setIsProcessingPDF] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
    const { selectedReportIds, toggleReportSelection, clearReportSelections } = useFilterContext();

    const mountedRef = useRef(true); // NEW: To track if component is mounted

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false; // Set to false on unmount
        };
    }, []);

    const [formData, setFormData] = useState({
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
    });

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
    const handleExportAIContext = () => {
        if (!asset || !reports.length) return;

        // 1. Prepare the Data (Filter if selection exists)
        const reportsToAnalyze = selectedReportIds.size > 0
            ? reports.filter(r => selectedReportIds.has(r.id))
            : reports;

        const cleanReports = reportsToAnalyze.map(r => ({
            date: r.date,
            technician: r.technician,
            tareChange: `${r.tareChange}%`,
            spanChange: `${r.spanChange}%`,
            zeroSignal: `${r.zeroMV} mV/V`,
            spanSignal: `${r.spanMV} mV/V`,
            beltSpeed: `${r.speed} m/s`,
            comments: r.comments ? r.comments.map(c => c.text).join(' | ') : ''
        }));

        // 2. Build the Content (Markdown Format)
        const fileContent = `
# AI Maintenance Analysis Context
**Generated on:** ${new Date().toISOString().split('T')[0]}
**Asset:** ${asset.name} (${asset.code})
**Location:** ${siteLocation || 'Unknown'}

---

## 🤖 SYSTEM PROMPT (Copy this to AI)
You are now a **Senior Field Service Engineer** and **Technical Specialist** for a leading **Weighing Equipment Original Equipment Manufacturer (OEM)**.

### Primary Directive: Data Analysis and Diagnostic Output
Your primary directive is to provide code changes and technical support, with a critical focus on deep, actionable data analysis, especially concerning service reports.

1.  **Service Report Analysis:** When generating a service report summary, you MUST analyze the full report history for the site.
2.  **Weather Correlation:** When analyzing reports, you MUST perform a Google search for the **historical weather data** (Temperature, precipitation, and general conditions) for the site's location, covering the entire date range of the reports (e.g., "historical weather data for ${siteLocation || 'Unknown'} from [First Report Date] to [Last Report Date]").
3.  **Diagnostic Charting:** Generate a chart that visually correlates **maintenance events/faults** with the **weather conditions** at the time of the report. This is critical for diagnosing environment-related failures.

### Personality & Output Rules
* **Tone:** Your communication must be professional, practical, and focused on maximizing **uptime and reliability**. You prioritize clear, working solutions that prevent costly service calls.
* **Accessibility Mandate:** You understand that many users are non-technical field personnel and managers. Therefore, all data and analytical outputs **MUST** be made accessible.

### Chart Data Export Protocol (Accessibility Mandate)
Whenever a task involves analyzing or outputting data for visualization (charts, graphs, metrics) from the Asset Analytics or other sections, you MUST adhere to the following output format:

1.  **Present the Data:** Render the raw, underlying chart data as a simple markdown table with clear column headers. The data must be structured as if it were to be pasted directly into an Excel spreadsheet (one column for the X-axis/Category, one or more columns for the Y-axis/Values).
2.  **DELETE RULE:** You must **NOT** repeat the "How to Create a Chart in Microsoft Excel" steps in your final response. The user has confirmed they have these instructions.

### Post-Analysis Follow-up
All analytical write-ups (especially service reports) MUST conclude with a set of user-friendly technical questions to guide the next phase of work.

1.  **Question Count:** Generate exactly **five (5)** distinct technical questions.
2.  **Format:** The questions must be actionable, user-friendly, and presented as a list, allowing the user to easily respond with a number to direct the next step.

**Example Question Format:**
"Do you want me to proceed with a deep dive on:
1. ...
2. ...
3. ...
4. ...
5. ..."

---

## 📊 DATASET (JSON Format)
\`\`\`json
${JSON.stringify(cleanReports, null, 2)}
\`\`\`
        `;

        // 3. Trigger Download
        const blob = new Blob([fileContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_Analysis_${asset.code}_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            {!showAddReport && <Modal title={`Analytics: ${asset.name}`} onClose={onClose} size="max">

                <div className="space-y-6">
                    {/* Action Bar */}
                    <div className="flex gap-3">
                        <Button onClick={() => setShowAddReport(true)} className="flex-1">
                            <Icons.Plus /> Add Report
                        </Button>
                        {/* NEW: AI Export Button */}
                        <button
                            onClick={handleExportAIContext}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-medium shadow-lg shadow-purple-900/20 transition-all border border-purple-400/30"
                            title="Download context file for AI Analysis"
                        >
                            <span>🤖</span> Generate AI Insight
                        </button>
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
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-slate-100">Service Reports</h3>
                                {selectedReportIds.size > 0 && (
                                    <button
                                        onClick={() => { handleExportAIContext(); clearReportSelections(); }}
                                        className="bg-[var(--accent-primary)] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded flex items-center gap-2 animate-pulse"
                                    >
                                        <Icons.Cpu className="w-3 h-3" /> Analyze Selected ({selectedReportIds.size})
                                    </button>
                                )}
                            </div>
                            <div className="bg-gradient-to-br from-blue-900/30 to-blue-700/30 rounded-lg p-2 border border-blue-700">
                                <div className="text-xs text-blue-300 uppercase font-bold mb-1">Total Reports</div>
                                <div className="text-xl font-bold text-white text-center">{reports.length}</div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                            <table className="w-full text-left text-xs text-slate-400">
                                <thead className="bg-slate-800 text-slate-200 uppercase font-bold">
                                    <tr>
                                        <th className="p-3 w-8">
                                            {/* Header Checkbox could go here if we wanted 'Select All' */}
                                        </th>
                                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                                            Date {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('fileName')}>
                                            File Name {sortColumn === 'fileName' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="p-3">Tech</th>
                                        <th className="p-3 text-right">Tare %</th>
                                        <th className="p-3 text-right">Span %</th>
                                        <th className="p-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {sortedReports.map(r => (
                                        <tr
                                            key={r.id}
                                            className="hover:bg-slate-800 cursor-pointer"
                                            onClick={() => setSelectedReport(r)}
                                        >
                                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedReportIds.has(r.id)}
                                                    onChange={() => toggleReportSelection(r.id)}
                                                    className="rounded border-slate-600 bg-slate-800 text-[var(--accent-primary)] focus:ring-0 focus:ring-offset-0"
                                                />
                                            </td>
                                            <td className="p-3">{formatDate(r.date)}</td>
                                            <td className="p-3 text-blue-400 flex items-center gap-1"><Icons.FileText /> {r.fileName}</td>
                                            <td className="p-3">{r.technician || '-'}</td>
                                            <td className={`p-3 text-right font-mono ${Math.abs(r.tareChange) > 0.5 ? 'text-red-400' : 'text-green-400'}`}>{r.tareChange}%</td>
                                            <td className={`p-3 text-right font-mono ${Math.abs(r.spanChange) > 0.25 ? 'text-yellow-400' : 'text-blue-400'}`}>{r.spanChange}%</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteReport(asset.id, r.id);
                                                    }}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Delete Report"
                                                >
                                                    <Icons.Trash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {reports.length === 0 && <tr><td colSpan="6" className="p-4 text-center italic">No reports logged.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </Modal>}

            {showAddReport && (
                <Modal title="Log Service Report" onClose={() => setShowAddReport(false)}>
                    <div className="space-y-4">
                        {/* PDF UPLOAD SECTION */}
                        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                            <h4 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-2">
                                📄 Upload PDF Service Report
                            </h4>
                            <p className="text-xs text-blue-200 mb-3">
                                Upload your PDF calibration report to automatically extract and fill the form data
                            </p>

                            {pdfError && (
                                <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-200">
                                    ⚠️ {pdfError}
                                </div>
                            )}

                            <label className="block cursor-pointer">
                                <div className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isProcessingPDF
                                    ? 'border-blue-500 bg-blue-900/30'
                                    : 'border-slate-600 bg-slate-900 hover:border-blue-500 hover:bg-slate-800'
                                    }`}>
                                    {isProcessingPDF ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin text-3xl">⏳</div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-blue-300 mb-1">
                                                    Processing PDFs... {uploadProgress.current} of {uploadProgress.total}
                                                </div>
                                                <div className="text-xs text-slate-400">{uploadProgress.fileName}</div>
                                                <div className="w-48 h-2 bg-slate-700 rounded-full mt-3 mx-auto overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Icons.UploadCloud className="text-3xl text-blue-400" />
                                            <span className="text-sm text-slate-300">Click to select PDF files</span>
                                            <span className="text-xs text-slate-400">or drag and drop (multiple files supported)</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    multiple
                                    className="hidden"
                                    disabled={isProcessingPDF}
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;

                                        if (mountedRef.current) setIsProcessingPDF(true);
                                        if (mountedRef.current) setPdfError('');
                                        if (mountedRef.current) setUploadProgress({ current: 0, total: files.length, fileName: '' });

                                        let successCount = 0;
                                        let failedFiles = [];

                                        for (let i = 0; i < files.length; i++) {
                                            const file = files[i];
                                            if (mountedRef.current) setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });

                                            // Check for unique file name before parsing and saving
                                            if (reports.some(r => r.fileName === file.name)) {
                                                failedFiles.push(`${file.name} (duplicate)`);
                                                continue;
                                            }

                                            try {
                                                const parsed = await parseServiceReport(file);

                                                const newReport = {
                                                    id: `rep-${Date.now()}-${i}`,
                                                    date: parsed.date || new Date().toISOString().split('T')[0],
                                                    technician: parsed.technician || 'Unknown',
                                                    fileName: file.name,
                                                    tareChange: parseFloat(parsed.tareChange) || 0,
                                                    spanChange: parseFloat(parsed.spanChange) || 0,
                                                    zeroMV: parseFloat(parsed.zeroMV) || 0,
                                                    spanMV: parseFloat(parsed.spanMV) || 0,
                                                    speed: parseFloat(parsed.speed) || 0,
                                                    throughput: parseFloat(parsed.throughput) || 0,
                                                    comments: parsed.comments ? [{ id: 1, text: parsed.comments, status: 'Open' }] : []
                                                };

                                                onSaveReport(asset.id, newReport);
                                                successCount++;
                                                await new Promise(resolve => setTimeout(resolve, 100));
                                            } catch (error) {
                                                console.error(`Failed to parse ${file.name}:`, error);
                                                failedFiles.push(file.name);
                                            }
                                        }

                                        if (mountedRef.current) setIsProcessingPDF(false);
                                        if (mountedRef.current) setUploadProgress({ current: 0, total: 0, fileName: '' });

                                        if (failedFiles.length > 0) {
                                            if (mountedRef.current) setPdfError(`${successCount} PDF(s) processed successfully. Failed: ${failedFiles.join(', ')}`);
                                        } else {
                                            alert(`✅ Successfully processed all ${successCount} PDF file(s)!`);
                                            if (mountedRef.current) setShowAddReport(false);
                                        }

                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-slate-800 text-slate-400">OR ENTER MANUALLY</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Service Date</label>
                                <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Select date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
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
