import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { Button } from '../UIComponents';
import { GeneralTab } from './tabs/GeneralTab';
import { CalibrationTab } from './tabs/CalibrationTab';
import { IntegratorTab } from './tabs/IntegratorTab';

const DEFAULT_INTEGRATOR_ROWS = [
    { id: 1, label: 'Scale Capacity (t/h)', asFound: '1500', asLeft: '1500', diff: '0', percentChange: '0.00', showPercentage: false },
    { id: 2, label: 'Totaliser (t)', asFound: '0', asLeft: '0', diff: '0', percentChange: '0.00', showPercentage: false },
    { id: 3, label: 'Pulses Per Length', asFound: '24.86', asLeft: '24.86', diff: '0.00', percentChange: '0.00', showPercentage: false },
    { id: 4, label: 'Test Time (s)', asFound: '60.00', asLeft: '60.00', diff: '0.00', percentChange: '0.00', showPercentage: false },
    { id: 5, label: 'Simulated Rate (t/h)', asFound: '0.00', asLeft: '0.00', diff: '0.00', percentChange: '0.00', showPercentage: false },
    { id: 6, label: 'Load Cell (mV)', asFound: '8.55', asLeft: '8.55', diff: '0.00', percentChange: '0.00', showPercentage: false }
];

const DEFAULT_TEMPLATES = [
    {
        id: 'std_integrator',
        name: 'Standard Integrator',
        integrator: DEFAULT_INTEGRATOR_ROWS
    }
];

export const ServiceReportForm = ({ site, asset, employees = [], onClose, onSave, initialData = null, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [draftSaved, setDraftSaved] = useState(false);

    // Template Management State
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateRows, setNewTemplateRows] = useState([...DEFAULT_INTEGRATOR_ROWS]);
    const [editingTemplateId, setEditingTemplateId] = useState(null);

    // Validation State
    const [validationErrors, setValidationErrors] = useState({});

    // --- INITIAL STATE ---
    const [formData, setFormData] = useState({
        general: {
            reportId: `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}-CALRPENDING-${asset?.code || 'UNK'}`,
            jobNumber: '',
            customerName: site?.customer || '',
            customerLogo: site?.logo || null,
            siteLocation: site?.location || '',
            contactName: site?.contactName || '',
            contactEmail: site?.contactEmail || '',
            assetName: asset?.name || '',
            conveyorNumber: asset?.code || '',
            serviceDate: new Date().toISOString().split('T')[0],
            nextServiceDate: asset?.dueDate || '',
            technicians: '',
            comments: '',
            photosLink: ''
        },
        calibration: {
            oldTare: '0.000', newTare: '0.000', tareChange: '0.00',
            oldSpan: '1.000', newSpan: '1.000', spanChange: '0.00',
            oldSpeed: '0.00', newSpeed: '0.00', speedChange: '0.00'
        },
        calibrationRows: null,
        integrator: DEFAULT_INTEGRATOR_ROWS,
        integratorRows: null
    });

    // --- LOAD DATA & TEMPLATES ---
    useEffect(() => {
        // Load custom templates from local storage
        const savedTemplates = JSON.parse(localStorage.getItem('serviceReportTemplates') || '[]');
        if (savedTemplates.length > 0) {
            setTemplates(prev => [...prev, ...savedTemplates]);
        }

        if (initialData) {
            setFormData({
                ...initialData,
                general: {
                    ...initialData.general,
                    customerLogo: initialData.general.customerLogo || site?.logo
                }
            });
        } else if (asset?.id) {
            const draftKey = `serviceReportDraft_${asset.id}`;
            const savedDraft = localStorage.getItem(draftKey);

            if (savedDraft) {
                try {
                    const parsedDraft = JSON.parse(savedDraft);
                    setFormData({
                        ...parsedDraft,
                        general: {
                            ...parsedDraft.general,
                            customerLogo: parsedDraft.general.customerLogo || site?.logo
                        }
                    });
                    setDraftSaved(true);
                } catch (error) {
                    console.error('Error loading draft:', error);
                    // If draft fails, show template modal since it's effectively a new report
                    if (!readOnly) setShowTemplateModal(true);
                }
            } else if (!readOnly) {
                // New report, no draft -> Show template selection
                setShowTemplateModal(true);
            }
        }
    }, [asset?.id, initialData, site?.logo, readOnly]);

    // --- AUTO-SAVE DRAFT ---
    useEffect(() => {
        if (asset?.id && !readOnly && !initialData && !showTemplateModal) {
            const draftKey = `serviceReportDraft_${asset.id}`;

            try {
                localStorage.setItem(draftKey, JSON.stringify(formData));
                setDraftSaved(true);
                const timer = setTimeout(() => setDraftSaved(false), 2000);
                return () => clearTimeout(timer);
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    console.warn('Local storage quota exceeded. Draft not saved.');
                }
            }
        }
    }, [formData, asset?.id, readOnly, initialData, showTemplateModal]);

    // --- HANDLERS ---
    const handleGeneralChange = (field, value) => {
        setFormData(prev => {
            const updates = { [field]: value };

            // Auto-update Report ID when Job Number changes
            if (field === 'jobNumber') {
                const date = new Date(prev.general.serviceDate);
                const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                const assetCode = asset?.code || 'UNK';
                const jobNum = value.trim() || 'PENDING';
                updates.reportId = `${dateStr}-CALR${jobNum}-${assetCode}`;
            }

            return {
                ...prev,
                general: { ...prev.general, ...updates }
            };
        });
    };

    const handleCalibrationChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleIntegratorChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- DRAFT MANAGEMENT ---
    const clearDraft = () => {
        if (asset?.id) {
            localStorage.removeItem(`serviceReportDraft_${asset.id}`);
            setDraftSaved(false);
        }
    };

    const handleSaveWrapper = async (dataWrapper) => {
        console.log('[handleSaveWrapper] Starting...', dataWrapper);
        // Validate required fields
        const errors = {};

        if (!dataWrapper.general.jobNumber || dataWrapper.general.jobNumber.trim() === '') {
            errors.jobNumber = 'Job Number is required';
        }

        if (!dataWrapper.general.technicians || dataWrapper.general.technicians.trim() === '') {
            errors.technicians = 'At least one technician is required';
        }

        // Show errors if any
        if (Object.keys(errors).length > 0) {
            console.log('[handleSaveWrapper] Validation errors:', errors);
            setValidationErrors(errors);
            setActiveTab('general'); // Switch to General tab where errors are
            return; // Don't proceed with save
        }

        console.log('[handleSaveWrapper] Validation passed, proceeding with save...');
        // Clear any previous errors
        setValidationErrors({});

        // Proceed with save
        try {
            console.log('[handleSaveWrapper] Calling onSave...');
            await onSave(dataWrapper);
            console.log('[handleSaveWrapper] onSave completed successfully');
            // Only clear draft on successful save
            clearDraft();
        } catch (error) {
            console.error('[handleSaveWrapper] Save failed:', error);
            // Don't close window on error - let user retry
        }
    };

    // --- TEMPLATE HANDLERS ---
    const handleSelectTemplate = (template) => {
        setFormData(prev => ({
            ...prev,
            integrator: template.integrator,
            integratorRows: template.integrator
        }));
        setShowTemplateModal(false);
    };

    const handleCreateTemplate = () => {
        if (!newTemplateName.trim()) return;

        let updatedTemplates;
        const newTemplate = {
            id: editingTemplateId || `custom_${Date.now()}`,
            name: newTemplateName,
            integrator: newTemplateRows
        };

        if (editingTemplateId) {
            // Update existing
            updatedTemplates = templates.map(t =>
                t.id === editingTemplateId ? newTemplate : t
            );
        } else {
            // Create new
            updatedTemplates = [...templates, newTemplate];
        }

        setTemplates(updatedTemplates);

        // Persist only custom templates
        const customTemplates = updatedTemplates.filter(t => t.id.startsWith('custom_'));
        localStorage.setItem('serviceReportTemplates', JSON.stringify(customTemplates));

        // Select the new/updated template immediately
        handleSelectTemplate(newTemplate);
        setIsCreatingTemplate(false);
        setEditingTemplateId(null);
    };

    const handleDeleteTemplate = (templateId) => {
        if (window.confirm('Are you sure you want to delete this template? This cannot be undone.')) {
            const updatedTemplates = templates.filter(t => t.id !== templateId);
            setTemplates(updatedTemplates);

            // Update local storage
            const customTemplates = updatedTemplates.filter(t => t.id.startsWith('custom_'));
            localStorage.setItem('serviceReportTemplates', JSON.stringify(customTemplates));
        }
    };

    const handleEditTemplate = (template) => {
        setNewTemplateName(template.name);
        setNewTemplateRows([...template.integrator]);
        setEditingTemplateId(template.id);
        setIsCreatingTemplate(true);
    };

    // --- RENDER TEMPLATE MODAL ---
    if (showTemplateModal) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Icons.FileText className="text-cyan-400" />
                                {isCreatingTemplate
                                    ? (editingTemplateId ? 'Edit Template' : 'Create New Template')
                                    : 'Select Report Type'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {isCreatingTemplate
                                    ? (editingTemplateId ? 'Modify the existing template parameters.' : 'Define the default parameters for this report type.')
                                    : 'Choose a template to initialize the service report.'}
                            </p>
                        </div>
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        {isCreatingTemplate ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                        placeholder="e.g., Heavy Duty Belt Scale"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Default Parameters</label>
                                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                                        {/* Reuse IntegratorTab for defining template structure */}
                                        <IntegratorTab
                                            formData={{ integratorRows: newTemplateRows }}
                                            onChange={(_, val) => setNewTemplateRows(val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Create New Card */}
                                <button
                                    onClick={() => {
                                        setIsCreatingTemplate(true);
                                        setNewTemplateRows([...DEFAULT_INTEGRATOR_ROWS]); // Start with defaults
                                        setNewTemplateName('');
                                        setEditingTemplateId(null); // Ensure we are in create mode
                                    }}
                                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-cyan-500 hover:bg-slate-800/50 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-cyan-900/30 transition-colors">
                                        <Icons.Plus className="text-cyan-400" size={24} />
                                    </div>
                                    <span className="font-bold text-white">Create New Template</span>
                                    <span className="text-xs text-slate-500 mt-1">Define custom parameters</span>
                                </button>

                                {/* Existing Templates */}
                                {templates.map(template => (
                                    <div
                                        key={template.id}
                                        className="relative group bg-slate-800 border border-slate-700 rounded-xl hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-900/20 transition-all"
                                    >
                                        <button
                                            onClick={() => handleSelectTemplate(template)}
                                            className="flex flex-col p-6 w-full text-left"
                                        >
                                            <div className="flex items-start justify-between w-full mb-3">
                                                <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-cyan-900/30 transition-colors">
                                                    <Icons.FileText className="text-cyan-400" size={20} />
                                                </div>
                                            </div>
                                            <span className="text-lg font-bold text-white mb-1">{template.name}</span>
                                            <span className="text-sm text-slate-400">{template.integrator.length} Parameters configured</span>
                                        </button>

                                        {/* Edit/Delete Actions for Custom Templates */}
                                        {template.id.startsWith('custom_') && (
                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditTemplate(template);
                                                    }}
                                                    className="p-1.5 bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                                                    title="Edit Template"
                                                >
                                                    <Icons.Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTemplate(template.id);
                                                    }}
                                                    className="p-1.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                                                    title="Delete Template"
                                                >
                                                    <Icons.Trash size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Custom Badge moved to bottom right */}
                                        {template.id.startsWith('custom_') && (
                                            <span className="absolute bottom-4 right-4 text-[10px] uppercase tracking-wider bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full pointer-events-none">Custom</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                        {isCreatingTemplate && (
                            <>
                                <Button variant="secondary" onClick={() => setIsCreatingTemplate(false)}>Back</Button>
                                <Button
                                    variant="primary"
                                    className="bg-emerald-600 hover:bg-emerald-500"
                                    onClick={handleCreateTemplate}
                                    disabled={!newTemplateName.trim()}
                                >
                                    <Icons.Save size={16} /> Save & Use Template
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-7xl h-[95vh] flex flex-col bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Icons.FileText className="text-cyan-400" />
                            {readOnly ? 'View Service Report' : 'New Service Report'}
                        </h2>
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-400">
                                {readOnly ? `Report ID: ${formData.general.reportId}` : `Generating for: ${asset?.name}`}
                            </p>
                            {draftSaved && (
                                <span className="text-xs text-green-400 flex items-center gap-1 animate-in fade-in duration-200">
                                    <Icons.Check size={12} /> Draft saved
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
                        {!readOnly && (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowTemplateModal(true)}
                                    title="Change Report Template"
                                >
                                    <Icons.LayoutTemplate size={16} /> Template
                                </Button>
                                <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={() => handleSaveWrapper({ ...formData, download: false })}>
                                    <Icons.Save size={16} /> Save Record
                                </Button>
                                <Button variant="primary" onClick={() => handleSaveWrapper({ ...formData, download: true })}>
                                    <Icons.Download size={16} /> Save & PDF
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800 flex-shrink-0">
                    {['general', 'calibration', 'integrator'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === tab
                                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            {tab === 'integrator' ? 'Integrator Data' : tab}
                        </button>
                    ))}
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* TAB: GENERAL */}
                    {activeTab === 'general' && (
                        <GeneralTab
                            formData={formData.general}
                            onChange={handleGeneralChange}
                            site={site}
                            asset={asset}
                            employees={employees}
                            readOnly={readOnly}
                            validationErrors={validationErrors}
                        />
                    )}

                    {/* TAB: CALIBRATION */}
                    {activeTab === 'calibration' && (
                        <CalibrationTab
                            formData={formData}
                            onChange={handleCalibrationChange}
                            readOnly={readOnly}
                        />
                    )}

                    {/* TAB: INTEGRATOR */}
                    {activeTab === 'integrator' && (
                        <IntegratorTab
                            formData={formData}
                            onChange={handleIntegratorChange}
                            readOnly={readOnly}
                        />
                    )}
                </div>
            </div>
        </div >
    );
};
