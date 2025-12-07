import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { Button } from '../UIComponents';
import { GeneralTab } from './tabs/GeneralTab';
import { CalibrationTab } from './tabs/CalibrationTab';
import { IntegratorTab } from './tabs/IntegratorTab';

export const ServiceReportForm = ({ site, asset, onClose, onSave, initialData = null, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [draftSaved, setDraftSaved] = useState(false);

    // --- INITIAL STATE ---
    const [formData, setFormData] = useState({
        general: {
            reportId: `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}-CALR-${asset?.code || 'UNK'}`,
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
            comments: ''
        },
        // Backward compatibility: keep old calibration structure
        calibration: {
            oldTare: '0.000', newTare: '0.000', tareChange: '0.00',
            oldSpan: '1.000', newSpan: '1.000', spanChange: '0.00',
            oldSpeed: '0.00', newSpeed: '0.00', speedChange: '0.00'
        },
        // New dynamic calibration rows
        calibrationRows: null, // Will be initialized on first use
        integrator: [
            { id: 1, label: 'Scale Capacity (t/h)', asFound: '1500', asLeft: '1500', diff: '0' },
            { id: 2, label: 'Totaliser (t)', asFound: '0', asLeft: '0', diff: '0' },
            { id: 3, label: 'Pulses Per Length', asFound: '24.86', asLeft: '24.86', diff: '0.00' },
            { id: 4, label: 'Test Time (s)', asFound: '60.00', asLeft: '60.00', diff: '0.00' },
            { id: 5, label: 'Simulated Rate (t/h)', asFound: '0.00', asLeft: '0.00', diff: '0.00' },
            { id: 6, label: 'Load Cell (mV)', asFound: '8.55', asLeft: '8.55', diff: '0.00' }
        ],
        integratorRows: null // Will use 'integrator' if not set
    });

    // --- LOAD DATA ON MOUNT ---
    useEffect(() => {
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
                }
            }
        }
    }, [asset?.id, initialData, site?.logo]);

    // --- AUTO-SAVE DRAFT ---
    useEffect(() => {
        if (asset?.id && !readOnly && !initialData) {
            const draftKey = `serviceReportDraft_${asset.id}`;
            localStorage.setItem(draftKey, JSON.stringify(formData));
            setDraftSaved(true);

            // Clear indicator after 2 seconds
            const timer = setTimeout(() => setDraftSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [formData, asset?.id, readOnly, initialData]);

    // --- HANDLERS ---
    const handleGeneralChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            general: { ...prev.general, [field]: value }
        }));
    };

    const handleCalibrationChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleIntegratorChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
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
                            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={() => onSave({ ...formData, download: false })}>
                                <Icons.Save size={16} /> Save Record
                            </Button>
                            <Button variant="primary" onClick={() => onSave({ ...formData, download: true })}>
                                <Icons.Download size={16} /> Save & PDF
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-800">
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
                        readOnly={readOnly}
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
    );
};
