import { Archive, Save, FileCheck, Lock, Unlock } from 'lucide-react';
import type { useQuote } from '../../hooks/useQuote';
import { useToast } from '../Toast';

interface StatusHeaderProps {
    quote: ReturnType<typeof useQuote>;
}

export default function StatusHeader({ quote }: StatusHeaderProps) {
    const { showToast } = useToast();
    const { status, isLocked, jobDetails } = quote;

    return (
        <>
            {status === 'invoice' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2 bg-primary-900/20 px-3 py-1.5 rounded border border-primary-700 text-primary-300">
                            <Unlock size={14} />
                            <span className="text-sm font-medium">Invoice Mode - Ready to Finalize</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to edit this invoice? This will unlock it for modifications.")) {
                                        quote.setStatus('draft');
                                    }
                                }}
                                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-500 font-medium"
                            >
                                <Unlock size={16} /> Edit Invoice
                            </button>
                            <button
                                onClick={() => quote.setStatus('closed')}
                                disabled={isLocked}
                                className="bg-emerald-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileCheck size={18} /> Finalize & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {status === 'closed' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Lock size={14} className="text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-400">✓ Invoice Closed</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to edit this closed invoice? This will revert it to draft status.")) {
                                        quote.setStatus('draft');
                                    }
                                }}
                                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-500 font-medium"
                            >
                                <Unlock size={16} /> Edit Invoice
                            </button>
                            <button
                                onClick={() => quote.setStatus('invoice')}
                                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-500 font-medium"
                            >
                                <Unlock size={16} /> Unlock to Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {status === 'archived' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-600 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Archive size={16} />
                        <span className="text-sm font-medium">This quote has been archived</span>
                    </div>
                    <button
                        onClick={() => quote.setStatus('draft')}
                        className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-500 font-medium"
                    >
                        Restore to Draft
                    </button>
                </div>
            )}
            {status === 'draft' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-sm">Ready to save this quote?</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (!jobDetails.customer) {
                                        showToast("Please enter Customer Name before saving.", "warning");
                                        return;
                                    }
                                    quote.setStatus('quoted');
                                    showToast("Quote saved to system! It is now locked.", "success");
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-emerald-700 font-medium"
                            >
                                <Save size={18} /> Add Quote to System
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Archive this quote? Archived quotes can be restored later.')) {
                                        quote.setStatus('archived');
                                    }
                                }}
                                className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-600 font-medium border border-slate-600"
                            >
                                <Archive size={14} />
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {status === 'quoted' && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Lock size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-400">Quote is Locked</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to unlock this quote? It will revert to draft status.")) {
                                        quote.setStatus('draft');
                                    }
                                }}
                                className="bg-slate-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-500 font-medium"
                            >
                                <Unlock size={16} /> Unlock to Edit
                            </button>
                            <button
                                onClick={() => quote.setStatus('invoice')}
                                className="bg-primary-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-primary-500 font-medium"
                            >
                                <FileCheck size={18} /> Convert to Draft Invoice
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Archive this quote? Archived quotes can be restored later.')) {
                                        quote.setStatus('archived');
                                    }
                                }}
                                className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-slate-600 font-medium border border-slate-600"
                            >
                                <Archive size={14} />
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
