import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { Button } from '../UIComponents';

export const ServiceReportForm = ({ site, asset, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [draftSaved, setDraftSaved] = useState(false);

    // --- INITIAL STATE ---
    const [formData, setFormData] = useState({
        general: {
            reportId: `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}-CALR-${asset?.code || 'UNK'}`,
            jobNumber: '',
            customerName: site?.customer || '',
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
        calibration: {
            oldTare: '0.000', newTare: '0.000', tareChange: '0.00',
            oldSpan: '1.000', newSpan: '1.000', spanChange: '0.00',
            oldSpeed: '0.00', newSpeed: '0.00', speedChange: '0.00'
        },
        integrator: [
            { id: 1, label: 'Scale Capacity (t/h)', asFound: '1500', asLeft: '1500', diff: '0' },
            { id: 2, label: 'Totaliser (t)', asFound: '0', asLeft: '0', diff: '0' },
            { id: 3, label: 'Pulses Per Length', asFound: '24.86', asLeft: '24.86', diff: '0.00' },
            { id: 4, label: 'Test Time (s)', asFound: '60.00', asLeft: '60.00', diff: '0.00' },
            { id: 5, label: 'Simulated Rate (t/h)', asFound: '0.00', asLeft: '0.00', diff: '0.00' },
            { id: 6, label: 'Load Cell (mV)', asFound: '8.55', asLeft: '8.55', diff: '0.00' }
        ]
    });

    // --- LOAD DRAFT ON MOUNT ---
    useEffect(() => {
        if (asset?.id) {
            const draftKey = `serviceReportDraft_${asset.id}`;
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                try {
                    const parsedDraft = JSON.parse(savedDraft);
                    setFormData(parsedDraft);
                    setDraftSaved(true);
                } catch (error) {
                    console.error('Error loading draft:', error);
                }
            }
        }
    }, [asset?.id]);

    // --- AUTO-SAVE DRAFT ---
    useEffect(() => {
        if (asset?.id) {
            const draftKey = `serviceReportDraft_${asset.id}`;
            localStorage.setItem(draftKey, JSON.stringify(formData));
            setDraftSaved(true);

            // Clear indicator after 2 seconds
            const timer = setTimeout(() => setDraftSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [formData, asset?.id]);

    // --- AUTO CALCULATIONS ---
    // Updates the "Difference" or "% Change" whenever inputs change
    useEffect(() => {
        const calcPct = (oldVal, newVal) => {
            const o = parseFloat(oldVal);
            const n = parseFloat(newVal);
            if (!o || o === 0) return '0.00';
            return (((n - o) / o) * 100).toFixed(2);
        };

        setFormData(prev => ({
            ...prev,
            calibration: {
                ...prev.calibration,
                tareChange: calcPct(prev.calibration.oldTare, prev.calibration.newTare),
                spanChange: calcPct(prev.calibration.oldSpan, prev.calibration.newSpan),
                speedChange: calcPct(prev.calibration.oldSpeed, prev.calibration.newSpeed),
            }
        }));
    }, [
        formData.calibration.oldTare, formData.calibration.newTare,
        formData.calibration.oldSpan, formData.calibration.newSpan,
        formData.calibration.oldSpeed, formData.calibration.newSpeed
    ]);

    // Handle Integrator Row Updates
    const updateIntegratorRow = (id, field, value) => {
        const updatedRows = formData.integrator.map(row => {
            if (row.id === id) {
                const newRow = { ...row, [field]: value };
                // Auto-calc difference if both are numbers
                const diff = (parseFloat(newRow.asLeft) - parseFloat(newRow.asFound));
                newRow.diff = isNaN(diff) ? '-' : diff.toFixed(2);
                return newRow;
            }
            return row;
        });
        setFormData({ ...formData, integrator: updatedRows });
    };

    const handleGeneralChange = (field, value) => {
        setFormData(prev => {
            const updated = {
                ...prev,
                general: { ...prev.general, [field]: value }
            };

            // Update reportId when job number changes
            if (field === 'jobNumber') {
                const date = new Date(updated.general.serviceDate);
                const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                const assetName = (updated.general.assetName || asset?.name || 'Asset').replace(/[^a-zA-Z0-9]/g, '_');
                updated.general.reportId = `${dateStr}-CALR-${value}-${assetName}`;
            }

            return updated;
        });
    };

    const handleCalChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            calibration: { ...prev.calibration, [field]: value }
        }));
    };

    const addIntegratorRow = () => {
        const newId = Math.max(...formData.integrator.map(r => r.id)) + 1;
        setFormData(prev => ({
            ...prev,
            integrator: [...prev.integrator, {
                id: newId,
                label: 'New Parameter',
                asFound: '0',
                asLeft: '0',
                diff: '0'
            }]
        }));
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Icons.FileText className="text-cyan-400" />
                        New Service Report
                    </h2>
                    <div className="flex items-center gap-3">
                        <p className="text-xs text-slate-400">Generating for: {asset?.name}</p>
                        {draftSaved && (
                            <span className="text-xs text-green-400 flex items-center gap-1 animate-in fade-in duration-200">
                                <Icons.Check size={12} /> Draft saved
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSave(formData)}>
                        <Icons.Save size={16} /> Save & Generate PDF
                    </Button>
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
                    <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                            <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs">Customer Info</h3>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Customer Name</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.customerName}
                                    onChange={e => handleGeneralChange('customerName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Site Location</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.siteLocation}
                                    onChange={e => handleGeneralChange('siteLocation', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Contact Name</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.contactName}
                                    onChange={e => handleGeneralChange('contactName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Contact Email</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.contactEmail}
                                    onChange={e => handleGeneralChange('contactEmail', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                            <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs">Service Info</h3>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Job Number *</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.jobNumber}
                                    onChange={e => handleGeneralChange('jobNumber', e.target.value)}
                                    placeholder="e.g., 25202"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Service Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.serviceDate}
                                    onChange={e => handleGeneralChange('serviceDate', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Technicians</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.technicians}
                                    onChange={e => handleGeneralChange('technicians', e.target.value)}
                                    placeholder="e.g., Tech A, Tech B"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Comments / Recommendations</label>
                                <textarea
                                    rows={4}
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    value={formData.general.comments}
                                    onChange={e => handleGeneralChange('comments', e.target.value)}
                                    placeholder="Enter service notes here..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: CALIBRATION */}
                {activeTab === 'calibration' && (
                    <div className="max-w-4xl mx-auto bg-slate-800 p-6 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-6">Critical Calibration Results</h3>

                        {/* Custom Grid Header */}
                        <div className="grid grid-cols-4 gap-4 mb-2 text-xs font-bold text-slate-400 uppercase">
                            <div>Parameter</div>
                            <div>Old (As Found)</div>
                            <div>New (As Left)</div>
                            <div>% Change</div>
                        </div>

                        {/* Row: Tare */}
                        <div className="grid grid-cols-4 gap-4 mb-4 items-center">
                            <div className="font-bold text-slate-200">Tare (kg/m)</div>
                            <input
                                type="number"
                                step="0.001"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={formData.calibration.oldTare}
                                onChange={e => handleCalChange('oldTare', e.target.value)}
                            />
                            <input
                                type="number"
                                step="0.001"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={formData.calibration.newTare}
                                onChange={e => handleCalChange('newTare', e.target.value)}
                            />
                            <div className={`font-mono font-bold ${parseFloat(formData.calibration.tareChange) > 1 ? 'text-red-400' : 'text-green-400'}`}>
                                {formData.calibration.tareChange}%
                            </div>
                        </div>

                        {/* Row: Span */}
                        <div className="grid grid-cols-4 gap-4 mb-4 items-center">
                            <div className="font-bold text-slate-200">Span / Factor</div>
                            <input
                                type="number"
                                step="0.0001"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={formData.calibration.oldSpan}
                                onChange={e => handleCalChange('oldSpan', e.target.value)}
                            />
                            <input
                                type="number"
                                step="0.0001"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={formData.calibration.newSpan}
                                onChange={e => handleCalChange('newSpan', e.target.value)}
                            />
                            <div className={`font-mono font-bold ${parseFloat(formData.calibration.spanChange) > 1 ? 'text-red-400' : 'text-green-400'}`}>
                                {formData.calibration.spanChange}%
                            </div>
                        </div>

                        {/* Row: Speed */}
                        <div className="grid grid-cols-4 gap-4 mb-4 items-center">
                            <div className="font-bold text-slate-200">Belt Speed (m/s)</div>
                            <input
                                type="number"
                                step="0.01"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={formData.calibration.oldSpeed}
                                onChange={e => handleCalChange('oldSpeed', e.target.value)}
                            />
                            <input
                                type="number"
                                step="0.01"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={formData.calibration.newSpeed}
                                onChange={e => handleCalChange('newSpeed', e.target.value)}
                            />
                            <div className="font-mono font-bold text-slate-400">
                                {formData.calibration.speedChange}%
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: INTEGRATOR */}
                {activeTab === 'integrator' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Parameter Description</th>
                                        <th className="p-3 w-32">As Found</th>
                                        <th className="p-3 w-32">As Left</th>
                                        <th className="p-3 w-24">Diff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {formData.integrator.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-700/50">
                                            <td className="p-3 font-medium text-slate-200">
                                                <input
                                                    className="bg-transparent w-full focus:outline-none text-white"
                                                    value={row.label}
                                                    onChange={e => updateIntegratorRow(row.id, 'label', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    className="bg-slate-900 border border-slate-600 rounded p-1 w-full text-center text-white"
                                                    value={row.asFound}
                                                    onChange={e => updateIntegratorRow(row.id, 'asFound', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    className="bg-slate-900 border border-slate-600 rounded p-1 w-full text-center text-white"
                                                    value={row.asLeft}
                                                    onChange={e => updateIntegratorRow(row.id, 'asLeft', e.target.value)}
                                                />
                                            </td>
                                            <td className={`p-3 text-center font-mono ${parseFloat(row.diff) !== 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                {row.diff}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-3 bg-slate-900 border-t border-slate-700">
                                <Button
                                    variant="secondary"
                                    className="text-xs w-full"
                                    onClick={addIntegratorRow}
                                >
                                    <Icons.Plus size={16} /> Add Custom Parameter
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
