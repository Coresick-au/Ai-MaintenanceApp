import React, { useEffect, useRef, useMemo, useState } from 'react';
// IMPORT DATA & HELPER
import { recalculateRow } from './data/mockData';
// IMPORT FIREBASE STORAGE
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  FullScreenContainer,
  SelectInput // New Component
} from './components/UIComponents';
import { Icons } from './constants/icons.jsx';
import { formatDate } from './utils/helpers';
import { getExpiryStatus } from './utils/employeeUtils';
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
import { ServiceReportForm } from './components/reports/ServiceReportForm';
import { ServiceReportDocument } from './components/reports/ServiceReportDocument';
import { ReportHistoryModal } from './components/reports/ReportHistoryModal';
import { ReportWizardModal } from './components/ReportWizardModal';
import { ToDoWidget } from './components/ToDoWidget';
import { ContextWizardModal } from './components/ContextWizardModal';
import { EmployeeManager } from './components/EmployeeManager';

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

// Helper function to get display location
const getDisplayLocation = (site) => {
  if (!site) return 'No location';
  return site.fullLocation || site.location || 'No location';
};

export function App() {
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

    handleFileChange, uploadServiceReport, deleteServiceReport,
    dbPath, isDbReady, handleDatabaseSelected,
    employees, handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee,
    todos, handleAddTodo, handleUpdateTodo, handleDeleteTodo
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
  const [isReportWizardOpen, setIsReportWizardOpen] = useState(false);
  const [reportFormState, setReportFormState] = useState(null); // { site, asset }
  const [commentsExpanded, setCommentsExpanded] = useState(true); // Comments section starts expanded

  // NEW: Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = isSidebarCollapsed ? 'w-20' : 'w-64';

  const [expandedSiteCards, setExpandedSiteCards] = useState({});

  // Universal Action Wizard State
  const [wizardAction, setWizardAction] = useState(null); // 'analytics', 'report', 'specs'
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isEmployeeManagerOpen, setIsEmployeeManagerOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const toggleCardExpansion = (e, siteId) => {
    e.stopPropagation();
    setExpandedSiteCards(prev => ({ ...prev, [siteId]: !prev[siteId] }));
  };
  // Actually, let's just use local state for now.

  // Calculate count of certifications/inductions needing attention
  const complianceIssuesCount = useMemo(() => {
    let count = 0;
    employees.forEach(emp => {
      // Check Certifications
      (emp.certifications || []).forEach(c => {
        const status = getExpiryStatus(c.expiry);
        if (status === 'expired' || status === 'warning') count++;
      });
      // Check Inductions
      (emp.inductions || []).forEach(i => {
        const status = getExpiryStatus(i.expiry);
        if (status === 'expired' || status === 'warning') count++;
      });
    });
    return count;
  }, [employees]);




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

  // Removed Electron window close handlers (web-only app)

  const printMenuRef = useRef(null);

  // FIX: Local handleSaveReport to prevent race conditions
  // FIX: Local handleSaveReport to prevent race conditions AND use Context
  const handleSaveReport = (assetId, reportData) => {
    // 1. Call Context Method (Persistence)
    uploadServiceReport(assetId, reportData);

    // 2. Update Local State (Immediate UI Feedback)
    if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
      setViewAnalyticsAsset(prev => {
        const reports = prev.reports || [];
        const existingIndex = reports.findIndex(r => r.id === reportData.id);

        let updatedReports;
        if (existingIndex >= 0) {
          updatedReports = [...reports];
          updatedReports[existingIndex] = reportData;
        } else {
          updatedReports = [...reports, reportData];
        }

        return {
          ...prev,
          reports: updatedReports
        };
      });
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

  // --- SERVICE REPORT MODAL STATE ---
  const [isServiceReportOpen, setIsServiceReportOpen] = useState(false);
  const [isReportHistoryOpen, setIsReportHistoryOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [serviceReportInitialData, setServiceReportInitialData] = useState(null);
  const [serviceReportReadOnly, setServiceReportReadOnly] = useState(false);

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

  const handleGenerateReport = async (reportData, assetOverride = null) => {
    const targetAsset = assetOverride || selectedAsset;
    if (!targetAsset) return;
    const targetAssetId = targetAsset.id;

    // Validate job number
    if (!reportData.general.jobNumber || reportData.general.jobNumber.trim() === '') {
      alert('Please enter a Job Number before generating the report.');
      return;
    }

    try {
      // 1. Generate PDF Blob
      const blob = await pdf(<ServiceReportDocument data={reportData} />).toBlob();

      // 2. Create filename: YYYY.MM.DD-CALR-[jobNumber]-[AssetName]
      const date = new Date(reportData.general.serviceDate);
      const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
      const jobNumber = reportData.general.jobNumber.trim();
      const assetName = (reportData.general.assetName || targetAsset.name).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${dateStr}-CALR${jobNumber}-${assetName}.pdf`;

      // 3. Save File Locally (Always offer download)
      const shouldDownload = reportData.download !== false;
      if (shouldDownload) {
        saveAs(blob, fileName);
      }

      // 4. Upload to Firebase Storage
      let downloadURL = null;
      try {
        const storageRef = ref(storage, `reports/${targetAssetId}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log('Uploaded report to:', downloadURL);
      } catch (uploadError) {
        console.error("Firebase upload failed:", uploadError);
        alert("Warning: PDF upload to Cloud failed. Report data will still be saved locally/offline.");
      }

      // 5. Save to App History (using existing context method)
      // If editing, delete old record first to ensure clean update (simulated update)
      if (editingReportId) {
        deleteServiceReport(targetAssetId, editingReportId);
      }

      handleSaveReport(targetAssetId, {
        id: editingReportId || Date.now(),
        date: new Date().toISOString(),
        type: 'Full Service',
        fileName: fileName,
        storageUrl: downloadURL, // Save the cloud URL
        jobNumber: jobNumber,
        data: reportData
      });

      // 6. Clear draft from localStorage
      const draftKey = `serviceReportDraft_${targetAssetId}`;
      localStorage.removeItem(draftKey);

      setIsServiceReportOpen(false);
      setReportFormState(null); // Also close the wizard form if open

      // Reset Edit State
      setEditingReportId(null);
      setServiceReportInitialData(null);
      setServiceReportReadOnly(false);

      // Open History Modal (Workflow Improvement)
      setIsReportHistoryOpen(true);
    } catch (error) {
      console.error('Error generating service report:', error);
      alert('Failed to generate service report. Please try again.');
    }
  };

  const handleRegeneratePDF = async (report) => {
    try {
      // 1. Generate PDF Blob from saved data
      const blob = await pdf(<ServiceReportDocument data={report.data} />).toBlob();

      // 2. Save File with original filename
      saveAs(blob, report.fileName);
    } catch (error) {
      console.error('Error regenerating PDF:', error);
      alert('Failed to regenerate PDF. Please try again.');
    }
  };

  const handleViewReport = (report) => {
    setEditingReportId(report.id);
    setServiceReportInitialData(report.data);
    setServiceReportReadOnly(true);
    setIsServiceReportOpen(true);
    setIsReportHistoryOpen(false);
  };

  const handleEditReport = (report) => {
    if (window.confirm("WARNING: You are about to edit a finalized service report.\n\nChanges will overwrite the existing record history.\n\nAre you sure you want to proceed?")) {
      setEditingReportId(report.id);
      setServiceReportInitialData(report.data);
      setServiceReportReadOnly(false);
      setIsServiceReportOpen(true);
      setIsReportHistoryOpen(false);
    }
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

  // --- MAIN RETURN: RENDER SIDEBAR + CONDITIONAL CONTENT ---
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
      <aside className={`sidebar-nav ${sidebarWidth} min-h-screen bg-slate-800 border-r border-slate-700 flex flex-col no-print fixed left-0 top-0 z-40 transition-all duration-300 overflow-visible`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-4 -right-3 z-50 bg-slate-700 text-slate-300 rounded-full p-1.5 border border-slate-600 shadow-lg hover:bg-slate-600 hover:text-white transition-colors"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <Icons.ChevronRight size={16} /> : <Icons.ChevronLeft size={16} />}
        </button>

        {/* Sidebar Header - Logo */}
        <div className="p-4 border-b border-slate-700 bg-slate-700 flex flex-col items-center">
          <div
            className="flex items-center justify-center mb-3 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
            onClick={() => { setSelectedSiteId(null); setSelectedRowIds(new Set()); }}
            title="Return to Site Selection"
          >
            <img
              src={selectedSite?.customerLogo || selectedSite?.logo || "./logos/ai-logo.png"}
              alt="Logo"
              className={`${isSidebarCollapsed ? 'h-8 w-8' : 'h-36 w-auto'} object-contain transition-all duration-300`}
            />
          </div>
          {!isSidebarCollapsed && (
            <h2 className="text-center text-lg font-bold text-slate-100 uppercase tracking-wide animate-in fade-in duration-300 whitespace-nowrap">AIMM</h2>
          )}
        </div>

        {/* Search */}
        <div className={`p-3 border-b border-slate-700 ${isSidebarCollapsed ? 'hidden' : ''}`}>
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
          {selectedSiteId ? (
            /* === CUSTOMER VIEW ACTIONS (When Site Selected) === */
            <div className="space-y-1 animate-in slide-in-from-left-4 duration-300">
              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider px-3 py-2 mb-2">
                  {selectedSite?.customer || 'Site'} Views
                </div>
              )}

              {/* 1. Service Schedule */}
              <button
                type="button"
                onClick={() => { setActiveTab('service'); setLocalViewMode('list'); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'service' && localViewMode === 'list'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title="Service Schedule"
              >
                <Icons.ClipboardList size={20} />
                {!isSidebarCollapsed && <span>Service Schedule</span>}
              </button>

              {/* 2. Roller Replacement */}
              <button
                type="button"
                onClick={() => { setActiveTab('roller'); setLocalViewMode('list'); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'roller' && localViewMode === 'list'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title="Roller Replacement"
              >
                <Icons.Settings size={20} />
                {!isSidebarCollapsed && <span>Roller Replacement</span>}
              </button>

              {/* 3. Timeline View */}
              <button
                type="button"
                onClick={() => { setLocalViewMode('timeline'); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${localViewMode === 'timeline'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title="Maintenance Timeline"
              >
                <Icons.Clock size={20} />
                {!isSidebarCollapsed && <span>Timeline</span>}
              </button>

              {/* 4. Issue Tracker */}
              <button
                type="button"
                onClick={() => { setActiveTab('issues'); setLocalViewMode('list'); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'issues'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title="Issue Tracker"
              >
                <Icons.AlertCircle size={20} />
                {!isSidebarCollapsed && <span>Issue Tracker</span>}
              </button>

              {/* 5. Customer Notes */}
              <button
                type="button"
                onClick={() => { setNotesModalSite(selectedSite); setIsNotesModalOpen(true); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-300 hover:text-white hover:bg-slate-700`}
                title="Customer Notes"
              >
                <Icons.StickyNote size={20} />
                {!isSidebarCollapsed && <span>Customer Notes</span>}
              </button>

              {/* 6. Equipment List */}
              <button
                type="button"
                onClick={() => { setIsMasterListOpen(true); setSelectedRowIds(new Set()); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-300 hover:text-white hover:bg-slate-700`}
                title="Equipment List"
              >
                <Icons.Database size={20} />
                {!isSidebarCollapsed && <span>Equipment List</span>}
              </button>

              {/* 7. Export CSV */}
              <button
                type="button"
                onClick={() => {
                  if (selectedRowIds.size === 0) {
                    // Try to export everything if nothing selected?
                    // For safety, just alert.
                    alert("Please select items in the list to export.");
                  } else {
                    exportBulkCSV();
                  }
                }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-300 hover:text-white hover:bg-slate-700`}
                title="Export Selected to CSV"
              >
                <Icons.Download size={20} />
                {!isSidebarCollapsed && <span>Export CSV</span>}
              </button>

              {/* === EXPORT MENU === */}
              <div className="relative mb-4 mt-4">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className={`w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-3 rounded-xl shadow-md border border-slate-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} font-bold transition-all`}
                  title={isSidebarCollapsed ? "Export" : ""}
                >
                  {!isSidebarCollapsed ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Icons.Printer size={20} />
                        <span>Export</span>
                      </div>
                      <Icons.ChevronDown className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} size={16} />
                    </>
                  ) : (
                    <Icons.Printer size={20} />
                  )}
                </button>

                {isExportMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">

                    {/* Full Dashboard */}
                    <button
                      onClick={() => { setIsExportMenuOpen(false); handlePrint('full'); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700 group"
                    >
                      <div className="text-slate-400 group-hover:text-white transition-colors">
                        <Icons.Printer size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white">Full Dashboard</span>
                    </button>

                    {/* Schedule & Chart */}
                    <button
                      onClick={() => { setIsExportMenuOpen(false); handlePrint('schedule'); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700 group"
                    >
                      <div className="text-slate-400 group-hover:text-white transition-colors">
                        <Icons.Calendar size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white">Schedule & Chart</span>
                    </button>

                    {/* Asset Specs */}
                    <button
                      onClick={() => { setIsExportMenuOpen(false); handlePrint('specs'); }}
                      disabled={selectedRowIds.size === 0}
                      className={`w-full p-3 text-left flex items-center gap-3 border-b border-slate-700 group ${selectedRowIds.size === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'}`}
                    >
                      <div className="text-slate-400 group-hover:text-white transition-colors">
                        <Icons.FileText size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-300 group-hover:text-white">Asset Specs</div>
                        {selectedRowIds.size === 0 && <div className="text-[10px] text-slate-500">(Select assets)</div>}
                      </div>
                    </button>

                    {/* Customer Report */}
                    <button
                      onClick={() => { setIsExportMenuOpen(false); setIsReportModalOpen(true); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 group"
                    >
                      <div className="text-slate-400 group-hover:text-white transition-colors">
                        <Icons.FileText size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white">Customer Report</span>
                    </button>

                  </div>
                )}
              </div>
            </div>
          ) : (
            /* === SITE SELECTION VIEW ACTIONS === */
            <>
              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Sort By</div>
              )}

              {/* Sort Options */}
              <button
                type="button"
                onClick={() => { setSiteSortOption('risk'); setSelectedRowIds(new Set()); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${siteSortOption === 'risk'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title={isSidebarCollapsed ? "Risk Level" : ""}
              >
                <Icons.AlertTriangle size={18} />
                {!isSidebarCollapsed && <span>Risk Level</span>}
              </button>

              <button
                type="button"
                onClick={() => { setSiteSortOption('name'); setSelectedRowIds(new Set()); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${siteSortOption === 'name'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title={isSidebarCollapsed ? "Site Name" : ""}
              >
                <Icons.Building size={18} />
                {!isSidebarCollapsed && <span>Site Name</span>}
              </button>

              <button
                type="button"
                onClick={() => { setSiteSortOption('customer'); setSelectedRowIds(new Set()); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${siteSortOption === 'customer'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                title={isSidebarCollapsed ? "Customer" : ""}
              >
                <Icons.Contact size={18} />
                {!isSidebarCollapsed && <span>Customer</span>}
              </button>

              <div className="border-t border-slate-700 my-3"></div>

              {/* === UNIVERSAL ACTIONS MENU === */}
              <div className="relative mb-4">
                <button
                  onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                  className={`w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white p-3 rounded-xl shadow-lg shadow-cyan-900/20 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} font-bold transition-all border border-cyan-400/20`}
                  title={isSidebarCollapsed ? "Actions Menu" : ""}
                >
                  {!isSidebarCollapsed ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Icons.Grid size={20} />
                        <span>Actions Menu</span>
                      </div>
                      <Icons.ChevronDown className={`transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} size={16} />
                    </>
                  ) : (
                    <Icons.Grid size={20} />
                  )}
                </button>

                {isActionMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">

                    {/* 1. VIEW ANALYTICS */}
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setWizardAction('analytics'); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700 group"
                    >
                      <div className="bg-purple-500/20 text-purple-400 p-2 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <Icons.Activity size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">View Analytics</div>
                        <div className="text-[10px] text-slate-400">Charts, Trends & History</div>
                      </div>
                    </button>

                    {/* 2. NEW REPORT */}
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setWizardAction('report'); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700 group"
                    >
                      <div className="bg-green-500/20 text-green-400 p-2 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                        <Icons.FileText size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">New Service Report</div>
                        <div className="text-[10px] text-slate-400">Create Digital Report</div>
                      </div>
                    </button>

                    {/* 3. MANAGE SPECS */}
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setWizardAction('specs'); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700 group"
                    >
                      <div className="bg-orange-500/20 text-orange-400 p-2 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Icons.Settings size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">Edit Specs</div>
                        <div className="text-[10px] text-slate-400">Update Asset Details</div>
                      </div>
                    </button>

                    {/* 4. VIEW TIMELINE */}
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setWizardAction('timeline'); }}
                      className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 group"
                    >
                      <div className="bg-blue-500/20 text-blue-400 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Icons.Clock size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">View Timeline</div>
                        <div className="text-[10px] text-slate-400">Site Schedule View</div>
                      </div>
                    </button>

                  </div>
                )}
              </div>


              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Site Management</div>
              )}

              {/* Add Site */}
              <button
                type="button"
                onClick={() => { closeFullscreen(); setSiteForm({ id: null, name: '', customer: '', location: '', fullLocation: '', streetAddress: '', city: '', state: '', postcode: '', country: 'Australia', gpsCoordinates: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null }); setNoteInput({ content: '', author: '' }); setIsAddSiteModalOpen(true); setSelectedRowIds(new Set()); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} bg-cyan-600 hover:bg-cyan-500 text-white shadow-md`}
                title={isSidebarCollapsed ? "Add New Site" : ""}
              >
                <Icons.Plus size={18} />
                {!isSidebarCollapsed && <span>Add New Site</span>}
              </button>

              {/* Add Demo Site */}
              <button
                type="button"
                onClick={() => { handleGenerateSample(); setSelectedRowIds(new Set()); }}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-300 hover:text-white hover:bg-slate-700`}
                title={isSidebarCollapsed ? "Add Demo Site" : ""}
              >
                <Icons.Zap size={18} />
                {!isSidebarCollapsed && <span>Add Demo Site</span>}
              </button>

              <div className="border-t border-slate-700 my-3"></div>
              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Tools</div>
              )}

              {/* Technicians & Training */}
              <button
                type="button"
                onClick={() => setIsEmployeeManagerOpen(true)}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-300 hover:text-white hover:bg-slate-700 relative`}
                title={isSidebarCollapsed ? "Technicians & Training" : ""}
              >
                <Icons.Users size={18} />
                {!isSidebarCollapsed && <span>Technicians & Training</span>}
                {complianceIssuesCount > 0 && (
                  <span className={`${isSidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
                    {complianceIssuesCount}
                  </span>
                )}
              </button>
            </>
          )}
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
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-400 hover:text-white hover:bg-slate-700 relative group`}
              title={isSidebarCollapsed ? "Light Mode" : ""}
            >
              <span className="text-lg">☀️</span>
              {!isSidebarCollapsed && <span>Light Mode</span>}
            </button>
          </div>

          <div className="px-3 mb-2">
            <button
              type="button"
              onClick={() => { setIsAppHistoryOpen(true); setSelectedRowIds(new Set()); }}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} text-slate-400 hover:text-white hover:bg-slate-700`}
              title={isSidebarCollapsed ? "Complete App History" : ""}
            >
              <Icons.History size={18} />
              {!isSidebarCollapsed && <span>Complete App History</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA (SITE SELECTION: GRID VIEW) ===== */}
      {!selectedSiteId && (
        <main className={`main-content flex-1 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} p-6 transition-all duration-300`}>
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
            {/* Navigation Hint */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>Tip: Click the sidebar logo to return to this dashboard</span>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Developer To-Do List Widget */}
            <div className="h-96 md:h-auto">
              <ToDoWidget
                todos={todos}
                onAdd={handleAddTodo}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
              />
            </div>

            {filteredSites.map(site => {
              const serviceStats = (site.serviceData || []).reduce((acc, curr) => {
                if (curr.remaining < 0) acc.critical++;
                else if (curr.remaining < 30) acc.dueSoon++;
                else acc.healthy++;
                acc.total++;
                return acc;
              }, { critical: 0, dueSoon: 0, healthy: 0, total: 0 });

              const rollerStats = (site.rollerData || []).reduce((acc, curr) => {
                if (curr.remaining < 0) acc.critical++;
                else if (curr.remaining < 30) acc.dueSoon++;
                else acc.healthy++;
                acc.total++;
                return acc;
              }, { critical: 0, dueSoon: 0, healthy: 0, total: 0 });

              // Calculate Overall Health Percentages (Service Based)
              const totalAssets = serviceStats.total;
              const criticalPct = totalAssets > 0 ? Math.round((serviceStats.critical / totalAssets) * 100) : 0;
              const warningPct = totalAssets > 0 ? Math.round((serviceStats.dueSoon / totalAssets) * 100) : 0;
              const healthyPct = totalAssets > 0 ? Math.round((serviceStats.healthy / totalAssets) * 100) : 0;

              // Active Issues Count (Mock logic if issues not yet populated in filtered list, ensuring safety)
              // Assuming site.issues might be enriched by provider, or we filter from a global context if needed.
              // For now, we check if site.issues exists. 
              const activeIssuesCount = (site.issues || []).filter(i => i.status !== 'Closed').length;

              return (
                <div
                  key={site.id}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    setViewContactSite(null);
                  }}
                  className={`
                      relative overflow-hidden group cursor-pointer transition-all duration-300
                      bg-slate-800/60 backdrop-blur-md border border-slate-700/50 hover:border-cyan-500/50 
                      rounded-2xl p-6 hover:shadow-2xl hover:shadow-cyan-900/10 hover:-translate-y-1
                      flex flex-col
                    `}
                >
                  {/* Decorative Top Gradient */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {/* Site Logo or Initial */}
                      {site.logo ? (
                        <div className="w-12 h-12 rounded-lg bg-white p-1 shadow-md">
                          <img src={site.logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                          {site.name[0]}
                        </div>
                      )}

                      <div>
                        <h3 className="font-bold text-xl text-white group-hover:text-cyan-400 transition-colors">{site.name}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Icons.MapPin size={12} />
                          {getDisplayLocation(site)}
                        </p>
                      </div>
                    </div>

                    {/* Restored Action Buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSiteForm(site); setNoteInput({ content: '', author: '' }); setIsAddSiteModalOpen(true); }}
                        className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                        title="Edit Site Details"
                      >
                        <Icons.Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewContactSite(site); }}
                        className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                        title="View Contact Info"
                      >
                        <Icons.Contact size={16} />
                      </button>
                    </div>

                  </div>

                  {/* Restored Active Issues Banner */}
                  {activeIssuesCount > 0 && (
                    <div className="mb-4 p-3 bg-slate-900/40 rounded-lg border border-red-500/30 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors">
                      <span className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                        <Icons.AlertTriangle size={16} className="text-red-500" />
                        Active Issues
                      </span>
                      <span className="text-xl font-bold text-red-400">{activeIssuesCount}</span>
                    </div>
                  )}

                  {/* Quick Stats Grid - Glass Pills */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/50 flex flex-col items-center">
                      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Service</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{(site.serviceData || []).length}</span>
                        <span className="text-xs text-slate-500">Assets</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/50 flex flex-col items-center">
                      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Rollers</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{(site.rollerData || []).length}</span>
                        <span className="text-xs text-slate-500">Assets</span>
                      </div>
                    </div>
                  </div>

                  {/* Restored Overall Health Bar */}
                  <div className="mb-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Overall Health</span>
                        <div className="flex items-center gap-2">
                          {criticalPct > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-red-400">{criticalPct}%</span></div>}
                          {warningPct > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs text-amber-400">{warningPct}%</span></div>}
                          {healthyPct > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-xs text-emerald-400">{healthyPct}%</span></div>}
                        </div>
                      </div>
                      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden flex">
                        <div className="bg-red-500 transition-all duration-500" title={`Critical: ${criticalPct}%`} style={{ width: `${criticalPct}%` }}></div>
                        <div className="bg-amber-500 transition-all duration-500" title={`Due Soon: ${warningPct}%`} style={{ width: `${warningPct}%` }}></div>
                        <div className="bg-emerald-500 transition-all duration-500" title={`Healthy: ${healthyPct}%`} style={{ width: `${healthyPct}%` }}></div>
                      </div>
                    </div>
                  </div>


                  {/* Toggle Breakdown Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCardExpansion(e, site.id);
                    }}
                    className="w-full py-2 bg-slate-900/40 hover:bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider rounded border border-slate-700 mb-4 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{expandedSiteCards[site.id] ? 'Hide' : 'Show'} Breakdown</span>
                    <Icons.ChevronDown className={`transition-transform duration-300 ${expandedSiteCards[site.id] ? 'rotate-180' : ''}`} size={16} />
                  </button>

                  {/* Service & Roller Breakdown */}
                  {
                    expandedSiteCards[site.id] && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Service Assets */}
                        <div className="mb-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">Service Assets</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-red-900/40 p-2 rounded text-center border border-red-900/60">
                              <div className="text-lg font-bold text-red-400">{serviceStats.critical}</div>
                              <div className="text-[9px] text-red-300 uppercase">Critical</div>
                            </div>
                            <div className="bg-amber-900/40 p-2 rounded text-center border border-amber-900/60">
                              <div className="text-lg font-bold text-amber-400">{serviceStats.dueSoon}</div>
                              <div className="text-[9px] text-amber-300 uppercase">Due Soon</div>
                            </div>
                            <div className="bg-green-900/40 p-2 rounded text-center border border-green-900/60">
                              <div className="text-lg font-bold text-green-400">{serviceStats.healthy}</div>
                              <div className="text-[9px] text-green-300 uppercase">Healthy</div>
                            </div>
                          </div>
                        </div>

                        {/* Roller Assets */}
                        <div className="mb-6 p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">Roller Assets</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-red-900/40 p-2 rounded text-center border border-red-900/60">
                              <div className="text-lg font-bold text-red-400">{rollerStats.critical}</div>
                              <div className="text-[9px] text-red-300 uppercase">Critical</div>
                            </div>
                            <div className="bg-amber-900/40 p-2 rounded text-center border border-amber-900/60">
                              <div className="text-lg font-bold text-amber-400">{rollerStats.dueSoon}</div>
                              <div className="text-[9px] text-amber-300 uppercase">Due Soon</div>
                            </div>
                            <div className="bg-green-900/40 p-2 rounded text-center border border-green-900/60">
                              <div className="text-lg font-bold text-green-400">{rollerStats.healthy}</div>
                              <div className="text-[9px] text-green-300 uppercase">Healthy</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500">
                    <span>Last Compliance Check: {formatDate(new Date(), true)}</span>
                    <span className="text-cyan-500 font-bold group-hover:underline">View Dashboard →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )
      }

      {/* ===== MAIN CONTENT AREA (SITE DASHBOARD) ===== */}
      {
        selectedSiteId && (
          <main className={`main-content flex-1 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} p-6 transition-all duration-300`}>
            <header className="mb-6 text-center relative">
              <h1 className="text-3xl font-bold text-slate-100 mb-2">
                {selectedSite.customer ? `${selectedSite.customer} Dashboard` : 'Distribution Hub Dashboard'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === 'service' && localViewMode === 'list' && 'Service Schedule'}
                {activeTab === 'roller' && localViewMode === 'list' && 'Roller Replacement'}
                {activeTab === 'issues' && 'Site Issue Tracker'}
                {localViewMode === 'timeline' && 'Maintenance Timeline'}
              </p>

              {/* Export / Print Button */}
              <div className="absolute top-0 right-0" ref={printMenuRef}>
                <button
                  onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-2 border border-slate-600"
                  title="Export / Print"
                >
                  <Icons.Printer size={18} />
                  <span className="text-sm font-medium">Export / Print</span>
                </button>

                {/* Dropdown Menu */}
                {isPrintMenuOpen && (
                  <div className="mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => handlePrint('full')}
                      className="w-full px-6 py-3 text-sm text-left hover:bg-slate-600 text-slate-300 flex items-center gap-2"
                    >
                      <span>🖨️</span> Full Dashboard
                    </button>
                    <button
                      onClick={() => handlePrint('schedule')}
                      className="w-full px-6 py-3 text-sm text-left hover:bg-slate-600 text-slate-300 flex items-center gap-2"
                    >
                      <span>📅</span> Schedule & Chart
                    </button>
                    <button
                      onClick={() => handlePrint('specs')}
                      disabled={selectedRowIds.size === 0}
                      className={`w-full px-6 py-3 text-sm text-left flex items-center gap-2 ${selectedRowIds.size === 0
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'hover:bg-slate-600 text-slate-300'
                        }`}
                    >
                      <span>📋</span> Asset Specs {selectedRowIds.size === 0 && '(Select assets)'}
                    </button>
                    <button
                      onClick={() => { setIsPrintMenuOpen(false); setIsReportModalOpen(true); }}
                      className="w-full px-6 py-3 text-sm text-left hover:bg-slate-600 text-slate-300 flex items-center gap-2"
                    >
                      <span>📄</span> Customer Report
                    </button>
                  </div>
                )}
              </div>
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
                            <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 min-w-[100px]" onClick={() => { handleSort('opStatus'); setSelectedRowIds(new Set()); }}>Op Status {getSortIcon('opStatus')}</th>
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
                                  }}
                                  className={`rounded-full px-2 py-0.5 text-xs font-bold border ${item.opStatus === 'Down' ? 'bg-red-900/30 text-red-500 border-red-800' :
                                    item.opStatus === 'Warning' ? 'bg-amber-900/30 text-amber-500 border-amber-800' :
                                      item.opStatus === 'Out of Service' ? 'bg-slate-700 text-slate-400 border-slate-600' :
                                        'bg-emerald-900/30 text-emerald-500 border-emerald-800'
                                    }`}
                                  title={item.opNote || 'Click to update operational status'}
                                >
                                  {item.opStatus || 'Operational'}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center no-print">
                                <div className="flex justify-center gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); setViewAnalyticsAsset(item); setWizardAction('analytics'); setIsActionMenuOpen(false); }} className="p-1.5 rounded hover:bg-slate-600 text-purple-400" title="Analytics"><Icons.Activity size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setWizardAction('report'); setIsActionMenuOpen(false); setSelectedAssetId(item.id); setIsReportWizardOpen(true); }} className="p-1.5 rounded hover:bg-slate-600 text-green-400" title="New Report"><Icons.FileText size={14} /></button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center no-print">
                                <button
                                  onClick={(e) => toggleAssetStatus(item, e)}
                                  className={`p-1.5 rounded transition-colors ${item.active === false ? 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600' : 'hover:bg-slate-600 text-slate-400 hover:text-red-400'}`}
                                  title={item.active === false ? "Restore" : "Archive"}
                                >
                                  {item.active === false ? <Icons.Redo size={14} /> : <Icons.Archive size={14} />}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center no-print">
                                <button onClick={(e) => { e.stopPropagation(); setEditingAsset(item); setIsAssetEditModalOpen(true); }} className="p-1.5 rounded hover:bg-slate-600 text-blue-400" title="Edit Asset Details & Specs">
                                  <Icons.Edit />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {
                      selectedRowIds.size > 0 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-6 py-3 rounded-full shadow-lg border border-slate-600 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 z-20 no-print">
                          <span className="font-bold text-sm">{selectedRowIds.size} Selected</span>
                          <div className="h-4 w-px bg-slate-500"></div>
                          <button onClick={performBulkService} className="text-sm font-medium text-slate-300 hover:text-green-400 flex items-center gap-2 bg-transparent shadow-none border-none p-0 transition-colors"><Icons.CheckCircle size={16} /> Mark as Serviced Today</button>
                          <div className="h-4 w-px bg-slate-500"></div>
                          <button onClick={() => { exportBulkCSV(); setSelectedRowIds(new Set()); }} className="text-sm font-medium hover:text-cyan-300 flex items-center gap-2"><Icons.FileCsv /> Export List</button>
                          <div className="h-4 w-px bg-slate-500"></div>
                          <button onClick={() => setSelectedRowIds(new Set())} className="text-xs text-slate-400 hover:text-white">Clear</button>
                        </div>
                      )
                    }
                  </FullScreenContainer >
                </section >

                <hr className="border-slate-800" />

                {/* ===== FULL-WIDTH SECTION: Equipment Details ===== */}
                <section aria-label="Equipment Details" className="w-full" id="print-section-specs">
                  <FullScreenContainer className="bg-slate-800/80 rounded-xl shadow-md border border-slate-700 flex flex-col" title="Equipment Specification">
                    <div className="p-4 border-b border-slate-700 bg-slate-900/30 rounded-t-xl flex justify-between items-center">
                      <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200"><Icons.Database /> Equipment Details</h2>
                      {selectedAsset && (
                        <div className="no-print mr-8 flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeFullscreen();
                              setIsReportHistoryOpen(true);
                              setSelectedRowIds(new Set());
                            }}
                          >
                            <Icons.History size={16} /> View Reports
                          </Button>
                          <Button
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeFullscreen();
                              setIsServiceReportOpen(true);
                              setSelectedRowIds(new Set());
                            }}
                          >
                            <Icons.FileText size={16} /> New Service Report
                          </Button>
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
              </div >
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
        )
      }

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

      {/* CONTACT INFO MODAL */}
      <ContactModal
        site={viewContactSite}
        onClose={() => setViewContactSite(null)}
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

      {/* SERVICE REPORT MODAL */}
      {
        isServiceReportOpen && (
          <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <ServiceReportForm
                site={selectedSite}
                asset={selectedAsset}
                onClose={() => {
                  setIsServiceReportOpen(false);
                  setEditingReportId(null);
                  setServiceReportInitialData(null);
                  setServiceReportReadOnly(false);
                }}
                onSave={(data) => handleGenerateReport(data)}
                initialData={serviceReportInitialData}
                readOnly={serviceReportReadOnly}
              />
            </div>
          </div>
        )
      }

      {/* REPORT HISTORY MODAL */}
      {
        isReportHistoryOpen && selectedAsset && (
          <ReportHistoryModal
            asset={selectedAsset}
            onClose={() => setIsReportHistoryOpen(false)}
            onRegeneratePDF={handleRegeneratePDF}
            onViewReport={handleViewReport}
            onEditReport={handleEditReport}
            onNewReport={() => {
              setIsReportHistoryOpen(false);
              setReportFormState({ site: selectedSite, asset: selectedAsset });
            }}
          />
        )
      }

      {/* EASTER EGG OVERLAY */}

      <ReportWizardModal
        isOpen={isReportWizardOpen}
        onClose={() => setIsReportWizardOpen(false)}
        sites={sites}
        onSelectAsset={(site, asset) => {
          setIsReportWizardOpen(false);
          setReportFormState({ site, asset }); // Open the actual form
        }}
      />

      {/* UNIVERSAL CONTEXT WIZARD */}
      <ContextWizardModal
        isOpen={!!wizardAction}
        onClose={() => setWizardAction(null)}
        sites={sites}
        actionTitle={
          wizardAction === 'analytics' ? 'View Analytics For...' :
            wizardAction === 'report' ? 'Create Report For...' :
              wizardAction === 'specs' ? 'Edit Specs For...' :
                wizardAction === 'timeline' ? 'View Timeline For...' : 'Select Asset'
        }
        onComplete={(site, asset) => {
          // 1. Set the global Site/Asset Context first
          setSelectedSiteId(site.id);
          setWizardAction(null); // Close wizard

          // 2. Perform the Specific Action
          if (wizardAction === 'analytics') {
            setSelectedAssetId(asset.id);
            setViewAnalyticsAsset(asset);
          } else if (wizardAction === 'report') {
            setSelectedAssetId(asset.id);
            setReportFormState({ site, asset });
          } else if (wizardAction === 'timeline') {
            // Open timeline in fullscreen for the selected site
            setLocalViewMode('timeline');
            setExpandedSection('timeline');
          } else if (wizardAction === 'specs') {
            setSelectedAssetId(asset.id);
            // Find specs for this asset
            const specs = (site.specData || []).find(s =>
              s.weigher === asset.weigher || s.altCode === asset.code || s.weigher === asset.code
            );
            setEditingAsset(asset);
            setEditingSpecs(specs || null);
            setIsAssetEditModalOpen(true);
          }
        }}
      />

      {/* The actual Report Form (Full Screen Overlay) */}
      {
        reportFormState && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-7xl h-[95vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
              <ServiceReportForm
                site={reportFormState.site}
                asset={reportFormState.asset}
                onClose={() => setReportFormState(null)}
                onSave={(data) => handleGenerateReport(data, reportFormState.asset)}
              />
            </div>
          </div>
        )
      }

      {
        isCooked && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-in fade-in duration-300 cursor-pointer" onClick={() => setIsCooked(false)}>
            <div className="text-center">
              <h1 className="text-6xl md:text-8xl font-black text-red-600 uppercase tracking-widest animate-bounce mb-4">COOKED</h1>
              <p className="text-2xl text-red-400 font-mono">stop pushing things so many times! insanity.</p>
            </div>
          </div>
        )
      }

      {/* EMPLOYEE MANAGER MODAL */}
      <EmployeeManager
        isOpen={isEmployeeManagerOpen}
        onClose={() => setIsEmployeeManagerOpen(false)}
        employees={employees}
        sites={sites}
        onAddEmployee={handleAddEmployee}
        onUpdateEmployee={handleUpdateEmployee}
      />

    </div >
  );
}


export default App;
