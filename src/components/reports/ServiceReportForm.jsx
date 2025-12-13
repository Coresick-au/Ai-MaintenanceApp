import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { Button } from '../UIComponents';
import { GeneralTab } from './tabs/GeneralTab';
import { CalibrationTab } from './tabs/CalibrationTab';
import { IntegratorTab } from './tabs/IntegratorTab';

export const ServiceReportForm = ({ site, asset, employees = [], onClose, onSave, initialData = null, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [draftSaved, setDraftSaved] = useState(false);

    // --- INITIAL STATE ---
    // --- HELPER: Calculate Next Date ---
    const calculateNextDate = (startDate, schedule) => {
        console.log('Calculating Next Date. Start:', startDate, 'Schedule:', schedule); // DEBUG
        if (!startDate) return '';

        const sched = schedule || 'Yearly';
        let monthsToAdd = 12; // Default

        const lowerSched = String(sched).toLowerCase();

        if (lowerSched.includes('month') && lowerSched.includes('1')) monthsToAdd = 1;
        else if (lowerSched.includes('quarter') || lowerSched.includes('3')) monthsToAdd = 3;
        else if (lowerSched.includes('half') || lowerSched.includes('6')) monthsToAdd = 6;
        else if (lowerSched.includes('year') || lowerSched.includes('annual') || lowerSched.includes('12')) monthsToAdd = 12;
        else if (!isNaN(parseInt(lowerSched))) monthsToAdd = parseInt(lowerSched);

        console.log('Months to add:', monthsToAdd); // DEBUG

        const date = new Date(startDate);
        if (isNaN(date.getTime())) return '';

        date.setMonth(date.getMonth() + monthsToAdd);
        return date.toISOString().split('T')[0];
    };

    // --- INITIAL STATE ---
    const [formData, setFormData] = useState(() => {
        const today = new Date().toISOString().split('T')[0];
        // Calculate initial next date immediately if not editing an existing draft/report
        const calcNext = !initialData ? calculateNextDate(today, asset?.serviceSchedule) : (asset?.dueDate || '');

        return {
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
                serviceDate: today,
                nextServiceDate: calcNext, // Use calculated date
                technicians: '',
                comments: '',
                photos: []
            },
            // ... (rest of initial state stays same, but we need to duplicate it here because we are replacing the whole block or need to merge)
            calibration: {
                oldTare: '0.000', newTare: '0.000', tareChange: '0.00',
                oldSpan: '1.000', newSpan: '1.000', spanChange: '0.00',
                oldSpeed: '0.00', newSpeed: '0.00', speedChange: '0.00'
            },
            calibrationRows: null,
            integrator: [
                { id: 1, label: 'Scale Capacity (t/h)', asFound: '1500', asLeft: '1500', diff: '0' },
                { id: 2, label: 'Totaliser (t)', asFound: '0', asLeft: '0', diff: '0' },
                { id: 3, label: 'Pulses Per Length', asFound: '24.86', asLeft: '24.86', diff: '0.00' },
                { id: 4, label: 'Test Time (s)', asFound: '60.00', asLeft: '60.00', diff: '0.00' },
                { id: 5, label: 'Simulated Rate (t/h)', asFound: '0.00', asLeft: '0.00', diff: '0.00' },
                { id: 6, label: 'Load Cell (mV)', asFound: '8.55', asLeft: '8.55', diff: '0.00' }
            ],
            integratorRows: null
        };
    });

    // ... (useEffect for Drafts need to handle state updates carefully)

    // --- HANDLERS ---
    const handleGeneralChange = (field, value) => {
        setFormData(prev => {
            const newGeneral = { ...prev.general, [field]: value };

            if (field === 'serviceDate' && value) {
                const nextDate = calculateNextDate(value, asset?.serviceSchedule);
                if (nextDate) {
                    newGeneral.nextServiceDate = nextDate;
                }
            }

            return {
                ...prev,
                general: newGeneral
            };
        });
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
        </div>
    );
};
