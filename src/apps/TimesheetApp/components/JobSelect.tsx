import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { JobOption } from '../types';

interface JobSelectProps {
    value: string;
    onChange: (value: string) => void;
    jobs: JobOption[];
    placeholder?: string;
    className?: string;
    error?: boolean;
    disabled?: boolean;
}

export function JobSelect({
    value,
    onChange,
    jobs,
    placeholder = "Select Job...",
    className = "",
    error = false,
    disabled = false
}: JobSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [openUpwards, setOpenUpwards] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const [customMode, setCustomMode] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Find the currently selected job
    const selectedJob = jobs.find(j => j.jobNumber === value);

    // Smart positioning: Check if we should open upwards and calculate coordinates
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const threshold = 380; // List is max 300px + search (~50px)
            const upwards = spaceBelow < threshold;
            setOpenUpwards(upwards);

            setCoords({
                top: upwards ? rect.top : rect.bottom,
                left: rect.left,
                width: 320 // Fixed width for searchability
            });
        }
    }, [isOpen]);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter jobs based on search term
    const filteredJobs = jobs.filter(job =>
        job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Auto-detect custom mode: if value exists but not in jobs list, enable custom mode
    useEffect(() => {
        if (value && !selectedJob) {
            // Value exists but not found in jobs list = custom job number
            setCustomMode(true);
        }
    }, [value, selectedJob]);

    const handleSelect = (jobNumber: string) => {
        onChange(jobNumber);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Display Button or Custom Input */}
            {customMode ? (
                // Custom Job Number Input
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                        placeholder="Enter custom job #..."
                        disabled={disabled}
                        className={`
                            flex-1 px-3 py-2 text-sm rounded-lg border transition-all outline-none font-medium
                            ${disabled ? 'bg-slate-800/50 border-slate-700/50 cursor-not-allowed opacity-50' : 'bg-[var(--bg-surface)]'}
                            ${error ? 'border-red-500 bg-red-500/5' : 'border-[var(--border-default)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30'}
                            text-[var(--text-primary)]
                        `}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setCustomMode(false);
                            onChange("");
                        }}
                        disabled={disabled}
                        className="px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Switch to job dropdown"
                    >
                        Use Dropdown
                    </button>
                </div>
            ) : (
                // Dropdown Selector
                <div className="flex gap-2">
                    <div
                        ref={triggerRef}
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        onKeyDown={(e) => {
                            if (disabled) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsOpen(!isOpen);
                            }
                        }}
                        className={`
                            flex-1 flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border transition-all outline-none
                            ${disabled ? 'bg-slate-800/50 border-slate-700/50 cursor-not-allowed opacity-50' : 'bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--accent)]/50'}
                            ${isOpen ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30' : 'border-[var(--border-default)]'}
                            ${error ? 'border-red-500 bg-red-500/5' : ''}
                            text-[var(--text-primary)]
                        `}
                    >
                        <span className={`truncate ${!selectedJob ? 'text-[var(--text-muted)]' : 'font-medium'}`}>
                            {selectedJob
                                ? `${selectedJob.jobNumber} - ${selectedJob.customer}`
                                : placeholder
                            }
                        </span>
                        <div className="flex items-center gap-1">
                            {value && !disabled && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange("");
                                    }}
                                    className="p-1 rounded-md hover:bg-white/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                    title="Clear selection"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setCustomMode(true);
                            onChange("");
                        }}
                        disabled={disabled}
                        className="px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Enter custom job number"
                    >
                        Custom #
                    </button>
                </div>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
                        fixed z-[9999] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150
                    `}
                    style={{
                        top: openUpwards ? 'auto' : `${coords.top + 4}px`,
                        bottom: openUpwards ? `${window.innerHeight - coords.top + 4}px` : 'auto',
                        left: `${coords.left}px`,
                        width: `${coords.width}px`
                    }}
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-[var(--border-default)] bg-white/5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                autoFocus
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search job, customer, or work details..."
                                className="w-full bg-[var(--bg-app)] text-sm px-9 py-2 rounded-md border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)]/50"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {filteredJobs.length > 0 ? (
                            filteredJobs.map((job) => (
                                <button
                                    key={job.jobNumber}
                                    type="button"
                                    onClick={() => handleSelect(job.jobNumber)}
                                    className={`
                                        w-full p-3 text-left hover:bg-[var(--bg-active)] transition-colors border-b border-white/5 last:border-0
                                        ${value === job.jobNumber ? 'bg-[var(--accent)]/10' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-0.5">
                                        <span className={`font-bold ${value === job.jobNumber ? 'text-[var(--accent)]' : 'text-white'}`}>
                                            {job.jobNumber} - {job.customer}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)] uppercase tracking-items font-semibold">
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                        {job.description || "No description provided"}
                                    </p>
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <Search size={24} className="mx-auto mb-2 text-slate-700 opacity-50" />
                                <p className="text-sm text-[var(--text-muted)] italic">No matches found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
