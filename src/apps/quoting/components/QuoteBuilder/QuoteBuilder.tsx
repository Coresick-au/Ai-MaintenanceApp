import { useState } from 'react';
import { Save, Lock, FileCheck, Unlock } from 'lucide-react';
import JobDetails from './JobDetails';
import Timesheet from './Timesheet';
import Extras from './Extras';
import HoursVisualizer from '../HoursVisualizer';
import type { useQuote } from '../../hooks/useQuote';

interface QuoteBuilderProps {
    quote: ReturnType<typeof useQuote>;
}

export default function QuoteBuilder({ quote }: QuoteBuilderProps) {
    const {
        status, setStatus,
        jobDetails, setJobDetails,
        shifts, addShift, updateShift, removeShift, calculateShiftBreakdown,
        extras, addExtra, updateExtra, removeExtra,
        isLocked, savedQuotes, loadQuote, activeQuoteId,
        savedCustomers, setRates, renameTechnician,
        totalHours, totalNTHrs, totalOTHrs
    } = quote;

    const [highlightMissingFields, setHighlightMissingFields] = useState(false);

    const saveQuoteToSystem = () => {
        if (!jobDetails.customer) {
            setHighlightMissingFields(true);
            // Clear highlight after 3 seconds
            setTimeout(() => setHighlightMissingFields(false), 3000);
            alert("Please enter Customer Name before saving.");
            return;
        }
        setStatus('quoted');
        alert("Quote saved to system! It is now locked. Convert to Invoice to edit actuals.");
    };

    const convertToDraftInvoice = () => {
        setStatus('invoice');
    };

    const unlockQuote = () => {
        if (confirm("Are you sure you want to unlock this quote? It will revert to draft status.")) {
            setStatus('draft');
        }
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

    return (
        <div className="space-y-6">
            {/* Workflow Controls */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {savedQuotes.length > 1 && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-400">Active Quote:</label>
                            <select
                                value={activeQuoteId || ''}
                                onChange={(e) => loadQuote(e.target.value)}
                                className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-slate-100 hover:border-primary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                            >
                                {savedQuotes.map((q) => (
                                    <option key={q.id} value={q.id} className="bg-gray-800 text-slate-100">
                                        {q.jobDetails.customer || 'Untitled'} - {q.jobDetails.jobNo || 'No Job #'} ({q.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {status === 'draft' && (
                        <button
                            onClick={saveQuoteToSystem}
                            className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-green-700 font-medium"
                        >
                            <Save size={18} /> Add Quote to System
                        </button>
                    )}
                    {status === 'quoted' && (
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-sm flex items-center gap-1"><Lock size={14} /> Quote is Locked</span>
                            <button
                                onClick={unlockQuote}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-amber-700 font-medium"
                            >
                                <Unlock size={16} /> Unlock to Edit
                            </button>
                            <button
                                onClick={convertToDraftInvoice}
                                className="bg-purple-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-purple-700 font-medium"
                            >
                                <FileCheck size={18} /> Convert to Draft Invoice
                            </button>
                        </div>
                    )}
                    {status === 'invoice' && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-purple-900/20 px-3 py-1.5 rounded border border-purple-700 text-purple-300">
                                <Unlock size={14} />
                                <span className="text-sm font-medium">Invoice Mode</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to edit this invoice? This will unlock it for modifications.")) {
                                        setStatus('draft');
                                    }
                                }}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-amber-700 font-medium"
                            >
                                <Unlock size={16} /> Edit Invoice
                            </button>
                            <button
                                onClick={() => setStatus('closed')}
                                className="bg-emerald-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-emerald-700 font-medium"
                            >
                                <FileCheck size={18} /> Finalize & Close
                            </button>
                        </div>
                    )}
                    {status === 'closed' && (
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-sm flex items-center gap-1"><Lock size={14} /> Invoice Closed</span>
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to edit this closed invoice? This will revert it to draft status.")) {
                                        setStatus('draft');
                                    }
                                }}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-amber-700 font-medium"
                            >
                                <Unlock size={16} /> Edit Invoice
                            </button>
                            <button
                                onClick={() => setStatus('invoice')}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-amber-700 font-medium"
                            >
                                <Unlock size={16} /> Unlock to Edit
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <JobDetails
                jobDetails={jobDetails}
                setJobDetails={setJobDetails}
                isLocked={isLocked}
                savedCustomers={savedCustomers}
                setRates={setRates}
                renameTechnician={renameTechnician}
                highlightMissingFields={highlightMissingFields}
            />

            <Timesheet
                shifts={shifts}
                isLocked={isLocked}
                addShift={addShift}
                updateShift={updateShift}
                removeShift={removeShift}
                calculateShiftBreakdown={calculateShiftBreakdown}
                formatMoney={formatMoney}
                technicians={jobDetails.technicians}
            />

            <Extras
                extras={extras}
                isLocked={isLocked}
                addExtra={addExtra}
                updateExtra={updateExtra}
                removeExtra={removeExtra}
            />

            {/* New Total Hours Box - Displays Hours (NT/OT) calculated in useQuote.ts */}
            <div className="bg-bg-secondary p-4 rounded-lg shadow-sm border border-slate-700 flex justify-between items-center">
                <div className="text-lg font-bold text-slate-300 uppercase tracking-wider">Total Shift Hours Summary:</div>
                <div className="flex gap-6 items-center">
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-blue-400">Normal Time (NT)</span>
                        <span className="text-xl font-bold text-blue-200">{totalNTHrs.toFixed(2)}h</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-amber-400">Overtime (OT)</span>
                        <span className="text-xl font-bold text-amber-200">{totalOTHrs.toFixed(2)}h</span>
                    </div>
                    <div className="flex flex-col items-end border-l pl-4 border-slate-700">
                        <span className="text-xs text-slate-400">Grand Total</span>
                        <span className="text-2xl font-bold text-accent-primary">{totalHours.toFixed(2)}h</span>
                    </div>
                </div>
            </div>

            <HoursVisualizer
                shifts={shifts}
                calculateShiftBreakdown={calculateShiftBreakdown}
            />
        </div>
    );
}
