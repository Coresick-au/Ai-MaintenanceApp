import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit2, Plus, Download, Printer, RotateCcw, DollarSign, ChevronDown, ChevronUp, AlertTriangle, Trash2, MessageSquare, LayoutDashboard, Table, X } from "lucide-react";
import { jobSheetSeed } from "../data/jobSheetSeed";
import { clearJobSheet, loadJobSheet, saveJobSheet } from "../lib/storage";
import {
    Card,
    HoldToConfirmButton,
    NeonButton,
    PageShell,
    Select,
    StatusBadge,
    TextInput,
    TextArea,
    Modal,
} from "../components/ui/NeonUI";
import { useGlobalData } from "../context/GlobalDataContext";
import JobSheetDashboard from "./JobSheetDashboard";

const TYPES = ["Service", "Parts", "Projects"];
const STATUSES = [
    "Ready for Invoicing",
    "Quoted",
    "PO Received",
    "Job in Progress",
    "Parts Required",
    "Parts Ordered",
    "Invoiced",
    "Paid",
    "Shipped",
    "Job Completed"
];

const columns = [
    { key: "jobNumber", label: "Job Number", w: "w-[120px]", sortable: true },
    { key: "customer", label: "Customer", w: "w-[180px]", sortable: true },
    { key: "managedSite", label: "Managed Site", w: "w-[160px]", sortable: true },
    { key: "jobDescription", label: "Job Description", w: "w-[360px]", sortable: false },
    { key: "quote", label: "Quote", w: "w-[120px]", sortable: true },
    { key: "po", label: "PO", w: "w-[120px]", sortable: true },
    { key: "type", label: "Type", w: "w-[140px]", sortable: true },
    { key: "poValueExGst", label: "PO Value Ex GST", w: "w-[160px]", sortable: true },
    { key: "poDate", label: "PO Date", w: "w-[140px]", sortable: true },
    { key: "status", label: "Status", w: "w-[160px]", sortable: true },
    { key: "estJobDate", label: "Est Job Date", w: "w-[140px]", sortable: true },
    { key: "partsOrderedFrom", label: "Parts Ordered From", w: "w-[190px]", sortable: false },
    { key: "partsOrderedDate", label: "Parts Ordered Date", w: "w-[160px]", sortable: true },
    { key: "estDelivery", label: "Est Delivery", w: "w-[140px]", sortable: true },
    { key: "invNo", label: "Inv No", w: "w-[120px]", sortable: true },
    { key: "invDate", label: "Inv Date", w: "w-[140px]", sortable: true },
    { key: "invValueExGst", label: "Inv Value Ex GST", w: "w-[170px]", sortable: true },
    { key: "invValueIncGst", label: "Inv Value Inc GST", w: "w-[170px]", sortable: true },
    { key: "invDueDate", label: "Inv Due Date", w: "w-[140px]", sortable: true },
];

const statusTone = (s) => {
    const v = String(s || "").toLowerCase();
    if (["paid", "complete", "completed", "job completed", "closed"].includes(v)) return "success";
    if (["overdue", "late", "cancelled", "canceled"].includes(v)) return "danger";
    if (["ordered", "parts ordered", "awaiting parts", "parts required", "awaiting", "pending"].includes(v)) return "warning";
    if (["wip", "in progress", "job in progress", "progress"].includes(v)) return "info";
    return "slate";
};

// Helper to get row background color based on status (matching Excel color scheme)
const statusRowColor = (status) => {
    switch (status) {
        // Yellow group - needs action/attention
        case "Ready for Invoicing":
        case "Parts Ordered":
        case "Parts Required":
            return "bg-yellow-500/30 hover:bg-yellow-500/40";
        // Green group - completed/paid
        case "Paid":
        case "Job Completed":
            return "bg-emerald-500/30 hover:bg-emerald-500/40";
        // Blue group - in progress/invoiced
        case "Shipped":
        case "Invoiced":
        case "Job In Progress":
        case "PO Received":
        case "Quoted":
            return "bg-sky-500/30 hover:bg-sky-500/40";
        default:
            return "hover:bg-slate-800/30";
    }
};

const INITIAL_JOB = {
    jobNumber: "",
    customer: "",
    managedSite: "",
    jobDescription: "",
    quote: "",
    po: "",
    type: "Service",
    poValueExGst: "",
    poDate: "",
    status: "Ready for Invoicing",
    estJobDate: "",
    partsOrderedFrom: "",
    partsOrderedDate: "",
    estDelivery: "",
    invNo: "",
    invDate: "",
    invValueExGst: "",
    invValueIncGst: "",
    invDueDate: "",
    notes: "",
};

// Helper to format quote/invoice with prefix for display (only if not already prefixed)
const formatQuote = (val) => {
    if (!val) return "";
    const strVal = String(val);
    return strVal.startsWith("QU-") ? strVal : `QU-${strVal}`;
};
const formatInvoice = (val) => {
    if (!val) return "";
    const strVal = String(val);
    return strVal.startsWith("INV-") ? strVal : `INV-${strVal}`;
};

const FormRow = ({ label, children, isMoney, prefix }) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
        <div className="relative">
            {isMoney && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10">
                    <DollarSign size={14} />
                </div>
            )}
            {prefix && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500 font-bold text-sm pointer-events-none z-10">
                    {prefix}
                </div>
            )}
            {children}
        </div>
    </div>
);

// Multi-select dropdown component
function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const toggleOption = (opt) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayText = selected.length === 0
        ? placeholder
        : selected.length === 1
            ? selected[0]
            : `${selected.length} selected`;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-left text-sm text-slate-200 flex justify-between items-center hover:border-cyan-600 transition-colors"
            >
                <span className={selected.length === 0 ? "text-slate-500" : ""}>{displayText}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
                <div className="absolute z-[100] mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                    {/* Search input */}
                    {options.length > 5 && (
                        <div className="p-2 border-b border-slate-700">
                            <TextInput
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="text-sm"
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="overflow-auto">
                        {filteredOptions.map(opt => (
                            <label
                                key={opt}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 cursor-pointer text-sm text-slate-200"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={() => toggleOption(opt)}
                                    className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                                />
                                {opt}
                            </label>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-2 text-slate-500 text-sm italic">No matches</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function JobSheetPage({ onBack, currentUser, userRole }) {
    const isTech = userRole === "tech";
    const { customers } = useGlobalData();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");

    // Multi-select filters
    const [statusFilters, setStatusFilters] = useState([]);
    const [customerFilters, setCustomerFilters] = useState([]);
    const [siteFilters, setSiteFilters] = useState([]);
    const [yearFilters, setYearFilters] = useState([]); // Multi-select year filter

    // Sorting
    const [sortColumn, setSortColumn] = useState("jobNumber");
    const [sortDirection, setSortDirection] = useState("desc");

    const [selectedId, setSelectedId] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_JOB);
    const [isEditing, setIsEditing] = useState(false);
    const [newNoteEntry, setNewNoteEntry] = useState("");

    // Job Number Override
    const [isJobNumberEditable, setIsJobNumberEditable] = useState(false);

    // Danger Zone toggle
    const [showDangerZone, setShowDangerZone] = useState(false);

    // View mode: "table" or "dashboard"
    const [viewMode, setViewMode] = useState("table");

    // Year type for dashboard: "calendar" or "financial"
    const [yearType, setYearType] = useState("calendar");

    // Drill down state for dashboard
    const [drillDownFilter, setDrillDownFilter] = useState(null);

    useEffect(() => {
        const loaded = loadJobSheet();
        setRows(Array.isArray(loaded) && loaded.length ? loaded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : jobSheetSeed);
    }, []);

    useEffect(() => {
        saveJobSheet(rows);
    }, [rows]);

    // Get unique customers, sites, and years from data for filters
    const filterOptions = useMemo(() => {
        const customerSet = new Set(rows.map(r => r.customer).filter(Boolean));
        const siteSet = new Set(rows.map(r => r.managedSite).filter(Boolean));

        // Extract years from PO Date
        const yearSet = new Set();
        rows.forEach(r => {
            if (r.poDate) {
                const year = r.poDate.substring(0, 4); // YYYY-MM-DD format
                if (year && year.length === 4 && !isNaN(year)) {
                    yearSet.add(year);
                }
            }
        });

        return {
            customers: Array.from(customerSet).sort(),
            sites: Array.from(siteSet).sort(),
            years: Array.from(yearSet).sort((a, b) => b - a) // Descending
        };
    }, [rows]);

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        return rows
            .filter((r) => {
                // Status filter (multi-select OR logic)
                if (statusFilters.length > 0 && !statusFilters.includes(r.status)) return false;
                // Customer filter
                if (customerFilters.length > 0 && !customerFilters.includes(r.customer)) return false;
                // Site filter
                if (siteFilters.length > 0 && !siteFilters.includes(r.managedSite)) return false;
                // Year filter (multi-select based on PO Date)
                if (yearFilters.length > 0) {
                    if (!r.poDate) return false;
                    const year = r.poDate.substring(0, 4);
                    if (!yearFilters.includes(year)) return false;
                }
                // Role-based visibility for Technicians
                if (isTech) {
                    const techAllowedStatuses = [
                        "Ready for Invoicing",
                        "PO Received",
                        "Job in Progress",
                        "Parts Required",
                        "Job Completed"
                    ];
                    if (!techAllowedStatuses.includes(r.status)) return false;
                }
                return true;
            })
            .filter((r) => {
                if (!query) return true;
                return [...columns, { key: 'notes' }].some((c) =>
                    (r[c.key] ?? "").toString().toLowerCase().includes(query)
                );
            })
            .sort((a, b) => {
                const aVal = a[sortColumn] ?? "";
                const bVal = b[sortColumn] ?? "";

                // Handle numeric sorting for value columns
                if (sortColumn.toLowerCase().includes("value")) {
                    const aNum = parseFloat(aVal) || 0;
                    const bNum = parseFloat(bVal) || 0;
                    return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
                }

                // Handle date sorting
                if (sortColumn.toLowerCase().includes("date")) {
                    const aDate = new Date(aVal || 0);
                    const bDate = new Date(bVal || 0);
                    return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
                }

                // String sorting
                const comparison = String(aVal).localeCompare(String(bVal));
                return sortDirection === "asc" ? comparison : -comparison;
            });
    }, [rows, q, statusFilters, customerFilters, siteFilters, yearFilters, sortColumn, sortDirection]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    function generateJobNumber() {
        const now = new Date();
        const yearPrefix = now.getFullYear().toString().slice(-2);

        // Find existing jobs for this year to determine next sequence
        const yearJobs = rows.filter(r => r.jobNumber && r.jobNumber.toString().startsWith(yearPrefix));

        // Count jobs in current year to determine next number
        const nextNum = yearJobs.length + 1;
        return `${yearPrefix}${nextNum.toString().padStart(3, '0')}`;
    }

    function openAddModal() {
        const autoNum = generateJobNumber();
        setFormData({ ...INITIAL_JOB, jobNumber: autoNum });
        setIsEditing(false);
        setNewNoteEntry("");
        setIsJobNumberEditable(false);
        setShowDangerZone(false);
        setIsModalOpen(true);
    }

    function openEditModal(job) {
        setFormData(job);
        setIsEditing(true);
        setNewNoteEntry("");
        setIsJobNumberEditable(false);
        setShowDangerZone(false);
        setIsModalOpen(true);
    }

    function handleSave() {
        const now = new Date();
        const timestamp = now.toISOString();
        // Display format for note: 18/12/2025 16:55
        const displayDate = now.getDate().toString().padStart(2, '0') + '/' +
            (now.getMonth() + 1).toString().padStart(2, '0') + '/' +
            now.getFullYear();
        const displayTime = now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0');

        // Handle Note Tagging
        let finalNotes = formData.notes || "";
        if (newNoteEntry.trim()) {
            const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "Admin";
            const tag = `[${userName} ${displayDate} ${displayTime}]`;
            const entry = `${tag} ${newNoteEntry.trim()}`;
            finalNotes = finalNotes ? `${entry}\n${finalNotes}` : entry;
        }

        const dataToSave = { ...formData, notes: finalNotes, updatedAt: timestamp };

        if (isEditing) {
            setRows(prev => prev.map(r => r.id === dataToSave.id ? dataToSave : r));
        } else {
            // Use the current job number (may have been overridden)
            const finalJobNum = isJobNumberEditable ? formData.jobNumber : generateJobNumber();
            const newJob = { ...dataToSave, id: crypto.randomUUID(), jobNumber: finalJobNum };
            setRows(prev => [newJob, ...prev]);
        }
        setIsModalOpen(false);
    }

    function deleteRow(id) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        if (selectedId === id) setSelectedId(null);
        setIsModalOpen(false);
    }

    function exportJson() {
        // Feature removed as per user request
        return;
    }

    function print() {
        window.print();
    }

    function resetToSeed() {
        clearJobSheet();
        setRows(jobSheetSeed);
        setSelectedId(null);
    }

    function handleJobNumberOverride() {
        if (confirm("⚠️ Warning: Manually editing job numbers may cause duplicates and data inconsistencies. Are you sure you want to proceed?")) {
            setIsJobNumberEditable(true);
        }
    }

    function clearAllFilters() {
        setStatusFilters([]);
        setCustomerFilters([]);
        setSiteFilters([]);
        setYearFilters([]);
        setQ("");
        setDrillDownFilter(null); // Also clear drill-down
    }

    // Drill-down handler for dashboard charts
    function handleDrillDown(type, value) {
        if (!type || !value) {
            setDrillDownFilter(null);
            return;
        }
        setDrillDownFilter({ type, value });
    }

    // Calculate drill-down filtered data
    const drillDownFiltered = useMemo(() => {
        if (!drillDownFilter) return filtered;

        return filtered.filter(job => {
            switch (drillDownFilter.type) {
                case 'status':
                    return job.status === drillDownFilter.value;
                case 'type':
                    return job.type === drillDownFilter.value;
                case 'customer':
                    return job.customer === drillDownFilter.value;
                case 'month':
                    return job.poDate && job.poDate.startsWith(drillDownFilter.value);
                case 'year':
                    return job.poDate && job.poDate.startsWith(drillDownFilter.value);
                default:
                    return true;
            }
        });
    }, [filtered, drillDownFilter]);

    // === TEMPORARY CSV IMPORT ===
    // Helper functions for CSV import
    const normalizeHeader = (h) => h.toLowerCase().trim().replace(/\s+/g, ' ');

    const convertDateToISO = (val) => {
        if (!val || typeof val !== 'string') return val;
        // Matches DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YY
        const match = val.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
        if (match) {
            let [, d, m, y] = match;
            if (y.length === 2) y = "20" + y;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return val;
    };

    function handleCsvImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;

                // 1. Robust CSV Parser: Handles newlines inside quotes & escaped quotes
                const parseCSV = (str) => {
                    const rows = [];
                    let row = [];
                    let col = "";
                    let inQuotes = false;
                    for (let i = 0; i < str.length; i++) {
                        const char = str[i];
                        const nextChar = str[i + 1];
                        if (char === '"' && inQuotes && nextChar === '"') {
                            col += '"'; i++; // Handle "" escaped quotes
                        } else if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            row.push(col.trim());
                            col = "";
                        } else if ((char === '\n' || char === '\r') && !inQuotes) {
                            if (col !== "" || row.length > 0) {
                                row.push(col.trim());
                                rows.push(row);
                                row = [];
                                col = "";
                            }
                            if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
                        } else {
                            col += char;
                        }
                    }
                    if (col || row.length) {
                        row.push(col.trim());
                        rows.push(row);
                    }
                    return rows;
                };

                const allRows = parseCSV(text);
                if (allRows.length < 2) {
                    alert("CSV appears empty or invalid.");
                    return;
                }

                // 2. Normalize headers to handle "Exc" vs "Ex" and extra spaces
                const rawHeaders = allRows[0];
                const normalizedHeaders = rawHeaders.map(normalizeHeader);
                console.log('[CSV Import] Normalized Headers:', normalizedHeaders);

                // Map CSV columns (normalized) to internal state keys
                const columnMap = {
                    'job number': 'jobNumber',
                    'job number(s)': 'jobNumber',
                    'customer': 'customer',
                    'job description': 'jobDescription',
                    'quote': 'quote',
                    'po': 'po',
                    'type': 'type',
                    'po value exc gst': 'poValueExGst',
                    'po value ex gst': 'poValueExGst',
                    'po date': 'poDate',
                    'status': 'status',
                    'est job date': 'estJobDate',
                    'est job date(s)': 'estJobDate',
                    'parts ordered from': 'partsOrderedFrom',
                    'parts ordered date': 'partsOrderedDate',
                    'parts ordered date(s)': 'partsOrderedDate',
                    'est delivery': 'estDelivery',
                    'inv no': 'invNo',
                    'inv date': 'invDate',
                    'inv value exc gst': 'invValueExGst',
                    'inv value ex gst': 'invValueExGst',
                    'inv value inc gst': 'invValueIncGst',
                    'inv value for gst': 'invValueIncGst',
                    'inv due date': 'invDueDate',
                    'notes': 'notes'
                };

                // 3. Efficiency: Find the last actual column index we care about
                const lastRelevantIdx = normalizedHeaders.reduce((acc, h, i) => columnMap[h] ? i : acc, 0);

                const importedJobs = [];
                for (let i = 1; i < allRows.length; i++) {
                    const values = allRows[i];
                    if (!values[0]) continue; // Skip if Job Number is missing

                    const job = {
                        id: crypto.randomUUID(),
                        updatedAt: new Date().toISOString(),
                        managedSite: ''
                    };

                    // Only loop through columns that exist in our headers
                    for (let j = 0; j <= lastRelevantIdx; j++) {
                        const header = normalizedHeaders[j];
                        const fieldName = columnMap[header];

                        if (fieldName && values[j] !== undefined) {
                            let value = values[j];

                            // Clean money
                            if (fieldName.toLowerCase().includes('value')) {
                                value = value.replace(/[$,\s]/g, '');
                            }
                            // Clean IDs
                            if (fieldName === 'quote') value = value.replace(/^QU-/i, '');
                            if (fieldName === 'invNo') value = value.replace(/^INV-/i, '');

                            // Convert dates to YYYY-MM-DD for the HTML inputs
                            if (fieldName.toLowerCase().includes('date') || fieldName === 'estDelivery') {
                                value = convertDateToISO(value);
                            }

                            job[fieldName] = value;
                        }
                    }

                    if (job.jobNumber) {
                        importedJobs.push(job);
                    }
                }

                if (importedJobs.length === 0) {
                    alert("No valid jobs found in CSV. Check if the 'Job Number' column exists.");
                    return;
                }

                if (confirm(`Found ${importedJobs.length} jobs. Add to database?`)) {
                    setRows(prev => [...importedJobs, ...prev]);
                    alert(`Imported ${importedJobs.length} jobs successfully.`);
                }

            } catch (err) {
                console.error('[CSV Import] Error:', err);
                alert("Failed to parse CSV: " + err.message);
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    }
    // === END TEMPORARY CSV IMPORT ===


    const right = (
        <>
            {/* View Toggle - Hidden for Techs */}
            {!isTech && (
                <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                    <button
                        onClick={() => setViewMode("table")}
                        className={`px-3 py-2 flex items-center gap-1 text-sm transition ${viewMode === "table"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                            }`}
                    >
                        <Table size={14} /> Table
                    </button>
                    <button
                        onClick={() => setViewMode("dashboard")}
                        className={`px-3 py-2 flex items-center gap-1 text-sm transition ${viewMode === "dashboard"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                            }`}
                    >
                        <LayoutDashboard size={14} /> Dashboard
                    </button>
                </div>
            )}
            {!isTech && (
                <>
                    <NeonButton variant="sky" onClick={openAddModal}>
                        <Plus size={16} /> New Job
                    </NeonButton>
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg px-3 py-2 border backdrop-blur-sm transition active:scale-95 hover:brightness-110 bg-amber-500/10 border-amber-500/50 text-amber-200 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.65)] text-sm">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCsvImport}
                            className="hidden"
                        />
                        <Download size={16} className="rotate-180" /> Temp Import CSV
                    </label>
                </>
            )}
            <NeonButton variant="slate" onClick={print}>
                <Printer size={16} /> Print / Save PDF
            </NeonButton>
        </>
    );

    return (
        <PageShell
            title={
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <ArrowLeft size={20} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    </button>
                    <span>Job Sheet</span>
                </div>
            }
            right={right}
        >
            {/* Filters Card - needs relative positioning for dropdowns */}
            <Card className="p-4 mb-4 print:hidden relative z-30">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Search Database</label>
                        <TextInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Customer, job #, PO, notes..."
                            className="bg-slate-950/50"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Status Filter</label>
                        <MultiSelectDropdown
                            options={isTech ? [
                                "Ready for Invoicing",
                                "PO Received",
                                "Job in Progress",
                                "Parts Required",
                                "Job Completed"
                            ] : STATUSES}
                            selected={statusFilters}
                            onChange={setStatusFilters}
                            placeholder="All Statuses"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Customer Filter</label>
                        <MultiSelectDropdown
                            options={filterOptions.customers}
                            selected={customerFilters}
                            onChange={setCustomerFilters}
                            placeholder="All Customers"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Managed Site Filter</label>
                        <MultiSelectDropdown
                            options={filterOptions.sites}
                            selected={siteFilters}
                            onChange={setSiteFilters}
                            placeholder="All Sites"
                        />
                    </div>

                    <div className="flex items-end gap-1">
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 block mb-1">Year (PO Date)</label>
                            <MultiSelectDropdown
                                options={filterOptions.years}
                                selected={yearFilters}
                                onChange={setYearFilters}
                                placeholder="All Years"
                            />
                        </div>
                        {(statusFilters.length > 0 || customerFilters.length > 0 || siteFilters.length > 0 || yearFilters.length > 0 || q) && (
                            <button
                                onClick={clearAllFilters}
                                className="p-2 h-[42px] rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Clear all filters"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col justify-end gap-2">
                        <div className="text-sm text-slate-400 bg-slate-950/30 px-3 py-2 rounded-lg border border-slate-800/50 flex justify-between">
                            <span>Results</span>
                            <span className="text-cyan-400 font-bold font-mono">{filtered.length}</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Dashboard View - Only for non-techs */}
            {viewMode === "dashboard" && !isTech && (
                <>
                    <JobSheetDashboard
                        filteredData={filtered}
                        allData={rows}
                        onDrillDown={handleDrillDown}
                        drillDownFilter={drillDownFilter}
                        yearType={yearType}
                        onYearTypeChange={setYearType}
                    />

                    {/* Drill-Down Job List */}
                    {drillDownFilter && drillDownFiltered.length > 0 && (
                        <Card className="mt-6">
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="text-lg font-bold text-white">
                                    {drillDownFiltered.length} Job{drillDownFiltered.length !== 1 ? 's' : ''} - {drillDownFilter.type}: {drillDownFilter.value}
                                </h3>
                            </div>
                            <div className="overflow-auto max-h-[400px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-900 border-b border-slate-700 sticky top-0">
                                        <tr>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-slate-400">Job #</th>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-slate-400">Customer</th>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-slate-400">Type</th>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-slate-400">Status</th>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-slate-400">PO Value</th>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-slate-400">PO Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {drillDownFiltered.map(job => (
                                            <tr
                                                key={job.id}
                                                className={`border-b border-slate-800/30 hover:bg-slate-800/30 cursor-pointer ${statusRowColor(job.status)}`}
                                                onClick={() => {
                                                    setSelectedId(job.id);
                                                    openEditModal(job);
                                                }}
                                            >
                                                <td className="p-3 text-slate-200 font-mono text-xs">{job.jobNumber}</td>
                                                <td className="p-3 text-slate-200">{job.customer || 'N/A'}</td>
                                                <td className="p-3 text-slate-200">{job.type}</td>
                                                <td className="p-3">
                                                    <StatusBadge tone={statusTone(job.status)}>{job.status}</StatusBadge>
                                                </td>
                                                <td className="p-3 text-slate-200">
                                                    {job.poValueExGst ? `$${Number(job.poValueExGst).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                                                </td>
                                                <td className="p-3 text-slate-400 text-xs">
                                                    {job.poDate || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* Table View */}
            {viewMode === "table" && (
                <Card className="overflow-hidden print:border print:bg-white flex-1">
                    <div className="overflow-auto custom-scrollbar max-h-[calc(100vh-280px)]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-900 border-b border-slate-700 print:bg-white print:border-gray-300 sticky top-0 z-20">
                                <tr>
                                    {columns.map((c) => (
                                        <th
                                            key={c.key}
                                            className={`p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-800 select-none ${c.w ?? ""}`}
                                            onClick={() => handleSort(c.key)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {c.label}
                                                {sortColumn === c.key && (
                                                    sortDirection === "asc"
                                                        ? <ChevronUp size={14} className="text-cyan-400" />
                                                        : <ChevronDown size={14} className="text-cyan-400" />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 w-[120px]">Last Updated</th>
                                    <th className="sticky right-0 z-10 bg-[#0f172a] p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-l border-slate-800/70 w-[100px] print:bg-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r) => {
                                    const selected = r.id === selectedId;
                                    return (
                                        <tr
                                            key={r.id}
                                            className={[
                                                "print:border-gray-300 group border-b border-slate-800/30",
                                                selected ? "ring-2 ring-cyan-500/50 bg-cyan-500/10" : statusRowColor(r.status),
                                                "transition-colors",
                                            ].join(" ")}
                                            onClick={() => setSelectedId(r.id)}
                                        >
                                            {columns.map((c) => {
                                                let value = r[c.key] ?? "";
                                                const key = c.key;

                                                // Format quote and invoice with prefix for display
                                                if (key === "quote" && value) {
                                                    value = formatQuote(value);
                                                }
                                                if (key === "invNo" && value) {
                                                    value = formatInvoice(value);
                                                }

                                                if (key === "status") {
                                                    return (
                                                        <td key={key} className="p-3">
                                                            <StatusBadge tone={statusTone(value)}>{String(value || "N/A")}</StatusBadge>
                                                        </td>
                                                    );
                                                }

                                                // Formatting money columns in table
                                                const displayValue = (key.toLowerCase().includes("value") && value && !isNaN(value))
                                                    ? `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : value || <span className="text-slate-600 italic">...</span>;

                                                return (
                                                    <td key={key} className="p-3 text-slate-200 truncate font-medium">
                                                        {displayValue}
                                                    </td>
                                                );
                                            })}

                                            <td className="p-3 text-[10px] text-slate-500 font-mono">
                                                {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""}
                                            </td>

                                            {/* Actions column - now at the end */}
                                            <td className="sticky right-0 z-10 bg-[#0f172a] print:bg-white p-2 border-l border-slate-800/70 print:border-gray-300">
                                                <div className="flex items-center justify-end gap-2">
                                                    <NeonButton
                                                        variant="cyan"
                                                        className="px-3 py-1.5 text-[10px] uppercase font-bold print:hidden relative"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(r);
                                                        }}
                                                    >
                                                        {isTech ? <Eye size={12} /> : <Edit2 size={12} />} {isTech ? "View" : "Edit"}
                                                        {r.notes && (
                                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center" title="Has notes">
                                                                <MessageSquare size={10} className="text-slate-900" />
                                                            </span>
                                                        )}
                                                    </NeonButton>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!filtered.length && (
                                    <tr>
                                        <td
                                            colSpan={columns.length + 2}
                                            className="p-12 text-center text-slate-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-4xl">🔍</span>
                                                <p className="text-lg">No matching records found in database.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Edit / Add Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? `Edit Job Record (${formData.jobNumber})` : "Add New Job"}
                footer={
                    <>
                        <NeonButton variant="slate" onClick={() => setIsModalOpen(false)}>{isTech ? "Close" : "Cancel"}</NeonButton>
                        {!isTech && (
                            <NeonButton variant="sky" onClick={handleSave}>
                                {isEditing ? "Update Record" : "Create Job"}
                            </NeonButton>
                        )}
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* General Section */}
                    <div className="col-span-full border-b border-slate-800 pb-2 mb-2">
                        <h3 className="text-sm font-bold text-cyan-500 uppercase flex justify-between items-center">
                            <span>General Information</span>
                            {formData.id && <span className="text-[10px] text-slate-500 font-mono">{formData.id}</span>}
                        </h3>
                    </div>

                    {/* Job Number with override */}
                    <FormRow label="Job Number (Auto)">
                        <div className="flex gap-2">
                            <TextInput
                                value={formData.jobNumber}
                                readOnly={isTech || !isJobNumberEditable}
                                disabled={isTech || !isJobNumberEditable}
                                onChange={e => setFormData({ ...formData, jobNumber: e.target.value })}
                                className={`flex-1 ${(isTech || !isJobNumberEditable) ? "opacity-70 bg-slate-950 font-bold text-cyan-400" : "bg-slate-900"}`}
                            />
                            {!isTech && !isJobNumberEditable && (
                                <button
                                    type="button"
                                    onClick={handleJobNumberOverride}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-400 hover:text-white transition-colors"
                                    title="Override job number (use with caution)"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                    </FormRow>

                    <FormRow label="Customer">
                        <Select
                            value={formData.customer || ""}
                            onChange={e => setFormData({ ...formData, customer: e.target.value, managedSite: "" })}
                        >
                            <option value="">Select Customer...</option>
                            {customers
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))
                            }
                        </Select>
                    </FormRow>
                    {/* Managed Site Dropdown - only shows if a customer is selected and has sites */}
                    {(() => {
                        const selectedCustomer = customers.find(c => c.name === formData.customer);
                        const sites = selectedCustomer?.managedSites || [];
                        if (formData.customer && sites.length > 0) {
                            return (
                                <FormRow label="Managed Site">
                                    <Select
                                        value={formData.managedSite || ""}
                                        onChange={e => setFormData({ ...formData, managedSite: e.target.value })}
                                    >
                                        <option value="">Select Site...</option>
                                        {sites
                                            .slice()
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(site => (
                                                <option key={site.id} value={site.name}>{site.name}</option>
                                            ))
                                        }
                                    </Select>
                                </FormRow>
                            );
                        }
                        return null;
                    })()}
                    <FormRow label="Type">
                        <Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                    </FormRow>
                    <div className="md:col-span-1 lg:col-span-2">
                        <FormRow label="Job Description">
                            <TextInput value={formData.jobDescription || ""} onChange={e => setFormData({ ...formData, jobDescription: e.target.value })} placeholder="Enter brief description" />
                        </FormRow>
                    </div>
                    <FormRow label="Status">
                        <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </FormRow>

                    {/* Order Info */}
                    <div className="col-span-full border-b border-slate-800 pb-2 mt-4 mb-2">
                        <h3 className="text-sm font-bold text-cyan-500 uppercase">Order Details</h3>
                    </div>
                    <FormRow label="Quote Number" prefix="QU-">
                        <TextInput
                            value={formData.quote}
                            onChange={e => setFormData({ ...formData, quote: e.target.value })}
                            placeholder="00876"
                            className="pl-12"
                        />
                    </FormRow>
                    <FormRow label="Purchase Order (PO)">
                        <TextInput value={formData.po || ""} onChange={e => setFormData({ ...formData, po: e.target.value })} placeholder="Any format..." />
                    </FormRow>
                    <FormRow label="PO Value (Ex GST)" isMoney>
                        <TextInput type="number" step="0.01" className="pl-8" value={formData.poValueExGst} onChange={e => setFormData({ ...formData, poValueExGst: e.target.value })} placeholder="0.00" />
                    </FormRow>
                    <FormRow label="PO Date">
                        <TextInput type="date" value={formData.poDate || ""} onChange={e => setFormData({ ...formData, poDate: e.target.value })} />
                    </FormRow>

                    {/* Logistics */}
                    <div className="col-span-full border-b border-slate-800 pb-2 mt-4 mb-2">
                        <h3 className="text-sm font-bold text-cyan-500 uppercase">Logistics & Supply</h3>
                    </div>
                    <FormRow label="Est. Job Date">
                        <TextInput type="date" value={formData.estJobDate || ""} onChange={e => setFormData({ ...formData, estJobDate: e.target.value })} />
                    </FormRow>
                    <FormRow label="Parts Ordered From">
                        <TextInput value={formData.partsOrderedFrom || ""} onChange={e => setFormData({ ...formData, partsOrderedFrom: e.target.value })} placeholder="Supplier name" />
                    </FormRow>
                    <FormRow label="Parts Ordered Date">
                        <TextInput type="date" value={formData.partsOrderedDate || ""} onChange={e => setFormData({ ...formData, partsOrderedDate: e.target.value })} />
                    </FormRow>
                    <FormRow label="Est. Delivery">
                        <TextInput type="date" value={formData.estDelivery || ""} onChange={e => setFormData({ ...formData, estDelivery: e.target.value })} />
                    </FormRow>

                    {/* Invoicing */}
                    <div className="col-span-full border-b border-slate-800 pb-2 mt-4 mb-2">
                        <h3 className="text-sm font-bold text-cyan-500 uppercase">Invoicing</h3>
                    </div>
                    <FormRow label="Invoice Number" prefix="INV-">
                        <TextInput
                            value={formData.invNo}
                            onChange={e => setFormData({ ...formData, invNo: e.target.value })}
                            placeholder="00987"
                            className="pl-12"
                        />
                    </FormRow>
                    <FormRow label="Invoice Date">
                        <TextInput type="date" value={formData.invDate || ""} onChange={e => setFormData({ ...formData, invDate: e.target.value })} />
                    </FormRow>
                    <FormRow label="Inv Value (Ex GST)" isMoney>
                        <TextInput type="number" step="0.01" className="pl-8" value={formData.invValueExGst} onChange={e => setFormData({ ...formData, invValueExGst: e.target.value })} placeholder="0.00" />
                    </FormRow>
                    <FormRow label="Inv Value (Inc GST)" isMoney>
                        <TextInput type="number" step="0.01" className="pl-8" value={formData.invValueIncGst} onChange={e => setFormData({ ...formData, invValueIncGst: e.target.value })} placeholder="0.00" />
                    </FormRow>
                    <FormRow label="Inv Due Date">
                        <TextInput type="date" value={formData.invDueDate || ""} onChange={e => setFormData({ ...formData, invDueDate: e.target.value })} />
                    </FormRow>

                    {/* Notes */}
                    <div className="col-span-full border-b border-slate-800 pb-2 mt-4 mb-2">
                        <h3 className="text-sm font-bold text-cyan-500 uppercase">Notes & Audit Trail</h3>
                    </div>
                    <div className="col-span-full">
                        <FormRow label="Quick Add Note (Auto-timestamps on save)">
                            <TextInput
                                value={newNoteEntry}
                                onChange={e => setNewNoteEntry(e.target.value)}
                                placeholder="Type a note here (Author/Date will be auto-attached on save)..."
                            />
                        </FormRow>
                    </div>
                    <div className="col-span-full mt-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Full Notes (Editable)</label>
                        <TextArea
                            value={formData.notes || ""}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="bg-slate-900 text-slate-200 text-xs font-mono h-[150px]"
                            placeholder="No notes yet. You can add or edit notes here..."
                        />
                        <p className="text-[10px] text-slate-500 mt-1">You can directly edit, add, or delete notes above. Use the "Quick Add" field to auto-timestamp new entries.</p>
                    </div>

                    {/* Danger Zone - only show when editing */}
                    {isEditing && (
                        <div className="col-span-full mt-6">
                            <button
                                type="button"
                                onClick={() => setShowDangerZone(!showDangerZone)}
                                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                                <AlertTriangle size={14} />
                                {showDangerZone ? "Hide Danger Zone" : "Show Danger Zone"}
                                <ChevronDown size={14} className={`transition-transform ${showDangerZone ? "rotate-180" : ""}`} />
                            </button>

                            {showDangerZone && (
                                <div className="mt-3 p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
                                    <p className="text-xs text-red-400 mb-3">
                                        Permanently delete this job record. This action cannot be undone.
                                    </p>
                                    <HoldToConfirmButton
                                        seconds={2}
                                        variant="danger"
                                        className="text-sm"
                                        onConfirm={() => deleteRow(formData.id)}
                                    >
                                        <Trash2 size={14} /> Hold to Delete Job
                                    </HoldToConfirmButton>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </PageShell>
    );
}
