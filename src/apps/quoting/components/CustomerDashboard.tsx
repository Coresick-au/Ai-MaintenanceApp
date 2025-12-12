
import { useState } from 'react';
import { Trash2, User, UserPlus } from 'lucide-react';
import RatesConfig from './RatesConfig';
import type { Customer, Rates, Contact } from '../types';

interface CustomerDashboardProps {
    savedCustomers: Customer[];
    saveCustomer: (customer: Customer) => void;
    deleteCustomer: (id: string) => void;
    saveAsDefaults: (rates: Rates) => void;
    resetToDefaults: () => void;
    savedDefaultRates: Rates;
}

// Customer Logo Component with background toggle
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
    rateNotes: 'Ex Banyo'
};

export default function CustomerDashboard({
    savedCustomers, saveCustomer, deleteCustomer,
    saveAsDefaults, resetToDefaults, savedDefaultRates
}: CustomerDashboardProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editRates, setEditRates] = useState<Rates>(DEFAULT_RATES);
    const [editContacts, setEditContacts] = useState<Contact[]>([]);
    const [showDefaultRates, setShowDefaultRates] = useState(false);

    const handleSelect = (customer: Customer) => {
        setSelectedId(customer.id);
        setEditName(customer.name);
        setEditRates(customer.rates || savedDefaultRates);
        setEditContacts(customer.contacts || []);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            deleteCustomer(id);
            if (selectedId === id) {
                setSelectedId(null);
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar List */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-600 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-200">Customers</h2>
                    <button
                        disabled
                        className="bg-gray-600 text-slate-400 p-2 rounded cursor-not-allowed opacity-50 text-xl font-bold"
                        title="Create customers in the Customer Portal"
                    >
                        +
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {savedCustomers.length === 0 && (
                        <p className="text-center text-slate-400 py-4 text-sm">No customers yet.</p>
                    )}
                    {savedCustomers.map(c => (
                        <div
                            key={c.id}
                            onClick={() => handleSelect(c)}
                            className={`p-3 rounded cursor-pointer flex justify-between items-center group ${selectedId === c.id ? 'bg-primary-900/20 border-primary-700 border' : 'hover:bg-gray-700 border border-transparent'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CustomerLogo customer={c} isSelected={selectedId === c.id} />
                                <span className="font-medium text-slate-200">{c.name}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto">
                {/* Toggle Default Rates */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <button
                        onClick={() => setShowDefaultRates(!showDefaultRates)}
                        className="w-full bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        {showDefaultRates ? 'Hide' : 'Show'} Default Rates
                    </button>
                </div>

                {/* Dedicated Default Rates Management */}
                {showDefaultRates && (
                    <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-200 mb-2">Default Rates Management</h2>
                            <p className="text-sm text-slate-400">Configure system-wide default rates for new customers</p>
                        </div>
                        <RatesConfig
                            rates={savedDefaultRates}
                            setRates={saveAsDefaults}
                            saveAsDefaults={saveAsDefaults}
                            resetToDefaults={resetToDefaults}
                        />
                    </div>
                )}

                {/* Customer-Specific Editor (Conditional) */}
                {selectedId ? (
                    <>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                            {/* Header */}
                            <div className="mb-6 pb-4 border-b border-gray-600">
                                <h2 className="text-2xl font-bold text-slate-100 mb-1">Customer Details</h2>
                                <p className="text-sm text-slate-400">All customer information is managed in the Customer Portal</p>
                            </div>

                            {/* Customer Name */}
                            <div className="mb-6">
                                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Customer Name</label>
                                <div className="text-3xl font-bold text-slate-100">
                                    {editName}
                                </div>
                            </div>

                            {/* Contacts and Rate Notes Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Contacts Display (Read-Only) */}
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2 flex items-center gap-2">
                                        <UserPlus size={16} /> Main Quote Contacts
                                    </label>

                                    {/* Contacts List - Easy to Copy */}
                                    {editContacts.length === 0 ? (
                                        <div className="bg-gray-700/50 p-4 rounded border border-gray-600 text-center text-slate-400 text-sm">
                                            No contacts added yet
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {editContacts.map((contact, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-gray-800/50 p-3 rounded-lg"
                                                >
                                                    <div className="text-sm font-bold text-slate-100 mb-2">{contact.name}</div>
                                                    {contact.phone && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs">📞</span>
                                                            <div
                                                                className="text-xs text-slate-300 font-mono select-all cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 break-all flex-1"
                                                                title="Click to select and copy"
                                                            >
                                                                {contact.phone}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {contact.email && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs">✉️</span>
                                                            <div
                                                                className="text-xs text-slate-300 font-mono select-all cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 break-all flex-1"
                                                                title="Click to select and copy"
                                                            >
                                                                {contact.email}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Customer Notes */}
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">
                                        Customer Notes
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={savedCustomers.find(c => c.id === selectedId)?.customerNotes || ''}
                                        onChange={(e) => {
                                            const updatedCustomer = savedCustomers.find(c => c.id === selectedId);
                                            if (updatedCustomer && !updatedCustomer.isLocked) {
                                                saveCustomer({ ...updatedCustomer, customerNotes: e.target.value });
                                            }
                                        }}
                                        disabled={savedCustomers.find(c => c.id === selectedId)?.isLocked}
                                        className={`w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none ${savedCustomers.find(c => c.id === selectedId)?.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder="1. Special billing requirements&#10;2. Contact preferences&#10;3. Payment terms"
                                    />
                                    <p className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M12 16v-4"></path>
                                            <path d="M12 8h.01"></path>
                                        </svg>
                                        Notes appear under the Customer dropdown in Job Details (small cyan text with 📝 icon)
                                    </p>
                                </div>
                            </div>

                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-slate-200">Customer-Specific Rates</h3>
                                <p className="text-sm text-slate-400">Override default rates for this specific customer</p>
                            </div>
                            <RatesConfig
                                rates={editRates}
                                setRates={setEditRates}
                                saveAsDefaults={saveAsDefaults}
                                resetToDefaults={() => setEditRates(savedDefaultRates)}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
                        <p>Select a customer to edit their specific rates</p>
                    </div>
                )}
            </div>
        </div>
    );
}
