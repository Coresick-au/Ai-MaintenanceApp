import React, { useEffect, useRef, useMemo, useState } from 'react';
// IMPORT DATA & HELPER
import { recalculateRow } from './data/mockData';
// IMPORT CONTEXTS
import { useSiteContext } from './context/SiteContext';
import { useUIContext } from './context/UIContext';
import { useFilterContext } from './context/FilterContext';
import { useUndo } from './context/UndoContext';

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
  LongPressButton,
  formatDate
} from './components/UIComponents';
import { MasterListModal } from './components/MasterListModal';
import { AddAssetModal, EditAssetModal } from './components/AssetModals';
import { AddSiteModal, EditSiteModal, ContactModal } from './components/SiteModals';
import { AssetAnalyticsModal } from './components/AssetAnalytics';
import { AppHistoryModal } from './components/AppHistoryModal';
import { IssueTracker } from './components/IssueTracker';
import AssetTimeline from './components/AssetTimeline';
import { SiteDropdown } from './components/SiteDropdown';
import { CustomerReportModal } from './components/CustomerReportModal';

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  // Force HMR update
  const {
    sites, selectedSiteId, setSelectedSiteId, selectedSite,
    currentServiceData, currentRollerData, currentSpecData,
    updateSiteData,
    handleAddSite, handleGenerateSample, handleDeleteSite, handleUpdateSiteInfo, toggleSiteStatus,
    handleAddIssue, handleToggleIssueStatus, handleUpdateIssue, handleCopyIssue,
    handleAddAsset, handleDeleteAsset, handleSaveEditedAsset, handleSaveEditedSpecs, handleInlineUpdate,
    handleAddSpecNote, handleDeleteSpecNote, saveEditedNote,
    handleSaveReport, handleDeleteReport, handleFileChange
  } = useSiteContext();

  const {
    isAddSiteModalOpen, setIsAddSiteModalOpen,
    isEditSiteModalOpen, setIsEditSiteModalOpen,
    isAssetModalOpen, setIsAssetModalOpen,
    isAssetEditModalOpen, setIsAssetEditModalOpen,
    isMasterListOpen, setIsMasterListOpen,
    isAppHistoryOpen, setIsAppHistoryOpen,
    isHelpModalOpen, setIsHelpModalOpen,
    selectedAssetId, setSelectedAssetId,
    editingAsset, setEditingAsset,
    editingSpecs, setEditingSpecs,
    viewHistoryAsset, setViewHistoryAsset,
    viewContactSite, setViewContactSite,
    viewAnalyticsAsset, setViewAnalyticsAsset,
    editingNoteId, setEditingNoteId,
    editNoteContent, setEditNoteContent,
    siteForm, setSiteForm,
    noteInput, setNoteInput,
    newAsset, setNewAsset,
    specNoteInput, setSpecNoteInput,
    theme, setTheme,
    isPrintMenuOpen, setIsPrintMenuOpen,
    viewMode, setViewMode // Add viewMode to context or local state? Wait, context doesn't have it. I should add it to local state here.
  } = useUIContext();

  // Local state for view mode if not in context (assuming it's not in context based on previous read)
  const [localViewMode, setLocalViewMode] = useState('list');
  // Actually, let's just use local state for now.


  const {
    activeTab, setActiveTab,
    siteSearchQuery, setSiteSearchQuery,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    isRollerOnlyMode, setIsRollerOnlyMode,
    sortConfig, setSortConfig,
    selectedRowIds, setSelectedRowIds,
    showArchived, setShowArchived,
    siteSortOption, setSiteSortOption,
    filteredSites,
    filteredData,
    stats,
    handleSort,
    toggleRow,
    toggleSelectAll
  } = useFilterContext();

  const { canUndo, performUndo, lastActionDescription } = useUndo();

  const printMenuRef = useRef(null);

  // --- RESET APP HISTORY STATE ---
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // --- CUSTOMER REPORT MODAL STATE ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // --- MAXIMIZE FEATURE STATE ---
  const [expandedSection, setExpandedSection] = useState(null);

  const handleResetConfirm = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Keyboard shortcut for Undo (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // Prevent default only if we're not in an input/textarea
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          return;
        }
        e.preventDefault();
        performUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo]);

  // --- DERIVED STATE ---
  const selectedAsset = React.useMemo(() => (filteredData || []).find(i => i.id === selectedAssetId), [filteredData, selectedAssetId]);
  const selectedSpecs = React.useMemo(() => {
    if (!selectedAsset) return null;
    return (currentSpecData || []).find(s => s.weigher === selectedAsset.weigher || s.altCode === selectedAsset.code || s.weigher === selectedAsset.code);
  }, [selectedAsset, currentSpecData]);

  // --- EFFECTS ---
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
  }, [setIsPrintMenuOpen]);

  // Only close MasterListModal when navigating AWAY from a site
  useEffect(() => {
    if (selectedSiteId === null) {
      setIsMasterListOpen(false);
    }
  }, [selectedSiteId, setIsMasterListOpen]);

  // Clear selection on tab/site change
  useEffect(() => { setSelectedRowIds(new Set()); }, [activeTab, selectedSiteId, setSelectedRowIds]);

  const handleDownloadData = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `${year}-${month}-${day}_MaintTrack_${hours}-${minutes}-${seconds}.json`;

    const dataStr = JSON.stringify(sites, null, 2); // Pretty print for better readability
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

    if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: updatedList }, 'Bulk Service Update'); }
    else { updateSiteData(selectedSiteId, { rollerData: updatedList }, 'Bulk Service Update'); }
    setSelectedRowIds(new Set());
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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setSiteForm(prev => ({ ...prev, logo: reader.result })); reader.readAsDataURL(file); }
  };

  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteContent({ content: note.content, author: note.author });
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteContent({ content: '', author: '' });
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
              <h1 className="text-4xl font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-tight" style={{ fontWeight: 800, letterSpacing: '0.15em' }}>Maintenance Tracker</h1>
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

      {/* REDESIGNED HEADER - 2 ROWS */}
      <header className="mb-6 bg-slate-900/50 rounded-xl border border-slate-700/50 no-print relative z-50">
        {/* ROW 1: Navigation & Utilities */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50">
          {/* Left: Back, Logo, Site Dropdown, Location */}
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setSelectedSiteId(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to Sites"
            >
              <Icons.ArrowLeft size={20} />
            </button>

            {/* Company Logo */}
            <div className="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
              <img src="logos/ai-logo.png" alt="Accurate Industries" className="w-full h-full object-cover" />
            </div>

            {/* Site Dropdown & Location */}
            <div className="flex flex-col">
              {/* Site Dropdown - Custom Dark Component */}
              <SiteDropdown
                sites={sites}
                selectedSiteId={selectedSiteId}
                onSiteChange={setSelectedSiteId}
              />

              {/* Location - subtle, secondary */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Icons.MapPin size={12} />
                <span>{selectedSite.location}</span>
              </div>
            </div>
          </div>

          {/* Right: Utility Buttons */}
          <div className="flex items-center gap-2">
            {/* History Button */}
            <button
              type="button"
              onClick={() => setIsAppHistoryOpen(true)}
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <Icons.History size={16} />
              <span>History</span>
            </button>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <Icons.MessageCircle size={16} />
              <span>Help</span>
            </button>

            {/* Undo Button */}
            <button
              type="button"
              onClick={performUndo}
              disabled={!canUndo}
              title={canUndo ? `Undo: ${lastActionDescription}` : 'Nothing to undo'}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
                }`}
            >
              <Icons.Undo size={16} />
              <span>Undo</span>
            </button>

            {/* Export/Print Dropdown */}
            <div className="relative" ref={printMenuRef}>
              <button
                type="button"
                onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <Icons.Printer size={16} />
                <span>Export</span>
              </button>
              {isPrintMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                  <div className="text-xs font-bold text-slate-400 uppercase px-4 py-2 bg-slate-900 border-b border-slate-700">Print Options</div>
                  <div className="flex flex-col">
                    <button onClick={() => handlePrint('full')} className="px-4 py-3 text-sm text-left hover:bg-slate-700 text-slate-300 border-b border-slate-700 flex items-center gap-2"><span>🖨️</span> Full Dashboard</button>
                    <button onClick={() => handlePrint('schedule')} className="px-4 py-3 text-sm text-left hover:bg-slate-700 text-slate-300 border-b border-slate-700 flex items-center gap-2"><span>📅</span> Schedule & Chart Only</button>
                    <button onClick={() => handlePrint('specs')} disabled={!selectedAsset} className={`px-4 py-3 text-sm text-left flex items-center gap-2 ${!selectedAsset ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700'}`}><span>📋</span> Asset Specs Only <span className="text-[10px] ml-auto text-slate-500">{!selectedAsset ? '(Select Asset)' : ''}</span></button>
                    <button onClick={() => { setIsPrintMenuOpen(false); setIsReportModalOpen(true); }} className="px-4 py-3 text-sm text-left hover:bg-slate-700 text-slate-300 border-b border-slate-700 flex items-center gap-2"><span>📄</span> Customer Report (PDF)</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* ROW 2: Dashboard Title & Feature Tabs */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Dashboard Title */}
          <h1 className="text-2xl font-bold text-slate-100">
            {selectedSite.customer ? `${selectedSite.customer} Dashboard` : 'Distribution Hub Dashboard'}
          </h1>

          {/* Right: Feature Navigation Tabs (Pill-shaped) */}
          <div className="flex items-center gap-2">
            {/* Service Schedule */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('service');
                setSelectedAssetId(null);
                setIsRollerOnlyMode(false);
                setLocalViewMode('list');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'service' && localViewMode === 'list'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Icons.Calendar size={16} />
              <span>Service Schedule</span>
            </button>

            {/* Roller Replacement */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('roller');
                setSelectedAssetId(null);
                setIsRollerOnlyMode(true);
                setLocalViewMode('list');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'roller' && localViewMode === 'list'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Icons.Settings size={16} />
              <span>Roller Replacement</span>
            </button>

            {/* Issue Tracker */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('issues');
                setSelectedAssetId(null);
                setLocalViewMode('list');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'issues'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Icons.AlertTriangle size={16} />
              <span>Issue Tracker</span>
            </button>

            {/* Timeline */}
            <button
              type="button"
              onClick={() => {
                setLocalViewMode('timeline');
                if (activeTab === 'issues') setActiveTab('service');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${localViewMode === 'timeline'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Icons.Clock size={16} />
              <span>Timeline</span>
            </button>

            {/* Master List */}
            <button
              type="button"
              onClick={() => setIsMasterListOpen(true)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Icons.Grid size={16} />
              <span>Master List</span>
            </button>
          </div>
        </div>
      </header >


      {activeTab !== 'issues' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: KPI Cards + Service Schedule Table */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* KPI Cards - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 no-print">
              {/* Total Assets */}
              <div
                onClick={() => setFilterStatus('all')}
                className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md ${filterStatus === 'all'
                  ? 'bg-cyan-500/20 border-2 border-cyan-400 ring-2 ring-cyan-400/50'
                  : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:border-cyan-500/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icons.Database className="text-cyan-400" size={20} />
                  <span className={`text-2xl font-bold ${filterStatus === 'all' ? 'text-white' : 'text-slate-200'}`}>{stats.total}</span>
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wide ${filterStatus === 'all' ? 'text-cyan-100' : 'text-slate-400'}`}>
                  Total Assets
                </div>
              </div>

              {/* Critical / Overdue */}
              <div
                onClick={() => setFilterStatus('overdue')}
                className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md ${filterStatus === 'overdue'
                  ? 'bg-red-600/30 border-2 border-red-500 ring-2 ring-red-500/50'
                  : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:border-red-500/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icons.AlertTriangle className="text-red-400" size={20} />
                  <span className={`text-2xl font-bold ${filterStatus === 'overdue' ? 'text-white' : 'text-slate-200'}`}>{stats.overdue}</span>
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wide ${filterStatus === 'overdue' ? 'text-red-100' : 'text-slate-400'}`}>
                  Critical
                </div>
              </div>

              {/* Due Soon */}
              <div
                onClick={() => setFilterStatus('dueSoon')}
                className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md ${filterStatus === 'dueSoon'
                  ? 'bg-amber-500/30 border-2 border-amber-500 ring-2 ring-amber-500/50'
                  : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:border-amber-500/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icons.Clock className="text-amber-400" size={20} />
                  <span className={`text-2xl font-bold ${filterStatus === 'dueSoon' ? 'text-white' : 'text-slate-200'}`}>{stats.dueSoon}</span>
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wide ${filterStatus === 'dueSoon' ? 'text-amber-100' : 'text-slate-400'}`}>
                  Due Soon
                </div>
              </div>

              {/* Healthy */}
              <div
                onClick={() => setFilterStatus('healthy')}
                className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md ${filterStatus === 'healthy'
                  ? 'bg-emerald-500/30 border-2 border-emerald-500 ring-2 ring-emerald-500/50'
                  : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:border-emerald-500/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icons.CheckCircle className="text-emerald-400" size={20} />
                  <span className={`text-2xl font-bold ${filterStatus === 'healthy' ? 'text-white' : 'text-slate-200'}`}>{stats.total - stats.overdue - stats.dueSoon}</span>
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wide ${filterStatus === 'healthy' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  Healthy
                </div>
              </div>
            </div>

            {/* Service Schedule Table */}
            <div className={`bg-slate-800/80 rounded-xl shadow-md border border-slate-700 overflow-hidden flex-1 ${expandedSection === 'schedule' ? 'fixed inset-4 z-50' : ''}`} id="print-section-schedule">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Calendar /> {activeTab === 'service' ? 'Service Schedule' : 'Roller Schedule'}</h2>
                  <span className="text-xs text-slate-500 font-normal ml-2 hidden sm:inline">({filteredData.length} items)</span>
                </div>
                <div className="flex gap-2 items-center no-print">
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'schedule' ? null : 'schedule')}
                    className="text-slate-400 hover:text-cyan-400 p-1 rounded transition-colors"
                    title={expandedSection === 'schedule' ? 'Minimize' : 'Maximize'}
                  >
                    {expandedSection === 'schedule' ? <Icons.Minimize size={18} /> : <Icons.Maximize size={18} />}
                  </button>
                  <div className="flex items-center mr-2">
                    <input
                      type="checkbox"
                      id="show-archived"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="mr-1 accent-cyan-500"
                    />
                    <label htmlFor="show-archived" className="text-xs text-slate-400 select-none cursor-pointer">Show Archived</label>
                  </div>
                  <input type="text" placeholder="Search..." className="pl-2 pr-2 py-1 border border-slate-600 rounded text-sm w-40 bg-slate-900 text-white focus:border-cyan-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <button type="button" onClick={() => setIsAssetModalOpen(true)} className="bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 border border-cyan-500/50"><Icons.Plus size={16} /> Add Asset</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 sticky top-[57px] z-20">
                    <tr>
                      <th className="px-4 py-2 w-8 text-center no-print">
                        <input
                          type="checkbox"
                          checked={filteredData.length > 0 && selectedRowIds.size === filteredData.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-500 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredData.map(item => (
                      <tr key={item.id} data-asset-id={item.id} onClick={() => setSelectedAssetId(item.id)} className={`cursor-pointer transition-all duration-200 ease-in-out ${selectedAssetId === item.id ? 'bg-cyan-900/40 ring-1 ring-cyan-500 shadow-sm z-10 relative' : selectedRowIds.has(item.id) ? 'bg-cyan-900/20' : (item.active === false ? 'bg-slate-900 opacity-50' : 'hover:bg-slate-700 border-b border-slate-700 border-l-4 border-l-transparent hover:border-l-cyan-500')}`}>
                        <td className="px-4 py-2 text-center no-print" onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }}>
                          <input type="checkbox" checked={selectedRowIds.has(item.id)} onChange={() => { }} className="rounded border-slate-500 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600" />
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
                            className="text-slate-500 hover:text-cyan-400 p-2 rounded"
                            title="Edit Asset Details & Specs"
                          >
                            <Icons.Edit />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedRowIds.size > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-6 py-3 rounded-full shadow-lg border border-slate-600 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 z-20 no-print">
                  <span className="font-bold text-sm">{selectedRowIds.size} Selected</span>
                  <div className="h-4 w-px bg-slate-500"></div>
                  <button onClick={performBulkService} className="text-sm font-medium hover:text-cyan-300 flex items-center gap-2">Mark Serviced Today</button>
                  <div className="h-4 w-px bg-slate-500"></div>
                  <button onClick={exportBulkCSV} className="text-sm font-medium hover:text-cyan-300 flex items-center gap-2"><Icons.FileCsv /> Export List</button>
                  <div className="h-4 w-px bg-slate-500"></div>
                  <button onClick={() => setSelectedRowIds(new Set())} className="text-xs text-slate-400 hover:text-white">Clear</button>
                </div>
              )}
            </div>
          </div>

          {/* CENTER COLUMN: Chart + Calendar */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Remaining Days Chart */}
            <div className="bg-slate-800/80 rounded-xl shadow-md border border-slate-700 p-4 no-print">
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <Icons.Activity className="text-cyan-400" />
                Remaining Days
              </h3>
              <SimpleBarChart data={filteredData} onBarClick={(data) => {
                // Filter table based on clicked bar
                if (data.remaining < 0) setFilterStatus('overdue');
                else if (data.remaining < 30) setFilterStatus('dueSoon');
                else setFilterStatus('healthy');
              }} />
            </div>

            {/* Maintenance Calendar */}
            <div className={`${expandedSection === 'calendar' ? 'fixed inset-4 z-50 bg-slate-900 p-4 rounded-xl overflow-auto' : ''}`}>
              <div className={`${expandedSection === 'calendar' ? 'flex justify-between items-center mb-4' : 'hidden'}`}>
                <h3 className="font-bold text-lg text-slate-200">Maintenance Calendar</h3>
                <button
                  type="button"
                  onClick={() => setExpandedSection(null)}
                  className="text-slate-400 hover:text-cyan-400 p-2 rounded transition-colors"
                  title="Minimize"
                >
                  <Icons.Minimize size={20} />
                </button>
              </div>
              <CalendarWidget
                assets={filteredData}
                selectedAssetId={selectedAssetId}
                onAssetSelect={setSelectedAssetId}
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Equipment Details (Sticky) */}
          <div className="lg:col-span-3" id="print-section-specs">
            <div className="bg-slate-800/80 rounded-xl shadow-md border border-slate-700 h-full flex flex-col sticky top-6">
              <div className="p-4 border-b border-slate-700 bg-slate-900/30 rounded-t-xl flex justify-between items-center">
                <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Database /> Equipment Details</h2>
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
              <div className="flex-1 p-6 text-slate-300 overflow-y-auto">
                {specsPanelContent}
              </div>
            </div>
          </div>
        </div>
      )
      }

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
        ) : localViewMode === 'timeline' ? (
          <div className="lg:col-span-12 h-[calc(100vh-300px)] min-h-[600px] mt-6">
            <AssetTimeline assets={filteredData} mode={activeTab} />
          </div>
        ) : null}
      </div >

      <AddAssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSave={(asset, tab) => {
          handleAddAsset(asset, tab);
          setIsAssetModalOpen(false);
          setNewAsset({ name: '', code: '', weigher: '', frequency: '', lastCal: '' });
        }}
        newAsset={newAsset}
        setNewAsset={setNewAsset}
        isRollerOnlyMode={isRollerOnlyMode}
      />

      <EditAssetModal
        isOpen={isAssetEditModalOpen}
        onClose={() => { setIsAssetEditModalOpen(false); setEditingAsset(null); setEditingSpecs(null); }}
        onSave={(asset, tab) => {
          handleSaveEditedAsset(asset, tab);
          setIsAssetEditModalOpen(false);
          setEditingAsset(null);
          setEditingSpecs(null);
        }}
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
      {
        isHelpModalOpen && (
          <Modal title="Help & Settings" onClose={() => setIsHelpModalOpen(false)}>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-200 mb-2">Support</h4>
                <p className="text-slate-300 text-sm">Contact BL if you find issues with the app so he can fix them.</p>
              </div>

              <div className="pt-6 border-t border-slate-700">
                <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2"><Icons.AlertTriangle size={16} /> Danger Zone</h4>
                <p className="text-slate-400 text-xs mb-4">
                  Resetting the app history will clear all local data, including sites, assets, and history. This action cannot be undone.
                </p>
                <LongPressButton
                  onLongPress={() => setIsResetConfirmOpen(true)}
                  duration={3000}
                  className="w-full bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Icons.Trash size={16} /> Hold to Reset App History
                </LongPressButton>
              </div>
            </div>
          </Modal>
        )
      }

      {/* RESET CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <Modal title="⚠️ Confirm Factory Reset" onClose={() => setIsResetConfirmOpen(false)}>
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex gap-3">
              <Icons.AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-red-400">Are you absolutely sure?</h4>
                <p className="text-red-200/80 text-sm mt-1">
                  This action will permanently delete all data stored on this device. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setIsResetConfirmOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleResetConfirm}>Yes, Delete Everything</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CUSTOMER REPORT MODAL */}
      <CustomerReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        site={selectedSite}
        serviceData={currentServiceData}
        rollerData={currentRollerData}
        specData={currentSpecData}
      />

    </div >
  );
}
