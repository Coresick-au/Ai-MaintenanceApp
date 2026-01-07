import React, { useState } from 'react';
import { Icons } from '../../constants/icons';
import { formatCurrency } from '../../services/specializedComponentsService';

export const IdlerFrameConfigModal = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [formData, setFormData] = useState({
        camPricePerUnit: currentConfig?.camPricePerUnit
            ? (currentConfig.camPricePerUnit / 100).toFixed(2)
            : '0.00',
        effectiveDate: currentConfig?.effectiveDate || new Date().toISOString().split('T')[0]
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const camPriceCents = Math.round(parseFloat(formData.camPricePerUnit) * 100);

            await onSave({
                camPricePerUnit: camPriceCents,
                effectiveDate: formData.effectiveDate
            });

            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl">
                <div className="border-b border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">Idler Frame Settings</h3>
                            <p className="text-sm text-slate-400 mt-1">Configure global pricing options</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icons.X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Cam Price */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Cam Price per Unit ($) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.camPricePerUnit}
                            onChange={(e) => setFormData(prev => ({ ...prev, camPricePerUnit: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="0.00"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            This price will be automatically added to all idler frames with cams enabled
                        </p>
                    </div>

                    {/* Effective Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Effective Date <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.effectiveDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>

                    {/* Current Config Display */}
                    {currentConfig?.camPricePerUnit > 0 && (
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <p className="text-xs text-slate-400 mb-1">Current Setting:</p>
                            <p className="text-sm text-white">
                                Cam Price: <span className="font-mono text-emerald-400">{formatCurrency(currentConfig.camPricePerUnit)}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Effective: {currentConfig.effectiveDate}
                            </p>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Icons.Loader className="animate-spin" size={16} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Icons.Save size={16} />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
