import React, { useState } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import { Icons } from '../../constants/icons';
import BackButton from '../../components/ui/BackButton';

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
        employees,
        loading,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addContactToCustomer,
        updateCustomerContact,
        deleteCustomerContact,
        addManagedSite,
        updateManagedSite,
        deleteManagedSite,
        enableAIMMForSite,
        updateSite,
        deleteSite,
        toggleSiteStatus,
        getOrphanedSites,
        deleteOrphanedSite,
        getAllMaintenanceAppSites,
        getLegacyGlobalSites,
        deleteLegacySite,
        getSitesByCustomer
    } = useGlobalData();

    const { userRole } = useAuth(); // Get user role

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
    const [isOrphanedSitesOpen, setIsOrphanedSitesOpen] = useState(false);
    const [showAllMaintenanceSites, setShowAllMaintenanceSites] = useState(false);
    const [showLegacyCleanup, setShowLegacyCleanup] = useState(false);
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

    // View mode: 'customers' or 'compliance'
    const [viewMode, setViewMode] = useState('customers');

    // Calculate site count for each customer
    const getSiteCountForCustomer = (customerId) => {
        // First try managedSites (new system)
        const customer = customers.find(c => c.id === customerId);
        if (customer?.managedSites) {
            return customer.managedSites.length;
        }
        // Fallback to legacy sites (old system)
        return getSitesByCustomer(customerId).length;
    };

    const handleGenerateSample = async () => {
        if (!selectedCustId) {
            alert('Please select a customer first.');
            return;
        }

        const demoSiteData = {
            name: 'Demo Site - ' + new Date().toLocaleDateString(),
            location: '123 Demo Street, Demo City, DC 12345',
            contact: 'Demo Contact',
            phone: '(555) 123-4567',
            email: 'demo@example.com',
            notes: [{ id: `note-${Date.now()}`, content: 'This is a demo site created for testing purposes.', author: 'System', timestamp: new Date().toISOString() }],
            hasAIMMProfile: true // Enable AIMM for demo sites
        };

        try {
            const siteId = await addManagedSite(selectedCustId, demoSiteData);
            if (siteId) {
                alert('Demo site created successfully!');
            }
        } catch (error) {
            console.error('Failed to create demo site:', error);
            alert('Failed to create demo site. Please try again.');
        }
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustId);
    const customerManagedSites = selectedCustomer?.managedSites || [];

    // Filter customers by search query (also searches managed sites) and sort alphabetically
    const searchLower = searchQuery.toLowerCase();
    const filteredCustomers = customers
        .map(c => {
            const customerMatches = c.name?.toLowerCase().includes(searchLower);
            const matchingSites = (c.managedSites || []).filter(site =>
                site.name?.toLowerCase().includes(searchLower) ||
                site.location?.toLowerCase().includes(searchLower)
            );
            // Include customer if name matches OR any site matches
            if (customerMatches || matchingSites.length > 0) {
                return { ...c, matchingSites, customerMatches };
            }
            return null;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

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

        if (userRole === 'tech') {
            alert("Please ask a manager to delete this customer.");
            return;
        }

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

        if (userRole === 'tech') {
            alert("Please ask a manager to archive/restore this customer.");
            return;
        }

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
            sendReports: contact.sendReports || false,
            managedSites: contact.managedSites || [] // NEW
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

        if (userRole === 'tech') {
            alert("Please ask a manager to delete this contact.");
            return;
        }

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

        try {
            const siteId = await addManagedSite(selectedCustId, {
                name: formData.name,
                location: formData.location || '',
                logo: formData.logo || selectedCustomer?.logo || null,
                active: true
            });

            if (siteId) {
                setIsAddSiteOpen(false);
                setFormData({});

                // Provide clear guidance about AIMM
                alert(`✅ Managed site "${formData.name}" created successfully!\n\n📝 IMPORTANT: This site is managed by the customer and ready for quoting.\n\nMaintenance App (AIMM):\n• This site is NOT in the Maintenance App yet\n• Use the activity icon (📊) to add to Maintenance App when needed\n• Maintenance App provides enhanced monitoring and analytics\n\nThe site will appear in quotes regardless of Maintenance App status.`);
            }
        } catch (error) {
            console.error('Failed to create managed site:', error);
            alert('❌ Failed to create managed site. Please try again.');
        }
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
        if (userRole === 'tech') {
            alert("Please ask a manager to delete this note.");
            return;
        }
        await deleteCustomerNote(selectedCustId, noteId);
    };

    const handleArchiveNote = async (noteId, isArchived) => {
        if (userRole === 'tech') {
            alert("Please ask a manager to archive/restore this note.");
            return;
        }
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
            {/* Header - AIMM Cyan Theme */}
            <header className="bg-slate-900 border-b border-cyan-500/20 shadow-[0_1px_10px_rgba(6,182,212,0.1)] p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {/* Unified Back Button */}
                    <BackButton label="Back to Portal" onClick={onBack} />
                    <div className="border-l border-slate-600 pl-4">
                        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Customer Portal</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Master Data Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {userRole !== 'tech' && (
                        <button
                            onClick={() => setIsOrphanedSitesOpen(true)}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition"
                            title="Manage orphaned sites in Maintenance App"
                        >
                            <Icons.AlertTriangle size={14} /> Clean Up
                        </button>
                    )}
                    <button
                        onClick={() => { setFormData({}); setIsAddCustOpen(true); }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition"
                    >
                        <Icons.Plus size={16} /> New Customer
                    </button>
                </div>
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

                    <div className={`p-4 space-y-3 ${isSidebarCollapsed ? 'hidden' : ''}`}>
                        {/* Compliance Overview Button */}
                        <button
                            onClick={() => { setViewMode('compliance'); setSelectedCustId(null); }}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-2 transition-colors font-bold ${viewMode === 'compliance'
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-800'
                                }`}
                        >
                            <Icons.AlertTriangle size={16} />
                            {!isSidebarCollapsed && 'Compliance Overview'}
                        </button>

                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search customers & sites..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
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
                            <div key={cust.id} className="space-y-1">
                                <button
                                    onClick={() => { setViewMode('customers'); setSelectedCustId(cust.id); }}
                                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${selectedCustId === cust.id ? 'bg-cyan-900/40 border border-cyan-500/50 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
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
                                            {getSiteCountForCustomer(cust.id)}
                                        </span>
                                    )}
                                </button>
                                {/* Show matching sites when searching */}
                                {!isSidebarCollapsed && searchQuery && cust.matchingSites?.length > 0 && !cust.customerMatches && (
                                    <div className="ml-4 pl-3 border-l-2 border-emerald-500/30 space-y-1">
                                        {cust.matchingSites.slice(0, 3).map(site => (
                                            <div
                                                key={site.id}
                                                className="text-xs text-emerald-400 flex items-center gap-1.5 py-0.5"
                                            >
                                                <Icons.MapPin size={10} />
                                                <span className="truncate">{site.name}</span>
                                            </div>
                                        ))}
                                        {cust.matchingSites.length > 3 && (
                                            <div className="text-[10px] text-slate-500 pl-4">
                                                +{cust.matchingSites.length - 3} more sites
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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
                                        className={`w-40 h-40 rounded flex items-center justify-center text-slate-600 text-xs text-center overflow-hidden cursor-pointer transition-colors ${logoBackgrounds[selectedCustomer.id] === 'light'
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
                                            <Icons.Users className="text-cyan-400" /> Contacts Directory
                                        </h3>
                                        <button
                                            onClick={() => { setFormData({ sendReports: false }); setIsAddContactOpen(true); }}
                                            className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1.5 rounded-lg transition"
                                        >
                                            + Add Person
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(selectedCustomer.contacts || []).map((contact, index) => (
                                            <div key={contact.id || `contact-${index}`} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 group">
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
                                                    {/* NEW: Managed Sites */}
                                                    {contact.managedSites && contact.managedSites.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            <span className="text-slate-400">Manages:</span>
                                                            {contact.managedSites.map((siteId, idx) => {
                                                                const site = customerManagedSites.find(s => s.id === siteId);
                                                                return site ? (
                                                                    <span key={siteId || `site-${idx}`} className="bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] border border-emerald-800">
                                                                        {site.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
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
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { handleGenerateSample(); }}
                                                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                                                title="Add Demo Site"
                                            >
                                                <Icons.Zap size={12} />
                                                Demo
                                            </button>
                                            <button
                                                onClick={() => { setFormData({}); setIsAddSiteOpen(true); }}
                                                className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1.5 rounded-lg transition"
                                            >
                                                + Add Site
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {customerManagedSites.map(site => (
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
                                                            {site.hasAIMMProfile ? (
                                                                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800 font-medium">AIMM</span>
                                                            ) : (
                                                                <span className="text-[10px] bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded border border-slate-500 font-medium">No AIMM</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-400 truncate">{site.location || "No Location"}</div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* Edit Site Button */}
                                                        <button
                                                            onClick={() => setEditingSite(site)}
                                                            className="text-cyan-400 hover:text-cyan-300 transition p-1"
                                                            title="Edit site details & compliance"
                                                        >
                                                            <Icons.Edit size={14} />
                                                        </button>
                                                        {/* AIMM Profile Toggle */}
                                                        <button
                                                            onClick={async () => {
                                                                if (userRole === 'tech') {
                                                                    alert("Please ask a manager to change AIMM profile settings.");
                                                                    return;
                                                                }

                                                                const isCurrentlyEnabled = site.hasAIMMProfile || false;
                                                                const action = isCurrentlyEnabled ? 'disable' : 'enable';
                                                                const warning = isCurrentlyEnabled
                                                                    ? '\n\n⚠️ WARNING: Disabling AIMM tracking will:\n• Remove this site from Maintenance App monitoring\n• Stop automatic data collection and updates\n• Any existing Maintenance App data will remain but will no longer be updated\n\nThe site will still appear in quotes.'
                                                                    : '\n\nEnabling AIMM tracking will:\n• Add this site to the Maintenance App (AIMM)\n• Enable automatic data collection and updates\n• Provide enhanced maintenance analytics\n\nThe site is already visible in quotes.';

                                                                if (window.confirm(`Are you sure you want to ${action} Maintenance App tracking for "${site.name}"?${warning}\n\nThis change will affect how this site is monitored in the Maintenance App.`)) {
                                                                    try {
                                                                        // Just update the hasAIMMProfile flag, don't move sites
                                                                        await updateManagedSite(selectedCustId, site.id, { hasAIMMProfile: !isCurrentlyEnabled });

                                                                        // Provide immediate feedback
                                                                        const statusMessage = !isCurrentlyEnabled
                                                                            ? `✅ Maintenance App tracking enabled for "${site.name}". Enhanced monitoring and analytics are now active.`
                                                                            : `✅ Maintenance App tracking disabled for "${site.name}". Monitoring has been stopped, but the site remains visible in quotes.`;

                                                                        // Show success message
                                                                        alert(statusMessage);

                                                                        // Optional: Force a brief delay to ensure Firebase sync
                                                                        await new Promise(resolve => setTimeout(resolve, 500));

                                                                    } catch (error) {
                                                                        console.error('Failed to update Maintenance App profile:', error);
                                                                        alert(`❌ Failed to ${action} Maintenance App tracking for "${site.name}". Please try again.\n\nError: ${error.message}`);
                                                                    }
                                                                }
                                                            }}
                                                            className={`transition p-1 ${site.hasAIMMProfile ? 'text-blue-400 hover:text-blue-300' : 'text-slate-500 hover:text-slate-400'}`}
                                                            title={site.hasAIMMProfile ? "Maintenance App tracking enabled - Click to disable" : "Maintenance App tracking disabled - Click to enable"}
                                                        >
                                                            <Icons.Activity size={14} />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (userRole === 'tech') {
                                                                    alert("Please ask a manager to archive/restore this site.");
                                                                    return;
                                                                }

                                                                const isCurrentlyActive = site.active !== false;
                                                                const action = isCurrentlyActive ? 'archive' : 'restore';
                                                                const warning = isCurrentlyActive
                                                                    ? '\n\n⚠️ Archiving this site will:\n• Remove it from active site lists\n• Stop monitoring and data collection\n• The site will remain accessible in the Customer Portal'
                                                                    : '\n\n⚠️ Restoring this site will:\n• Add it back to active site lists\n• Resume monitoring and data collection\n• The site will be visible in the Maintenance App if AIMM is enabled';

                                                                if (window.confirm(`Are you sure you want to ${action} "${site.name}"?${warning}\n\nThis action can be reversed later.`)) {
                                                                    try {
                                                                        await updateManagedSite(selectedCustId, site.id, { active: !isCurrentlyActive });

                                                                        const statusMessage = isCurrentlyActive
                                                                            ? `✅ Site "${site.name}" has been archived.`
                                                                            : `✅ Site "${site.name}" has been restored and is now active.`;

                                                                        alert(statusMessage);
                                                                    } catch (error) {
                                                                        console.error('Failed to toggle site status:', error);
                                                                        alert(`❌ Failed to ${action} site "${site.name}". Please try again.\n\nError: ${error.message}`);
                                                                    }
                                                                }
                                                            }}
                                                            className={`transition p-1 ${site.active === false ? 'text-green-400 hover:text-green-300' : 'text-orange-400 hover:text-orange-300'}`}
                                                            title={site.active === false ? "Restore site" : "Archive site"}
                                                        >
                                                            {site.active === false ? <Icons.RotateCcw size={14} /> : <Icons.Archive size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (userRole === 'tech') {
                                                                    alert("Please ask a manager to delete this site.");
                                                                    return;
                                                                }

                                                                if (window.confirm(`Are you sure you want to delete "${site.name}"?\n\n⚠️ This action cannot be undone.\n\nThe site will be permanently removed from this customer.`)) {
                                                                    try {
                                                                        await deleteManagedSite(selectedCustId, site.id);
                                                                        alert(`✅ Site "${site.name}" has been deleted successfully.`);
                                                                    } catch (error) {
                                                                        console.error('Failed to delete site:', error);
                                                                        alert(`❌ Failed to delete site "${site.name}". Please try again.\n\nError: ${error.message}`);
                                                                    }
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-300 transition p-1"
                                                            title="Delete site"
                                                        >
                                                            <Icons.Trash size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {customerManagedSites.length === 0 && (
                                            <div className="text-center py-6 text-slate-500 text-sm italic border-2 border-dashed border-slate-800 rounded-lg">
                                                No sites created yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* Site Compliance Summary - Full Width */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
                                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                        <Icons.ClipboardList className="text-purple-400" size={18} />
                                        Site Compliance
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    {(() => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

                                        // Collect all compliance items from this customer's managed sites
                                        const allItems = [];
                                        customerManagedSites.forEach(site => {
                                            (site.compliance || []).forEach(item => {
                                                const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                                                let status = 'active';
                                                if (dueDate) {
                                                    if (dueDate < today) status = 'expired';
                                                    else if (dueDate <= thirtyDaysFromNow) status = 'warning';
                                                }
                                                allItems.push({
                                                    ...item,
                                                    siteName: site.name,
                                                    status
                                                });
                                            });
                                        });

                                        // Sort by due date (soonest first)
                                        allItems.sort((a, b) => {
                                            if (!a.dueDate && !b.dueDate) return 0;
                                            if (!a.dueDate) return 1;
                                            if (!b.dueDate) return -1;
                                            return new Date(a.dueDate) - new Date(b.dueDate);
                                        });

                                        return (
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                                                    <tr>
                                                        <th className="px-4 py-3">Site</th>
                                                        <th className="px-4 py-3">Document</th>
                                                        <th className="px-4 py-3">Due Date</th>
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3 w-12">Link</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-700">
                                                    {allItems.map((item, idx) => (
                                                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-800/50">
                                                            <td className="px-4 py-3 font-medium text-slate-200">{item.siteName}</td>
                                                            <td className="px-4 py-3 text-slate-300">{item.name}</td>
                                                            <td className="px-4 py-3 text-slate-300">{item.dueDate ? formatDate(item.dueDate) : '-'}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${item.status === 'expired' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                                                    item.status === 'warning' ? 'bg-amber-900/30 text-amber-400 border-amber-800' :
                                                                        'bg-green-900/30 text-green-400 border-green-800'
                                                                    }`}>
                                                                    {item.status === 'expired' ? 'Expired' : item.status === 'warning' ? 'Due Soon' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {item.link ? (
                                                                    <a
                                                                        href={item.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                                                        title="Open Document"
                                                                    >
                                                                        <Icons.ExternalLink size={14} />
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-600">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {allItems.length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="p-6 text-center text-slate-500 italic">
                                                                No compliance documents added yet. Click the Edit button on a site to add compliance items.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        );
                                    })()}
                                </div>
                            </div>

                        </div>
                    ) : viewMode === 'compliance' ? (
                        /* COMPLIANCE DASHBOARD */
                        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-800">
                                    <Icons.AlertTriangle size={24} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Compliance Dashboard</h2>
                                    <p className="text-sm text-slate-400">Overview of all site compliance documents requiring attention.</p>
                                </div>
                            </div>

                            {/* Compliance Items Table */}
                            {(() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

                                // Collect all compliance items from all customers' managed sites
                                const allItems = [];
                                customers.forEach(customer => {
                                    (customer.managedSites || []).forEach(site => {
                                        (site.compliance || []).forEach(item => {
                                            const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                                            if (dueDate && dueDate <= thirtyDaysFromNow) {
                                                allItems.push({
                                                    ...item,
                                                    siteName: site.name,
                                                    customerName: customer.name,
                                                    status: dueDate < today ? 'expired' : 'warning'
                                                });
                                            }
                                        });
                                    });
                                });

                                // Sort by due date (oldest first)
                                allItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                                return (
                                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                                        <div className="p-4 bg-slate-900 border-b border-slate-700">
                                            <h3 className="font-bold text-slate-200">Attention Required ({allItems.length})</h3>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                                                <tr>
                                                    <th className="px-4 py-3">Customer</th>
                                                    <th className="px-4 py-3">Site</th>
                                                    <th className="px-4 py-3">Document</th>
                                                    <th className="px-4 py-3">Due Date</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3 w-12">Link</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {allItems.map((item, idx) => (
                                                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 text-slate-300">{item.customerName}</td>
                                                        <td className="px-4 py-3 text-slate-200 font-medium">{item.siteName}</td>
                                                        <td className="px-4 py-3 text-slate-200">{item.name}</td>
                                                        <td className="px-4 py-3 text-slate-300">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${item.status === 'expired'
                                                                ? 'bg-red-900/30 text-red-400 border-red-800'
                                                                : 'bg-amber-900/30 text-amber-400 border-amber-800'
                                                                }`}>
                                                                {item.status === 'expired' ? 'Expired' : 'Due Soon'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {item.link ? (
                                                                <a
                                                                    href={item.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                                                    title="Open Document"
                                                                >
                                                                    <Icons.ExternalLink size={14} />
                                                                </a>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {allItems.length === 0 && (
                                                    <tr>
                                                        <td colSpan="6" className="p-8 text-center text-slate-500">
                                                            <Icons.CheckCircle size={32} className="mx-auto mb-2 text-green-500/50" />
                                                            <p className="font-medium">All compliance documents are up to date!</p>
                                                            <p className="text-xs mt-1">No items require attention at this time.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}

                            {/* Status Guide */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Valid (60+ Days)</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Due Soon (&lt; 30 Days)</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Expired</span>
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
            </div >

            {/* --- MODALS --- */}

            {/* 1. Add Customer Modal */}
            {
                isAddCustOpen && (
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
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded font-bold transition"
                            >
                                Create Customer
                            </button>
                        </div>
                    </Modal>
                )
            }

            {/* 2. Edit Customer Modal */}
            {
                isEditCustOpen && (
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
                )
            }

            {/* 3. Add Contact Modal */}
            {
                isAddContactOpen && (
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

                            {/* NEW: Managed Sites Multi-Select */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-300">Managed Sites (Optional)</label>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                    {customerManagedSites.length === 0 ? (
                                        <div className="text-xs text-slate-500 italic">No sites available for this customer</div>
                                    ) : (
                                        customerManagedSites.map(site => (
                                            <label key={site.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 p-2 rounded transition">
                                                <input
                                                    type="checkbox"
                                                    checked={(formData.managedSites || []).includes(site.id)}
                                                    onChange={(e) => {
                                                        const current = formData.managedSites || [];
                                                        const updated = e.target.checked
                                                            ? [...current, site.id]
                                                            : current.filter(id => id !== site.id);
                                                        setFormData({ ...formData, managedSites: updated });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className="text-sm text-slate-300">{site.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <div className="text-xs text-slate-400">Select which sites this contact manages</div>
                            </div>

                            <button
                                onClick={handleCreateContact}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white p-2 rounded font-bold transition"
                            >
                                Save Contact
                            </button>
                        </div>
                    </Modal>
                )
            }

            {/* 4. Edit Contact Modal */}
            {
                isEditContactOpen && (
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

                            {/* NEW: Managed Sites Multi-Select */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-300">Managed Sites (Optional)</label>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                    {customerManagedSites.length === 0 ? (
                                        <div className="text-xs text-slate-500 italic">No sites available for this customer</div>
                                    ) : (
                                        customerManagedSites.map(site => (
                                            <label key={site.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 p-2 rounded transition">
                                                <input
                                                    type="checkbox"
                                                    checked={(formData.managedSites || []).includes(site.id)}
                                                    onChange={(e) => {
                                                        const current = formData.managedSites || [];
                                                        const updated = e.target.checked
                                                            ? [...current, site.id]
                                                            : current.filter(id => id !== site.id);
                                                        setFormData({ ...formData, managedSites: updated });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className="text-sm text-slate-300">{site.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <div className="text-xs text-slate-400">Select which sites this contact manages</div>
                            </div>

                            <button
                                onClick={handleUpdateContact}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded font-bold transition"
                            >
                                Save Changes
                            </button>
                        </div>
                    </Modal>
                )
            }

            {/* 5. Add Site Modal */}
            {
                isAddSiteOpen && (
                    <Modal title={`Add Site for ${selectedCustomer?.name}`} onClose={() => setIsAddSiteOpen(false)}>
                        <div className="space-y-4">
                            <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded text-xs text-yellow-200">
                                <strong>📝 Important Information:</strong><br />
                                • This creates a managed site for this customer<br />
                                • <strong>The site will NOT be added to the Maintenance App (AIMM)</strong><br />
                                • Use the activity icon (📊) to add site to Maintenance App when needed<br />
                                • Sites appear in quotes regardless of Maintenance App status<br />
                                • Maintenance App provides enhanced monitoring and analytics
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
                )
            }

            {/* 6. Edit Site Modal */}
            {
                isEditSiteOpen && editingSite && (
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
                )
            }

            {/* 7. View Site Contacts Modal */}
            {
                isViewContactsOpen && selectedSiteForContacts && (
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
                )
            }

            {/* 8. Customer Notes Modal */}
            {
                isNotesOpen && selectedCustomer && (
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
                )
            }

            {/* Orphaned Sites Management Modal - Admin Only */}
            {
                isOrphanedSitesOpen && userRole !== 'tech' && (
                    <Modal title="Site Management" onClose={() => { setIsOrphanedSitesOpen(false); setShowAllMaintenanceSites(false); setShowLegacyCleanup(false); }}>
                        <div className="space-y-4">
                            <div className="bg-orange-900/20 border border-orange-700/50 p-3 rounded text-xs text-orange-200">
                                <strong>⚠️ Admin Only:</strong> Manage customer sites and clean up legacy data.
                            </div>

                            {/* Toggle between different views */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowAllMaintenanceSites(false); setShowLegacyCleanup(false); }}
                                    className={`px-3 py-1 rounded text-xs font-bold transition ${!showAllMaintenanceSites && !showLegacyCleanup
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        }`}
                                >
                                    Issues Only ({getOrphanedSites().length})
                                </button>
                                <button
                                    onClick={() => { setShowAllMaintenanceSites(true); setShowLegacyCleanup(false); }}
                                    className={`px-3 py-1 rounded text-xs font-bold transition ${showAllMaintenanceSites && !showLegacyCleanup
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        }`}
                                >
                                    All Sites ({getAllMaintenanceAppSites().length})
                                </button>
                                <button
                                    onClick={() => { setShowAllMaintenanceSites(false); setShowLegacyCleanup(true); }}
                                    className={`px-3 py-1 rounded text-xs font-bold transition ${showLegacyCleanup
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        }`}
                                >
                                    Legacy Cleanup ({getLegacyGlobalSites().length})
                                </button>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {showLegacyCleanup ? (
                                    // Legacy global sites view
                                    getLegacyGlobalSites().length === 0 ? (
                                        <div className="text-center py-4 text-slate-500 text-sm">
                                            No legacy sites found in global collection.
                                        </div>
                                    ) : (
                                        getLegacyGlobalSites().map(site => (
                                            <div key={site.id} className="bg-red-950/20 border border-red-700/50 p-3 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-sm text-slate-200">{site.name}</div>
                                                            <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-800">LEGACY</span>
                                                        </div>
                                                        <div className="text-xs text-slate-400">ID: {site.id}</div>
                                                        <div className="text-xs text-slate-400">Customer: {site.customerName || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-400">Location: {site.location || 'Not specified'}</div>
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            AIMM: {site.hasAIMMProfile ?
                                                                <span className="text-blue-400">Enabled</span> :
                                                                <span className="text-slate-500">Disabled</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteLegacySite(site.id)}
                                                        className="text-red-400 hover:text-red-300 transition p-1"
                                                        title="Delete legacy site"
                                                    >
                                                        <Icons.Trash size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    // Customer managed sites view
                                    (!showAllMaintenanceSites ? getOrphanedSites() : getAllMaintenanceAppSites()).length === 0 ? (
                                        <div className="text-center py-4 text-slate-500 text-sm">
                                            {!showAllMaintenanceSites
                                                ? "No site issues found. All customer sites are properly configured."
                                                : "No sites found."
                                            }
                                        </div>
                                    ) : (
                                        (!showAllMaintenanceSites ? getOrphanedSites() : getAllMaintenanceAppSites()).map(site => (
                                            <div key={site.id} className={`bg-slate-800 p-3 rounded-lg border ${site.isOrphaned ? 'border-orange-700/50' : 'border-slate-700'
                                                }`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-sm text-slate-200">{site.name}</div>
                                                            {site.isOrphaned && (
                                                                <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800">ISSUE</span>
                                                            )}
                                                            {!site.isOrphaned && (
                                                                <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">OK</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-400">ID: {site.id}</div>
                                                        <div className="text-xs text-slate-400">Customer: {site.customerName || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-400">Status: {site.customerStatus || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-400">Location: {site.location || 'Not specified'}</div>
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            AIMM: {site.hasAIMMProfile ?
                                                                <span className="text-blue-400">Enabled</span> :
                                                                <span className="text-slate-500">Disabled</span>
                                                            }
                                                        </div>
                                                        {site.customerId && (
                                                            <div className="text-xs text-slate-400">
                                                                Customer ID: {site.customerId}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => deleteOrphanedSite(site.id)}
                                                        className="text-red-400 hover:text-red-300 transition p-1"
                                                        title="Delete site"
                                                    >
                                                        <Icons.Trash size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>

                            <div className="text-xs text-slate-400 border-t border-slate-700 pt-2">
                                {showLegacyCleanup ? (
                                    <><strong>Legacy Cleanup:</strong> These are sites in the old global collection. They should be deleted as sites are now managed within customer documents.</>
                                ) : (
                                    <><strong>Info:</strong> This shows all customer managed sites. Sites from archived customers or with issues can be cleaned up here.</>
                                )}
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Edit Site Modal with Compliance Tracker */}
            {
                editingSite && (
                    <Modal title={`Edit Site: ${editingSite.name}`} onClose={() => setEditingSite(null)} size="lg">
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                    placeholder="Site Name"
                                    value={editingSite.name || ''}
                                    onChange={e => setEditingSite({ ...editingSite, name: e.target.value })}
                                />
                                <input
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                    placeholder="Location"
                                    value={editingSite.location || ''}
                                    onChange={e => setEditingSite({ ...editingSite, location: e.target.value })}
                                />
                            </div>

                            {/* Site Compliance Tracker */}
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                        <Icons.ClipboardList size={16} className="text-purple-400" />
                                        Site Compliance Tracker
                                    </h3>
                                </div>

                                {/* Add Compliance Form */}
                                <div className="p-3 bg-slate-800/50 border-b border-slate-700">
                                    <div className="grid grid-cols-5 gap-2">
                                        <input
                                            placeholder="Document Name"
                                            className="col-span-2 bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={editingSite._newCompName || ''}
                                            onChange={e => setEditingSite({ ...editingSite, _newCompName: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={editingSite._newCompDueDate || ''}
                                            onChange={e => setEditingSite({ ...editingSite, _newCompDueDate: e.target.value })}
                                            title="Due Date"
                                        />
                                        <input
                                            placeholder="Link (URL)"
                                            className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={editingSite._newCompLink || ''}
                                            onChange={e => setEditingSite({ ...editingSite, _newCompLink: e.target.value })}
                                        />
                                        <button
                                            onClick={() => {
                                                if (!editingSite._newCompName) return;
                                                const newItem = {
                                                    id: `comp-${Date.now()}`,
                                                    name: editingSite._newCompName,
                                                    dueDate: editingSite._newCompDueDate || '',
                                                    link: editingSite._newCompLink || '',
                                                    status: 'active',
                                                    lastUpdated: new Date().toISOString()
                                                };
                                                setEditingSite({
                                                    ...editingSite,
                                                    compliance: [...(editingSite.compliance || []), newItem],
                                                    _newCompName: '',
                                                    _newCompDueDate: '',
                                                    _newCompLink: ''
                                                });
                                            }}
                                            className="bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition-colors"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>

                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-900">
                                        <tr>
                                            <th className="px-3 py-2">Document</th>
                                            <th className="px-3 py-2">Due Date</th>
                                            <th className="px-3 py-2">Status</th>
                                            <th className="px-3 py-2 w-10">Link</th>
                                            <th className="px-3 py-2 w-16">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {(editingSite.compliance || [])
                                            .sort((a, b) => {
                                                if (!a.dueDate && !b.dueDate) return 0;
                                                if (!a.dueDate) return 1;
                                                if (!b.dueDate) return -1;
                                                return new Date(a.dueDate) - new Date(b.dueDate);
                                            })
                                            .map(item => {
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                                                let status = 'active';
                                                if (dueDate) {
                                                    if (dueDate < today) status = 'expired';
                                                    else if (dueDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) status = 'warning';
                                                }
                                                const isEditing = editingSite._editingCompId === item.id;

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-700/50">
                                                        {isEditing ? (
                                                            <>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editingSite._editCompName || ''}
                                                                        onChange={e => setEditingSite({ ...editingSite, _editCompName: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="date"
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editingSite._editCompDueDate || ''}
                                                                        onChange={e => setEditingSite({ ...editingSite, _editCompDueDate: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2"></td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        placeholder="URL"
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editingSite._editCompLink || ''}
                                                                        onChange={e => setEditingSite({ ...editingSite, _editCompLink: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                const updated = editingSite.compliance.map(c =>
                                                                                    c.id === item.id ? {
                                                                                        ...c,
                                                                                        name: editingSite._editCompName,
                                                                                        dueDate: editingSite._editCompDueDate,
                                                                                        link: editingSite._editCompLink,
                                                                                        lastUpdated: new Date().toISOString()
                                                                                    } : c
                                                                                );
                                                                                setEditingSite({
                                                                                    ...editingSite,
                                                                                    compliance: updated,
                                                                                    _editingCompId: null,
                                                                                    _editCompName: '',
                                                                                    _editCompDueDate: '',
                                                                                    _editCompLink: ''
                                                                                });
                                                                            }}
                                                                            className="text-green-400 hover:text-green-300"
                                                                            title="Save"
                                                                        >
                                                                            <Icons.Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingSite({ ...editingSite, _editingCompId: null })}
                                                                            className="text-slate-400 hover:text-slate-300"
                                                                            title="Cancel"
                                                                        >
                                                                            <Icons.X size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-3 py-2 font-medium text-slate-200">{item.name}</td>
                                                                <td className="px-3 py-2 text-slate-300">{item.dueDate ? formatDate(item.dueDate) : '-'}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${status === 'expired' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                                                        status === 'warning' ? 'bg-amber-900/30 text-amber-400 border-amber-800' :
                                                                            'bg-green-900/30 text-green-400 border-green-800'
                                                                        }`}>
                                                                        {status === 'expired' ? 'Expired' : status === 'warning' ? 'Due Soon' : 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    {item.link ? (
                                                                        <a
                                                                            href={item.link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-400 hover:text-blue-300 transition-colors inline-block"
                                                                            title="Open Document"
                                                                        >
                                                                            <Icons.ExternalLink size={14} />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-slate-600">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingSite({
                                                                                    ...editingSite,
                                                                                    _editingCompId: item.id,
                                                                                    _editCompName: item.name,
                                                                                    _editCompDueDate: item.dueDate || '',
                                                                                    _editCompLink: item.link || ''
                                                                                });
                                                                            }}
                                                                            className="text-blue-400 hover:text-blue-300"
                                                                            title="Edit"
                                                                        >
                                                                            <Icons.Edit size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!window.confirm(`Delete "${item.name}"?`)) return;
                                                                                setEditingSite({
                                                                                    ...editingSite,
                                                                                    compliance: editingSite.compliance.filter(c => c.id !== item.id)
                                                                                });
                                                                            }}
                                                                            className="text-red-400 hover:text-red-300"
                                                                            title="Delete"
                                                                        >
                                                                            <Icons.Trash size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        {(!editingSite.compliance || editingSite.compliance.length === 0) && (
                                            <tr><td colSpan="5" className="p-4 text-center text-slate-500 italic">No compliance documents yet. Add one above.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={async () => {
                                    try {
                                        // Remove temp fields before saving
                                        const { _newCompName, _newCompDueDate, _newCompLink, _editingCompId, _editCompName, _editCompDueDate, _editCompLink, ...siteData } = editingSite;
                                        await updateManagedSite(selectedCustId, editingSite.id, siteData);
                                        setEditingSite(null);
                                    } catch (error) {
                                        console.error('Failed to update site:', error);
                                        alert('Failed to save site. Please try again.');
                                    }
                                }}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded font-bold transition"
                            >
                                Save Site Changes
                            </button>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
};
