import React, { useEffect, useRef, useMemo, useState } from 'react';
// IMPORT DATA & HELPER
import { recalculateRow } from './data/mockData';
// IMPORT CONTEXTS
import { useSiteContext } from './hooks/useSiteContext';
import { useUIContext } from './hooks/useUIContext';
import { useFilterContext } from './hooks/useFilterContext';
import { useUndo } from './hooks/useUndo';

// IMPORT UI COMPONENTS
import {
  Card,
  Button,
  StatusBadge,
  SimpleBarChart,
  CalendarWidget,
  Modal,
  EditableCell,
  SecureDeleteButton,
  UniversalDatePicker,
  ErrorBoundary,
  FullScreenContainer
} from './components/UIComponents';
import { Icons } from './constants/icons.jsx';
import { formatDate } from './utils/helpers';
import { SiteHealthCircle } from './components/SiteHealthCircle';
import { MasterListModal } from './components/MasterListModal';
import { AddAssetModal, EditAssetModal, OperationalStatusModal } from './components/AssetModals';
import { AddSiteModal, EditSiteModal, ContactModal, SiteNotesModal } from './components/SiteModals';
import { AssetAnalyticsModal } from './components/AssetAnalytics';
import { AppHistorySidePanel } from './components/AppHistorySidePanel';
import { SiteIssueTracker } from './components/SiteIssueTracker';
import AssetTimeline from './components/AssetTimeline';
import { SiteDropdown } from './components/SiteDropdown';
import { CustomerReportModal } from './components/CustomerReportModal';
import { FullDashboardPDFPreview } from './components/FullDashboardPDFPreview';
import { ScheduleChartPDFPreview } from './components/ScheduleChartPDFPreview';
import { AssetSpecsPDFPreview } from './components/AssetSpecsPDFPreview';
import { MasterListPDFPreview } from './components/MasterListPDFPreview';
import { FullDashboardPDF } from './components/FullDashboardPDF';
import { ScheduleChartPDF } from './components/ScheduleChartPDF';
import { AssetSpecsPDF } from './components/AssetSpecsPDF';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

// Helper function to get display location
const getDisplayLocation = (site) => {
  if (!site) return 'No location';
  return site.fullLocation || site.location || 'No location';
};

export default function App() {
  // Force HMR update
  const {
    sites, selectedSiteId, setSelectedSiteId, selectedSite,
    currentServiceData, currentRollerData, currentSpecData,
    updateSiteData,
    handleAddSite, handleGenerateSample, handleDeleteSite, handleUpdateSiteInfo, toggleSiteStatus,
    handleAddIssue, handleDeleteIssue, handleToggleIssueStatus, handleUpdateIssue, handleCopyIssue,
    handleAddAsset, handleDeleteAsset, handleSaveEditedAsset, handleSaveEditedSpecs, handleInlineUpdate,
    handleAddSpecNote, handleDeleteSpecNote, saveEditedNote,
    handleAddSiteNote, handleUpdateSiteNote, handleDeleteSiteNote, handleArchiveSiteNote,

    handleFileChange, uploadServiceReport, deleteServiceReport
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
    viewHistoryAsset,
    viewContactSite, setViewContactSite,
    viewAnalyticsAsset, setViewAnalyticsAsset,
    editingNoteId, setEditingNoteId,
    editNoteContent, setEditNoteContent,
    siteForm, setSiteForm,
    noteInput, setNoteInput,
    newAsset, setNewAsset,
    specNoteInput, setSpecNoteInput,
    isPrintMenuOpen, setIsPrintMenuOpen,
    expandedSection, setExpandedSection,
    closeFullscreen,
    handleLightModeClick, isCooked, setIsCooked,
    lightModeMessage, showLightModeMessage
  } = useUIContext();

  // Local state for view mode if not in context (assuming it's not in context based on previous read)
  const [localViewMode, setLocalViewMode] = useState('list');
  const [commentsExpanded, setCommentsExpanded] = useState(true); // Comments section starts expanded
  // Actually, let's just use local state for now.




  const {
    activeTab, setActiveTab,
    siteSearchQuery, setSiteSearchQuery,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    isRollerOnlyMode, setIsRollerOnlyMode,
    sortConfig,
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

  const { canUndo, performUndo, lastActionDescription, isDirty, canRedo, performRedo, lastRedoActionDescription } = useUndo();

  // --- APP EXIT CONFIRMATION ---
  // We need a ref to access the latest isDirty inside the event handler
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handleCloseRequest = () => {
      const hasUnsavedChanges = isDirtyRef.current;

      if (!hasUnsavedChanges) {
        window.electronAPI?.sendAppCloseApproved();
      } else {
        const shouldClose = window.electronAPI?.promptClose(true);
        if (shouldClose) {
          window.electronAPI?.sendAppCloseApproved();
        }
      }
    };

    window.electronAPI?.onAppCloseRequest(handleCloseRequest);
  }, []);

  const printMenuRef = useRef(null);

  // FIX: Local handleSaveReport to prevent race conditions
  // FIX: Local handleSaveReport to prevent race conditions AND use Context
  const handleSaveReport = (assetId, reportData) => {
    // 1. Call Context Method (Persistence)
    uploadServiceReport(assetId, reportData);

    // 2. Update Local State (Immediate UI Feedback)
    if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
      setViewAnalyticsAsset(prev => ({
        ...prev,
        reports: [...(prev.reports || []), reportData]
      }));
    }
  };

  const handleDeleteReportWrapper = (assetId, reportId) => {
    // 1. Call Context Method
    deleteServiceReport(assetId, reportId);

    // 2. Update Local State
    if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
      setViewAnalyticsAsset(prev => ({ ...prev, reports: (prev.reports || []).filter(r => r.id !== reportId) }));
    }
  };

  // --- CUSTOMER REPORT MODAL STATE ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFullDashboardPreviewOpen, setIsFullDashboardPreviewOpen] = useState(false);
  const [isScheduleChartPreviewOpen, setIsScheduleChartPreviewOpen] = useState(false);
  const [isAssetSpecsPreviewOpen, setIsAssetSpecsPreviewOpen] = useState(false);
  const [isMasterListPreviewOpen, setIsMasterListPreviewOpen] = useState(false);

  // --- SITE NOTES MODAL STATE ---
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesModalSite, setNotesModalSite] = useState(null);

  // --- OPERATIONAL STATUS MODAL STATE ---
  const [opStatusAsset, setOpStatusAsset] = useState(null);
  const [isOpStatusModalOpen, setIsOpStatusModalOpen] = useState(false);

  // Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y or Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent shortcuts if we're in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        performRedo();
      }
      // Undo: Ctrl+Z (without Shift)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo]);

  // --- DERIVED STATE ---
  const selectedAsset = React.useMemo(() => (filteredData || []).find(i => i.id === selectedAssetId), [filteredData, selectedAssetId]);
  const selectedSpecs = React.useMemo(() => {
    if (!selectedAsset) return null;
    return (currentSpecData || []).find(s => 
      s.weigher === selectedAsset.weigher || 
      s.altCode === selectedAsset.code || 
      s.weigher === selectedAsset.code
    );
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

  const handleSaveOpStatus = (statusData) => {
    if (!opStatusAsset) return;

    const updateAssetStatus = (list) => list.map(item => {
      if (item.id === opStatusAsset.id) {
        return {
          ...item,
          opStatus: statusData.opStatus,
          opNote: statusData.opNote,
          opNoteTimestamp: statusData.opNoteTimestamp,
          history: [...(item.history || []), {
            date: new Date().toISOString(),
            action: `Operational Status changed to ${statusData.opStatus}`,
            user: 'User'
          }]
        };
      }
      return item;
    });

    updateSiteData(selectedSiteId, {
      serviceData: updateAssetStatus(currentServiceData),
      rollerData: updateAssetStatus(currentRollerData)
    }, 'Update Operational Status');

    setIsOpStatusModalOpen(false);
    setOpStatusAsset(null);
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
    if (selectedRowIds.size === 0) return;
    // Confirmation handled by SecureDeleteButton

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

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePrint = (mode) => {
    setIsPrintMenuOpen(false);
    
    if (mode === 'full') {
      // Open Full Dashboard Preview
      setIsFullDashboardPreviewOpen(true);
    } else if (mode === 'schedule') {
      // Open Schedule & Chart Preview
      setIsScheduleChartPreviewOpen(true);
    } else if (mode === 'specs') {
      // Asset Specs PDF for multiple selected assets
      if (selectedRowIds.size === 0) {
        alert('Please select one or more assets using the checkboxes to generate specifications.');
        return;
      }
      
      const selectedAssets = filteredData.filter(asset => selectedRowIds.has(asset.id));
      const assetsWithSpecs = selectedAssets.map(asset => {
        const specs = (currentSpecData || []).find(s => 
          s.weigher === asset.weigher || 
          s.altCode === asset.code || 
          s.weigher === asset.code
        );
        return { asset, specs };
      }).filter(item => item.specs); // Only include assets that have specs
      
      if (assetsWithSpecs.length === 0) {
        alert('No specifications found for any of the selected assets. Please select assets that have matching spec data.');
        return;
      }
      
      if (assetsWithSpecs.length < selectedRowIds.size) {
        const skipped = selectedRowIds.size - assetsWithSpecs.length;
        alert(`Warning: ${skipped} selected asset(s) don't have specifications. Generating PDF for ${assetsWithSpecs.length} asset(s) with specs.`);
      }
      
      // Open Asset Specs Preview with the filtered assets
      setIsAssetSpecsPreviewOpen(true);
    } else if (mode === 'master') {
      // Open Master List Preview
      setIsMasterListPreviewOpen(true);
    } else {
      // Fallback to original print method for other modes
      const body = document.body;
      body.classList.remove('print-schedule', 'print-specs', 'print-master');
      
      if (mode === 'schedule') body.classList.add('print-schedule');
      if (mode === 'specs') body.classList.add('print-specs');
      if (mode === 'master') body.classList.add('print-master');
      
      setTimeout(() => {
        window.print();
      }, 100);
    }
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

    // Helper to find an asset by ID (or its mirror ID) and update its status
    const updateListStatus = (list, targetId, mirrorId) => list.map(item => {
      // Check if this item is the target OR the mirror representation
      if (item.id === targetId || item.id === mirrorId) {
        const updated = { ...item, active: isActivating };
        updated.history = [...(item.history || []), { date: new Date().toISOString(), action: isActivating ? 'Asset Re-activated' : 'Asset Decommissioned', user: 'User' }];
        return updated;
      }
      return item;
    });

    // Calculate IDs
    const idParts = asset.id.split('-');
    const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

    // Determine the ID of the asset in the OTHER list
    // If current is s-123, match r-123. If r-123, match s-123.
    let mirrorId = null;
    if (baseId) {
      mirrorId = asset.id.startsWith('s-') ? `r-${baseId}` : `s-${baseId}`;
    }

    // Update BOTH lists looking for the asset ID or its mirror
    const newServiceData = updateListStatus(currentServiceData, asset.id, mirrorId);
    const newRollerData = updateListStatus(currentRollerData, asset.id, mirrorId);

    // Save changes
    updateSiteData(selectedSiteId, {
      serviceData: newServiceData,
      rollerData: newRollerData
    }, isActivating ? 'Asset Reactivated' : 'Asset Decommissioned');

    // UI Cleanup
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
        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
          <div className="text-4xl opacity-20"><Icons.Scale /></div>
          <p>Select an asset to view details.</p>
        </div>
      );
    }
    if (!selectedSpecs) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
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
          <div className="text-blue-400 text-sm font-bold uppercase mb-2 flex items-center gap-2"><span>📦</span> Scale Details</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Scale Type:</span><span className="font-medium text-slate-200">{selectedSpecs.scaleType || '-'}</span></div>
            <div className="flex justify-between"><span>Integrator:</span><span className="font-medium text-slate-200">{selectedSpecs.integratorController || '-'}</span></div>
            <div className="flex justify-between"><span>Speed Sensor:</span><span className="font-medium text-slate-200">{selectedSpecs.speedSensorType || '-'}</span></div>
            <div className="flex justify-between"><span>Load Cell Brand:</span><span className="font-medium text-slate-200">{selectedSpecs.loadCellBrand || '-'}</span></div>
            <div className="flex justify-between"><span>Load Cell Size:</span><span className="font-medium text-slate-200">{selectedSpecs.loadCellSize || '-'}</span></div>
            <div className="flex justify-between"><span>LC Sensitivity:</span><span className="font-medium text-slate-200">{selectedSpecs.loadCellSensitivity || '-'}</span></div>
            <div className="flex justify-between"><span>No. of Load Cells:</span><span className="font-medium text-slate-200">{selectedSpecs.numberOfLoadCells || '-'}</span></div>
          </div>
        </div>
        {/* Roller Details Section */}
        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
          <div className="text-orange-400 text-sm font-bold uppercase mb-2 flex items-center gap-2"><span>🔧</span> Roller Details</div>

          {/* Combined Dimensions Badge */}
          <div
            className="font-mono text-xs bg-slate-800 p-2 rounded border border-slate-600 break-all mb-2 text-slate-300 cursor-copy hover:bg-slate-700 transition-colors relative group"
            onClick={() => copyToClipboard(selectedSpecs.rollDims || '')}
            title="Click to copy"
          >
            {selectedSpecs.rollDims || '-'}
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icons.CheckSquare size={14} />
            </span>
          </div>

          {/* Detailed Fields */}
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Adjustment Type:</span>
              <span className="font-medium text-slate-200">{selectedSpecs.adjustmentType || '-'}</span>
            </div>
          </div>
        </div>

        {/* Billet Details Section */}
        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
          <div className="text-purple-400 text-sm font-bold uppercase mb-2 flex items-center gap-2"><span>⚖️</span> Billet Details</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Billet Weight Type:</span>
              <span className="font-medium text-slate-200">{selectedSpecs.billetWeightType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billet Weight Size:</span>
              <span className="font-medium text-slate-200">{selectedSpecs.billetWeightSize || '-'}</span>
            </div>
            {/* Billet Weight IDs Display */}
            {selectedSpecs.billetWeightIds && selectedSpecs.billetWeightIds.length > 0 && (
              <div className="pt-2 mt-2 border-t border-slate-700/50">
                <span className="text-slate-500 block mb-1 text-xs">Billet Weight IDs:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedSpecs.billetWeightIds.map((id, idx) => (
                    <span key={idx} className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-xs font-mono text-slate-300">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4
            className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-2 cursor-pointer hover:text-slate-300 hover:bg-slate-700/30 transition-all p-2 rounded -mx-2"
            onClick={() => setCommentsExpanded(!commentsExpanded)}
          >
            <Icons.MessageCircle />
            Comments
            {selectedSpecs.notes && selectedSpecs.notes.length > 0 && (
              <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-bold">{selectedSpecs.notes.length}</span>
            )}
            <Icons.ChevronDown className={`ml-auto transition-transform ${commentsExpanded ? 'rotate-180' : ''}`} size={16} />
          </h4>

          {/* Show latest comment when collapsed (if comments exist) */}
          {!commentsExpanded && selectedSpecs.notes && selectedSpecs.notes.length > 0 && (
            <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700/50 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                  {selectedSpecs.notes[selectedSpecs.notes.length - 1].author || 'UNK'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatDate(selectedSpecs.notes[selectedSpecs.notes.length - 1].timestamp, true)}
                </span>
              </div>
              <p className="text-slate-300 line-clamp-2">{selectedSpecs.notes[selectedSpecs.notes.length - 1].content}</p>
              {selectedSpecs.notes.length > 1 && (
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  +{selectedSpecs.notes.length - 1} more comment{selectedSpecs.notes.length - 1 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Expanded view */}
          {commentsExpanded && (
            <>
              <div className="space-y-2 mb-2 max-h-60 overflow-y-auto">
                {(selectedSpecs.notes || []).map(n => (
                  <div key={n.id} className="p-2 bg-slate-900/50 border border-slate-700 rounded text-xs group hover:bg-slate-800 hover:border-blue-500/50 transition-all relative">
                    {editingNoteId === n.id ? (
                      <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-1"><span className="font-bold text-blue-400">Editing Comment...</span></div>
                        <input className="w-full border border-slate-600 rounded p-2 text-xs mb-1 bg-slate-800 text-white" value={editNoteContent.author} onChange={e => setEditNoteContent({ ...editNoteContent, author: e.target.value })} placeholder="Initials / Name" />
                        <textarea className="w-full border border-slate-600 rounded p-2 text-xs bg-slate-800 text-white" rows="3" value={editNoteContent.content} onChange={e => setEditNoteContent({ ...editNoteContent, content: e.target.value })} />
                        <div className="flex gap-2 justify-end mt-2">
                          <button onClick={() => { saveEditedNote(editingNoteId, editNoteContent, selectedSpecs); setEditingNoteId(null); }} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500 flex items-center gap-1"><Icons.Save /> Save</button>
                          <button onClick={cancelEditNote} className="bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs hover:bg-slate-600 flex items-center gap-1"><Icons.Cancel /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{n.author || 'UNK'}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Icons.Clock /> {formatDate(n.timestamp, true)}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-slate-800 rounded shadow-sm border border-slate-600 p-0.5">
                            <button onClick={(e) => { e.stopPropagation(); startEditingNote(n); }} className="hover:bg-slate-700 p-1 rounded text-blue-400" title="Edit Note"><Icons.Edit /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSpecNote(n.id, selectedSpecs); }} className="hover:bg-slate-700 p-1 rounded text-red-400" title="Delete Note"><Icons.Trash /></button>
                          </div>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed pl-1">{n.content}</p>
                      </>
                    )}
                  </div>
                ))}
                {(!selectedSpecs.notes || selectedSpecs.notes.length === 0) && <p className="text-slate-400 text-xs italic text-center py-2">No comments yet.</p>}
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-700 rounded border-dashed mt-3 hover:border-blue-500/50 transition-colors">
                <div className="flex gap-2 mb-2">
                  <input className="w-24 text-xs border border-slate-600 rounded p-2 bg-slate-800 focus:bg-slate-900 text-white transition-colors" placeholder="Initials / Name" value={specNoteInput.author || ''} onChange={e => setSpecNoteInput({ ...specNoteInput, author: e.target.value })} />
                  <div className="flex-1 text-[10px] text-slate-400 flex items-center justify-end italic">{formatDate(new Date(), false)}</div>
                </div>
                <textarea className="w-full text-xs border border-slate-600 rounded p-2 mb-2 bg-slate-800 focus:bg-slate-900 text-white transition-colors focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Add a comment..." rows="2" value={specNoteInput.content || ''} onChange={e => setSpecNoteInput({ ...specNoteInput, content: e.target.value })} />
                <button type="button" onClick={() => { handleAddSpecNote(specNoteInput, selectedSpecs); setSpecNoteInput({ ...specNoteInput, content: '' }); }} disabled={!specNoteInput.content} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 text-xs py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Icons.Plus /> Add Comment</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset, selectedSpecs, editingNoteId, editNoteContent, specNoteInput]);

  if (!selectedSite) {
    // --- SITE SELECTION VIEW (DARK MODE) ---
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex">
        <style>{`
          @media print { 
            .no-print { display: none !important; }
            aside.sidebar-nav { display: none !important; }
            main.main-content { margin-left: 0 !important; width: 100% !important; }
          }
        `}</style>

        {/* ===== SIDEBAR NAVIGATION - SITE SELECTION ===== */}
        <aside className="sidebar-nav w-64 min-h-screen bg-slate-800 border-r border-slate-700 flex flex-col no-print fixed left-0 top-0 z-40">
          {/* Sidebar Header - Logo */}
          <div className="p-4 border-b border-slate-700 bg-slate-700">
            <div className="flex items-center justify-center mb-3">
              <img
                src={selectedSite?.customerLogo || selectedSite?.logo || "logos/ai-logo.png"}
                alt={selectedSite?.customerName || selectedSite?.name || "Accurate Industries"}
                className="h-36 w-auto object-contain"
              />
            </div>
            <h2 className="text-center text-lg font-bold text-slate-100 uppercase tracking-wide">Maintenance Tracker</h2>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search size={16} /></span>
              <input
                type="text"
                placeholder="Search sites..."
                className="w-full pl-9 pr-3 py-2 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-100 text-sm"
                value={siteSearchQuery}
                onChange={(e) => { setSiteSearchQuery(e.target.value); setSelectedRowIds(new Set()); }}
              />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Sort By</div>

            {/* Sort Options */}
            <button
              type="button"
              onClick={() => { setSiteSortOption('risk'); setSelectedRowIds(new Set()); }}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${siteSortOption === 'risk'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
            >
              <Icons.AlertTriangle size={18} />
              <span>Risk Level</span>
            </button>

            <button
              type="button"
              onClick={() => { setSiteSortOption('name'); setSelectedRowIds(new Set()); }}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${siteSortOption === 'name'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
            >
              <Icons.Building size={18} />
              <span>Site Name</span>
            </button>

            <button
              type="button"
              onClick={() => { setSiteSortOption('customer'); setSelectedRowIds(new Set()); }}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${siteSortOption === 'customer'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
            >
              <Icons.Contact size={18} />
              <span>Customer</span>
            </button>

            <div className="border-t border-slate-700 my-3"></div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Filter</div>

            {/* Show Archived Toggle */}
            <button
              type="button"
              onClick={() => { setShowArchived(!showArchived); setSelectedRowIds(new Set()); }}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${showArchived
                ? 'bg-slate-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
            >
              <Icons.Archive size={18} />
              <span>Show Archived</span>
              {showArchived && <Icons.CheckCircle size={14} className="ml-auto text-green-400" />}
            </button>

            <div className="border-t border-slate-700 my-3"></div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Actions</div>

            {/* Add Site */}
            <button
              type="button"
              onClick={() => { closeFullscreen(); setSiteForm({ id: null, name: '', customer: '', location: '', fullLocation: '', streetAddress: '', city: '', state: '', postcode: '', country: 'Australia', gpsCoordinates: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null }); setNoteInput({ content: '', author: '' }); setIsAddSiteModalOpen(true); setSelectedRowIds(new Set()); }}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white shadow-md"
            >
              <Icons.Plus size={18} />
              <span>Add New Site</span>
            </button>

            {/* Add Demo Site */}
            <button
              type="button"
              onClick={() => { handleGenerateSample(); setSelectedRowIds(new Set()); }}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Icons.Zap size={18} />
              <span>Add Demo Site</span>
            </button>

            <div className="border-t border-slate-700 my-3"></div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Data</div>

            {/* Backup */}
            <button
              type="button"
              onClick={() => { handleDownloadData(); setSelectedRowIds(new Set()); }}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Icons.Download size={18} />
              <span>Backup Data</span>
            </button>

            {/* Restore */}
            <label className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer">
              <Icons.UploadCloud size={18} />
              <span>Restore Data</span>
              <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
            </label>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-700">
            <div className="px-3 mb-2">
              {showLightModeMessage && (
                <div className="mb-2 p-2 bg-slate-700 text-white text-xs rounded-lg border border-slate-600">
                  {lightModeMessage}
                </div>
              )}
              <button
                type="button"
                onClick={handleLightModeClick}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-700 relative group"
              >
                <span className="text-lg">☀️</span>
                <span>Light Mode</span>
              </button>
            </div>

            {/* Complete App History */}
            <div className="px-3 mb-2">
              <button
                type="button"
                onClick={() => { setIsAppHistoryOpen(true); setSelectedRowIds(new Set()); }}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <Icons.History size={18} />
                <span>Complete App History</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT AREA ===== */}
        <main className="main-content flex-1 ml-64 p-6">
          {/* Page Header */}
          <header className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Site Overview</h1>
            <p className="text-slate-400">Select a site to view its maintenance dashboard</p>
            <p className="text-sm text-slate-500 mt-1">
              {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''} found
              {(() => {
                const archivedCount = filteredSites.filter(s => s.active === false).length;
                return archivedCount > 0 ? ` (${archivedCount} archived)` : '';
              })()}
            </p>
          </header>

          {/* Site Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                <div key={site.id} onClick={() => { setSelectedSiteId(site.id); setIsAppHistoryOpen(false); }} className={`bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 hover:shadow-2xl hover:bg-slate-700 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden group cursor-pointer ${cardOpacity}`}>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button type="button" onClick={(e) => { e.stopPropagation(); closeFullscreen(); setSiteForm({ ...site }); setIsEditSiteModalOpen(true); setSelectedRowIds(new Set()); }} className="p-2 bg-slate-800 bg-slate-700 hover:text-blue-400 rounded-full shadow-md border border-slate-700 border-slate-600 text-slate-400 text-slate-300 transition-colors" title="Edit Site Details"><Icons.Edit /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); closeFullscreen(); setViewContactSite(site); setSelectedRowIds(new Set()); }} className="p-2 bg-slate-800 bg-slate-700 hover:text-green-400 rounded-full shadow-md border border-slate-700 border-slate-600 text-slate-400 text-slate-300 transition-colors" title="View Contact Info"><Icons.Contact /></button>
                  </div>

                  <div className="mb-5 flex items-center justify-start h-16">
                    {site.logo ? <img src={site.logo} alt="Logo" className="h-full w-auto object-contain max-w-[150px] drop-shadow" /> : <div className="h-12 w-12 bg-slate-800 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-2xl shadow-inner"><Icons.Building /></div>}
                  </div>
                  {site.customer && <div className="text-xs font-bold text-blue-600 text-blue-400 uppercase mb-1 tracking-widest">{site.customer}</div>}
                  <h2 className="2xl font-bold text-slate-200 text-slate-100 mb-2 leading-tight">
                    {site.name} {site.active === false && <span className="text-sm font-normal text-slate-400">(Archived)</span>}
                  </h2>
                  <div className="flex items-center text-slate-400 text-sm mb-5"><span className="mr-1"><Icons.MapPin /></span> {getDisplayLocation(selectedSite)}</div>

                  <div className="mb-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">Service Assets</div>
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

                  <div className="mb-6 p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">Roller Assets</div>
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

                  <div className="mb-6 p-3 bg-slate-900/40 rounded-lg border border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2"><Icons.AlertTriangle /> Active Issues</span>
                    <span className="text-2xl font-bold text-red-500 text-red-400">{activeIssuesCount}</span>
                  </div>

                  {/* Full-width Health Bar */}
                  <div className="mb-6 p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                    <SiteHealthCircle site={site} fullWidth={true} />
                  </div>

                  <button
                    type="button"
                    className="flex flex-col gap-1 bg-slate-900/50 p-3 rounded-lg border border-slate-700 min-h-[90px] mt-auto cursor-pointer hover:bg-slate-800/50 hover:border-slate-600 transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFullscreen();
                      setNotesModalSite(site);
                      setIsNotesModalOpen(true);
                    }}
                    title="Click to manage notes"
                  >
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1 justify-between">
                      <span className="flex items-center gap-1"><Icons.FileText /> Latest Note</span>
                      <Icons.ChevronRight size={14} className="text-slate-500" />
                    </div>
                    {(() => {
                      // Get the most recent non-archived note
                      const activeNotes = (site.notes || []).filter(n => !n.archived);
                      const latestNote = activeNotes.length > 0
                        ? activeNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
                        : null;

                      return latestNote ? (
                        <>
                          <p className="text-sm text-slate-300 line-clamp-2">{latestNote.content}</p>
                          <div className="mt-auto pt-2 text-[10px] text-slate-400 text-right flex justify-between items-center">
                            <span className="text-slate-500">👤 {latestNote.author}</span>
                            <span>{formatDate(latestNote.timestamp, true)}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No notes. Click to add one.</p>
                      );
                    })()}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Data Persistence Info */}
          <div className="mt-12 p-6 bg-amber-900/20 border border-amber-800/50 rounded-xl no-print">
            <h3 className="text-lg font-bold text-amber-700 text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl">⚠️</span> Important: Data Persistence Guide
            </h3>
            <p className="text-amber-600 text-amber-300 mb-4 text-sm">
              This application is currently running in a temporary environment. Your data is <strong>not automatically saved</strong> to a cloud server.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <strong className="text-amber-600 text-amber-300 block mb-1">How to Save:</strong>
                Use the <strong>Backup Data</strong> button in the left sidebar (under Data) to download a <code>.json</code> file of your current data.
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <strong className="text-amber-600 text-amber-300 block mb-1">How to Load:</strong>
                Use the <strong>Restore Data</strong> link in the left sidebar (under Data) to upload a previously saved <code>.json</code> file to continue your work.
              </div>
            </div>
          </div>
        </main>


        <AddSiteModal
          isOpen={isAddSiteModalOpen}
          onClose={() => setIsAddSiteModalOpen(false)}
          onSave={(form, note) => { handleAddSite(form, note); setIsAddSiteModalOpen(false); }}
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          noteInput={noteInput}
          setNoteInput={setNoteInput}
          onLogoUpload={handleLogoUpload}
        />

        <EditSiteModal
          isOpen={isEditSiteModalOpen}
          onClose={() => setIsEditSiteModalOpen(false)}
          onSave={(form) => { handleUpdateSiteInfo(form); setIsEditSiteModalOpen(false); }}
          onDelete={handleDeleteSite}
          onToggleStatus={toggleSiteStatus}
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          onLogoUpload={handleLogoUpload}
        />

        <ContactModal site={viewContactSite} onClose={() => setViewContactSite(null)} />

        <AppHistorySidePanel
          isOpen={isAppHistoryOpen}
          onClose={() => setIsAppHistoryOpen(false)}
          asset={viewHistoryAsset}
        />

        {/* SITE NOTES MODAL - Also needed in Site Overview */}
        <SiteNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => {
            setIsNotesModalOpen(false);
            setNotesModalSite(null);
          }}
          site={sites.find(s => s.id === notesModalSite?.id)}
          onAddNote={handleAddSiteNote}
          onUpdateNote={handleUpdateSiteNote}
          onDeleteNote={handleDeleteSiteNote}
          onArchiveNote={handleArchiveSiteNote}
        />
      </div >
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex">
      <style>{`
        @media print {
            .no-print { display: none !important; }
            body, .min-h-screen { background-color: white !important; height: auto !important; padding: 0 !important; }
            .shadow, .shadow-sm { box-shadow: none !important; border: none !important; }
            .bg-slate-800 { background-color: white !important; }
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
            body.print-master #master-list-modal th, body.print-master #master-list-modal td { 
                padding: 4px !important; 
                border: 1px solid #ccc !important; 
                color: #000 !important;
                background: #fff !important;
            }
            body.print-master #master-list-modal th {
                background: #f9fafb !important;
                color: #374151 !important;
            }
            body.print-master #master-list-modal .bg-slate-800,
            body.print-master #master-list-modal .bg-slate-900 {
                background: #fff !important;
                color: #000 !important;
            }
            body.print-master #master-list-modal .text-slate-100,
            body.print-master #master-list-modal .text-slate-200,
            body.print-master #master-list-modal .text-slate-300,
            body.print-master #master-list-modal .text-slate-400 {
                color: #000 !important;
            }
            body.print-master #master-list-modal .text-gray-800,
            body.print-master #master-list-modal .text-gray-600 {
                color: #000 !important;
            }
            body.print-master #master-list-modal .border-slate-700 {
                border-color: #ccc !important;
            }

            /* Hide sidebar on print */
            aside.sidebar-nav { display: none !important; }
            main.main-content { margin-left: 0 !important; width: 100% !important; }
        }
      `}</style>

      {/* ===== SIDEBAR NAVIGATION ===== */}
      <aside className="sidebar-nav w-64 min-h-screen bg-slate-800 border-r border-slate-700 flex flex-col no-print fixed left-0 top-0 z-40">
        {/* Sidebar Header - Logo & Back */}
        <div className="p-4 border-b border-slate-700">


          {/* Logo as rounded square - full width */}
          <div className="flex items-center justify-center w-full h-20 bg-slate-700 rounded-xl border border-slate-600 overflow-hidden">
            <img
              src={selectedSite?.customerLogo || selectedSite?.logo || "logos/ai-logo.png"}
              alt={selectedSite?.customerName || selectedSite?.name || "Accurate Industries"}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 px-1">
            <Icons.MapPin size={12} />
            <span className="truncate">{selectedSite.location}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">

          {/* Full-width back button (MOVED) */}
          <button
            type="button"
            onClick={() => setSelectedSiteId(null)}
            className="w-full px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-3 text-sm font-medium"
            title="Back to Sites"
          >
            <Icons.ArrowLeft size={18} />
            <span>Back to Sites</span>
          </button>

          <div className="border-t border-slate-700 my-3"></div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Views</div>

          {/* Service Schedule */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('service');
              setSelectedAssetId(null);
              setIsRollerOnlyMode(false);
              setLocalViewMode('list');
              setExpandedSection(null);
            }}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'service' && localViewMode === 'list'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
          >
            <Icons.Calendar size={18} />
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
              setExpandedSection(null);
            }}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'roller' && localViewMode === 'list'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
          >
            <Icons.Settings size={18} />
            <span>Roller Replacement</span>
          </button>

          {/* Issue Tracker */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('issues');
              setSelectedAssetId(null);
              setLocalViewMode('list');
              setExpandedSection(null);
            }}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'issues'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
          >
            <Icons.AlertTriangle size={18} />
            <div className="flex-1 flex justify-between items-center">
              <span>Issue Tracker</span>
              {/* BADGE LOGIC START */}
              {(() => {
                const openIssueCount = (selectedSite?.issues || []).filter(i => i.status !== 'Completed').length;
                return openIssueCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
                    {openIssueCount}
                  </span>
                );
              })()}
              {/* BADGE LOGIC END */}
            </div>
          </button>

          {/* Timeline */}
          <button
            type="button"
            onClick={() => {
              setLocalViewMode('timeline');
              if (activeTab === 'issues') setActiveTab('service');
            }}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${localViewMode === 'timeline'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
          >
            <Icons.Clock size={18} />
            <span>Timeline</span>
          </button>

          <div className="border-t border-slate-700 my-3"></div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Tools</div>

          {/* Master List */}
          <button
            type="button"
            onClick={() => { closeFullscreen(); setIsMasterListOpen(true); setSelectedRowIds(new Set()); }}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Icons.Grid size={18} />
            <span>Equipment List</span>
          </button>

          {/* Export/Print */}
          <div className="relative" ref={printMenuRef}>
            <button
              type="button"
              onClick={() => { setIsPrintMenuOpen(!isPrintMenuOpen); }}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${isPrintMenuOpen
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
            >
              <Icons.Printer size={18} />
              <span>Export</span>
              <Icons.ChevronDown size={14} className={`ml-auto transition-transform ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isPrintMenuOpen && (
              <div className="mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button onClick={() => handlePrint('full')} className="w-full px-6 py-3 text-sm text-left hover:bg-slate-600 text-slate-300 flex items-center gap-2"><span>🖨️</span> Full Dashboard</button>
                <button onClick={() => handlePrint('schedule')} className="w-full px-6 py-3 text-sm text-left hover:bg-slate-600 text-slate-300 flex items-center gap-2"><span>📅</span> Schedule & Chart</button>
                <button onClick={() => handlePrint('specs')} disabled={selectedRowIds.size === 0} className={`w-full px-6 py-3 text-sm text-left flex items-center gap-2 ${selectedRowIds.size === 0 ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-600'}`}><span>📋</span> Asset Specs{selectedRowIds.size > 0 ? ` (${selectedRowIds.size} selected)` : ' (Select assets)'}</button>
                <button onClick={() => { setIsPrintMenuOpen(false); setIsReportModalOpen(true); }} className="w-full px-6 py-3 text-sm text-left hover:bg-slate-600 text-slate-300 flex items-center gap-2"><span>📄</span> Customer Report</button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 my-3"></div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Actions</div>

          {/* Master List */}
          <button
            type="button"
            onClick={() => { setIsMasterListOpen(true); setSelectedRowIds(new Set()); }}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Icons.Database size={18} />
            <span>Master List</span>
          </button>

          {/* Undo */}
          <button
            type="button"
            onClick={performUndo}
            disabled={!canUndo}
            title={canUndo ? `Undo: ${lastActionDescription}` : 'Nothing to undo'}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${canUndo
              ? 'text-slate-300 hover:text-white hover:bg-slate-700'
              : 'text-slate-500 cursor-not-allowed'
              }`}
          >
            <Icons.Undo size={18} />
            <span>Undo</span>
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={performRedo}
            disabled={!canRedo}
            title={canRedo ? `Redo: ${lastRedoActionDescription}` : 'Nothing to redo'}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${canRedo
              ? 'text-slate-300 hover:text-white hover:bg-slate-700'
              : 'text-slate-500 cursor-not-allowed'
              }`}
          >
            <Icons.Redo size={18} />
            <span>Redo</span>
          </button>
        </nav>

        {/* Sidebar Footer - Help */}
        <div className="p-3 border-t border-slate-700">
          <button
            type="button"
            onClick={() => { setIsHelpModalOpen(true); setSelectedRowIds(new Set()); }}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <Icons.MessageCircle size={18} />
            <span>Help & Settings</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="main-content flex-1 ml-64 p-6">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">
            {selectedSite.customer ? `${selectedSite.customer} Dashboard` : 'Distribution Hub Dashboard'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {activeTab === 'service' && localViewMode === 'list' && 'Service Schedule'}
            {activeTab === 'roller' && localViewMode === 'list' && 'Roller Replacement'}
            {activeTab === 'issues' && 'Site Issue Tracker'}
            {localViewMode === 'timeline' && 'Maintenance Timeline'}
          </p>
        </header>



        {/* ===== REFINED LAYOUT: Main Container with consistent padding and spacing ===== */}
        {activeTab !== 'issues' && (
          <div className="w-full space-y-6">

            {/* ===== TOP ROW: Asset Analytics (Left) + Maintenance Calendar (Right) ===== */}
            <section
              aria-label="Overview Statistics and Maintenance Calendar"
              className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {/* Asset Analytics - KPI Cards (1/3 or 1/4 width) */}
              <div className="lg:col-span-1 flex">
                <div className="flex flex-col gap-3 no-print w-full">
                  {/* Total Assets */}
                  <div
                    onClick={() => { setFilterStatus('all'); setSelectedRowIds(new Set()); }}
                    className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md flex-1 ${filterStatus === 'all'
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
                    onClick={() => { setFilterStatus('overdue'); setSelectedRowIds(new Set()); }}
                    className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md flex-1 ${filterStatus === 'overdue'
                      ? 'bg-red-600/30 border-2 border-red-500 ring-2 ring-red-500/50'
                      : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:border-red-500/50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icons.AlertTriangle className="text-red-400" size={20} />
                      <span className={`text-2xl font-bold ${filterStatus === 'overdue' ? 'text-white' : 'text-slate-200'}`}>{stats.overdue}</span>
                    </div>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${filterStatus === 'overdue' ? 'text-red-100' : 'text-slate-400'}`}>
                      Critical (Overdue)
                    </div>
                  </div>

                  {/* Due Soon */}
                  <div
                    onClick={() => { setFilterStatus('dueSoon'); setSelectedRowIds(new Set()); }}
                    className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md flex-1 ${filterStatus === 'dueSoon'
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
                    onClick={() => { setFilterStatus('healthy'); setSelectedRowIds(new Set()); }}
                    className={`cursor-pointer transition-all duration-200 rounded-xl p-4 shadow-md flex-1 ${filterStatus === 'healthy'
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
              </div>

              {/* Maintenance Calendar (2/3 or 3/4 width) */}
              <div className="lg:col-span-2 xl:col-span-3 h-full">
                {expandedSection === 'calendar' ? (
                  <FullScreenContainer title="Maintenance Calendar" id="calendar" onClose={() => setExpandedSection(null)} className="bg-slate-900">
                    <CalendarWidget
                      assets={filteredData}
                      selectedAssetId={selectedAssetId}
                      onAssetSelect={setSelectedAssetId}
                      expandedSection={expandedSection}
                      setExpandedSection={setExpandedSection}
                    />
                  </FullScreenContainer>
                ) : (
                  <div className="h-full">
                    <CalendarWidget
                      assets={filteredData}
                      selectedAssetId={selectedAssetId}
                      onAssetSelect={setSelectedAssetId}
                      expandedSection={expandedSection}
                      setExpandedSection={setExpandedSection}
                    />
                  </div>
                )}
              </div>
            </section>

            <hr className="border-slate-800" />

            {/* ===== FULL-WIDTH SECTION: Remaining Days Chart ===== */}
            <section aria-label="Asset Health Overview" className="w-full">
              <FullScreenContainer
                className="bg-slate-800/80 rounded-xl shadow-md border border-slate-700 p-4 no-print flex flex-col"
                title="Asset Health Overview"
                isOpen={expandedSection === 'chart'}
                onToggle={(val) => setExpandedSection(val ? 'chart' : null)}
              >
                <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                  <Icons.Activity className="text-cyan-400" />
                  Remaining Days
                </h3>
                <div className="flex-1 min-h-0">
                  <SimpleBarChart data={filteredData} onBarClick={(data) => {
                    // Filter table based on clicked bar
                    if (data.remaining < 0) setFilterStatus('overdue');
                    else if (data.remaining < 30) setFilterStatus('dueSoon');
                    else setFilterStatus('healthy');
                  }} />
                </div>
              </FullScreenContainer>
            </section>

            <hr className="border-slate-800" />

            {/* ===== FULL-WIDTH SECTION: Service/Roller Schedule ===== */}
            <section aria-label="Service and Roller Schedules" className="w-full">
              <FullScreenContainer
                className="bg-slate-800/80 rounded-xl shadow-md border border-slate-700 overflow-hidden"
                id="print-section-schedule"
                isOpen={expandedSection === 'schedule'}
                onToggle={(val) => setExpandedSection(val ? 'schedule' : null)}
              >
                <div className="p-4 border-b border-slate-700 flex flex-wrap gap-4 justify-between items-center sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Calendar /> {activeTab === 'service' ? 'Service Schedule' : 'Roller Schedule'}</h2>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-xs text-cyan-400 font-bold hidden sm:inline">{filteredData.length}</span>
                    <span
                      className="ml-2 px-2 py-0.5 rounded-full bg-slate-600 text-xs font-bold text-slate-300 hidden sm:inline min-w-[20px] text-center flex items-center justify-center"
                      title={`Archived Assets: ${(activeTab === 'service' ? currentServiceData : currentRollerData)?.filter(i => i.active === false).length || 0}`}
                    >
                      {(activeTab === 'service' ? currentServiceData : currentRollerData)?.filter(i => i.active === false).length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center no-print pr-2 sm:pr-10">
                    <div className="flex items-center mr-2">
                      <input
                        type="checkbox"
                        id="show-archived"
                        checked={showArchived}
                        onChange={(e) => { setShowArchived(e.target.checked); setSelectedRowIds(new Set()); }}
                        className="mr-1 accent-cyan-500"
                      />
                      <label htmlFor="show-archived" className="text-xs text-slate-400 select-none cursor-pointer">Show Archived</label>
                    </div>
                    <input type="text" placeholder="Search..." className="pl-2 pr-2 py-1 border border-slate-600 rounded text-sm w-32 md:w-40 bg-slate-900 text-white focus:border-cyan-500 outline-none" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedRowIds(new Set()); }} />
                    <button type="button" onClick={() => { closeFullscreen(); setIsAssetModalOpen(true); setSelectedRowIds(new Set()); }} className="bg-cyan-600 text-white hover:bg-cyan-700 w-10 h-10 md:w-auto md:h-auto p-0 md:px-4 md:py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-2 shadow-md" title="Add Asset"><Icons.Plus size={20} /> <span className="hidden md:inline">Add Asset</span></button>
                  </div>
                </div>
                <div className="overflow-x-auto h-full">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 z-20">
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
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[150px]" onClick={() => { handleSort('name'); setSelectedRowIds(new Set()); }}>Name {getSortIcon('name')}</th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[120px]" onClick={() => { handleSort('code'); setSelectedRowIds(new Set()); }}>Code {getSortIcon('code')}</th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[120px] whitespace-nowrap" onClick={() => { handleSort('lastCal'); setSelectedRowIds(new Set()); }}>Last Cal {getSortIcon('lastCal')}</th>
                        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 min-w-[80px]" onClick={() => { handleSort('frequency'); setSelectedRowIds(new Set()); }}>Freq {getSortIcon('frequency')}</th>
                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-700 min-w-[120px] whitespace-nowrap" onClick={() => { handleSort('dueDate'); setSelectedRowIds(new Set()); }}>Cal Due {getSortIcon('dueDate')}</th>
                        <th className="px-4 py-2 text-right cursor-pointer hover:bg-slate-700 min-w-[80px]" onClick={() => { handleSort('remaining'); setSelectedRowIds(new Set()); }}>Days {getSortIcon('remaining')}</th>
                        <th className="px-4 py-2 text-center min-w-[100px]">Cal Status</th>
                        <th className="px-4 py-2 text-center min-w-[100px]">Op Status</th>
                        <th className="px-3 py-2 text-center no-print text-xs">Reports / Analytics</th>
                        <th className="px-3 py-2 text-center no-print text-xs">Archive</th>
                        <th className="px-3 py-2 text-center no-print text-xs">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredData.map(item => (
                        <tr key={item.id} data-asset-id={item.id} onClick={() => setSelectedAssetId(item.id)} className={`cursor-pointer transition-all duration-200 ease-in-out ${selectedAssetId === item.id ? 'bg-cyan-900/40 ring-1 ring-cyan-500 ring-offset-0 shadow-sm z-10 relative' : selectedRowIds.has(item.id) ? 'bg-cyan-900/20' : (item.active === false ? 'bg-slate-900 opacity-50' : 'hover:bg-slate-700 border-b border-slate-700 border-l-4 border-l-transparent hover:border-l-cyan-500')}`}>
                          <td className="px-4 py-2 text-center no-print" onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }}>
                            <input type="checkbox" checked={selectedRowIds.has(item.id)} onChange={() => { }} className="rounded border-slate-500 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600" />
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-200">{item.name} {item.active === false && <span className="text-[10px] text-slate-400">(Archived)</span>}</td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-400">{item.code}</td>
                          <td className="px-4 py-2"><EditableCell value={item.lastCal} type="date" onSave={(val) => handleInlineUpdate(item.id, 'lastCal', val, activeTab)} className="bg-slate-800 text-white border-slate-600" /></td>
                          <td className="px-4 py-2 text-center"><EditableCell value={item.frequency} type="number" onSave={(val) => handleInlineUpdate(item.id, 'frequency', val, activeTab)} className="text-center bg-slate-800 text-white border-slate-600" /></td>
                          <td className="px-4 py-2 text-slate-400 font-medium">{formatDate(item.dueDate)}</td>
                          <td className={`px-4 py-2 text-right font-bold ${item.remaining < 0 ? 'text-red-400' : 'text-slate-300'}`}>{item.remaining}</td>
                          <td className="px-4 py-2 text-center"><StatusBadge remaining={item.remaining} isActive={item.active} /></td>
                          <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeFullscreen();
                                setOpStatusAsset(item);
                                setIsOpStatusModalOpen(true);
                                setSelectedRowIds(new Set());
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${item.opStatus === 'Warning'
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : item.opStatus === 'Down'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              title={item.opNote || 'Click to update operational status'}
                            >
                              {item.opStatus || 'Operational'}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}><button type="button" onClick={(e) => { e.stopPropagation(); closeFullscreen(); setViewAnalyticsAsset(item); setSelectedRowIds(new Set()); }} className="text-slate-400 hover:text-purple-400 p-2 rounded" title="View Reports / Analytics"><Icons.Activity /></button></td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(item.active === false ? "Are you sure you want to restore this asset?" : "Are you sure you want to archive this asset?")) {
                                  toggleAssetStatus(item);
                                  setSelectedRowIds(new Set());
                                }
                              }}
                              className="text-slate-400 hover:text-orange-400 p-2 rounded transition-colors"
                              title={item.active === false ? "Restore Asset" : "Archive Asset"}
                            >
                              <Icons.Archive size={20} />
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeFullscreen();
                                setEditingAsset({ ...item });
                                const specs = currentSpecData.find(s => s.weigher === item.weigher || s.altCode === item.code || s.weigher === item.code);
                                setEditingSpecs(specs || null);
                                setIsAssetEditModalOpen(true);
                                setSelectedRowIds(new Set());
                              }}
                              className="text-slate-400 hover:text-cyan-400 p-2 rounded"
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
                    <button onClick={performBulkService} className="text-sm font-medium text-slate-300 hover:text-green-400 flex items-center gap-2 bg-transparent shadow-none border-none p-0 transition-colors"><Icons.CheckCircle size={16} /> Mark as Serviced Today</button>
                    <div className="h-4 w-px bg-slate-500"></div>
                    <button onClick={() => { exportBulkCSV(); setSelectedRowIds(new Set()); }} className="text-sm font-medium hover:text-cyan-300 flex items-center gap-2"><Icons.FileCsv /> Export List</button>
                    <div className="h-4 w-px bg-slate-500"></div>
                    <button onClick={() => setSelectedRowIds(new Set())} className="text-xs text-slate-400 hover:text-white">Clear</button>
                  </div>
                )}
              </FullScreenContainer>
            </section>

            <hr className="border-slate-800" />

            {/* ===== FULL-WIDTH SECTION: Equipment Details ===== */}
            <section aria-label="Equipment Details" className="w-full" id="print-section-specs">
              <FullScreenContainer className="bg-slate-800/80 rounded-xl shadow-md border border-slate-700 flex flex-col" title="Equipment Specification">
                <div className="p-4 border-b border-slate-700 bg-slate-900/30 rounded-t-xl flex justify-between items-center">
                  <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Database /> Equipment Details</h2>
                  {selectedAsset && (
                    <div className="no-print mr-8">
                      <Button
                        variant={activeTab === 'service' ? 'secondary' : 'orange'}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeFullscreen();
                          setEditingAsset({ ...selectedAsset });
                          const specs = currentSpecData.find(s => s.weigher === selectedAsset.weigher || s.altCode === selectedAsset.code || s.weigher === selectedAsset.code);
                          setEditingSpecs(specs || null);
                          setIsAssetEditModalOpen(true);
                          setSelectedRowIds(new Set());
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
              </FullScreenContainer>
            </section>
          </div>
        )
        }


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {activeTab === 'issues' ? (
            <div className="lg:col-span-12 flex flex-col gap-6"> {/* Full width for issues tab */}
              <SiteIssueTracker
                siteId={selectedSiteId}
                issues={selectedSite?.issues || []}
                onAddIssue={handleAddIssue}
                onDeleteIssue={handleDeleteIssue}
                onUpdateIssue={handleUpdateIssue} // Pass the new update handler
                onToggleStatus={handleToggleIssueStatus}
                onCopyIssue={handleCopyIssue}
                assets={[...(selectedSite?.serviceData || []), ...(selectedSite?.rollerData || [])].filter(asset => asset.active !== false)}
                closeFullscreen={closeFullscreen}
              />
            </div>
          ) : localViewMode === 'timeline' ? (
            <div className="lg:col-span-12 h-[calc(100vh-300px)] min-h-[600px] mt-6">
              {/* WRAPPED: Asset Timeline with Full Screen */}
              <FullScreenContainer
                className="h-full w-full bg-slate-900 rounded-xl border border-slate-800"
                title="Maintenance Timeline"
                isOpen={expandedSection === 'timeline'}
                onToggle={(val) => setExpandedSection(val ? 'timeline' : null)}
              >
                <AssetTimeline assets={filteredData} mode={activeTab} />
              </FullScreenContainer>
            </div>
          ) : null}
        </div >
      </main>

      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSave={(form, note) => {
          handleAddSite(form, note);
          setIsAddSiteModalOpen(false);
          setSiteForm({});
          setNoteInput({ author: '', content: '' });
        }}
        siteForm={siteForm}
        setSiteForm={setSiteForm}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        onLogoUpload={handleFileChange}
      />

      <EditSiteModal
        isOpen={isEditSiteModalOpen}
        onClose={() => setIsEditSiteModalOpen(false)}
        onSave={(form) => {
          handleUpdateSiteInfo(form);
          setIsEditSiteModalOpen(false);
        }}
        onDelete={handleDeleteSite}
        onToggleStatus={toggleSiteStatus}
        siteForm={siteForm}
        setSiteForm={setSiteForm}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        onLogoUpload={handleFileChange}
        onAddNote={saveEditedNote}
      />

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
        siteLocation={selectedSite?.fullLocation || selectedSite?.location}
        onSaveReport={handleSaveReport}
        onDeleteReport={handleDeleteReportWrapper}
      />

      <AppHistorySidePanel
        isOpen={isAppHistoryOpen}
        onClose={() => setIsAppHistoryOpen(false)}
        asset={viewHistoryAsset}
      />

      {/* SITE NOTES MODAL */}
      <SiteNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => {
          setIsNotesModalOpen(false);
          setNotesModalSite(null);
        }}
        site={sites.find(s => s.id === notesModalSite?.id)}
        onAddNote={handleAddSiteNote}
        onUpdateNote={handleUpdateSiteNote}
        onDeleteNote={handleDeleteSiteNote}
        onArchiveNote={handleArchiveSiteNote}
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
            </div>
          </Modal>
        )
      }

      {/* CUSTOMER REPORT MODAL */}
      <CustomerReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        site={selectedSite}
        serviceData={currentServiceData}
        rollerData={currentRollerData}
        specData={currentSpecData}
      />

      {/* FULL DASHBOARD PREVIEW MODAL */}
      <FullDashboardPDFPreview
        isOpen={isFullDashboardPreviewOpen}
        onClose={() => setIsFullDashboardPreviewOpen(false)}
        site={{
          ...selectedSite,
          serviceData: currentServiceData,
          rollerData: currentRollerData
        }}
        generatedDate={formatDate(new Date().toISOString())}
      />

      {/* SCHEDULE CHART PREVIEW MODAL */}
      <ScheduleChartPDFPreview
        isOpen={isScheduleChartPreviewOpen}
        onClose={() => setIsScheduleChartPreviewOpen(false)}
        site={{
          ...selectedSite,
          serviceData: currentServiceData,
          rollerData: currentRollerData
        }}
        generatedDate={formatDate(new Date().toISOString())}
      />

      {/* ASSET SPECS PREVIEW MODAL */}
      <AssetSpecsPDFPreview
        isOpen={isAssetSpecsPreviewOpen}
        onClose={() => setIsAssetSpecsPreviewOpen(false)}
        assets={(() => {
          if (selectedRowIds.size === 0) return [];
          const selectedAssets = filteredData.filter(asset => selectedRowIds.has(asset.id));
          return selectedAssets.map(asset => {
            const specs = (currentSpecData || []).find(s => 
              s.weigher === asset.weigher || 
              s.altCode === asset.code || 
              s.weigher === asset.code
            );
            return { asset, specs };
          }).filter(item => item.specs);
        })()}
        generatedDate={formatDate(new Date().toISOString())}
      />

      {/* MASTER LIST PREVIEW MODAL */}
      <MasterListPDFPreview
        isOpen={isMasterListPreviewOpen}
        onClose={() => setIsMasterListPreviewOpen(false)}
        site={{
          ...selectedSite,
          serviceData: currentServiceData,
          rollerData: currentRollerData
        }}
        serviceData={currentServiceData}
        rollerData={currentRollerData}
        specData={currentSpecData}
        showArchived={showArchived}
        generatedDate={formatDate(new Date().toISOString())}
      />

      {/* OPERATIONAL STATUS MODAL */}
      <OperationalStatusModal
        isOpen={isOpStatusModalOpen}
        onClose={() => {
          setIsOpStatusModalOpen(false);
          setOpStatusAsset(null);
        }}
        onSave={handleSaveOpStatus}
        asset={opStatusAsset}
      />

      {/* EASTER EGG OVERLAY */}
      {isCooked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-in fade-in duration-300 cursor-pointer" onClick={() => setIsCooked(false)}>
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-black text-red-600 uppercase tracking-widest animate-bounce mb-4">COOKED</h1>
            <p className="text-2xl text-red-400 font-mono">stop pushing things so many times! insanity.</p>
          </div>
        </div>
      )}

    </div >
  );
}
