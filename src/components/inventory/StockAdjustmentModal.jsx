import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { adjustStockQuantity, transferStock } from '../../services/inventoryService';

export const StockAdjustmentModal = ({ isOpen, onClose, part }) => {
    const [locations, setLocations] = useState([]);
    const [mode, setMode] = useState('adjust'); // 'adjust' or 'transfer'
    const [formData, setFormData] = useState({
        locationId: '',
        quantity: '',
        notes: '',
        fromLocationId: '',
        toLocationId: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = onSnapshot(collection(db, 'locations'), (snap) => {
            setLocations(snap.docs.map(doc => doc.data()));
        });

        return () => unsubscribe();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                locationId: '',
                quantity: '',
                notes: '',
                fromLocationId: '',
                toLocationId: ''
            });
            setMode('adjust');
            setError('');
        }
    }, [isOpen, part]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const userId = 'current-user'; // TODO: Get from auth context

            if (mode === 'adjust') {
                const delta = parseInt(formData.quantity);
                await adjustStockQuantity(
                    part.id,
                    formData.locationId,
                    delta,
                    userId,
                    formData.notes
                );
            } else {
                const quantity = parseInt(formData.quantity);
                await transferStock(
                    part.id,
                    formData.fromLocationId,
                    formData.toLocationId,
                    quantity,
                    userId,
                    formData.notes
                );
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Failed to adjust stock');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !part) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Adjust Stock</h2>
                        <p className="text-sm text-slate-400 mt-1">{part.sku} - {part.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Icons.X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('adjust')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'adjust'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Icons.Plus size={18} />
                                Adjust Quantity
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('transfer')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'transfer'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Icons.ArrowRight size={18} />
                                Transfer Stock
                            </div>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {mode === 'adjust' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Location <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.locationId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="">Select location...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Quantity Change <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Use + for additions, - for removals (e.g., +50 or -10)"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Positive numbers add stock, negative numbers remove stock
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        From Location <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.fromLocationId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, fromLocationId: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="">Select source...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        To Location <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.toLocationId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, toLocationId: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="">Select destination...</option>
                                        {locations.filter(l => l.id !== formData.fromLocationId).map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Quantity to Transfer <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Enter quantity"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows="2"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Optional notes for audit trail..."
                        />
                    </div>

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
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (mode === 'adjust' ? 'Adjust Stock' : 'Transfer Stock')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
