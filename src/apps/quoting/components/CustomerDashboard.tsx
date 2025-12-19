import { useState } from 'react';
import { Trash2, User, UserPlus, Save, Check, MapPin, Building2, Layout, Plus } from 'lucide-react';
import RatesConfig from './RatesConfig';
import type { Customer, Rates, Contact, ManagedSite } from '../types';
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
    saveAsDefaults, resetToDefaults, savedDefaultRates
}: CustomerDashboardProps) {
    const {
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addManagedSite,
        deleteManagedSite
    } = useGlobalData();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editRates, setEditRates] = useState<Rates>(DEFAULT_RATES);
    const [editContacts, setEditContacts] = useState<Contact[]>([]);
    const [editIsLocked, setEditIsLocked] = useState(false);
    const [showDefaultRates, setShowDefaultRates] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'details' | 'sites'>('details');

    // New Managed Site State
    const [isAddingSite, setIsAddingSite] = useState(false);
    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteLocation, setNewSiteLocation] = useState('');

    const handleSelect = (customer: Customer) => {
        setSelectedId(customer.id);
        setEditName(customer.name);
        setEditRates(customer.rates || savedDefaultRates);
        setEditContacts(customer.contacts || []);
        setEditIsLocked(customer.isLocked || false);
        setSaveSuccess(false);
        setActiveTab('details'); // Reset to details on select
        setIsAddingSite(false);
    };

    const handleDelete = async (id: string) => {
        // deleteCustomer handles confirmation
        await deleteCustomer(id);
        if (selectedId === id) {
            setSelectedId(null);
        }
    };

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

        await updateCustomer(selectedId, {
            rates: editRates,
            isLocked: editIsLocked
        });

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleAddNewSite = async () => {
        if (!selectedId || !newSiteName.trim()) return;

        const siteData: Partial<ManagedSite> = {
            name: newSiteName.trim(),
            location: newSiteLocation.trim(),
            contacts: [], // Can inherit or be empty
            isLocked: false,
        };

        await addManagedSite(selectedId, siteData);
        setNewSiteName('');
        setNewSiteLocation('');
        setIsAddingSite(false);
    };

    const selectedCustomer = customers.find((c: Customer) => c.id === selectedId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar List */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-600 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-200">Customers</h2>
                    <button
                        onClick={handleAddCustomer}
                        className="bg-primary-600 hover:bg-primary-500 text-white p-2 rounded transition-colors"
                        title="Add New Customer"
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {customers.length === 0 && (
                        <p className="text-center text-slate-400 py-4 text-sm">No customers yet.</p>
                    )}
                    {(customers as Customer[]).map(c => (
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

                {!selectedId ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
                        <p>Select a customer to edit details and managed sites</p>
                    </div>
                ) : (
                    <>
                        {/* Header Card */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
                            {/* Header & Tabs */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-100">{editName}</h2>
                                    <p className="text-sm text-slate-400">Manage customer details and sites</p>
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-gray-700 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveTab('details')}
                                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'details' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-300 hover:bg-gray-600'}`}
                                    >
                                        Customer Details
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('sites')}
                                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'sites' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-300 hover:bg-gray-600'}`}
                                    >
                                        Managed Sites
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT: CUSTOMER DETAILS */}
                            {activeTab === 'details' && (
                                <div className="animate-fade-in">
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
                                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                                <UserPlus size={16} /> Main Contacts
                                            </label>
                                            <div className="bg-gray-700/30 p-4 rounded border border-gray-600 min-h-[100px]">
                                                {editContacts.length === 0 ? (
                                                    <p className="text-sm text-slate-500 text-center italic mt-4">No contacts added.</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {editContacts.map((c, i) => (
                                                            <li key={i} className="text-sm text-slate-300 bg-gray-800 p-2 rounded flex justify-between">
                                                                <span>{c.name}</span>
                                                                <span className="text-slate-500">{c.phone}</span>
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
                                        <RatesConfig
                                            rates={editRates}
                                            setRates={setEditRates}
                                            saveAsDefaults={saveAsDefaults}
                                            resetToDefaults={() => setEditRates(savedDefaultRates)}
                                            isLocked={editIsLocked}
                                            onLockChange={setEditIsLocked}
                                        />
                                        <div className="mt-6">
                                            <button
                                                onClick={handleSaveRates}
                                                className={`w-full py-3 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-500'}`}
                                            >
                                                {saveSuccess ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save Customer Details</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CONTENT: MANAGED SITES */}
                            {activeTab === 'sites' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-slate-200">Managed Sites</h3>
                                        <button
                                            onClick={() => setIsAddingSite(!isAddingSite)}
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2"
                                        >
                                            <Plus size={16} /> Add Site
                                        </button>
                                    </div>

                                    {isAddingSite && (
                                        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 mb-4 animate-slide-down">
                                            <h4 className="text-sm font-bold text-cyan-400 mb-3 uppercase">New Site Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-1">Site Name</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                                                        placeholder="e.g. Banyo Processing Plant"
                                                        value={newSiteName}
                                                        onChange={e => setNewSiteName(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-1">Location / Address</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                                                        placeholder="e.g. 192 Granite St, Geebung"
                                                        value={newSiteLocation}
                                                        onChange={e => setNewSiteLocation(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setIsAddingSite(false)}
                                                    className="px-3 py-1.5 text-slate-400 hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddNewSite}
                                                    disabled={!newSiteName.trim()}
                                                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-1.5 rounded font-medium"
                                                >
                                                    Create Site
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {(selectedCustomer?.managedSites || []).length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 bg-gray-900/30 rounded border border-gray-700 border-dashed">
                                                <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                                                <p>No managed sites found for {selectedCustomer?.name}</p>
                                                <p className="text-xs mt-1">Add sites to track maintenance data and generate specific quotes</p>
                                            </div>
                                        ) : (
                                            (selectedCustomer?.managedSites || []).map((site: ManagedSite) => (
                                                <div key={site.id} className="bg-gray-700/30 border border-gray-600 p-4 rounded flex justify-between items-start group hover:bg-gray-700/50 transition-colors">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-slate-200 text-lg">{site.name}</h4>
                                                            {site.isLocked && <span className="text-xs bg-red-900/50 text-red-200 px-1.5 py-0.5 rounded">LOCKED</span>}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                                            <span className="flex items-center gap-1"><MapPin size={14} /> {site.location || 'No location set'}</span>
                                                            <span className="flex items-center gap-1"><Layout size={14} /> {site.rates ? 'Custom Rates' : 'Default/Customer Rates'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => deleteManagedSite(selectedId!, site.id)}
                                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                                                            title="Delete Site"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
