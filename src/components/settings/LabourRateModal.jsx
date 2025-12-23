import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { getLabourRate, setLabourRate } from '../../services/settingsService';

export const LabourRateModal = ({ isOpen, onClose }) => {
    const [labourRate, setLabourRateLocal] = useState('50.00');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadLabourRate = async () => {
            if (isOpen) {
                setLoading(true);
                try {
                    const rate = await getLabourRate();
                    setLabourRateLocal((rate / 100).toFixed(2));
                } catch {
                    setError('Failed to load labour rate');
                } finally {
                    setLoading(false);
                }
            }
        };

        loadLabourRate();
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const rateInCents = Math.round(parseFloat(labourRate) * 100);
            await setLabourRate(rateInCents);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save labour rate');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Labour Rate Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <Icons.X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Icons.Loader className="animate-spin text-cyan-400" size={32} />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Labour Rate (per hour)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={labourRate}
                                        onChange={(e) => setLabourRateLocal(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="50.00"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-400">
                                    This rate will be used to calculate labour costs for all products
                                </p>
                            </div>

                            <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                                <div className="flex items-start gap-2">
                                    <Icons.Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-cyan-300">
                                        Changing this rate will automatically update the cost calculation for all products with labour time
                                    </p>
                                </div>
                            </div>
                        </>
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
                            disabled={saving || loading}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
