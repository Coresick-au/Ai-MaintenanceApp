import { useState, useEffect, useRef } from 'react';
import { User, UserPlus, Save, Search, X } from 'lucide-react';
import RatesConfig from './RatesConfig';
import type { Customer, Rates, Contact } from '../types';
// @ts-ignore
import { useGlobalData } from '../../../context/GlobalDataContext';

interface CustomerDashboardProps {
    // Legacy props might still be passed but we prefer global data
    savedCustomers?: Customer[];
    saveCustomer?: (customer: Customer) => void;
    deleteCustomer?: (id: string) => void;
    saveAsDefaults: (rates: Rates) => void;
    resetToDefaults: () => void;
    savedDefaultRates: Rates;
}

// ... CustomerLogo ... (Keep existing if possible, or redefine)
function CustomerLogo({ customer, isSelected }: { customer: Customer; isSelected: boolean }) {
    const backgrounds = ['bg-white', 'bg-gray-200', 'bg-gray-700', 'bg-black'];
    const [bgIndex, setBgIndex] = useState(() => {
        const saved = localStorage.getItem(`customer-logo-bg-${customer.id}`);
        return saved ? parseInt(saved) : 2; // Default to gray-700
    });

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIndex = (bgIndex + 1) % backgrounds.length;
        setBgIndex(nextIndex);
        localStorage.setItem(`customer-logo-bg-${customer.id}`, nextIndex.toString());
    };

    if (!customer.logo) {
        return (
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-700 text-primary-200' : 'bg-gray-600 text-slate-300'
                }`}>
                <User size={20} />
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={`w-12 h-12 rounded-lg flex items-center justify-center p-1 cursor-pointer transition-all ${backgrounds[bgIndex]
                } ${isSelected ? 'ring-2 ring-primary-500' : 'hover:ring-2 hover:ring-gray-500'}`}
            title="Click to change background"
        >
            <img
                src={customer.logo}
                alt={`${customer.name} logo`}
                className="w-full h-full object-contain"
            />
        </div>
    );
}

const DEFAULT_RATES: Rates = {
    siteNormal: 160,
    siteOvertime: 190,
    weekend: 210,
    publicHoliday: 235,
    officeReporting: 160,
    travel: 75,
    travelOvertime: 112,
    travelCharge: 1.10,
    travelChargeExBrisbane: 0,
    vehicle: 120,
    perDiem: 90,
    standardDayRate: 2055,
    weekendDayRate: 2520,
    costOfLabour: 100,
    rateNotes: 'Ex Banyo',
    overtimeThreshold: 7.5,
    standardExpenses: []
};

export default function CustomerDashboard({
    savedCustomers: propSavedCustomers,
    saveCustomer: propSaveCustomer,
    deleteCustomer: propDeleteCustomer,
    saveAsDefaults,
    resetToDefaults,
    savedDefaultRates
}: CustomerDashboardProps) {
    const {
        customers: globalCustomers,
        addCustomer,
        updateCustomer: globalUpdateCustomer,
    } = useGlobalData();

    // Use props if provided (for managed site support), otherwise fall back to global context
    const customers = propSavedCustomers || globalCustomers;
    const updateCustomer = propSaveCustomer ? async (id: string, data: any) => {
        const customer = customers.find((c: Customer) => c.id === id);
        if (customer) {
            await propSaveCustomer({ ...customer, ...data });
        }
    } : globalUpdateCustomer;

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editName, setEditName] = useState('');
    const [editRates, setEditRates] = useState<Rates>(DEFAULT_RATES);
    const [editContacts, setEditContacts] = useState<Contact[]>([]);
    const [editIsLocked, setEditIsLocked] = useState(false);
    const [editLockedAt, setEditLockedAt] = useState<string | undefined>(undefined);
    const [showDefaultRates, setShowDefaultRates] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Unsaved changes tracking
    const originalRatesRef = useRef<Rates | null>(null);
    const originalIsLockedRef = useRef<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Detect if rates or lock state have been modified
    useEffect(() => {
        if (!originalRatesRef.current || !selectedId) {
            setHasUnsavedChanges(false);
            return;
        }

        const ratesChanged = JSON.stringify(editRates) !== JSON.stringify(originalRatesRef.current);
        const lockChanged = editIsLocked !== originalIsLockedRef.current;
        setHasUnsavedChanges(ratesChanged || lockChanged);
    }, [editRates, editIsLocked, selectedId]);

    // Warn before leaving page with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleSelect = (customer: Customer) => {
        // Warn if there are unsaved changes
        if (hasUnsavedChanges) {
            const confirmLeave = confirm('You have unsaved changes to the rates. Do you want to discard them?');
            if (!confirmLeave) return;
        }

        setSelectedId(customer.id);
        setEditName(customer.name);
        const customerRates = customer.rates || savedDefaultRates;
        setEditRates(customerRates);
        originalRatesRef.current = JSON.parse(JSON.stringify(customerRates)); // Deep copy
        originalIsLockedRef.current = customer.isLocked || false; // Track original lock state
        setEditContacts(customer.contacts || []);
        setEditIsLocked(customer.isLocked || false);
        setEditLockedAt(customer.lockedAt);
        setSaveSuccess(false);
        setHasUnsavedChanges(false);
    };

    // Note: Customer deletion removed - manage customers in Customer Portal app

    const handleAddCustomer = async () => {
        const name = prompt("Enter new customer name:");
        if (name && name.trim()) {
            await addCustomer({
                name: name.trim(),
                rates: savedDefaultRates,
                contacts: [],
                managedSites: []
            });
            // Auto-select is tricky without finding the object, but customers list updates automatically
        }
    };

    const handleSaveRates = async () => {
        if (!selectedId) return;

        const customer = customers.find((c: Customer) => c.id === selectedId);
        if (!customer) return;

        // Update lockedAt timestamp if rates are being locked
        const newLockedAt = editIsLocked ? (editLockedAt || new Date().toISOString()) : undefined;

        await updateCustomer(selectedId, {
            rates: editRates,
            isLocked: editIsLocked,
            lockedAt: newLockedAt
        });

        // Update local state with new timestamp
        setEditLockedAt(newLockedAt);

        // Reset unsaved changes tracking
        originalRatesRef.current = JSON.parse(JSON.stringify(editRates));
        originalIsLockedRef.current = editIsLocked;
        setHasUnsavedChanges(false);

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleLockChange = async (isLocked: boolean) => {
        const newLockedAt = isLocked ? new Date().toISOString() : undefined;

        setEditIsLocked(isLocked);
        setEditLockedAt(newLockedAt);

        // Auto-save when lock state changes
        if (selectedId) {
            await updateCustomer(selectedId, {
                rates: editRates,
                isLocked: isLocked,
                lockedAt: newLockedAt
            });

            // Update tracking refs after auto-save
            originalIsLockedRef.current = isLocked;
            setHasUnsavedChanges(false);

            // Show success feedback
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
    };

    const selectedCustomer = customers.find((c: Customer) => c.id === selectedId);

    const filteredCustomers = (customers as Customer[])
        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar List */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-600 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-slate-200">Customers</h2>
                        <button
                            onClick={handleAddCustomer}
                            className="bg-primary-600 hover:bg-primary-500 text-white p-2 rounded transition-colors"
                            title="Add New Customer"
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md pl-9 pr-8 py-1.5 text-sm text-slate-200 focus:ring-1 focus:ring-primary-500 outline-none placeholder:text-slate-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredCustomers.length === 0 && (
                        <p className="text-center text-slate-400 py-4 text-sm">
                            {searchQuery ? 'No customers found' : 'No customers yet.'}
                        </p>
                    )}
                    {filteredCustomers.map(c => (
                        <div
                            key={c.id}
                            onClick={() => handleSelect(c)}
                            className={`p-3 rounded cursor-pointer flex justify-between items-center group ${selectedId === c.id ? 'bg-primary-900/20 border-primary-700 border' : 'hover:bg-gray-700 border border-transparent'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CustomerLogo customer={c} isSelected={selectedId === c.id} />
                                <span className="font-medium text-slate-200">{c.name}</span>
                            </div>
                            {/* Delete removed - manage customers in Customer Portal app */}
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto">

                {!selectedId ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
                        <p>Select a customer to edit details and rates</p>
                    </div>
                ) : (
                    <>
                        {/* Header Card */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-100">{editName}</h2>
                                    <p className="text-sm text-slate-400">Manage customer details and rates</p>
                                </div>
                            </div>

                            {/* Default Rates Toggle */}
                            <div className="mb-6 flex justify-end">
                                <button
                                    onClick={() => setShowDefaultRates(!showDefaultRates)}
                                    className="text-xs text-primary-400 hover:text-primary-300 underline"
                                >
                                    {showDefaultRates ? 'Hide' : 'Configure'} Default System Rates
                                </button>
                            </div>

                            {showDefaultRates && (
                                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 mb-6">
                                    <h3 className="text-sm font-bold text-slate-200 mb-2">Default Global Rates</h3>
                                    <RatesConfig
                                        rates={savedDefaultRates}
                                        setRates={saveAsDefaults}
                                        saveAsDefaults={saveAsDefaults}
                                        resetToDefaults={resetToDefaults}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Contacts */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                        <UserPlus size={16} /> Main Contacts
                                    </label>
                                    <div className="bg-gray-700/30 p-4 rounded border border-gray-600 min-h-[100px]">
                                        {editContacts.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center italic mt-4">No contacts added.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {editContacts.map((c: any, i: number) => (
                                                    <li key={i} className="text-sm text-slate-300 bg-gray-800 p-3 rounded">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className="font-medium">{c.name}</span>
                                                                {c.role && <span className="ml-2 text-xs text-slate-500">({c.role})</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                                            {c.phone && <span>📞 {c.phone}</span>}
                                                            {c.email && <span>✉️ {c.email}</span>}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Intro / Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Customer Notes</label>
                                    <textarea
                                        className="w-full h-[100px] bg-gray-700/50 border border-gray-600 rounded p-2 text-sm text-slate-200 resize-none"
                                        value={selectedCustomer?.customerNotes || ''}
                                        onChange={(e) => updateCustomer(selectedId!, { customerNotes: e.target.value })}
                                        placeholder="Enter notes about this customer..."
                                    />
                                </div>
                            </div>

                            {/* Rates Config */}
                            <div className="border-t border-gray-600 pt-6">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">Customer Specific Rates</h3>
                                {hasUnsavedChanges && (
                                    <div className="mb-4 px-4 py-2 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-300 text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                        You have unsaved changes to the rates
                                    </div>
                                )}
                                <RatesConfig
                                    rates={editRates}
                                    setRates={setEditRates}
                                    saveAsDefaults={saveAsDefaults}
                                    resetToDefaults={() => setEditRates(savedDefaultRates)}
                                    isLocked={editIsLocked}
                                    lockedAt={editLockedAt}
                                    onLockChange={handleLockChange}
                                    onSaveCustomer={hasUnsavedChanges ? handleSaveRates : undefined}
                                    hasUnsavedChanges={hasUnsavedChanges}
                                    saveSuccess={saveSuccess}
                                    title="Customer Default Rates"
                                    description={`Default rates for ${editName}. These rates will be used for new quotes.`}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
