
import React, { useState } from 'react';
import { FileText, Plus, Trash2, FolderOpen, Users, Download, Upload, Search } from 'lucide-react';
import { calculateShiftBreakdown as calculateLogic } from '../logic';
import type { Quote, Customer, Rates } from '../types';
import CustomerDashboard from './CustomerDashboard';
import TechnicianDashboard from './TechnicianDashboard';
import QuoteValueChart from './QuoteValueChart';

interface DashboardProps {
    savedQuotes: Quote[];
    createNewQuote: () => void;
    loadQuote: (id: string) => void;
    deleteQuote: (id: string) => void;
    savedCustomers: Customer[];
    saveCustomer: (customer: Customer) => void;
    deleteCustomer: (id: string) => void;
    savedTechnicians: string[];
    saveTechnician: (name: string) => void;
    deleteTechnician: (name: string) => void;
    saveAsDefaults: (rates: Rates) => void;
    resetToDefaults: () => void;
    savedDefaultRates: Rates;
    exportState: () => void;
    importState: (fileContent: string) => Promise<boolean>;
}

export default function Dashboard({
    savedQuotes, createNewQuote, loadQuote, deleteQuote,
    savedCustomers, saveCustomer, deleteCustomer,
    savedTechnicians, saveTechnician, deleteTechnician,
    saveAsDefaults, resetToDefaults, savedDefaultRates, exportState, importState
}: DashboardProps) {
    const [view, setView] = useState<'quotes' | 'customers' | 'technicians' | 'backup'>('quotes');
    const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'quoted' | 'invoice' | 'closed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [backupSuccess, setBackupSuccess] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        exportState();
        setBackupSuccess(true);
        setTimeout(() => setBackupSuccess(false), 2000); // Reset after 2 seconds
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                try {
                    const success = await importState(content);
                    if (success) {
                        alert('State imported successfully! Quotes have been saved to the cloud.');
                    } else {
                        alert('Failed to import state. Please check the file format.');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Failed to import state. Error: ' + error);
                }
            };
            reader.readAsText(file);
        }
        // Reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Helper function to calculate total cost for a quote (for KPIs only),
    // using the same core logic as useQuote / logic.ts
    const calculateQuoteTotal = (quote: Quote): number => {
        const calcShiftBreakdown = (shift: any) => calculateLogic(shift, quote.rates);

        const shiftCosts = quote.shifts.reduce((acc, shift) => {
            const result = calcShiftBreakdown(shift);
            return acc + (result.cost || 0);
        }, 0);

        const extrasCost = quote.extras.reduce((acc, extra) => acc + (extra.cost || 0), 0);

        const reportingCost = (quote.jobDetails.reportingTime || 0) * quote.rates.officeReporting;

        const travelChargeCost = (quote.rates.travelChargeExBrisbane || 0) * quote.jobDetails.technicians.length;

        return shiftCosts + extrasCost + reportingCost + travelChargeCost;
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this quote?")) {
            deleteQuote(id);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary p-6 pt-14">
            <div className="max-w-[95%] mx-auto">
                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-200">Service Quote & Invoice Manager</h1>
                        <p className="text-slate-400 mt-1">Manage quotes, customers, and technicians</p>
                    </div>

                    <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 shadow-sm">
                        <button
                            onClick={() => setView('quotes')}
                            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors ${view === 'quotes' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-gray-700'}`}
                        >
                            <FileText size={18} /> Quotes
                        </button>
                        <button
                            onClick={() => setView('customers')}
                            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors ${view === 'customers' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-gray-700'}`}
                        >
                            <Users size={18} /> Customers
                        </button>
                        <button
                            onClick={() => setView('backup')}
                            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors ${view === 'backup' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-gray-700'}`}
                        >
                            <Download size={18} /> Backup & Restore
                        </button>
                    </div>
                </div>

                {view === 'quotes' ? (
                    <>
                        {/* KPI Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Card 1: Draft Count */}
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Drafts to Start</p>
                                        <p className="text-2xl font-bold text-slate-200">
                                            {savedQuotes.filter(q => q.status === 'draft').length}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center">
                                        <FileText size={20} className="text-slate-200" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Quoted Value */}
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Pending Quote Value</p>
                                        <p className="text-2xl font-bold text-amber-400">
                                            {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(
                                                savedQuotes.filter(q => q.status === 'quoted').reduce((acc, q) => acc + calculateQuoteTotal(q), 0)
                                            )}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-amber-700 rounded-lg flex items-center justify-center">
                                        <FileText size={20} className="text-amber-200" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Total Invoiced */}
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Invoiced Revenue</p>
                                        <p className="text-2xl font-bold text-purple-400">
                                            {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(
                                                savedQuotes.filter(q => q.status === 'invoice' || q.status === 'closed').reduce((acc, q) => acc + calculateQuoteTotal(q), 0)
                                            )}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                        <FileText size={20} className="text-purple-200" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Total Quotes */}
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Total Quotes</p>
                                        <p className="text-2xl font-bold text-teal-400">
                                            {savedQuotes.length}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center">
                                        <FileText size={20} className="text-teal-200" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quote Value Chart */}
                        <div className="mb-6">
                            <QuoteValueChart
                                quotes={savedQuotes}
                                calculateQuoteTotal={calculateQuoteTotal}
                            />
                        </div>

                        <div className="px-6">
                            {/* Search and Filter Section */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                {/* Search Bar */}
                                <div className="relative flex-1 max-w-md">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search customers, jobs, descriptions..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                {/* Status Filter Pills */}
                                <div className="flex gap-2 flex-wrap">
                                    {(['all', 'draft', 'quoted', 'invoice', 'closed'] as const).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filterStatus === status
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-gray-800 text-slate-400 border border-gray-700 hover:bg-gray-700'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quotes Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* New Quote Card */}
                                <button
                                    onClick={createNewQuote}
                                    className="flex flex-col items-center justify-center h-48 bg-gray-800 border-2 border-dashed border-primary-600 rounded-lg hover:border-primary-400 hover:bg-gray-700 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 mb-3 group-hover:scale-110 transition-transform">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-semibold text-slate-300">Create New Quote</span>
                                </button>

                                {/* Filtered Quotes */}
                                {savedQuotes
                                    .filter(q => {
                                        // Status filter
                                        const matchesStatus = filterStatus === 'all' || q.status === filterStatus;

                                        // Search filter (case-insensitive)
                                        if (!searchQuery.trim()) return matchesStatus;

                                        const query = searchQuery.toLowerCase().trim();
                                        const matchesSearch =
                                            q.jobDetails.customer?.toLowerCase().includes(query) ||
                                            q.jobDetails.jobNo?.toLowerCase().includes(query) ||
                                            q.quoteNumber?.toLowerCase().includes(query) ||
                                            q.jobDetails.description?.toLowerCase().includes(query) ||
                                            q.jobDetails.location?.toLowerCase().includes(query);

                                        return matchesStatus && matchesSearch;
                                    })
                                    .sort((a, b) => {
                                        // Sort by quote number (descending - newest first)
                                        const numA = parseInt(a.quoteNumber) || 0;
                                        const numB = parseInt(b.quoteNumber) || 0;
                                        return numB - numA;
                                    })
                                    .map((quote) => {
                                        const quoteTotal = calculateQuoteTotal(quote);
                                        return (
                                            <div
                                                key={quote.id}
                                                onClick={() => loadQuote(quote.id)}
                                                className="p-5 rounded-xl bg-gray-800/80 border border-gray-700 hover:border-gray-600 hover:bg-gray-800 transition-all cursor-pointer relative group"
                                            >
                                                {/* Header Row */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-black text-slate-100">#{quote.quoteNumber}</span>
                                                        <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${quote.status === 'draft' ? 'bg-slate-700 text-slate-300' :
                                                            quote.status === 'quoted' ? 'bg-amber-600 text-amber-50' :
                                                                quote.status === 'invoice' ? 'bg-purple-600 text-purple-50' :
                                                                    'bg-emerald-600 text-emerald-50'
                                                            }`}>
                                                            {quote.status}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleDelete(e, quote.id)}
                                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Job Number */}
                                                <h3 className="text-lg font-bold text-slate-200 mb-1">
                                                    {quote.jobDetails.jobNo ? `JOB-${quote.jobDetails.jobNo}` : 'JOB-PENDING'}
                                                </h3>

                                                {/* Customer */}
                                                <p className="text-sm text-slate-400 truncate">
                                                    {quote.jobDetails.customer || 'No Customer Assigned'}
                                                </p>

                                                {/* Description/Scope */}
                                                {quote.jobDetails.description && (
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                        {quote.jobDetails.description}
                                                    </p>
                                                )}

                                                {/* Divider */}
                                                <div className="border-t border-gray-700 my-3"></div>

                                                {/* Footer Row */}
                                                <div className="flex justify-between items-center">
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <FolderOpen size={12} />
                                                        <span>{new Date(quote.lastModified).toLocaleDateString('en-AU')}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500 uppercase tracking-wider">Value</div>
                                                        <div className={`text-sm font-bold ${quote.status === 'quoted' ? 'text-amber-400' :
                                                            quote.status === 'invoice' || quote.status === 'closed' ? 'text-emerald-400' :
                                                                'text-slate-400'
                                                            }`}>
                                                            {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(quoteTotal)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </>
                ) : view === 'customers' ? (
                    <CustomerDashboard
                        savedCustomers={savedCustomers}
                        saveCustomer={saveCustomer}
                        deleteCustomer={deleteCustomer}
                        saveAsDefaults={saveAsDefaults}
                        resetToDefaults={resetToDefaults}
                        savedDefaultRates={savedDefaultRates}
                    />
                ) : view === 'backup' ? (
                    <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-slate-200 mb-2">Backup & Restore</h2>
                            <p className="text-sm text-slate-400">Save and restore your complete application data including quotes, customers, and default rates.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                                <h3 className="text-xl font-bold uppercase text-slate-100 tracking-wider mb-3 flex items-center gap-2">
                                    <Download size={18} /> Export Data
                                </h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Download a complete backup of all your quotes, customers, and settings.
                                </p>
                                <button
                                    onClick={handleBackup}
                                    className={`w-full px-4 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2 ${backupSuccess
                                        ? 'bg-success text-white'
                                        : 'bg-gray-600 text-white hover:bg-gray-500'
                                        }`}
                                >
                                    {backupSuccess ? (
                                        <>
                                            <Download size={16} /> Backup Saved Successfully!
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} /> Backup/Save State
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                                <h3 className="text-xl font-bold uppercase text-slate-100 tracking-wider mb-3 flex items-center gap-2">
                                    <Upload size={18} /> Import Data
                                </h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Restore your data from a previously saved backup file.
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileImport}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <Upload size={16} /> Restore/Load State
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
                            <p className="text-sm text-amber-300">
                                <strong>Warning:</strong> Importing data will overwrite all existing quotes, customers, and settings. Consider creating a backup before importing.
                            </p>
                        </div>
                    </div>
                ) : (
                    <TechnicianDashboard
                        savedTechnicians={savedTechnicians}
                        saveTechnician={saveTechnician}
                        deleteTechnician={deleteTechnician}
                    />
                )
                }
            </div >
        </div >
    );
}
