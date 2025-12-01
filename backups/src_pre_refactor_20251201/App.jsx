import React, { useState, useMemo, useEffect, useRef } from 'react';
// IMPORT DATA & HELPER
import { recalculateRow, generateSampleSite } from './data/mockData';
// IMPORT UI COMPONENTS
import {
  Icons,
  Card,
  Button,
  StatusBadge,
  SimpleBarChart,
  CalendarWidget,
  Modal,
  EditableCell,
  formatDate
} from './components/UIComponents';
import { MasterListModal } from './components/MasterListModal';
import { AddAssetModal, EditAssetModal } from './components/AssetModals';
import { AddSiteModal, EditSiteModal, ContactModal } from './components/SiteModals';
import { AssetAnalyticsModal } from './components/AssetAnalytics';
import { AppHistoryModal } from './components/AppHistoryModal';
import { IssueTracker } from './components/IssueTracker';

// ==========================================
// HELPER: SAFELY LOAD DATA
// ==========================================
const safelyLoadData = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map(site => ({
    ...site,
    customer: site.customer || '',
    contactName: site.contactName || '',
    contactEmail: site.contactEmail || '',
    contactPosition: site.contactPosition || '',
    contactPhone1: site.contactPhone1 || '',
    contactPhone2: site.contactPhone2 || '',
    active: site.active !== false,
    serviceData: Array.isArray(site.serviceData) ? site.serviceData.map(i => ({ ...i, active: i.active !== false })) : [],
    rollerData: Array.isArray(site.rollerData) ? site.rollerData.map(i => ({ ...i, active: i.active !== false })) : [],
    specData: Array.isArray(site.specData) ? site.specData : [],
    notes: Array.isArray(site.notes) ? site.notes : [],
    issues: Array.isArray(site.issues) ? site.issues.map(issue => ({
      ...issue,
      importance: issue.importance || 'Medium', // Ensure importance exists
      assetId: issue.assetId || null,
      assetName: issue.assetName || null,
    })) : [], // Initialize issues array
  }));
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  // --- STATE ---
  const [sites, setSites] = useState([]); // Start with empty array, no mock data
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('service');
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isRollerOnlyMode, setIsRollerOnlyMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const printMenuRef = useRef(null);

  // --- NEW BULK ACTION & FILTER STATE ---
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [siteSortOption, setSiteSortOption] = useState('risk');

  // --- SELECTION ---
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingSpecs, setEditingSpecs] = useState(null);
  const [viewHistoryAsset, setViewHistoryAsset] = useState(null);
  const [viewContactSite, setViewContactSite] = useState(null);
  const [viewAnalyticsAsset, setViewAnalyticsAsset] = useState(null);

  // --- COMMENTS EDITING STATE ---
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState({ content: '', author: '' });
  // --- MODALS ---
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isAssetEditModalOpen, setIsAssetEditModalOpen] = useState(false);
  const [isMasterListOpen, setIsMasterListOpen] = useState(false);
  const [isAppHistoryOpen, setIsAppHistoryOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark'); // THEME STATE

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- FORMS ---
  const [siteForm, setSiteForm] = useState({
    id: null, name: '', customer: '', location: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null, issues: [] // Initialize issues here too
  });
  const [noteInput, setNoteInput] = useState({ content: '', author: '' });
  const [newAsset, setNewAsset] = useState({ name: '', weigher: '', code: '', lastCal: '', frequency: '' });


  const [specNoteInput, setSpecNoteInput] = useState({ content: '', author: '' });

  // --- PERSISTENCE & CLEANUP ---
  useEffect(() => {
    const savedData = localStorage.getItem('app_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSites(safelyLoadData(parsed));
      } catch (e) { console.error(e); }
    }
    setIsDataLoaded(true);
  }, []);

  useEffect(() => {
    if (isDataLoaded) localStorage.setItem('app_data', JSON.stringify(sites));
  }, [sites, isDataLoaded]);

  useEffect(() => {
    const cleanup = () => { document.body.classList.remove('print-schedule', 'print-specs', 'print-master'); };
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target)) {
        setIsPrintMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setSelectedRowIds(new Set()); }, [activeTab, selectedSiteId]);
  // Only close MasterListModal when navigating AWAY from a site (selectedSiteId becomes null)
  useEffect(() => {
    if (selectedSiteId === null) {
      setIsMasterListOpen(false);
    }
  }, [selectedSiteId]);

  // --- DERIVED STATE ---
  const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);

  const filteredSites = useMemo(() => {
    let result = sites.filter(site => {
      const matchesSearch = (site.name || '').toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
        (site.customer || '').toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
        (site.location || '').toLowerCase().includes(siteSearchQuery.toLowerCase());
      return showArchived ? matchesSearch : (matchesSearch && site.active !== false);
    });

    if (siteSortOption === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (siteSortOption === 'customer') {
      result.sort((a, b) => (a.customer || '').localeCompare(b.customer || ''));
    } else {
      result.sort((a, b) => {
        const countCritical = (site) => {
          const service = (site.serviceData || []).filter(a => a.active !== false);
          const roller = (site.rollerData || []).filter(a => a.active !== false);
          return [...service, ...roller].filter(i => i.remaining < 0).length;
        };
        return countCritical(b) - countCritical(a);
      });
    }
    return result;
  }, [sites, siteSearchQuery, siteSortOption, showArchived]);

  const currentServiceData = selectedSite ? selectedSite.serviceData : [];
  const currentRollerData = selectedSite ? selectedSite.rollerData : [];
  const currentSpecData = useMemo(() => selectedSite ? (selectedSite.specData || []) : [], [selectedSite]);
  const currentTableData = activeTab === 'service' ? currentServiceData : currentRollerData;

  const filteredData = useMemo(() => {
    if (!currentTableData) return [];
    let data = currentTableData.filter(item => showArchived ? true : item.active !== false);

    data = data.filter(item =>
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.weigher || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus === 'overdue') data = data.filter(d => d.remaining < 0);
    else if (filterStatus === 'dueSoon') data = data.filter(d => d.remaining >= 0 && d.remaining < 30);
    else if (filterStatus === 'healthy') data = data.filter(d => d.remaining >= 30);

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'dueDate') {
          aVal = new Date(a.dueDate).getTime();
          bVal = new Date(b.dueDate).getTime();
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return data;
  }, [currentTableData, searchTerm, filterStatus, sortConfig, showArchived]);

  const selectedAsset = useMemo(() => currentTableData.find(i => i.id === selectedAssetId), [currentTableData, selectedAssetId]);
  const selectedSpecs = useMemo(() => {
    if (!selectedAsset) return null;
    return currentSpecData.find(s => s.weigher === selectedAsset.weigher || s.altCode === selectedAsset.code || s.weigher === selectedAsset.code);
  }, [selectedAsset, currentSpecData]);

  const stats = useMemo(() => {
    if (!currentTableData) return { overdue: 0, dueSoon: 0, total: 0 };
    const activeData = currentTableData.filter(d => d.active !== false);

    const total = activeData.length;
    const overdue = activeData.filter(d => d.remaining < 0).length;
    const dueSoon = activeData.filter(d => d.remaining >= 0 && d.remaining < 30).length;
    const healthy = activeData.filter(d => d.remaining >= 30).length;
    return { total, overdue, dueSoon, healthy };
  }, [currentTableData]);

  // --- HANDLERS ---
  const updateSiteData = (siteId, updates) => { setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...updates } : s)); };

  const handleSaveReport = (assetId, reportData) => {
    const updateList = (list) => list.map(a => {
      if (a.id === assetId) {
        return { ...a, reports: [...(a.reports || []), reportData] };
      }
      return a;
    });

    updateSiteData(selectedSiteId, {
      serviceData: updateList(currentServiceData),
      rollerData: updateList(currentRollerData)
    });

    if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
      setViewAnalyticsAsset(prev => ({ ...prev, reports: [...(prev.reports || []), reportData] }));
    }
  };

  const handleDeleteReport = (assetId, reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const updateList = (list) => list.map(a => {
      if (a.id === assetId) {
        return { ...a, reports: (a.reports || []).filter(r => r.id !== reportId) };
      }
      return a;
    });

    updateSiteData(selectedSiteId, {
      serviceData: updateList(currentServiceData),
      rollerData: updateList(currentRollerData)
    });

    if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
      setViewAnalyticsAsset(prev => ({ ...prev, reports: (prev.reports || []).filter(r => r.id !== reportId) }));
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const toggleRow = (id) => {
    const newSelection = new Set(selectedRowIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedRowIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredData.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredData.map(item => item.id)));
    }
  };

  const performBulkService = () => {
    if (selectedRowIds.size === 0) return;
    if (!window.confirm(`Mark ${selectedRowIds.size} items as serviced today?`)) return;

    const list = activeTab === 'service' ? currentServiceData : currentRollerData;
    const today = new Date().toISOString().split('T')[0];

    const updatedList = list.map(item => {
      if (selectedRowIds.has(item.id)) {
        let updated = { ...item, lastCal: today };
        updated = recalculateRow(updated);
        updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: 'Bulk Service Completed', user: 'User' }];
        return updated;
      }
      return item;
    });

    if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: updatedList }); }
    else { updateSiteData(selectedSiteId, { rollerData: updatedList }); }
    setSelectedRowIds(new Set());
  };

  const exportBulkCSV = () => {
    if (selectedRowIds.size === 0) return;
    const itemsToExport = filteredData.filter(i => selectedRowIds.has(i.id));

    const headers = ['Name', 'Code', 'Frequency', 'Last Cal', 'Due Date', 'Status'];
    const rows = itemsToExport.map(i => [
      i.name,
      i.code,
      i.frequency,
      i.lastCal,
      i.dueDate,
      i.remaining < 0 ? 'Overdue' : i.remaining < 30 ? 'Due Soon' : 'Good'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `maintenance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleAssetStatus = (asset, e) => {
    if (e) e.stopPropagation();
    const isActivating = asset.active === false;
    const confirmMsg = isActivating
      ? "Re-activate this asset? It will appear in schedules and stats again."
      : "Decommission this asset? It will be hidden from schedules and stats.";

    if (!window.confirm(confirmMsg)) return;

    const list = activeTab === 'service' ? currentServiceData : currentRollerData;
    const updatedList = list.map(item => {
      if (item.id === asset.id) {
        const updated = { ...item, active: isActivating };
        updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: isActivating ? 'Asset Re-activated' : 'Asset Decommissioned', user: 'User' }];
        return updated;
      }
      return item;
    });

    if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: updatedList }); }
    else { updateSiteData(selectedSiteId, { rollerData: updatedList }); }

    if (!isActivating && isAssetEditModalOpen) {
      setIsAssetEditModalOpen(false);
      setEditingAsset(null);
    } else if (isActivating && editingAsset) {
      setEditingAsset({ ...editingAsset, active: true });
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'ascending' ? <Icons.SortAsc /> : <Icons.SortDesc />;
  };

  const handlePrint = (mode) => {
    const body = document.body;
    body.classList.remove('print-schedule', 'print-specs', 'print-master');

    if (mode === 'schedule') body.classList.add('print-schedule');
    if (mode === 'specs') body.classList.add('print-specs');
    if (mode === 'master') body.classList.add('print-master');

    setIsPrintMenuOpen(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleAddSite = () => {
    if (!siteForm.name) return;
    const initialNotes = noteInput.content ? [{ id: `n-${Date.now()}`, content: noteInput.content, author: noteInput.author || 'Admin', timestamp: new Date().toISOString() }] : [];
    const newSite = {
      id: `site-${Date.now()}`,
      name: siteForm.name,
      customer: siteForm.customer,
      location: siteForm.location,
      contactName: siteForm.contactName,
      contactEmail: siteForm.contactEmail,
      contactPosition: siteForm.contactPosition,
      contactPhone1: siteForm.contactPhone1,
      contactPhone2: siteForm.contactPhone2,
      active: true,
      notes: initialNotes,
      logo: siteForm.logo,
      serviceData: [],
      rollerData: [],
      specData: []
    };
    setSites([...sites, newSite]);
    setSiteForm({ id: null, name: '', customer: '', location: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null });
    setNoteInput({ content: '', author: '' });
    setIsAddSiteModalOpen(false);
  };

  const handleGenerateSample = () => {
    const sample = generateSampleSite();
    setSites([sample, ...sites]);
  };

  const handleDeleteSite = () => {
    if (!siteForm || !siteForm.id) return;
    setSites(sites.filter(s => s.id !== siteForm.id));
    setIsEditSiteModalOpen(false);
    setSelectedSiteId(null);
    setSiteForm({ id: null, name: '', customer: '', location: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null });
  };

  const handleUpdateSiteInfo = () => {
    updateSiteData(siteForm.id, {
      name: siteForm.name,
      customer: siteForm.customer,
      location: siteForm.location,
      contactName: siteForm.contactName,
      contactEmail: siteForm.contactEmail,
      contactPosition: siteForm.contactPosition,
      contactPhone1: siteForm.contactPhone1,
      contactPhone2: siteForm.contactPhone2,
      notes: siteForm.notes,
      logo: siteForm.logo
    });
    setIsEditSiteModalOpen(false);
  };

  const toggleSiteStatus = (site, e) => {
    if (e) e.stopPropagation();
    const isActivating = site.active === false;
    const confirmMsg = isActivating
      ? "Re-activate this customer? They will appear in the dashboard again."
      : "Archive this customer? They will be hidden from the dashboard.";

    if (!window.confirm(confirmMsg)) return;

    const updatedSites = sites.map(s => {
      if (s.id === site.id) {
        const newNote = {
          id: `n-${Date.now()}`,
          content: isActivating ? 'Site Re-activated' : 'Site Archived',
          author: 'System',
          timestamp: new Date().toISOString()
        };
        return { ...s, active: isActivating, notes: [...s.notes, newNote] };
      }
      return s;
    });

    setSites(updatedSites);
    setSiteForm(prev => ({ ...prev, active: isActivating }));
  };

  const handleAddIssue = (siteId, newIssue) => {
    setSites(prevSites =>
      prevSites.map(site => {
        if (site.id === siteId) {
          const selectedAsset = [...(site.serviceData || []), ...(site.rollerData || [])].find(
            asset => asset.id === newIssue.assetId
          );
          return {
            ...site,
            issues: [
              ...(site.issues || []),
              {
                ...newIssue,
                assetName: selectedAsset ? `${selectedAsset.name} (${selectedAsset.code})` : 'N/A',
              },
            ],
          };
        }
        return site;
      })
    );
  };

  const handleToggleIssueStatus = (siteId, issueId) => {
    setSites(prevSites =>
      prevSites.map(site =>
        site.id === siteId
          ? {
            ...site,
            issues: (site.issues || []).map(issue =>
              issue.id === issueId
                ? {
                  ...issue,
                  status: issue.status === 'Completed' ? 'Open' : 'Completed',
                  completedAt: issue.status === 'Completed' ? null : new Date().toISOString(),
                }
                : issue
            ),
          }
          : site
      )
    );
  };

  const handleUpdateIssue = (siteId, issueId, updatedFields) => {
    setSites(prevSites =>
      prevSites.map(site => {
        if (site.id === siteId) {
          const updatedIssues = (site.issues || []).map(issue => {
            if (issue.id === issueId) {
              const selectedAsset = updatedFields.assetId
                ? [...(site.serviceData || []), ...(site.rollerData || [])].find(asset => asset.id === updatedFields.assetId)
                : null;
              const assetName = selectedAsset ? `${selectedAsset.name} (${selectedAsset.code})` : null;

              return {
                ...issue,
                ...updatedFields,
                assetName: assetName, // Update assetName based on new assetId
              };
            }
            return issue;
          });
          return { ...site, issues: updatedIssues };
        }
        return site;
      })
    );
  };

  const handleCopyIssue = (issue) => {
    const issueText = `Issue: ${issue.description}\nAssigned To: ${issue.assignedTo}\nStatus: ${issue.status}\nCreated: ${formatDate(issue.createdAt, true)}${issue.completedAt ? `\nCompleted: ${formatDate(issue.completedAt, true)}` : ''}`;
    navigator.clipboard.writeText(issueText);
    alert('Issue details copied to clipboard!');
  };

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.code) return;
    const baseId = Math.random().toString(36).substr(2, 9);
    const historyEntry = { date: new Date().toISOString(), action: 'Asset Created', user: 'User' };
    const serviceItem = recalculateRow({ id: `s-${baseId}`, active: true, ...newAsset, frequency: activeTab === 'service' && newAsset.frequency ? parseInt(newAsset.frequency) : 3, dueDate: '', remaining: 0, history: [historyEntry] });
    const rollerItem = recalculateRow({ id: `r-${baseId}`, active: true, ...newAsset, frequency: activeTab === 'roller' && newAsset.frequency ? parseInt(newAsset.frequency) : 12, dueDate: '', remaining: 0, history: [historyEntry] });
    updateSiteData(selectedSiteId, { serviceData: [serviceItem, ...currentServiceData], rollerData: [rollerItem, ...currentRollerData] });
    setNewAsset({ name: '', weigher: '', code: '', lastCal: '', frequency: '' });
    setIsAssetModalOpen(false);
  };

  const handleDeleteAsset = () => {
    if (!editingAsset) return;
    const idParts = editingAsset.id.split('-');
    const baseId = idParts.length > 1 ? idParts[1] : null;
    let newServiceData = currentServiceData.filter(i => i.id !== editingAsset.id);
    let newRollerData = currentRollerData.filter(i => i.id !== editingAsset.id);
    if (baseId) {
      newServiceData = newServiceData.filter(i => i.id !== `s-${baseId}`);
      newRollerData = newRollerData.filter(i => i.id !== `r-${baseId}`);
    }
    updateSiteData(selectedSiteId, { serviceData: newServiceData, rollerData: newRollerData });
    setIsAssetEditModalOpen(false); setEditingAsset(null); setSelectedAssetId(null);
  };

  const handleSaveEditedAsset = () => {
    if (!editingAsset) return;
    const updated = recalculateRow(editingAsset);
    const newHistory = { date: new Date().toISOString(), action: 'Details Updated', user: 'User' };
    updated.history = [...(updated.history || []), newHistory];
    if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: currentServiceData.map(i => i.id === updated.id ? updated : i) }); }
    else { updateSiteData(selectedSiteId, { rollerData: currentRollerData.map(i => i.id === updated.id ? updated : i) }); }
    setIsAssetEditModalOpen(false);
    setEditingAsset(null);
    setEditingSpecs(null);
  };

  const handleSaveEditedSpecs = () => {
    if (!editingSpecs) return;
    const newHistory = { date: new Date().toISOString(), action: editingSpecs.id ? 'Specification Updated' : 'Specification Created', user: 'User' };
    const specToSave = { ...editingSpecs, history: [...(editingSpecs.history || []), newHistory] };
    if (editingSpecs.id) {
      updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === editingSpecs.id ? specToSave : s) });
    } else {
      updateSiteData(selectedSiteId, { specData: [...currentSpecData, { ...specToSave, id: Math.random().toString(36).substr(2, 9), notes: editingSpecs.notes || [] }] });
    }
    // Close the modal after saving
    setIsAssetEditModalOpen(false);
    setEditingAsset(null);
    setEditingSpecs(null);
  };

  const handleInlineUpdate = (id, field, val) => {
    const list = activeTab === 'service' ? currentServiceData : currentRollerData;
    const updatedList = list.map(item => {
      if (item.id === id) {
        let updated = { ...item, [field]: val };
        if (field === 'lastCal' || field === 'frequency') updated = recalculateRow(updated);
        updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val}`, user: 'User' }];
        return updated;
      }
      return item;
    });

    // Sync the change to the paired asset (service <-> roller)
    const idParts = id.split('-');
    const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

    if (baseId) {
      const pairedId = activeTab === 'service' ? `r-${baseId}` : `s-${baseId}`;
      const pairedList = activeTab === 'service' ? currentRollerData : currentServiceData;
      const updatedPairedList = pairedList.map(item => {
        if (item.id === pairedId) {
          let updated = { ...item, [field]: val };
          if (field === 'lastCal' || field === 'frequency') updated = recalculateRow(updated);
          updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val} (synced)`, user: 'User' }];
          return updated;
        }
        return item;
      });

      if (activeTab === 'service') {
        updateSiteData(selectedSiteId, { serviceData: updatedList, rollerData: updatedPairedList });
      } else {
        updateSiteData(selectedSiteId, { serviceData: updatedPairedList, rollerData: updatedList });
      }
    } else {
      if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: updatedList }); }
      else { updateSiteData(selectedSiteId, { rollerData: updatedList }); }
    }
  };



  const handleAddSpecNote = () => {
    if (!specNoteInput.content || !selectedSpecs) return;
    const newN = { id: `sn-${Date.now()}`, content: specNoteInput.content, author: specNoteInput.author || 'Unknown', timestamp: new Date().toISOString() };
    const updatedSpec = { ...selectedSpecs, notes: [...(selectedSpecs.notes || []), newN] };
    updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    setSpecNoteInput({ content: '', author: '' });
  };

  const handleDeleteSpecNote = (e, noteId) => {
    e.stopPropagation();
    if (!selectedSpecs) return;
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    const updatedSpec = { ...selectedSpecs, notes: selectedSpecs.notes.filter(n => n.id !== noteId) };
    updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
  };

  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteContent({ content: note.content, author: note.author });
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteContent({ content: '', author: '' });
  };

  const saveEditedNote = () => {
    if (!selectedSpecs || !editingNoteId) return;
    const updatedNotes = selectedSpecs.notes.map(n => {
      if (n.id === editingNoteId) {
        return { ...n, content: editNoteContent.content, author: editNoteContent.author, timestamp: new Date().toISOString() };
      }
      return n;
    });
    const updatedSpec = { ...selectedSpecs, notes: updatedNotes };
    updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    cancelEditNote();
  };

  const handleDownloadData = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `${year}-${month}-${day}_MaintTrack_${hours}-${minutes}-${seconds}.json`;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sites));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", filename);
    document.body.appendChild(node);
    node.click();
    node.remove();
  };

  const handleFileChange = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = e => {
      try { const parsedData = JSON.parse(e.target.result); if (Array.isArray(parsedData)) { setSites(safelyLoadData(parsedData)); alert("Data loaded successfully!"); } } catch { alert("Error reading file."); }
    };
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setSiteForm(prev => ({ ...prev, logo: reader.result })); reader.readAsDataURL(file); }
  };

  // --- REFACTORED SPECS CONTENT TO AVOID NESTING ERRORS ---
  const specsPanelContent = useMemo(() => {
    if (!selectedAsset) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <div className="text-4xl opacity-20"><Icons.Scale /></div>
          <p>Select an asset to view details.</p>
        </div>
      );
    }
    if (!selectedSpecs) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <p>Specs Not Found for <strong className="text-slate-300">{selectedAsset.code}</strong></p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="pb-4 border-b border-slate-700">
          <h3 className="2xl font-bold text-slate-100">{selectedSpecs.description}</h3>
          <p className="text-sm font-mono text-slate-400 bg-slate-900 inline-block px-2 rounded mt-1">{selectedSpecs.weigher}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
          <div className="text-blue-400 text-sm font-bold uppercase mb-2">System Info</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Scale:</span><span className="font-medium text-slate-200">{selectedSpecs.scale}</span></div>
            <div className="flex justify-between"><span>Integrator:</span><span className="font-medium text-slate-200">{selectedSpecs.integrator}</span></div>
            <div className="flex justify-between"><span>Speed Sensor:</span><span className="font-medium text-slate-200">{selectedSpecs.speedSensor || '-'}</span></div>
            <div className="flex justify-between"><span>Load Cell:</span><span className="font-medium text-slate-200">{selectedSpecs.loadCell || '-'}</span></div>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
          <div className="text-orange-400 text-sm font-bold uppercase mb-2">Roller & Billet</div>
          <div
            className="font-mono text-xs bg-slate-800 p-2 rounded border border-slate-600 break-all mb-2 text-slate-300 cursor-copy hover:bg-slate-700 transition-colors relative group"
            onClick={async (e) => {
              e.stopPropagation();
              if (selectedSpecs.rollDims) {
                try {
                  await navigator.clipboard.writeText(selectedSpecs.rollDims);
                  alert("Roller dimensions copied to clipboard!");
                } catch (err) {
                  console.error("Failed to copy text: ", err);
                  alert("Failed to copy dimensions.");
                }
              }
            }}
            title="Click to copy"
          >
            {selectedSpecs.rollDims || "N/A"}
            {selectedSpecs.rollDims && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.CheckSquare /></span>}
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Adjustment Type:</span><span className="font-medium text-slate-200">{selectedSpecs.adjustmentType || '-'}</span></div>
            <div className="flex justify-between"><span>Billet Type:</span><span className="font-medium text-slate-200">{selectedSpecs.billetType || '-'}</span></div>
            <div className="flex justify-between"><span>Billet Weight:</span><span className="font-medium text-slate-200">{selectedSpecs.billetWeight ? `${selectedSpecs.billetWeight} kg` : '-'}</span></div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2"><Icons.MessageCircle /> Comments</h4>
          <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
            {(selectedSpecs.notes || []).map(n => (
              <div key={n.id} className="p-2 bg-slate-900/50 border border-slate-700 rounded text-xs group hover:bg-slate-800 hover:border-blue-500/50 transition-all relative">
                {editingNoteId === n.id ? (
                  <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-1"><span className="font-bold text-blue-400">Editing Comment...</span></div>
                    <input className="w-full border border-slate-600 rounded p-2 text-xs mb-1 bg-slate-800 text-white" value={editNoteContent.author} onChange={e => setEditNoteContent({ ...editNoteContent, author: e.target.value })} placeholder="Initials / Name" />
                    <textarea className="w-full border border-slate-600 rounded p-2 text-xs bg-slate-800 text-white" rows="3" value={editNoteContent.content} onChange={e => setEditNoteContent({ ...editNoteContent, content: e.target.value })} />
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={saveEditedNote} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500 flex items-center gap-1"><Icons.Save /> Save</button>
                      <button onClick={cancelEditNote} className="bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs hover:bg-slate-600 flex items-center gap-1"><Icons.Cancel /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{n.author || 'UNK'}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1"><Icons.Clock /> {formatDate(n.timestamp, true)}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-slate-800 rounded shadow-sm border border-slate-600 p-0.5">
                        <button onClick={(e) => { e.stopPropagation(); startEditingNote(n); }} className="hover:bg-slate-700 p-1 rounded text-blue-400" title="Edit Note"><Icons.Edit /></button>
                        <button onClick={(e) => handleDeleteSpecNote(e, n.id)} className="hover:bg-slate-700 p-1 rounded text-red-400" title="Delete Note"><Icons.Trash /></button>
                      </div>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed pl-1">{n.content}</p>
                  </>
                )}
              </div>
            ))}
            {(!selectedSpecs.notes || selectedSpecs.notes.length === 0) && <p className="text-slate-500 text-xs italic text-center py-2">No comments yet.</p>}
          </div>
          <div className="p-3 bg-slate-900/50 border border-slate-700 rounded border-dashed mt-3 hover:border-blue-500/50 transition-colors">
            <div className="flex gap-2 mb-2">
              <input className="w-24 text-xs border border-slate-600 rounded p-2 bg-slate-800 focus:bg-slate-900 text-white transition-colors" placeholder="Initials / Name" value={specNoteInput.author || ''} onChange={e => setSpecNoteInput({ ...specNoteInput, author: e.target.value })} />
              <div className="flex-1 text-[10px] text-slate-500 flex items-center justify-end italic">{formatDate(new Date(), false)}</div>
            </div>
            <textarea className="w-full text-xs border border-slate-600 rounded p-2 mb-2 bg-slate-800 focus:bg-slate-900 text-white transition-colors focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Add a comment..." rows="2" value={specNoteInput.content || ''} onChange={e => setSpecNoteInput({ ...specNoteInput, content: e.target.value })} />
            <button type="button" onClick={handleAddSpecNote} disabled={!specNoteInput.content} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 text-xs py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Icons.Plus /> Add Comment</button>
          </div>
        </div>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset, selectedSpecs, editingNoteId, editNoteContent, specNoteInput]);

  if (!selectedSite) {
    // --- SITE SELECTION VIEW (DARK MODE) ---
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 p-8 transition-colors duration-200">
        <style>{`@media print { .no-print { display: none !important; } }`}</style>

        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-4 no-print">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col items-center gap-6 mb-10 text-center">
            <div className="flex-shrink-0 flex flex-col items-center gap-4 max-w-xs"> {/* Added max-w-xs here */}
              <img src="logos/ai-logo.png" alt="Accurate Industries" className="w-full h-auto mb-2" /> {/* Changed w-auto to w-full, h-16 to h-auto */}
              <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Maintenance Tracker</h1>
            </div>

            <div className="flex-1 w-full min-w-[300px] max-w-2xl relative mt-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></span>
              <input
                type="text"
                placeholder="Search sites..."
                className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md text-base h-12 transition-colors"
                value={siteSearchQuery}
                onChange={(e) => setSiteSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <select
                value={siteSortOption}
                onChange={(e) => setSiteSortOption(e.target.value)}
                className="w-36 h-12 border border-slate-300 dark:border-slate-700 rounded-lg px-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 shadow-sm cursor-pointer transition-colors"
              >
                <option value="risk">Sort: Risk</option>
                <option value="name">Sort: Name</option>
                <option value="customer">Sort: Customer</option>
              </select>

              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg px-3 h-12 border border-slate-300 dark:border-slate-700 shadow-sm transition-colors">
                <input
                  type="checkbox"
                  id="show-archived-sites"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="mr-2 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <label htmlFor="show-archived-sites" className="text-sm text-slate-300 select-none cursor-pointer">Archived</label>
              </div>

              <Button className="w-36 h-12" onClick={() => { setSiteForm({ id: null, name: '', customer: '', location: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null }); setNoteInput({ content: '', author: '' }); setIsAddSiteModalOpen(true); }}> <Icons.Plus /> Add Site</Button>

              <Button className="w-36 h-12" onClick={handleDownloadData} variant="secondary"><Icons.Download /> Backup</Button>
              <label className="cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 w-36 h-12">
                <Icons.UploadCloud /> Restore <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
              </label>
            </div>
          </header>

          <p className="text-slate-500 dark:text-slate-400 text-lg mb-4 no-print italic border-b border-slate-300 dark:border-slate-700 pb-4 text-center">Select a site to view its maintenance dashboard.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSites.map(site => {
              const serviceAssets = (site.serviceData || []).filter(a => a.active !== false);
              const rollerAssets = (site.rollerData || []).filter(a => a.active !== false);

              const getStats = (data) => {
                if (!data) return { critical: 0, dueSoon: 0, healthy: 0 };
                return {
                  critical: data.filter(d => d.remaining < 0).length,
                  dueSoon: data.filter(d => d.remaining >= 0 && d.remaining < 30).length,
                  healthy: data.filter(d => d.remaining >= 30).length
                };
              };

              const serviceStats = getStats(serviceAssets);
              const rollerStats = getStats(rollerAssets);
              const activeIssuesCount = (site.issues || []).filter(issue => issue.status === 'Open').length;
              const cardOpacity = site.active === false ? 'opacity-60 grayscale' : '';

              return (
                <div key={site.id} onClick={() => setSelectedSiteId(site.id)} className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden group cursor-pointer ${cardOpacity}`}>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSiteForm({ ...site }); setIsEditSiteModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-slate-700 hover:text-blue-400 rounded-full shadow-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 transition-colors" title="Edit Site Details"><Icons.Edit /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setViewContactSite(site); }} className="p-2 bg-slate-100 dark:bg-slate-700 hover:text-green-400 rounded-full shadow-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 transition-colors" title="View Contact Info"><Icons.Contact /></button>
                  </div>

                  <div className="mb-5 flex items-center justify-start h-16">
                    {site.logo ? <img src={site.logo} alt="Logo" className="h-full w-auto object-contain max-w-[150px] drop-shadow" /> : <div className="h-12 w-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-2xl shadow-inner"><Icons.Building /></div>}
                  </div>
                  {site.customer && <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 tracking-widest">{site.customer}</div>}
                  <h2 className="2xl font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight">
                    {site.name} {site.active === false && <span className="text-sm font-normal text-slate-500">(Archived)</span>}
                  </h2>
                  <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mb-5"><span className="mr-1"><Icons.MapPin /></span> {site.location || 'No location'}</div>

                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">Service Assets</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-red-900/40 p-2 rounded text-center border border-red-900/60">
                        <div className="text-lg font-bold text-red-400">{serviceStats.critical}</div>
                        <div className="text-[9px] text-red-300 uppercase">Critical</div>
                      </div>
                      <div className="bg-yellow-900/40 p-2 rounded text-center border border-yellow-900/60">
                        <div className="text-lg font-bold text-yellow-400">{serviceStats.dueSoon}</div>
                        <div className="text-[9px] text-yellow-300 uppercase">Due Soon</div>
                      </div>
                      <div className="bg-green-900/40 p-2 rounded text-center border border-green-900/60">
                        <div className="text-lg font-bold text-green-400">{serviceStats.healthy}</div>
                        <div className="text-[9px] text-green-300 uppercase">Healthy</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">Roller Assets</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-red-900/40 p-2 rounded text-center border border-red-900/60">
                        <div className="text-lg font-bold text-red-400">{rollerStats.critical}</div>
                        <div className="text-[9px] text-red-300 uppercase">Critical</div>
                      </div>
                      <div className="bg-yellow-900/40 p-2 rounded text-center border border-yellow-900/60">
                        <div className="text-lg font-bold text-yellow-400">{rollerStats.dueSoon}</div>
                        <div className="text-[9px] text-yellow-300 uppercase">Due Soon</div>
                      </div>
                      <div className="bg-green-900/40 p-2 rounded text-center border border-green-900/60">
                        <div className="text-lg font-bold text-green-400">{rollerStats.healthy}</div>
                        <div className="text-[9px] text-green-300 uppercase">Healthy</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2"><Icons.AlertTriangle /> Active Issues</span>
                    <span className="text-2xl font-bold text-red-500 dark:text-red-400">{activeIssuesCount}</span>
                  </div>

                  <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[90px] mt-auto">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.FileText /> Latest Note</div>
                    {site.notes && site.notes.length > 0 ? <><p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{site.notes[site.notes.length - 1].content}</p><div className="mt-auto pt-2 text-[10px] text-slate-400 dark:text-slate-500 text-right">{formatDate(site.notes[site.notes.length - 1].timestamp, true)}</div></> : <p className="text-sm text-slate-400 dark:text-slate-500 italic">No notes.</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-16 mb-16 no-print">
            <Button onClick={handleGenerateSample} className="max-w-xs bg-red-600 hover:bg-red-500 text-white"> <Icons.Plus /> Add Demo Site</Button>
          </div>



          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl no-print">
            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-200 mb-2 flex items-center gap-2">
              <span className="text-xl">⚠️</span> Important: Data Persistence Guide
            </h3>
            <p className="text-blue-600 dark:text-blue-300 mb-4 text-sm">
              This application is currently running in a temporary environment. Your data is <strong>not automatically saved</strong> to a cloud server.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <strong className="text-blue-600 dark:text-blue-300 block mb-1">How to Save:</strong>
                Use the <strong>Backup</strong> button at the top right to download a <code>.json</code> file of your current data.
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <strong className="text-blue-600 dark:text-blue-300 block mb-1">How to Load:</strong>
                Use the <strong>Restore</strong> button to upload a previously saved <code>.json</code> file to continue your work.
              </div>
            </div>
          </div>
        </div>

        <AddSiteModal
          isOpen={isAddSiteModalOpen}
          onClose={() => setIsAddSiteModalOpen(false)}
          onSave={handleAddSite}
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          noteInput={noteInput}
          setNoteInput={setNoteInput}
          onLogoUpload={handleLogoUpload}
        />

        <EditSiteModal
          isOpen={isEditSiteModalOpen}
          onClose={() => setIsEditSiteModalOpen(false)}
          onSave={handleUpdateSiteInfo}
          onDelete={handleDeleteSite}
          onToggleStatus={toggleSiteStatus}
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          noteInput={noteInput}
          setNoteInput={setNoteInput}
          onLogoUpload={handleLogoUpload}
          onAddNote={() => {
            if (!noteInput.content) return;
            const newNote = { id: Date.now(), content: noteInput.content, author: noteInput.author || 'Unknown', timestamp: new Date().toISOString() };
            setSiteForm(prev => ({ ...prev, notes: [...prev.notes, newNote] }));
            setNoteInput({ content: '', author: '' });
          }}
        />

        <ContactModal site={viewContactSite} onClose={() => setViewContactSite(null)} />
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 p-6">
      <style>{`
        @media print {
            .no-print { display: none !important; }
            body, .min-h-screen { background-color: white !important; height: auto !important; padding: 0 !important; }
            .shadow, .shadow-sm { box-shadow: none !important; border: none !important; }
            .bg-white { background-color: white !important; }
            .print-hide-chart { display: none !important; }
            table { width: 100% !important; color: black !important; }
            th, td { color: black !important; border-color: #e2e8f0 !important; }
            ::-webkit-scrollbar { display: none; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

            body.print-schedule #print-section-specs { display: none !important; }
            body.print-schedule #print-section-schedule { width: 100% !important; grid-column: span 12 !important; }
            body.print-schedule .lg\\:col-span-7 { width: 100% !important; grid-column: span 12 !important; }
            body.print-schedule .print-hide-chart { display: block !important; }

            body.print-specs #print-section-schedule { display: none !important; }
            body.print-specs #print-section-specs { width: 100% !important; grid-column: span 12 !important; }
            body.print-specs .lg\\:col-span-5 { width: 100% !important; grid-column: span 12 !important; }
            body.print-specs .sticky { position: static !important; }

            body.print-master .min-h-screen > * { display: none !important; }

            body.print-master #master-list-modal {
                display: flex !important;
                position: static !important;
                background: white !important;
                height: auto !important;
                width: 100% !important;
                z-index: 9999 !important;
                inset: 0 !important;
            }
            body.print-master #master-list-modal > div {
                max-width: 100% !important;
                width: 100% !important;
                height: auto !important;
                box-shadow: none !important;
                border: none !important;
            }
            body.print-master #master-list-modal .overflow-auto { overflow: visible !important; }
            body.print-master #master-list-modal button { display: none !important; }
            body.print-master #master-list-modal .relative { display: none !important; }
            body.print-master #master-list-modal table { font-size: 10px !important; width: 100% !important; }
            body.print-master #master-list-modal th, body.print-master #master-list-modal td { padding: 4px !important; border: 1px solid #ccc !important; }
        }
      `}</style>

      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="no-print">
          <button type="button" onClick={() => setSelectedSiteId(null)} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center shadow-sm mb-2">
            <span className="mr-1 text-lg"><Icons.ArrowLeft /></span> Back to Sites
          </button>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <img src="logos/ai-logo.png" alt="Accurate Industries" className="h-12 w-auto mr-2" />
            {selectedSite.name} Dashboard
          </h1>
          <div className="flex items-center gap-4 mt-1">
            {selectedSite.customer && <span className="text-blue-400 font-bold text-sm uppercase flex items-center gap-1"><Icons.Briefcase /> {selectedSite.customer}</span>}
            <span className="text-slate-400 text-sm flex items-center gap-1"><Icons.MapPin /> {selectedSite.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm no-print">
            <button type="button" onClick={() => { setActiveTab('service'); setSelectedAssetId(null); setIsRollerOnlyMode(false); }} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'service' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>Service Schedule</button>
            <button type="button" onClick={() => { setActiveTab('roller'); setSelectedAssetId(null); setIsRollerOnlyMode(true); }} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'roller' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>Roller Replacement</button>
            <button type="button" onClick={() => {
              console.log('Clicked Issue Tracker tab');
              setActiveTab((prevTab) => {
                console.log(`Changing activeTab from ${prevTab} to 'issues'`);
                return 'issues';
              });
              setSelectedAssetId(null);
            }} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'issues' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>Issue Tracker</button>
          </div>
          <button type="button" onClick={() => setIsMasterListOpen(true)} className="ml-2 bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-700 border border-slate-700 flex items-center gap-2 no-print"><Icons.Grid /> Master List</button>
          <button type="button" onClick={() => setIsAppHistoryOpen(true)} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-700 border border-slate-700 flex items-center gap-2 no-print"><Icons.History /> History</button>
          {/* NEW HELP BUTTON */}
          <button type="button" onClick={() => setIsHelpModalOpen(true)} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-700 border border-slate-700 flex items-center gap-2 no-print"><Icons.MessageCircle /> Help</button>

          <div className="relative no-print" ref={printMenuRef}>
            <button type="button" onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)} className="bg-slate-800 p-2 rounded border border-slate-700 shadow-sm text-xl hover:bg-slate-700 active:bg-slate-600 transition-colors text-slate-300"><Icons.Printer /></button>
            {isPrintMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                <div className="text-xs font-bold text-slate-400 uppercase px-4 py-2 bg-slate-900 border-b border-slate-700">Print Options</div>
                <div className="flex flex-col">
                  <button onClick={() => handlePrint('full')} className="px-4 py-3 text-sm text-left hover:bg-slate-700 text-slate-300 border-b border-slate-700 flex items-center gap-2"><span>🖨️</span> Full Dashboard</button>
                  <button onClick={() => handlePrint('schedule')} className="px-4 py-3 text-sm text-left hover:bg-slate-700 text-slate-300 border-b border-slate-700 flex items-center gap-2"><span>📅</span> Schedule & Chart Only</button>
                  <button onClick={() => handlePrint('specs')} disabled={!selectedAsset} className={`px-4 py-3 text-sm text-left flex items-center gap-2 ${!selectedAsset ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700'}`}><span>📋</span> Asset Specs Only <span className="text-[10px] ml-auto text-slate-500">{!selectedAsset ? '(Select Asset)' : ''}</span></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
        <div className={`cursor-pointer transition-all duration-200 rounded-xl ${filterStatus === 'all' ? 'ring-1 ring-blue-500 shadow-lg !bg-blue-500' : 'hover:shadow-md hover:bg-slate-700/50 bg-slate-800'}`}>
          <Card onClick={() => setFilterStatus('all')} className="!bg-transparent !border-transparent !shadow-none p-5"><div className={`text-xs font-bold uppercase ${filterStatus === 'all' ? 'text-white' : 'text-slate-400'}`}>{activeTab === 'service' ? 'Total Assets - Service' : 'Total Assets - Rollers'}</div><div className="text-2xl font-bold text-white">{stats.total}</div></Card>
        </div>
        <div className={`cursor-pointer transition-all duration-200 rounded-xl border-l-4 ${filterStatus === 'overdue' ? 'ring-1 ring-red-500 shadow-lg !bg-red-500 border-red-500' : 'hover:shadow-md hover:bg-slate-700/50 bg-slate-800 border-l-red-500'}`}>
          <Card onClick={() => setFilterStatus('overdue')} className="!bg-transparent !border-transparent !shadow-none p-5"><div className={`text-xs font-bold uppercase ${filterStatus === 'overdue' ? 'text-white' : 'text-slate-400'}`}>Critical / Overdue</div><div className="text-2xl font-bold text-white">{stats.overdue}</div></Card>
        </div>
        <div className={`cursor-pointer transition-all duration-200 rounded-xl border-l-4 ${filterStatus === 'dueSoon' ? 'ring-1 ring-yellow-500 shadow-lg bg-yellow-500 border-yellow-500' : 'hover:shadow-md hover:bg-slate-700/50 bg-slate-800 border-l-yellow-500'}`}>
          <Card onClick={() => setFilterStatus('dueSoon')} className="!bg-transparent !border-transparent !shadow-none p-5"><div className={`text-xs font-bold uppercase ${filterStatus === 'dueSoon' ? 'text-white' : 'text-slate-400'}`}>Due This Month</div><div className="text-2xl font-bold text-white">{stats.dueSoon}</div></Card>
        </div>
        <div className={`cursor-pointer transition-all duration-200 rounded-xl border-l-4 ${filterStatus === 'healthy' ? 'ring-1 ring-green-500 shadow-lg bg-green-500 border-green-500' : 'hover:shadow-md hover:bg-slate-700/50 bg-slate-800 border-l-green-500'}`}>
          <Card onClick={() => setFilterStatus('healthy')} className="!bg-transparent !border-transparent !shadow-none p-5"><div className={`text-xs font-bold uppercase ${filterStatus === 'healthy' ? 'text-white' : 'text-slate-400'}`}>Healthy</div><div className="2xl font-bold text-white">{stats.total - stats.overdue - stats.dueSoon}</div></Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {activeTab === 'issues' ? (
          <div className="lg:col-span-12 flex flex-col gap-6"> {/* Full width for issues tab */}
            <IssueTracker
              siteId={selectedSiteId}
              issues={selectedSite?.issues || []}
              onAddIssue={handleAddIssue}
              onUpdateIssue={handleUpdateIssue} // Pass the new update handler
              onToggleIssueStatus={handleToggleIssueStatus}
              onCopyIssue={handleCopyIssue}
              assets={[...(selectedSite?.serviceData || []), ...(selectedSite?.rollerData || [])].filter(asset => asset.active !== false)}
            />
          </div>
        ) : (
          <> {/* Fragment for multiple elements */}
            <div className="lg:col-span-7 flex flex-col gap-6" id="print-section-schedule">
              <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Calendar /> {activeTab === 'service' ? 'Service Schedule' : 'Roller Schedule'}</h2>
                    <span className="text-xs text-slate-500 font-normal ml-2 hidden sm:inline">({filteredData.length} items)</span>
                  </div>
                  <div className="flex gap-2 items-center no-print">
                    <div className="flex items-center mr-2">
                      <input
                        type="checkbox"
                        id="show-archived"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                        className="mr-1 accent-blue-600"
                      />
                      <label htmlFor="show-archived" className="text-xs text-slate-400 select-none cursor-pointer">Show Archived</label>
                    </div>
                    <input type="text" placeholder="Search..." className="pl-2 pr-2 py-1 border border-slate-600 rounded text-sm w-40 bg-slate-900 text-white focus:border-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button type="button" onClick={() => setIsAssetModalOpen(true)} className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500">➕</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/50 text-slate-400">
                      <tr>
                        <th className="px-4 py-2 w-8 text-center no-print">
                          <input
                            type="checkbox"
                            checked={filteredData.length > 0 && selectedRowIds.size === filteredData.length}
                            onChange={toggleSelectAll}
                            className="rounded border-slate-500 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            title="Select All"
                          />
                        </th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[150px]" onClick={() => handleSort('name')}>Name {getSortIcon('name')}</th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[120px]" onClick={() => handleSort('code')}>Code {getSortIcon('code')}</th>
                        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 min-w-[80px]" onClick={() => handleSort('frequency')}>Freq {getSortIcon('frequency')}</th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[120px] whitespace-nowrap" onClick={() => handleSort('lastCal')}>Last Cal {getSortIcon('lastCal')}</th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[120px] whitespace-nowrap" onClick={() => handleSort('dueDate')}>Cal Due {getSortIcon('dueDate')}</th>
                        <th className="px-4 py-2 text-right cursor-pointer hover:bg-slate-700 min-w-[80px]" onClick={() => handleSort('remaining')}>Days {getSortIcon('remaining')}</th>
                        <th className="px-4 py-2 text-center min-w-[100px]">Status</th>
                        <th className="px-3 py-2 text-center no-print text-xs">Analytics</th>
                        <th className="px-3 py-2 text-center no-print text-xs">Archive</th>
                        <th className="px-3 py-2 text-center no-print text-xs">Edit</th>
                        <th className="px-3 py-2 text-center no-print text-xs">History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredData.map(item => (
                        <tr key={item.id} data-asset-id={item.id} onClick={() => setSelectedAssetId(item.id)} className={`cursor-pointer transition-all duration-200 ease-in-out ${selectedAssetId === item.id ? 'bg-blue-900/40 ring-1 ring-blue-500 shadow-sm z-10 relative' : selectedRowIds.has(item.id) ? 'bg-blue-900/20' : (item.active === false ? 'bg-slate-900 opacity-50' : 'hover:bg-slate-700 border-b border-slate-700 border-l-4 border-l-transparent hover:border-l-slate-500')}`}>
                          <td className="px-4 py-2 text-center no-print" onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }}>
                            <input type="checkbox" checked={selectedRowIds.has(item.id)} onChange={() => { }} className="rounded border-slate-500 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" />
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-200">{item.name} {item.active === false && <span className="text-[10px] text-slate-500">(Archived)</span>}</td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-400">{item.code}</td>
                          <td className="px-4 py-2 text-center"><EditableCell value={item.frequency} type="number" onSave={(val) => handleInlineUpdate(item.id, 'frequency', val)} className="text-center bg-slate-800 text-white border-slate-600" /></td>
                          <td className="px-4 py-2"><EditableCell value={item.lastCal} type="date" onSave={(val) => handleInlineUpdate(item.id, 'lastCal', val)} className="bg-slate-800 text-white border-slate-600" /></td>
                          <td className="px-4 py-2 text-slate-400 font-medium">{formatDate(item.dueDate)}</td>
                          <td className={`px-4 py-2 text-right font-bold ${item.remaining < 0 ? 'text-red-400' : 'text-slate-300'}`}>{item.remaining}</td>
                          <td className="px-4 py-2 text-center"><StatusBadge remaining={item.remaining} isActive={item.active} /></td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}><button type="button" onClick={(e) => { e.stopPropagation(); setViewAnalyticsAsset(item); }} className="text-slate-500 hover:text-purple-400 p-2 rounded" title="View Analytics & Reports"><Icons.Activity /></button></td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}><button type="button" onClick={(e) => { e.stopPropagation(); toggleAssetStatus(item, e); }} className="text-slate-500 hover:text-orange-400 p-2 rounded" title={item.active !== false ? "Archive Asset" : "Restore Asset"}><Icons.Archive /></button></td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAsset({ ...item });
                                const specs = currentSpecData.find(s => s.weigher === item.weigher || s.altCode === item.code || s.weigher === item.code);
                                setEditingSpecs(specs || null);
                                setIsAssetEditModalOpen(true);
                              }}
                              className="text-slate-500 hover:text-blue-400 p-2 rounded"
                              title="Edit Asset Details & Specs"
                            >
                              <Icons.Edit />
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}><button type="button" onClick={(e) => { e.stopPropagation(); setViewHistoryAsset(item); }} className="text-slate-500 hover:text-blue-400 p-2 rounded" title="View History"><Icons.History /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedRowIds.size > 0 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-6 py-3 rounded-full shadow-lg border border-slate-600 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 z-20 no-print">
                    <span className="font-bold text-sm">{selectedRowIds.size} Selected</span>
                    <div className="h-4 w-px bg-slate-500"></div>
                    <button onClick={performBulkService} className="text-sm font-medium hover:text-blue-300 flex items-center gap-2">Mark Serviced Today</button>
                    <div className="h-4 w-px bg-slate-500"></div>
                    <button onClick={exportBulkCSV} className="text-sm font-medium hover:text-blue-300 flex items-center gap-2"><Icons.FileCsv /> Export List</button>
                    <div className="h-4 w-px bg-slate-500"></div>
                    <button onClick={() => setSelectedRowIds(new Set())} className="text-xs text-slate-400 hover:text-white">Clear</button>
                  </div>
                )}
              </div>
              <CalendarWidget assets={filteredData} selectedAssetId={selectedAssetId} onAssetSelect={setSelectedAssetId} />
            </div>
            <div className="lg:col-span-5" id="print-section-specs">
              <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 h-full flex flex-col sticky top-6">
                <div className="p-4 border-b border-slate-700 bg-slate-900/30 rounded-t-xl flex justify-between items-center">
                  <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Database /> Equipment Specs</h2>
                  {selectedAsset && (
                    <div className="no-print">
                      <Button
                        variant={activeTab === 'service' ? 'secondary' : 'orange'}
                        onClick={() => {
                          setEditingAsset({ ...selectedAsset });
                          const specs = currentSpecData.find(s => s.weigher === selectedAsset.weigher || s.altCode === selectedAsset.code || s.weigher === selectedAsset.code);
                          setEditingSpecs(specs || null);
                          setIsAssetEditModalOpen(true);
                        }}
                      >
                        ✏️ Edit
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-6 text-slate-300">
                  {specsPanelContent}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AddAssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSave={handleAddAsset}
        newAsset={newAsset}
        setNewAsset={setNewAsset}
        isRollerOnlyMode={isRollerOnlyMode}
      />

      <EditAssetModal
        isOpen={isAssetEditModalOpen}
        onClose={() => { setIsAssetEditModalOpen(false); setEditingAsset(null); setEditingSpecs(null); }}
        onSave={handleSaveEditedAsset}
        onSaveSpecs={handleSaveEditedSpecs}
        onDelete={handleDeleteAsset}
        editingAsset={editingAsset}
        setEditingAsset={setEditingAsset}
        specs={editingSpecs}
        setSpecs={setEditingSpecs}
        activeTab={activeTab}
      />

      <MasterListModal
        isOpen={isMasterListOpen}
        onClose={() => setIsMasterListOpen(false)}
        onPrint={handlePrint}
        serviceData={currentServiceData}
        rollerData={currentRollerData}
        specData={currentSpecData}
        showArchived={showArchived}
        customerName={selectedSite?.customer || ''}
        siteName={selectedSite?.name || ''}
        location={selectedSite?.location || ''}
      />

      <AssetAnalyticsModal
        isOpen={viewAnalyticsAsset !== null}
        onClose={() => setViewAnalyticsAsset(null)}
        asset={viewAnalyticsAsset}
        siteLocation={selectedSite?.location}
        onSaveReport={handleSaveReport}
        onDeleteReport={handleDeleteReport}
      />

      <AppHistoryModal
        isOpen={isAppHistoryOpen}
        onClose={() => setIsAppHistoryOpen(false)}
        sites={sites}
        asset={viewHistoryAsset}
      />

      {/* NEW HELP MODAL */}
      {isHelpModalOpen && (
        <Modal title="Help" onClose={() => setIsHelpModalOpen(false)}>
          <p className="text-slate-300">Contact BL if you find issues with the app so he can fix them.</p>
        </Modal>
      )}

    </div>
  );
}
