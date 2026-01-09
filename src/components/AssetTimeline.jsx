import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Calendar,
    Search,
    ZoomIn,
    ZoomOut,
    AlertTriangle,
    CheckCircle2,
    Clock,
    MoreVertical,
    Filter,
    Minus,
    Plus,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, addDays, format, subDays, isAfter, isBefore, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import * as Icons from 'lucide-react';

const AssetTimeline = ({ assets = [], mode = 'service' }) => {
    // --- State Configuration ---
    const [timeScale, setTimeScale] = useState('quarter'); // 'month', 'quarter', 'year'
    const [searchQuery, setSearchQuery] = useState('');
    const scrollContainerRef = useRef(null);

    // --- Constants & Derived State ---
    const TODAY = startOfDay(new Date());

    // Configure view based on timeScale
    const viewConfig = useMemo(() => {
        switch (timeScale) {
            case 'month':
                return {
                    days: 90, // Show 3 months (1 month back, 2 forward)
                    startOffset: -30,
                    zoom: 60, // px per day
                    labelFormat: 'd',
                    headerFormat: 'MMMM yyyy'
                };
            case 'year':
                return {
                    days: 730, // 2 years
                    startOffset: -180, // 6 months back
                    zoom: 4, // px per day (compressed)
                    labelFormat: 'MMM',
                    headerFormat: 'yyyy'
                };
            case 'quarter':
            default:
                return {
                    days: 365, // 1 year
                    startOffset: -90, // 3 months back
                    zoom: 20, // px per day
                    labelFormat: 'd',
                    headerFormat: 'MMM yyyy'
                };
        }
    }, [timeScale]);

    const [zoomLevel, setZoomLevel] = useState(viewConfig.zoom);

    // Update zoom when scale changes
    useEffect(() => {
        setZoomLevel(viewConfig.zoom);
    }, [viewConfig]);

    const TIMELINE_START = addDays(TODAY, viewConfig.startOffset);
    const TOTAL_DAYS = viewConfig.days;

    // Scroll to "Today" on initial load or scale change
    useEffect(() => {
        if (scrollContainerRef.current) {
            const todayPos = Math.abs(viewConfig.startOffset) * zoomLevel;
            // Center today: position - (containerWidth / 2)
            const containerWidth = scrollContainerRef.current.clientWidth;
            scrollContainerRef.current.scrollTo({ left: Math.max(0, todayPos - (containerWidth / 2) + 100), behavior: 'auto' });
        }
    }, [viewConfig, zoomLevel]);

    // --- Helpers ---
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-emerald-500/80 hover:bg-emerald-400';
            case 'dueSoon': return 'bg-amber-500/80 hover:bg-amber-400';
            case 'overdue': return 'bg-rose-500/80 hover:bg-rose-400';
            default: return 'bg-slate-700';
        }
    };

    // --- Filtering Logic ---
    const filteredAssets = useMemo(() => {
        return assets.filter(asset =>
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.code || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [assets, searchQuery]);

    // --- Data Transformation (Continuous Bars) ---
    const getAssetBars = (asset) => {
        const bars = [];
        if (!asset.dueDate) return bars;

        const dueDate = parseISO(asset.dueDate);
        const frequencyDays = parseInt(asset.frequency, 10) || 30;

        // Determine Start Date: Last Cal or (DueDate - Frequency)
        let startDate;
        if (asset.lastCal) {
            startDate = parseISO(asset.lastCal);
        } else {
            startDate = subDays(dueDate, frequencyDays);
        }

        // 1. Healthy Segment (Green)
        // From Start Date to (DueDate - 30 days)
        const healthyEnd = subDays(dueDate, 30);

        if (isBefore(startDate, healthyEnd)) {
            const startPos = differenceInDays(startDate, TIMELINE_START);
            const duration = differenceInDays(healthyEnd, startDate);

            // Only add if visible or partially visible
            if (startPos + duration > 0 && startPos < TOTAL_DAYS) {
                bars.push({
                    type: 'healthy',
                    start: Math.max(startPos, 0), // Clip start
                    width: Math.min(duration, TOTAL_DAYS - startPos), // Clip end
                    label: 'Healthy',
                    originalStart: startPos // For positioning check
                });
            }
        }

        // 2. Due Soon Segment (Yellow)
        // From (DueDate - 30 days) to DueDate
        // Start is max of (startDate, healthyEnd) to handle short frequencies
        const warningStart = isAfter(startDate, healthyEnd) ? startDate : healthyEnd;

        if (isBefore(warningStart, dueDate)) {
            const startPos = differenceInDays(warningStart, TIMELINE_START);
            const duration = differenceInDays(dueDate, warningStart);

            if (startPos + duration > 0 && startPos < TOTAL_DAYS) {
                bars.push({
                    type: 'dueSoon',
                    start: startPos,
                    width: duration,
                    label: 'Due Soon',
                    originalStart: startPos
                });
            }
        }

        // 3. Overdue Segment (Red)
        // From DueDate to Today (if overdue)
        if (isAfter(TODAY, dueDate)) {
            const startPos = differenceInDays(dueDate, TIMELINE_START);
            const duration = differenceInDays(TODAY, dueDate);

            if (startPos + duration > 0 && startPos < TOTAL_DAYS) {
                bars.push({
                    type: 'overdue',
                    start: startPos,
                    width: duration,
                    label: 'Overdue',
                    originalStart: startPos
                });
            }
        }

        return bars;
    };

    // Navigation functions
    const handleJumpToDue = (asset) => {
        if (!asset.dueDate) return;

        const dueDate = parseISO(asset.dueDate);
        const startDay = differenceInDays(dueDate, TIMELINE_START);

        if (scrollContainerRef.current) {
            const scrollPosition = startDay * zoomLevel - 200; // Offset for visibility
            scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans overflow-hidden rounded-xl border border-slate-700 shadow-sm">

            {/* --- Top Navigation / Header --- */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">{mode === 'service' ? 'Service Timeline' : 'Roller Timeline'}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {/* Time Scale Toggles */}
                            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                <button
                                    onClick={() => setTimeScale('month')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeScale === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                >
                                    Month
                                </button>
                                <button
                                    onClick={() => setTimeScale('quarter')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeScale === 'quarter' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                >
                                    Quarter
                                </button>
                                <button
                                    onClick={() => setTimeScale('year')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeScale === 'year' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                >
                                    Year
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Jump to Today */}
                    <button
                        onClick={() => {
                            if (scrollContainerRef.current) {
                                const todayPos = Math.abs(viewConfig.startOffset) * zoomLevel;
                                const containerWidth = scrollContainerRef.current.clientWidth;
                                scrollContainerRef.current.scrollTo({ left: Math.max(0, todayPos - (containerWidth / 2) + 100), behavior: 'smooth' });
                            }
                        }}
                        className="bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        title="Jump to Today"
                    >
                        <Clock size={16} />
                        <span className="hidden md:inline">Today</span>
                    </button>

                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter assets..."
                            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-500 transition-all w-full md:w-64 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 ml-2 border border-slate-700">
                        <button
                            onClick={() => setZoomLevel(Math.max(1, zoomLevel - (timeScale === 'year' ? 1 : 5)))}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white disabled:opacity-50"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs font-mono w-10 text-center text-slate-400">{zoomLevel}</span>
                        <button
                            onClick={() => setZoomLevel(Math.min(100, zoomLevel + (timeScale === 'year' ? 1 : 5)))}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white disabled:opacity-50"
                        >
                            <ZoomIn size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* --- Main Content Area --- */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Left Sidebar: Asset List */}
                <div className="w-64 bg-slate-800 border-r border-slate-700 flex-shrink-0 z-10 shadow-lg flex flex-col">
                    <div className="h-12 border-b border-slate-700 bg-slate-900/50 flex items-center px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">
                        Asset Name
                    </div>
                    <div className="overflow-y-hidden flex-1">
                        {filteredAssets.map((asset, index) => {
                            const hasDueDate = !!asset.dueDate;

                            return (
                                <div
                                    key={asset.id}
                                    className={`h-20 border-b border-slate-700/50 flex items-center justify-between px-4 hover:bg-slate-700/30 transition-colors group ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-slate-200 text-sm truncate block" title={asset.name}>{asset.name}</span>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 truncate max-w-[80px]">
                                                {asset.code}
                                            </span>
                                            <button
                                                onClick={() => handleJumpToDue(asset)}
                                                className={`text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 truncate max-w-[80px] transition-colors ${hasDueDate ? 'hover:bg-blue-600 hover:text-white hover:border-blue-500 cursor-pointer' : ''}`}
                                                title={hasDueDate ? "Jump to Next Due Date" : "No due date"}
                                                disabled={!hasDueDate}
                                            >
                                                Next Due
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredAssets.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No assets found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Scrollable Area: Timeline */}
                <div className="flex-1 overflow-auto bg-slate-900 relative custom-scrollbar" ref={scrollContainerRef}>
                    <div
                        className="relative"
                        style={{ width: `${TOTAL_DAYS * zoomLevel}px`, minWidth: '100%' }}
                    >
                        {/* 1. Header Row (Months & Days) */}
                        <div className="sticky top-0 z-10 flex flex-col bg-slate-900 border-b border-slate-700 shadow-sm">

                            {/* Month Row */}
                            <div className="relative h-8 w-full border-b border-slate-700/30 bg-slate-800/50">
                                {(() => {
                                    const endDate = addDays(TIMELINE_START, TOTAL_DAYS - 1);

                                    // Get all months that overlap with the timeline range
                                    const intervalMonths = eachMonthOfInterval({
                                        start: TIMELINE_START,
                                        end: endDate
                                    });

                                    return intervalMonths.map((monthDate, i) => {
                                        const monthStart = startOfMonth(monthDate);
                                        const monthEnd = endOfMonth(monthDate);

                                        // Calculate visible range for this month
                                        const visibleStart = isBefore(monthStart, TIMELINE_START) ? TIMELINE_START : monthStart;
                                        const visibleEnd = isAfter(monthEnd, endDate) ? endDate : monthEnd;

                                        if (isAfter(visibleStart, visibleEnd)) return null;

                                        const startOffset = differenceInDays(visibleStart, TIMELINE_START);
                                        const widthDays = differenceInDays(visibleEnd, visibleStart) + 1;

                                        return (
                                            <div
                                                key={i}
                                                className="absolute top-0 bottom-0 border-r border-slate-700/30 flex items-center justify-center text-xs font-bold text-slate-300 uppercase tracking-wider overflow-hidden whitespace-nowrap"
                                                style={{
                                                    left: `${startOffset * zoomLevel}px`,
                                                    width: `${widthDays * zoomLevel}px`
                                                }}
                                            >
                                                {format(monthDate, 'MMMM yyyy')}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Day Row */}
                            <div className="flex h-8 w-full">
                                {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
                                    const dayDate = addDays(TIMELINE_START, i);
                                    const isToday = differenceInDays(dayDate, TODAY) === 0;
                                    const isMonthStart = dayDate.getDate() === 1;

                                    // Render logic depends on scale
                                    if (timeScale === 'year') {
                                        // For year view, days are too small, maybe just show ticks?
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-shrink-0 border-r border-slate-700/30 flex items-end pb-1 justify-center text-[10px] select-none ${isMonthStart ? 'border-l border-l-slate-600' : ''} ${isToday ? 'bg-blue-900/20' : ''}`}
                                                style={{ width: `${zoomLevel}px` }}
                                            >
                                                {/* Minimal content for year view */}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={i}
                                            className={`flex-shrink-0 border-r border-slate-700/30 flex items-center justify-center text-[10px] select-none ${isMonthStart ? 'font-bold text-slate-300 border-l border-l-slate-600' : 'text-slate-400'} ${isToday ? 'bg-blue-900/20 text-blue-200 font-bold' : ''}`}
                                            style={{ width: `${zoomLevel}px` }}
                                        >
                                            {format(dayDate, 'd')}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Grid Background */}
                        <div className="absolute inset-0 top-12 z-0 flex pointer-events-none">
                            {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
                                const dayDate = addDays(TIMELINE_START, i);
                                const isMonthStart = dayDate.getDate() === 1;
                                return (
                                    <div
                                        key={i}
                                        className={`flex-shrink-0 border-r border-slate-700/20 h-full ${isMonthStart ? 'border-l border-l-slate-700/50' : ''}`}
                                        style={{ width: `${zoomLevel}px` }}
                                    />
                                );
                            })}

                            {/* Current Day Line */}
                            <div
                                className="absolute top-0 bottom-0 border-l-2 border-blue-500 border-dashed z-0 opacity-50"
                                style={{ left: `${differenceInDays(TODAY, TIMELINE_START) * zoomLevel}px` }}
                            >
                                <div className="bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded absolute -top-0 -left-6 z-20">
                                    Today
                                </div>
                            </div>
                        </div>

                        {/* 3. Asset Rows & Bars */}
                        <div>
                            {filteredAssets.map((asset, index) => {
                                const bars = getAssetBars(asset);

                                return (
                                    <div
                                        key={asset.id}
                                        className={`h-20 border-b border-slate-700/50 relative group ${index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-900/20'}`}
                                    >
                                        {/* Render Continuous Bars */}
                                        {bars.map((bar, bIndex) => (
                                            <div
                                                key={bIndex}
                                                className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-sm shadow-sm flex items-center justify-center text-[10px] font-medium text-white overflow-hidden whitespace-nowrap transition-all hover:h-8 hover:z-10 cursor-pointer ${getStatusColor(bar.type)}`}
                                                style={{
                                                    left: `${bar.start * zoomLevel}px`,
                                                    width: `${Math.max(bar.width * zoomLevel, 2)}px`
                                                }}
                                                title={`${bar.label} (${bar.width} days)`}
                                            >
                                                {/* Only show label if wide enough */}
                                                {bar.width * zoomLevel > 40 && bar.label}
                                            </div>
                                        ))}

                                        {/* Due Date Marker (Vertical Line) */}
                                        {asset.dueDate && (
                                            <div
                                                className="absolute top-2 bottom-2 w-0.5 bg-slate-800/50 z-0"
                                                style={{ left: `${differenceInDays(parseISO(asset.dueDate), TIMELINE_START) * zoomLevel}px` }}
                                                title={`Due: ${format(parseISO(asset.dueDate), 'dd MMM yyyy')}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Footer / Legend --- */}
            <footer className="bg-slate-800 border-t border-slate-700 px-6 py-3 text-xs text-slate-400 flex justify-between items-center z-20">
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span>Healthy</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span>Due Soon (&lt;30 days)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span>Overdue</span>
                    </div>
                </div>
                <div>
                    Showing {filteredAssets.length} assets
                </div>
            </footer>


        </div>
    );
};

export default AssetTimeline;
