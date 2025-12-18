import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit2, Plus, Download, Printer, RotateCcw, DollarSign, ChevronDown, ChevronUp, AlertTriangle, Trash2 } from "lucide-react";
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
function MultiSelectDropdown({ label, options, selected, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (opt) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

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
                <div className="absolute z-[100] mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                    {options.map(opt => (
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
                    {options.length === 0 && (
                        <div className="px-3 py-2 text-slate-500 text-sm italic">No options</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function JobSheetPage({ onBack, currentUser }) {
    const { customers } = useGlobalData();
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");

    // Multi-select filters
    const [statusFilters, setStatusFilters] = useState([]);
    const [customerFilters, setCustomerFilters] = useState([]);
    const [siteFilters, setSiteFilters] = useState([]);

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

    useEffect(() => {
        const loaded = loadJobSheet();
        setRows(Array.isArray(loaded) && loaded.length ? loaded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : jobSheetSeed);
    }, []);

    useEffect(() => {
        saveJobSheet(rows);
    }, [rows]);

    // Get unique customers and sites from data for filters
    const filterOptions = useMemo(() => {
        const customerSet = new Set(rows.map(r => r.customer).filter(Boolean));
        const siteSet = new Set(rows.map(r => r.managedSite).filter(Boolean));
        return {
            customers: Array.from(customerSet).sort(),
            sites: Array.from(siteSet).sort()
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
    }, [rows, q, statusFilters, customerFilters, siteFilters, sortColumn, sortDirection]);

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
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `job-sheet-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
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
        setQ("");
    }

    // === TEMPORARY CSV IMPORT ===
    function handleCsvImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    alert("CSV appears empty or invalid.");
                    return;
                }

                // Parse header
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                console.log('[CSV Import] Headers:', headers);

                // Map CSV columns to our data structure
                const columnMap = {
                    'Job Number(s)': 'jobNumber',
                    'Job Number': 'jobNumber',
                    'Customer': 'customer',
                    'Job Description': 'jobDescription',
                    'Quote': 'quote',
                    'PO': 'po',
                    'Type': 'type',
                    'PO Value Ex GST': 'poValueExGst',
                    'PO Date': 'poDate',
                    'Status': 'status',
                    'Est Job Date(s)': 'estJobDate',
                    'Est Job Date': 'estJobDate',
                    'Parts Ordered From': 'partsOrderedFrom',
                    'Parts Ordered Date': 'partsOrderedDate',
                    'Parts Ordered Date(s)': 'partsOrderedDate',
                    'Est Delivery': 'estDelivery',
                    'Inv No': 'invNo',
                    'Inv Date': 'invDate',
                    'Inv Value Ex GST': 'invValueExGst',
                    'Inv Value Inc GST': 'invValueIncGst',
                    'Inv Value for GST': 'invValueIncGst',
                    'Inv Due Date': 'invDueDate',
                    'Notes': 'notes'
                };

                // Parse data rows (handle quoted fields with commas)
                const importedJobs = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    // Simple CSV parsing (handles basic quoted fields)
                    const values = [];
                    let current = '';
                    let inQuotes = false;
                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim()); // Don't forget last field

                    const job = {
                        id: crypto.randomUUID(),
                        updatedAt: new Date().toISOString(),
                        managedSite: '' // Not in CSV, but we need it
                    };

                    headers.forEach((header, idx) => {
                        const fieldName = columnMap[header];
                        if (fieldName && values[idx] !== undefined) {
                            let value = values[idx].replace(/^"|"$/g, ''); // Remove quotes

                            // Clean up money values (remove $ and commas)
                            if (fieldName.includes('Value') && value) {
                                value = value.replace(/[$,]/g, '');
                            }

                            // Clean up quote/invoice prefixes if they exist (we'll add them on display)
                            if (fieldName === 'quote' && value) {
                                value = value.replace(/^QU-/i, '');
                            }
                            if (fieldName === 'invNo' && value) {
                                value = value.replace(/^INV-/i, '');
                            }

                            job[fieldName] = value;
                        }
                    });

                    // Only add if it has a job number
                    if (job.jobNumber) {
                        importedJobs.push(job);
                    }
                }

                if (importedJobs.length === 0) {
                    alert("No valid jobs found in CSV.");
                    return;
                }

                const confirmImport = confirm(`Found ${importedJobs.length} jobs to import. This will ADD them to your existing data. Continue?`);
                if (confirmImport) {
                    setRows(prev => [...importedJobs, ...prev]);
                    alert(`Successfully imported ${importedJobs.length} jobs!`);
                }

            } catch (err) {
                console.error('[CSV Import] Error:', err);
                alert("Failed to parse CSV: " + err.message);
            }
        };

        reader.readAsText(file);
        // Reset input so same file can be re-selected
        event.target.value = '';
    }
    // === END TEMPORARY CSV IMPORT ===

    const right = (
        <>
            <NeonButton variant="slate" onClick={onBack}>
                <ArrowLeft size={16} /> Back
            </NeonButton>
            <NeonButton variant="sky" onClick={openAddModal}>
                <Plus size={16} /> New Job
            </NeonButton>
            <NeonButton variant="cyan" onClick={exportJson}>
                <Download size={16} /> Export JSON
            </NeonButton>
            {/* TEMPORARY: CSV Import Button */}
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg px-3 py-2 border backdrop-blur-sm transition active:scale-95 hover:brightness-110 bg-amber-500/10 border-amber-500/50 text-amber-200 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.65)]">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvImport}
                    className="hidden"
                />
                <Download size={16} className="rotate-180" /> Temp Import CSV
            </label>
            <NeonButton variant="slate" onClick={print}>
                <Printer size={16} /> Print / Save PDF
            </NeonButton>
            <HoldToConfirmButton variant="danger" seconds={3} onConfirm={resetToSeed}>
                <RotateCcw size={16} /> Reset (Hold)
            </HoldToConfirmButton>
        </>
    );

    return (
        <PageShell title="Job Sheet" right={right}>
            {/* Filters Card - needs relative positioning for dropdowns */}
            <Card className="p-4 mb-4 print:hidden relative z-30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                            options={STATUSES}
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

                    <div className="flex flex-col justify-end gap-2">
                        <div className="text-sm text-slate-400 bg-slate-950/30 px-3 py-2 rounded-lg border border-slate-800/50 flex justify-between">
                            <span>Results</span>
                            <span className="text-cyan-400 font-bold font-mono">{filtered.length}</span>
                        </div>
                        {(statusFilters.length > 0 || customerFilters.length > 0 || siteFilters.length > 0 || q) && (
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Data Table */}
            <Card className="overflow-hidden print:border print:bg-white flex-1">
                <div className="overflow-auto custom-scrollbar max-h-[calc(100vh-280px)]">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-900 border-b border-slate-700 print:bg-white print:border-gray-300 sticky top-0 z-20">
                            <tr>
                                {columns.map((c) => (
                                    <th
                                        key={c.key}
                                        onClick={() => c.sortable && handleSort(c.key)}
                                        className={[
                                            "text-left p-3 font-semibold text-slate-400 print:text-black whitespace-nowrap uppercase tracking-wider text-[10px]",
                                            c.w,
                                            c.sortable ? "cursor-pointer hover:text-cyan-400 select-none" : ""
                                        ].join(" ")}
                                    >
                                        <div className="flex items-center gap-1">
                                            {c.label}
                                            {c.sortable && sortColumn === c.key && (
                                                sortDirection === "asc"
                                                    ? <ChevronUp size={12} className="text-cyan-400" />
                                                    : <ChevronDown size={12} className="text-cyan-400" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th className="text-left p-3 font-semibold text-slate-400 print:text-black w-[160px] uppercase tracking-wider text-[10px]">
                                    Last Updated
                                </th>
                                <th className="sticky right-0 z-10 bg-slate-900 print:bg-white text-left p-3 border-l border-slate-700 print:border-gray-300 w-[100px] uppercase tracking-wider text-[10px] text-slate-400">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800/50">
                            {filtered.map((r) => {
                                const selected = r.id === selectedId;
                                return (
                                    <tr
                                        key={r.id}
                                        className={[
                                            "print:border-gray-300 group",
                                            selected ? "bg-cyan-500/5" : "hover:bg-slate-800/30",
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
                                            <NeonButton
                                                variant="cyan"
                                                className="px-2 py-1 text-[10px] uppercase font-bold print:hidden h-7"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(r);
                                                }}
                                            >
                                                <Edit2 size={12} /> Edit
                                            </NeonButton>
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

            {/* Edit / Add Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? `Edit Job Record (${formData.jobNumber})` : "Add New Job"}
                footer={
                    <>
                        <NeonButton variant="slate" onClick={() => setIsModalOpen(false)}>Cancel</NeonButton>
                        <NeonButton variant="sky" onClick={handleSave}>
                            {isEditing ? "Update Record" : "Create Job"}
                        </NeonButton>
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
                                readOnly={!isJobNumberEditable}
                                disabled={!isJobNumberEditable}
                                onChange={e => setFormData({ ...formData, jobNumber: e.target.value })}
                                className={`flex-1 ${!isJobNumberEditable ? "opacity-70 bg-slate-950 font-bold text-cyan-400" : "bg-slate-900"}`}
                            />
                            {!isJobNumberEditable && (
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
                        <FormRow label="Add New Note Entry">
                            <TextInput
                                value={newNoteEntry}
                                onChange={e => setNewNoteEntry(e.target.value)}
                                placeholder="Type a note here (Author/Date will be auto-attached on save)..."
                            />
                        </FormRow>
                    </div>
                    <div className="col-span-full mt-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Full History</label>
                        <TextArea
                            value={formData.notes || ""}
                            readOnly
                            className="bg-slate-950/40 text-slate-400 text-xs font-mono opacity-80 h-[120px]"
                            placeholder="No history yet."
                        />
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
