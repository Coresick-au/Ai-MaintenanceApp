import React, { useState } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext';
import { Icons } from '../../constants/icons';

// Format date helper
const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (includeTime) {
        return date.toLocaleString();
    }
    return date.toLocaleDateString();
};

// Simple modal component for internal use
const Modal = ({ title, onClose, children, size = 'md' }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className={`bg-slate-900 border border-slate-700 rounded-xl w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-lg text-white">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                    <Icons.Cancel size={20} />
                </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">{children}</div>
        </div>
    </div>
);

export const CustomerApp = ({ onBack }) => {
    const {
        customers,
        sites,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addContactToCustomer,
        updateCustomerContact,
        deleteCustomerContact,
        addCustomerNote,
        updateCustomerNote,
        deleteCustomerNote,
        archiveCustomerNote,
        addSite,
        updateSite,
        deleteSite,
        toggleSiteStatus,
        getSitesByCustomer
    } = useGlobalData();

    const [selectedCustId, setSelectedCustId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form States
    const [isAddCustOpen, setIsAddCustOpen] = useState(false);
    const [isEditCustOpen, setIsEditCustOpen] = useState(false);
    const [isAddContactOpen, setIsAddContactOpen] = useState(false);
    const [isEditContactOpen, setIsEditContactOpen] = useState(false);
    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
    const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isViewContactsOpen, setIsViewContactsOpen] = useState(false);
    const [logoBackgrounds, setLogoBackgrounds] = useState({}); // Track logo bg per site

    // Temporary Form Data
    const [formData, setFormData] = useState({});
    const [editingContact, setEditingContact] = useState(null);
    const [editingSite, setEditingSite] = useState(null);
    const [selectedSiteForContacts, setSelectedSiteForContacts] = useState(null);

    // Notes state
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteContent, setEditNoteContent] = useState({ content: '', author: '' });
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteAuthor, setNewNoteAuthor] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [sortOrder, setSortOrder] = useState('desc');

    // Sidebar collapse state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const sidebarWidth = isSidebarCollapsed ? 'w-20' : 'w-80';

    const selectedCustomer = customers.find(c => c.id === selectedCustId);
    const customerSites = selectedCustId ? getSitesByCustomer(selectedCustId) : [];

    // Filter customers by search query
    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get contacts with reporting enabled
    const reportingContacts = (selectedCustomer?.contacts || []).filter(c => c.sendReports === true);

    // Logo upload handler
    const handleLogoUpload = (e, forSite = false) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, logo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    }


    // Toggle Logo Background
    const toggleLogoBg = (e, id) => {
        if (e) e.stopPropagation();
        setLogoBackgrounds(prev => ({
            ...prev,
            [id]: prev[id] === 'light' ? 'dark' : 'light'
        }));
    };

    const handleCreateCustomer = async () => {
        if (!formData.name) {
            alert('Customer name is required');
            return;
        }
        const newId = await addCustomer(formData);
        if (newId) {
            setIsAddCustOpen(false);
            setFormData({});
            setSelectedCustId(newId);
        }
    };

    const handleEditCustomer = () => {
        if (!selectedCustomer) return;
        setFormData({
            name: selectedCustomer.name || '',
            address: selectedCustomer.address || '',
            logo: selectedCustomer.logo || ''
        });
        setIsEditCustOpen(true);
    };

    const handleUpdateCustomer = async () => {
        if (!formData.name) {
            alert('Customer name is required');
            return;
        }
        await updateCustomer(selectedCustId, formData);
        setIsEditCustOpen(false);
        setFormData({});
    };

    const handleDeleteCustomer = async () => {
        if (!selectedCustomer) return;

        const linkedSites = getSitesByCustomer(selectedCustId);
        if (linkedSites.length > 0) {
            alert(`Cannot delete customer. They have ${linkedSites.length} active sites. Please delete or reassign sites first.`);
            return;
        }

        if (window.confirm(`⚠️ WARNING: You are about to delete "${selectedCustomer.name}".\n\nAre you sure?`)) {
            if (window.confirm(`This action cannot be undone.\n\nPress OK to permanently delete this customer.`)) {
                await deleteCustomer(selectedCustId);
                setSelectedCustId(null);
            }
        }
    };

    const handleArchiveCustomer = async () => {
        if (!selectedCustomer) return;

        const isArchiving = selectedCustomer.active !== false;
        const message = isArchiving
            ? `Are you sure you want to archive "${selectedCustomer.name}"?\n\nArchived customers are hidden by default but can be restored.`
            : `Are you sure you want to restore "${selectedCustomer.name}"?`;

        if (window.confirm(message)) {
            await updateCustomer(selectedCustId, {
                active: !isArchiving,
                archivedAt: isArchiving ? new Date().toISOString() : null
            });
        }
    };

    const handleCreateContact = async () => {
        if (!selectedCustId) return;
        if (!formData.name) {
            alert('Contact name is required');
            return;
        }
        await addContactToCustomer(selectedCustId, { ...formData, sendReports: formData.sendReports || false });
        setIsAddContactOpen(false);
        setFormData({});
    };

    const handleEditContact = (contact) => {
        setEditingContact(contact);
        setFormData({
            name: contact.name || '',
            role: contact.role || '',
            email: contact.email || '',
            phone: contact.phone || '',
            sendReports: contact.sendReports || false
        });
        setIsEditContactOpen(true);
    };

    const handleUpdateContact = async () => {
        if (!formData.name) {
            alert('Contact name is required');
            return;
        }
        await updateCustomerContact(selectedCustId, editingContact.id, formData);
        setIsEditContactOpen(false);
        setEditingContact(null);
        setFormData({});
    };

    const handleDeleteContact = async (contactId, contactName) => {
        if (!selectedCustId) return;

        if (window.confirm(`Are you sure you want to delete "${contactName}"?`)) {
            await deleteCustomerContact(selectedCustId, contactId);
        }
    };

    const handleCreateSite = async () => {
        if (!selectedCustId) return;
        if (!formData.name) {
            alert('Site name is required');
            return;
        }
        await addSite(selectedCustId, {
            name: formData.name,
            location: formData.location || '',
            customer: selectedCustomer?.name || '',
            logo: formData.logo || selectedCustomer?.logo || null,
            active: true
        });
        setIsAddSiteOpen(false);
        setFormData({});
    };

    const handleEditSite = (site) => {
        setEditingSite(site);
        setFormData({
            name: site.name || '',
            location: site.location || '',
            logo: site.logo || ''
        });
        setIsEditSiteOpen(true);
    };

    const handleUpdateSite = async () => {
        if (!formData.name) {
            alert('Site name is required');
            return;
        }
        await updateSite(editingSite.id, formData);
        setIsEditSiteOpen(false);
        setEditingSite(null);
        setFormData({});
    };

    const handleViewSiteContacts = (site) => {
        setSelectedSiteForContacts(site);
        setIsViewContactsOpen(true);
    };

    // Notes handlers
    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;
        await addCustomerNote(selectedCustId, newNoteContent.trim(), newNoteAuthor.trim() || 'Unknown');
        setNewNoteContent('');
        setNewNoteAuthor('');
    };

    const handleStartEdit = (note) => {
        setEditingNoteId(note.id);
        setEditNoteContent({ content: note.content, author: note.author });
    };

    const handleSaveEdit = async () => {
        if (!editNoteContent.content.trim()) return;
        await updateCustomerNote(selectedCustId, editingNoteId, editNoteContent.content.trim());
        setEditingNoteId(null);
        setEditNoteContent({ content: '', author: '' });
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setEditNoteContent({ content: '', author: '' });
    };

    const handleDeleteNote = async (noteId) => {
        await deleteCustomerNote(selectedCustId, noteId);
    };

    const handleArchiveNote = async (noteId, isArchived) => {
        await archiveCustomerNote(selectedCustId, noteId, isArchived);
    };

    // Get filtered and sorted notes
    const notes = selectedCustomer?.notes || [];
    const filteredNotes = notes
        .filter(note => showArchived || !note.archived)
        .sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

    const activeNotesCount = notes.filter(n => !n.archived).length;
    const archivedNotesCount = notes.filter(n => n.archived).length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition" title="Return to Portal">
                        <Icons.ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Customer Portal</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Master Data Management</p>
                    </div>
                </div>
                <button
                    onClick={() => { setFormData({}); setIsAddCustOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition"
                >
                    <Icons.Plus size={16} /> New Customer
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar: Customer List */}
                <aside className={`${sidebarWidth} bg-slate-900/50 border-r border-slate-800 flex flex-col transition-all duration-300 relative overflow-visible`}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute top-4 -right-3 z-50 bg-slate-700 text-slate-300 rounded-full p-1.5 border border-slate-600 shadow-lg hover:bg-slate-600 hover:text-white transition-colors"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <Icons.ChevronRight size={16} /> : <Icons.ChevronLeft size={16} />}
                    </button>

                    <div className={`p-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>
                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 px-2 space-y-1 pb-4 overflow-y-auto">
                        {filteredCustomers.length === 0 && (
                            <div className="text-center text-slate-500 py-10 text-sm">
                                {searchQuery ? 'No customers found' : 'No customers yet. Create one to get started!'}
                            </div>
                        )}
                        {filteredCustomers.map(cust => (
                            <button
                                key={cust.id}
                                onClick={() => setSelectedCustId(cust.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${selectedCustId === cust.id ? 'bg-purple-900/40 border border-purple-500/50 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                title={isSidebarCollapsed ? cust.name : ''}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {isSidebarCollapsed ? (
                                        <span className="font-bold text-lg">{cust.name.charAt(0)}</span>
                                    ) : (
                                        <>
                                            <span className="font-bold truncate">{cust.name}</span>
                                            {cust.active === false && (
                                                <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800">Archived</span>
                                            )}
                                        </>
                                    )}
                                </div>
                                {!isSidebarCollapsed && (
                                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                                        {getSitesByCustomer(cust.id).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content: Details */}
                <main className="flex-1 bg-slate-950 p-6 overflow-y-auto">
                    {selectedCustomer ? (
                        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

                            {/* Customer Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-4xl font-black text-white">{selectedCustomer.name}</h2>
                                        {selectedCustomer.active === false && (
                                            <span className="px-3 py-1 text-sm bg-orange-900/30 text-orange-400 rounded-lg border border-orange-800 font-bold">ARCHIVED</span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-sm text-slate-400">
                                        <span>ID: {selectedCustomer.id}</span>
                                        {selectedCustomer.createdAt && (
                                            <>
                                                <span>•</span>
                                                <span>Added: {new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                                            </>
                                        )}
                                    </div>
                                    {selectedCustomer.address && (
                                        <p className="text-sm text-slate-400 mt-2">📍 {selectedCustomer.address}</p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={handleEditCustomer}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-1"
                                        >
                                            <Icons.Edit size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => setIsNotesOpen(true)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-1"
                                        >
                                            <Icons.StickyNote size={14} /> Notes ({activeNotesCount})
                                        </button>
                                        <button
                                            onClick={handleArchiveCustomer}
                                            className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition flex items-center gap-1 ${selectedCustomer.active === false
                                                ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50'
                                                : 'bg-slate-800 text-orange-400 border-orange-900 hover:bg-orange-900/20'
                                                }`}
                                        >
                                            <Icons.Archive size={14} /> {selectedCustomer.active === false ? 'Restore' : 'Archive'}
                                        </button>
                                        <button
                                            onClick={handleDeleteCustomer}
                                            className="px-3 py-1.5 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 rounded-lg text-sm font-bold transition flex items-center gap-1"
                                        >
                                            <Icons.Trash size={14} /> Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                    <div
                                        onClick={(e) => toggleLogoBg(e, selectedCustomer.id)}
                                        className={`w-20 h-20 rounded flex items-center justify-center text-slate-600 text-xs text-center overflow-hidden cursor-pointer transition-colors ${logoBackgrounds[selectedCustomer.id] === 'light'
                                            ? 'bg-white border border-slate-200'
                                            : 'bg-slate-800'
                                            }`}
                                        title="Click to toggle background"
                                    >
                                        {selectedCustomer.logo ? (
                                            <img src={selectedCustomer.logo} className="w-full h-full object-contain p-1" alt="Logo" />
                                        ) : (
                                            "No Logo"
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grid: Contacts & Sites */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* CONTACTS CARD */}
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                            <Icons.Users className="text-purple-400" /> Contacts Directory
                                        </h3>
                                        <button
                                            onClick={() => { setFormData({ sendReports: false }); setIsAddContactOpen(true); }}
                                            className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 px-3 py-1.5 rounded-lg transition"
                                        >
                                            + Add Person
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(selectedCustomer.contacts || []).map(contact => (
                                            <div key={contact.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 group">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-sm text-slate-200">{contact.name}</div>
                                                            {contact.sendReports && (
                                                                <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-800">📧 Reports</span>
                                                            )}
                                                        </div>
                                                        {contact.role && <div className="text-xs text-slate-400">{contact.role}</div>}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                        <button
                                                            onClick={() => handleEditContact(contact)}
                                                            className="text-blue-400 hover:text-blue-300 transition p-1"
                                                            title="Edit contact"
                                                        >
                                                            <Icons.Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteContact(contact.id, contact.name)}
                                                            className="text-red-400 hover:text-red-300 transition p-1"
                                                            title="Delete contact"
                                                        >
                                                            <Icons.Trash size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-xs text-slate-500 space-y-1">
                                                    {contact.email && <div>✉️ {contact.email}</div>}
                                                    {contact.phone && <div>📞 {contact.phone}</div>}
                                                </div>
                                            </div>
                                        ))}
                                        {(!selectedCustomer.contacts || selectedCustomer.contacts.length === 0) && (
                                            <div className="text-center py-6 text-slate-500 text-sm italic border-2 border-dashed border-slate-800 rounded-lg">
                                                No contacts listed.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SITES CARD */}
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                            <Icons.MapPin className="text-emerald-400" /> Managed Sites
                                        </h3>
                                        <button
                                            onClick={() => { setFormData({}); setIsAddSiteOpen(true); }}
                                            className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1.5 rounded-lg transition"
                                        >
                                            + Add Site
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {customerSites.map(site => (
                                            <div key={site.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        onClick={(e) => toggleLogoBg(e, site.id)}
                                                        className={`rounded-lg flex-shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${logoBackgrounds[site.id] === 'light'
                                                            ? 'bg-white border border-slate-200'
                                                            : 'bg-emerald-500/10 text-emerald-500'
                                                            }`}
                                                        title="Toggle logo background (Light/Dark)"
                                                    >
                                                        {site.logo ? (
                                                            <img src={site.logo} alt={site.name} className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <Icons.Building size={16} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-sm text-slate-200 truncate">{site.name}</div>
                                                            {site.active === false && (
                                                                <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800">Archived</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-400 truncate">{site.location || "No Location"}</div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditSite(site)}
                                                            className="text-blue-400 hover:text-blue-300 transition p-1"
                                                            title="Edit site"
                                                        >
                                                            <Icons.Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleSiteStatus(site.id)}
                                                            className={`transition p-1 ${site.active === false ? 'text-green-400 hover:text-green-300' : 'text-orange-400 hover:text-orange-300'}`}
                                                            title={site.active === false ? "Restore site" : "Archive site"}
                                                        >
                                                            {site.active === false ? <Icons.RotateCcw size={14} /> : <Icons.Archive size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteSite(site.id)}
                                                            className="text-red-400 hover:text-red-300 transition p-1"
                                                            title="Delete site"
                                                        >
                                                            <Icons.Trash size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {customerSites.length === 0 && (
                                            <div className="text-center py-6 text-slate-500 text-sm italic border-2 border-dashed border-slate-800 rounded-lg">
                                                No sites created yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600">
                            <Icons.Users size={64} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a customer to view details</p>
                            <p className="text-sm">Or create a new one to get started</p>
                        </div>
                    )}
                </main>
            </div>

            {/* --- MODALS --- */}

            {/* 1. Add Customer Modal */}
            {isAddCustOpen && (
                <Modal title="Create New Customer" onClose={() => setIsAddCustOpen(false)}>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Company Name *"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Billing Address"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="w-full text-slate-400 text-sm"
                            />
                            {formData.logo && (
                                <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700">
                                    <img src={formData.logo} alt="Preview" className="h-16 object-contain mx-auto" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleCreateCustomer}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white p-2 rounded font-bold transition"
                        >
                            Create Customer
                        </button>
                    </div>
                </Modal>
            )}

            {/* 2. Edit Customer Modal */}
            {isEditCustOpen && (
                <Modal title={`Edit ${selectedCustomer?.name}`} onClose={() => setIsEditCustOpen(false)}>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Company Name *"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Billing Address"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="w-full text-slate-400 text-sm"
                            />
                            {formData.logo && (
                                <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700">
                                    <img src={formData.logo} alt="Preview" className="h-16 object-contain mx-auto" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleUpdateCustomer}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded font-bold transition"
                        >
                            Save Changes
                        </button>
                    </div>
                </Modal>
            )}

            {/* 3. Add Contact Modal */}
            {isAddContactOpen && (
                <Modal title={`Add Contact for ${selectedCustomer?.name}`} onClose={() => setIsAddContactOpen(false)}>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Full Name *"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Job Title / Role"
                            value={formData.role || ''}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="Email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <input
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="Phone"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <label className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800 transition">
                            <input
                                type="checkbox"
                                checked={formData.sendReports || false}
                                onChange={(e) => setFormData({ ...formData, sendReports: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-200">Send reports to this contact</div>
                                <div className="text-xs text-slate-400">Enable to include in site reporting lists</div>
                            </div>
                        </label>
                        <button
                            onClick={handleCreateContact}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white p-2 rounded font-bold transition"
                        >
                            Save Contact
                        </button>
                    </div>
                </Modal>
            )}

            {/* 4. Edit Contact Modal */}
            {isEditContactOpen && (
                <Modal title={`Edit Contact`} onClose={() => { setIsEditContactOpen(false); setEditingContact(null); }}>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Full Name *"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Job Title / Role"
                            value={formData.role || ''}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="Email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <input
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="Phone"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <label className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800 transition">
                            <input
                                type="checkbox"
                                checked={formData.sendReports || false}
                                onChange={(e) => setFormData({ ...formData, sendReports: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-900"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-200">Send reports to this contact</div>
                                <div className="text-xs text-slate-400">Enable to include in site reporting lists</div>
                            </div>
                        </label>
                        <button
                            onClick={handleUpdateContact}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded font-bold transition"
                        >
                            Save Changes
                        </button>
                    </div>
                </Modal>
            )}

            {/* 5. Add Site Modal */}
            {isAddSiteOpen && (
                <Modal title={`Add Site for ${selectedCustomer?.name}`} onClose={() => setIsAddSiteOpen(false)}>
                    <div className="space-y-4">
                        <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded text-xs text-yellow-200">
                            Note: This creates a new site in the Maintenance App linked to this customer.
                        </div>
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Site Name (e.g. Newman Hub) *"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Location / Region"
                            value={formData.location || ''}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Site Logo (Optional - inherits from customer)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e, true)}
                                className="w-full text-slate-400 text-sm"
                            />
                            {formData.logo && (
                                <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700">
                                    <img src={formData.logo} alt="Preview" className="h-16 object-contain mx-auto" />
                                </div>
                            )}
                            {!formData.logo && selectedCustomer?.logo && (
                                <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <p className="text-xs text-slate-400 mb-1 text-center">Will inherit customer logo:</p>
                                    <img src={selectedCustomer.logo} alt="Customer Logo" className="h-12 object-contain mx-auto opacity-50" />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleCreateSite}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded font-bold transition"
                        >
                            Create Site
                        </button>
                    </div>
                </Modal>
            )}

            {/* 6. Edit Site Modal */}
            {isEditSiteOpen && editingSite && (
                <Modal title={`Edit Site: ${editingSite.name}`} onClose={() => { setIsEditSiteOpen(false); setEditingSite(null); }}>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Site Name *"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            placeholder="Location / Region"
                            value={formData.location || ''}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Site Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e, true)}
                                className="w-full text-slate-400 text-sm"
                            />
                            {formData.logo && (
                                <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700">
                                    <img src={formData.logo} alt="Preview" className="h-16 object-contain mx-auto" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleUpdateSite}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded font-bold transition"
                        >
                            Save Changes
                        </button>
                    </div>
                </Modal>
            )}

            {/* 7. View Site Contacts Modal */}
            {isViewContactsOpen && selectedSiteForContacts && (
                <Modal
                    title={`Reporting Contacts: ${selectedSiteForContacts.name}`}
                    onClose={() => { setIsViewContactsOpen(false); setSelectedSiteForContacts(null); }}
                >
                    <div className="space-y-4">
                        {reportingContacts.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Icons.Users size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No contacts enabled for reporting</p>
                                <p className="text-xs mt-1">Enable "Send reports" toggle on contacts to include them here</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-cyan-900/20 border border-cyan-700/50 p-3 rounded text-xs text-cyan-200">
                                    <strong>{reportingContacts.length}</strong> contact{reportingContacts.length !== 1 ? 's' : ''} will receive reports for this site
                                </div>
                                <div className="space-y-2">
                                    {reportingContacts.map(contact => (
                                        <div key={contact.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-200">{contact.name}</div>
                                                    {contact.role && <div className="text-xs text-slate-400">{contact.role}</div>}
                                                </div>
                                                <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-800">📧 Enabled</span>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-300 space-y-1">
                                                {contact.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Icons.Mail size={12} className="text-slate-500" />
                                                        <a href={`mailto:${contact.email}`} className="hover:text-cyan-400 transition">{contact.email}</a>
                                                    </div>
                                                )}
                                                {contact.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Icons.Phone size={12} className="text-slate-500" />
                                                        <span>{contact.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}

            {/* 8. Customer Notes Modal */}
            {isNotesOpen && selectedCustomer && (
                <Modal title={`Notes: ${selectedCustomer.name}`} onClose={() => setIsNotesOpen(false)} size="lg">
                    <div className="space-y-4">
                        {/* Stats Bar */}
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-cyan-400">{activeNotesCount}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">Active</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-slate-500">{archivedNotesCount}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">Archived</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                                    title={sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                                >
                                    {sortOrder === 'desc' ? <Icons.SortDesc size={16} /> : <Icons.SortAsc size={16} />}
                                </button>
                                <button
                                    onClick={() => setShowArchived(!showArchived)}
                                    className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${showArchived
                                        ? 'bg-slate-700 text-white border-slate-600'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                >
                                    {showArchived ? 'Hide Archived' : 'Show Archived'}
                                </button>
                            </div>
                        </div>

                        {/* Add New Note */}
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                <Icons.Plus size={14} /> Add New Note
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Author name..."
                                    value={newNoteAuthor}
                                    onChange={(e) => setNewNoteAuthor(e.target.value)}
                                    className="w-full p-2 border border-slate-600 rounded text-sm bg-slate-900 text-white focus:outline-none focus:border-cyan-500"
                                />
                                <textarea
                                    placeholder="Write your note here..."
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    rows={3}
                                    className="w-full p-2 border border-slate-600 rounded text-sm bg-slate-900 text-white focus:outline-none focus:border-cyan-500 resize-none"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNoteContent.trim()}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Icons.Plus size={16} /> Add Note
                                </button>
                            </div>
                        </div>

                        {/* Notes List */}
                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                            {filteredNotes.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Icons.FileText size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notes found</p>
                                    {!showArchived && archivedNotesCount > 0 && (
                                        <p className="text-xs mt-1">({archivedNotesCount} archived notes hidden)</p>
                                    )}
                                </div>
                            ) : (
                                filteredNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        className={`group rounded-lg border transition-all ${note.archived
                                            ? 'bg-slate-900/30 border-slate-800 opacity-60'
                                            : 'bg-slate-700/50 border-slate-600 hover:border-cyan-500/50'
                                            } p-3`}
                                    >
                                        {editingNoteId === note.id ? (
                                            // EDITING STATE
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-cyan-400 text-xs uppercase tracking-wide">Editing Note...</span>
                                                </div>
                                                <input
                                                    className="w-full border border-slate-600 rounded p-2 text-sm mb-1 bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                                    value={editNoteContent.author}
                                                    onChange={(e) => setEditNoteContent({ ...editNoteContent, author: e.target.value })}
                                                    placeholder="Author Name"
                                                />
                                                <textarea
                                                    className="w-full border border-slate-600 rounded p-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                                                    rows="3"
                                                    value={editNoteContent.content}
                                                    onChange={(e) => setEditNoteContent({ ...editNoteContent, content: e.target.value })}
                                                />
                                                <div className="flex gap-2 justify-end pt-2 border-t border-slate-600 items-center">
                                                    <button
                                                        onClick={() => handleArchiveNote(note.id, note.archived)}
                                                        className={`p-1.5 rounded hover:bg-slate-600 transition-colors ${note.archived ? 'text-green-400' : 'text-amber-400'}`}
                                                        title={note.archived ? "Restore Note" : "Archive Note"}
                                                    >
                                                        {note.archived ? <Icons.RotateCcw size={16} /> : <Icons.Archive size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="p-1.5 rounded text-red-400 hover:bg-slate-600 hover:text-red-300 transition-colors"
                                                        title="Delete Note"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </button>

                                                    <div className="w-px h-4 bg-slate-600 mx-1"></div>

                                                    <button onClick={handleCancelEdit} className="bg-slate-600 text-white px-3 py-1 rounded text-xs hover:bg-slate-500 font-bold transition-colors flex items-center gap-1">
                                                        <Icons.X size={14} /> Cancel
                                                    </button>
                                                    <button onClick={handleSaveEdit} className="bg-cyan-600 text-white px-3 py-1 rounded text-xs hover:bg-cyan-500 font-bold transition-colors flex items-center gap-1">
                                                        <Icons.Check size={14} /> Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // DISPLAY STATE
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleStartEdit(note)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleStartEdit(note);
                                                    }
                                                }}
                                                className="w-full text-left space-y-2 p-0 relative focus:outline-none rounded-lg group-hover:scale-[1.005] transition-transform duration-200 cursor-pointer"
                                                title="Click to edit note"
                                            >
                                                <div className="flex justify-between items-start mb-1 relative pr-16">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide border border-slate-700/50">👤 {note.author || 'UNKNOWN'}</span>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            {formatDate(note.timestamp, true)}
                                                        </span>
                                                        {note.archived && (
                                                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-orange-400 rounded border border-orange-900/30">Archived</span>
                                                        )}
                                                    </div>

                                                    {/* Floating Icon-Only Action Buttons */}
                                                    <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 bg-slate-800 rounded-lg shadow-lg border border-slate-600 p-1 scale-90 group-hover:scale-100">
                                                        <span className="p-1.5 rounded text-cyan-400 hover:bg-slate-700" title="Edit Note">
                                                            <Icons.Edit size={14} />
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed pl-1">{note.content}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Floating Return to Portal Button - Bottom Right */}
            <button
                onClick={onBack}
                className="fixed bottom-4 right-4 z-[9999] p-3 bg-slate-800 border border-slate-600 rounded-full shadow-2xl text-cyan-400 hover:bg-slate-700 hover:text-white transition-all hover:scale-110"
                title="Return to App Portal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                    <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                    <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                    <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                </svg>
            </button>

        </div>
    );
};
