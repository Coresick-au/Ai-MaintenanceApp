import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import {
    getPricingForPart,
    addPricing,
    updatePricing,
    deletePricing
} from '../../services/partPricingService';

import { calculateLinearTrend, forecastCostAtDate } from '../../utils/costForecasting';
import { formatCurrency } from '../../utils/helpers';

export const PartPricingTab = ({ part, suppliers, onPartUpdate }) => {
    const [pricingEntries, setPricingEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        supplier: '',
        effectiveDate: '',
        costPrice: '',
        quantity: '',
        ignoreForTrend: false,
        notes: ''
    });

    // Forcasting state
    const [costPriceSource, setCostPriceSource] = useState('MANUAL');
    const [preferredSupplier, setPreferredSupplier] = useState(''); // Local state for optimistic updates
    const [trendData, setTrendData] = useState(null);
    const [hasSufficientHistory, setHasSufficientHistory] = useState(false); // Controls visibility of the section
    const [trendSupplier, setTrendSupplier] = useState(''); // The supplier currently being analyzed
    const [manualCostPrice, setManualCostPrice] = useState('');



    // Load pricing entries
    useEffect(() => {
        if (part?.id) {
            loadPricing();
            setCostPriceSource(part.costPriceSource || 'MANUAL');
            setPreferredSupplier(part.preferredSupplier || ''); // Sync local state
            setManualCostPrice((part.costPrice / 100).toFixed(2));
        }
    }, [part?.id, part?.costPrice, part?.costPriceSource, part?.preferredSupplier]);



    const loadPricing = async () => {
        try {
            setLoading(true);
            const pricing = await getPricingForPart(part.id);
            setPricingEntries(pricing);
        } catch (err) {
            console.error('Error loading pricing:', err);
            setError('Failed to load pricing');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Validation
            if (!formData.supplier || !formData.effectiveDate || !formData.costPrice || !formData.quantity) {
                setError('Please fill in all required fields');
                return;
            }

            const costPriceCents = Math.round(parseFloat(formData.costPrice) * 100);
            const quantity = parseInt(formData.quantity);

            if (costPriceCents <= 0) {
                setError('Cost price must be greater than 0');
                return;
            }

            if (quantity <= 0) {
                setError('Quantity must be greater than 0');
                return;
            }

            if (editingId) {
                // Update existing
                await updatePricing(editingId, {
                    supplierName: formData.supplier,
                    effectiveDate: new Date(formData.effectiveDate),
                    costPrice: costPriceCents,
                    quantity: quantity,
                    ignoreForTrend: formData.ignoreForTrend,
                    notes: formData.notes
                });
            } else {
                // Add new
                await addPricing(
                    part.id,
                    part.sku,
                    formData.supplier,
                    costPriceCents,
                    new Date(formData.effectiveDate),
                    formData.notes,
                    quantity,
                    formData.ignoreForTrend
                );
            }

            // Reset form and reload
            resetForm();
            await loadPricing();
        } catch (err) {
            console.error('Error saving pricing:', err);
            setError('Failed to save pricing');
        }
    };

    const handleEdit = (pricing) => {
        setEditingId(pricing.id);
        setFormData({
            supplier: pricing.supplierName,
            effectiveDate: (() => {
                const d = new Date(pricing.effectiveDate);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })(),
            costPrice: (pricing.costPrice / 100).toFixed(2),
            quantity: (pricing.quantity || 1).toString(),
            ignoreForTrend: pricing.ignoreForTrend || false,
            notes: pricing.notes || ''
        });
        setError('');
    };

    const handleDelete = async (pricingId) => {
        if (!confirm('Are you sure you want to delete this pricing entry?')) return;

        try {
            await deletePricing(pricingId);
            await loadPricing();
        } catch (err) {
            console.error('Error deleting pricing:', err);
            setError('Failed to delete pricing');
        }
    };

    const resetForm = () => {
        setFormData({
            supplier: '',
            effectiveDate: '',
            costPrice: '',
            quantity: '',
            ignoreForTrend: false,
            notes: ''
        });
        setEditingId(null);
        setError('');
    };



    // Calculate trend data when pricing history changes
    useEffect(() => {
        const calculateTrend = async () => {
            // Group pricing by supplier
            const bySupplier = pricingEntries.reduce((acc, p) => {
                if (!acc[p.supplierName]) acc[p.supplierName] = [];
                acc[p.supplierName].push(p);
                return acc;
            }, {});

            const availableSuppliers = Object.keys(bySupplier);

            // Determine if ANY supplier has sufficient history (to show the section)
            const anySufficient = availableSuppliers.some(s =>
                bySupplier[s].filter(p => !p.ignoreForTrend).length >= 2
            );
            setHasSufficientHistory(anySufficient);

            // Handle supplier selection
            let currentSupplier = trendSupplier;

            // If no trend supplier selected (or selected one is invalid), pick the best one
            if (!currentSupplier || !bySupplier[currentSupplier]) {
                // Prefer supplier with most data points, tie-break with most recent
                const bestSupplier = availableSuppliers.sort((a, b) => {
                    const countA = bySupplier[a].filter(p => !p.ignoreForTrend).length;
                    const countB = bySupplier[b].filter(p => !p.ignoreForTrend).length;
                    if (countB !== countA) return countB - countA;
                    // If counts equal, pick one with most recent date
                    return bySupplier[b][0].effectiveDate - bySupplier[a][0].effectiveDate;
                })[0];

                if (bestSupplier) {
                    setTrendSupplier(bestSupplier);
                    currentSupplier = bestSupplier;
                }
            }

            if (!currentSupplier || !bySupplier[currentSupplier]) {
                setTrendData(null);
                setHasSufficientHistory(false);
                return;
            }

            // Calculate trend for the specific supplier
            const supplierEntries = bySupplier[currentSupplier].filter(p => !p.ignoreForTrend);

            if (supplierEntries.length >= 2) {
                const trend = calculateLinearTrend(supplierEntries.map(p => ({
                    date: new Date(p.effectiveDate),
                    cost: p.costPrice
                })));

                if (trend) {
                    // Calculate slope per month (trend.slope is per millisecond)
                    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
                    const slopePerMonth = trend.slope * msPerMonth;

                    // Find the lowest historical price for this supplier to use as a floor
                    const minHistoricalPrice = Math.min(...supplierEntries.map(p => p.costPrice));

                    // Forecast for today (clamped to minHistoricalPrice)
                    const today = new Date();
                    const forecastToday = forecastCostAtDate(supplierEntries, today);
                    const clampedForecastToday = forecastToday
                        ? Math.max(forecastToday.forecastedCost, minHistoricalPrice)
                        : 0;

                    // Forecast 6 months from today (clamped to minHistoricalPrice)
                    const sixMonthsFromNow = new Date();
                    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                    const forecast6Months = forecastCostAtDate(supplierEntries, sixMonthsFromNow);
                    const clampedForecast6Months = forecast6Months
                        ? Math.max(forecast6Months.forecastedCost, minHistoricalPrice)
                        : 0;

                    setTrendData({
                        slopePerMonth,
                        confidence: trend.r2,
                        forecastToday: clampedForecastToday,
                        forecast6Months: clampedForecast6Months,
                        dataPointCount: supplierEntries.length
                    });
                }
            } else {
                setTrendData(null);
            }
        };

        calculateTrend();
    }, [pricingEntries, trendSupplier]);



    // Handle cost source change
    const handleCostSourceChange = async (e) => {
        const newSource = e.target.value;
        setCostPriceSource(newSource);

        try {
            // Determine which collection this part belongs to based on ID prefix
            const collection = part.id.startsWith('fastener-') ? 'fastener_catalog' : 'part_catalog';

            // Prepare update data
            const updateData = {
                costPriceSource: newSource
            };

            // Define today for filtering
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Filter to pricing entries that are effective (on or before today)
            const effectivePricing = pricingEntries.filter(entry => {
                const effectiveDate = entry.effectiveDate instanceof Date
                    ? entry.effectiveDate
                    : new Date(entry.effectiveDate);
                effectiveDate.setHours(0, 0, 0, 0);
                return effectiveDate <= today;
            });

            if (newSource === 'SUPPLIER_LOWEST') {
                if (effectivePricing.length > 0) {
                    // Find the lowest cost price
                    const lowestPrice = Math.min(...effectivePricing.map(entry => entry.costPrice));
                    updateData.costPrice = lowestPrice;
                    console.log('[PartPricingTab] Setting lowest supplier price:', lowestPrice);
                } else {
                    setError('No current supplier pricing available. Please add pricing data first or use Manual Entry.');
                    setCostPriceSource(part.costPriceSource || 'MANUAL'); // Revert
                    return;
                }
            } else if (newSource === 'PREFERRED_SUPPLIER') {
                if (!part.preferredSupplier) {
                    setError('No preferred supplier selected. Please mark a supplier as preferred in the history above.');
                    setCostPriceSource(part.costPriceSource || 'MANUAL'); // Revert
                    return;
                }

                // Find pricing for preferred supplier
                const preferredPricing = effectivePricing
                    .filter(p => p.supplierName === part.preferredSupplier)
                    .sort((a, b) => b.effectiveDate - a.effectiveDate); // Newest first

                if (preferredPricing.length > 0) {
                    updateData.costPrice = preferredPricing[0].costPrice;
                    console.log('[PartPricingTab] Setting preferred supplier price:', preferredPricing[0].costPrice);
                } else {
                    setError(`No current pricing available for preferred supplier. Please add pricing or check selected supplier.`);
                    setCostPriceSource(part.costPriceSource || 'MANUAL'); // Revert
                    return;
                }
            }

            // If the part is saleable with calculated list price, update list price too
            if (part.isSaleable && part.listPriceSource === 'CALCULATED' && updateData.costPrice) {
                const newCostPrice = updateData.costPrice; // in cents
                const marginPercent = parseFloat(part.targetMarginPercent || 0) / 100;

                if (marginPercent < 1 && newCostPrice > 0) {
                    const calculatedListPrice = Math.round(newCostPrice / (1 - marginPercent));
                    updateData.listPrice = calculatedListPrice;
                    console.log('[PartPricingTab] Auto-updating list price:', calculatedListPrice);
                }
            }

            // Update part in database
            await updateDoc(doc(db, collection, part.id), updateData);

            // Notify parent to refresh part data
            if (onPartUpdate) {
                await onPartUpdate();
            }
        } catch (err) {
            console.error(`Error updating cost source:`, err);
            setError('Failed to update cost source');
        }
    };

    const handleTogglePreferredSupplier = async (supplierName) => {
        try {
            const collection = part.id.startsWith('fastener-') ? 'fastener_catalog' : 'part_catalog';
            const currentPreferred = preferredSupplier || part.preferredSupplier;
            const newPreferred = currentPreferred === supplierName ? null : supplierName;

            // Optimistic update - update UI immediately
            setPreferredSupplier(newPreferred || '');

            const updateData = {
                preferredSupplier: newPreferred
            };

            // If we are currently using PREFERRED_SUPPLIER as source, we need to update the price too
            if (costPriceSource === 'PREFERRED_SUPPLIER') {
                if (!newPreferred) {
                    // If removing preference, revert to manual
                    updateData.costPriceSource = 'MANUAL';
                    // keep existing cost price
                } else {
                    // Recalculate price for new preferred supplier
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const effectivePricing = pricingEntries.filter(entry => {
                        const effectiveDate = entry.effectiveDate instanceof Date
                            ? entry.effectiveDate
                            : new Date(entry.effectiveDate);
                        effectiveDate.setHours(0, 0, 0, 0);
                        return effectiveDate <= today && entry.supplierName === newPreferred;
                    }).sort((a, b) => b.effectiveDate - a.effectiveDate);

                    if (effectivePricing.length > 0) {
                        updateData.costPrice = effectivePricing[0].costPrice;
                    } else {
                        // Warn and revert if no price found
                        updateData.costPriceSource = 'MANUAL';
                        setError(`Preferred supplier set to ${newPreferred}, but no current pricing found. Reverting to Manual source.`);
                    }
                }
            } else if (newPreferred && costPriceSource === 'SUPPLIER_LOWEST') {
                // If we switch preference but are on lowest, we stay on lowest. logic remains same.
            }

            // If the part is saleable with calculated list price and we're updating cost price, update list price too
            if (part.isSaleable && part.listPriceSource === 'CALCULATED' && updateData.costPrice) {
                const newCostPrice = updateData.costPrice; // in cents
                const marginPercent = parseFloat(part.targetMarginPercent || 0) / 100;

                if (marginPercent < 1 && newCostPrice > 0) {
                    const calculatedListPrice = Math.round(newCostPrice / (1 - marginPercent));
                    updateData.listPrice = calculatedListPrice;
                    console.log('[PartPricingTab] Auto-updating list price due to preferred supplier change:', calculatedListPrice);
                }
            }

            await updateDoc(doc(db, collection, part.id), updateData);

            // Notify parent to refresh part data
            if (onPartUpdate) {
                await onPartUpdate();
            }
        } catch (err) {
            console.error('Error updating preferred supplier:', err);
            setError('Failed to update preferred supplier');
            // Revert optimistic update on error
            setPreferredSupplier(part.preferredSupplier || '');
        }
    };


    // Handle manual cost price change
    const handleManualCostBlur = async () => {
        try {
            const collection = part.id.startsWith('fastener-') ? 'fastener_catalog' : 'part_catalog';
            const costPriceCents = Math.round(parseFloat(manualCostPrice || 0) * 100);

            await updateDoc(doc(db, collection, part.id), {
                costPrice: costPriceCents
            });
        } catch (err) {
            console.error('Error updating manual cost:', err);
            setError('Failed to update cost price');
        }
    };



    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getPricingStatus = (effectiveDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const priceDate = new Date(effectiveDate);
        priceDate.setHours(0, 0, 0, 0);

        if (priceDate > today) {
            return { label: 'Future', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
        } else if (priceDate.getTime() === today.getTime()) {
            return { label: 'Today', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        } else {
            // Check if this is the most recent for this supplier
            const supplierPricing = pricingEntries.filter(p => p.supplierName === pricingEntries.find(x => x.effectiveDate === effectiveDate)?.supplierName);
            const mostRecent = supplierPricing.filter(p => p.effectiveDate <= today).sort((a, b) => b.effectiveDate - a.effectiveDate)[0];

            if (mostRecent && mostRecent.effectiveDate.getTime() === priceDate.getTime()) {
                return { label: 'Current', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
            }
            return { label: 'Historical', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' };
        }
    };

    // Group pricing by supplier
    const groupedPricing = pricingEntries.reduce((acc, pricing) => {
        if (!acc[pricing.supplierName]) {
            acc[pricing.supplierName] = [];
        }
        acc[pricing.supplierName].push(pricing);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading pricing...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                    {editingId ? 'Edit Pricing Entry' : 'Add Pricing Entry'}
                </h3>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Supplier */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Supplier <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.supplier}
                                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            >
                                <option value="">-- Select Supplier --</option>
                                {suppliers.map((supplier, index) => (
                                    <option key={index} value={supplier}>{supplier}</option>
                                ))}
                            </select>
                        </div>

                        {/* Effective Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Effective Date <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.effectiveDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            />
                        </div>

                        {/* Cost Price (per unit) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Cost Price ($ per unit) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.costPrice}
                                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="0.00"
                                required
                            />
                            {formData.costPrice && formData.quantity && (
                                <p className="text-xs text-cyan-400 mt-1">
                                    Total: ${(parseFloat(formData.costPrice) * parseInt(formData.quantity)).toFixed(2)}
                                </p>
                            )}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Quantity <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="1"
                                required
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Number of units for cost calculation
                            </p>
                        </div>
                    </div>

                    {/* Notes - Full Width */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Notes
                        </label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Optional notes..."
                            maxLength={500}
                        />
                    </div>

                    {/* Ignore for Trend Checkbox */}
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <input
                            type="checkbox"
                            id="ignoreForTrend"
                            checked={formData.ignoreForTrend}
                            onChange={(e) => setFormData(prev => ({ ...prev, ignoreForTrend: e.target.checked }))}
                            className="w-4 h-4 rounded border-slate-600 text-amber-600 focus:ring-amber-500 focus:ring-offset-slate-900"
                        />
                        <label htmlFor="ignoreForTrend" className="text-sm text-slate-300 cursor-pointer flex-1">
                            <span className="font-medium">Ignore for Trend Analysis</span>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Exclude this price from trend forecasting (useful for incorrect or outlier data)
                            </p>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Icons.Plus size={16} />
                            {editingId ? 'Update Price' : 'Add Price'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Pricing List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Pricing History</h3>

                {Object.keys(groupedPricing).length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        No pricing entries yet. Add your first pricing entry above.
                    </div>
                ) : (
                    Object.entries(groupedPricing).map(([supplierName, pricing]) => (
                        <div key={supplierName} className={`bg-slate-800/50 rounded-lg border p-4 transition-colors ${preferredSupplier === supplierName
                            ? 'border-amber-500/50 bg-amber-500/5'
                            : 'border-slate-700'
                            }`}>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-md font-semibold text-white flex items-center gap-2">
                                    {supplierName}
                                    {preferredSupplier === supplierName && (
                                        <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                            Preferred
                                        </span>
                                    )}
                                </h4>
                                <button
                                    onClick={() => handleTogglePreferredSupplier(supplierName)}
                                    className={`p-1.5 rounded transition-colors ${preferredSupplier === supplierName
                                        ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                        : 'text-slate-500 hover:text-amber-400 hover:bg-slate-700'
                                        }`}
                                    title={preferredSupplier === supplierName ? "Remove as preferred" : "Set as preferred supplier"}
                                >
                                    {preferredSupplier === supplierName ? <Icons.CheckCircle size={18} className="text-amber-400" /> : <Icons.Circle size={18} />}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {pricing.map((entry) => {
                                    const status = getPricingStatus(entry.effectiveDate);
                                    return (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="text-sm text-slate-300 font-mono w-24">
                                                    {formatDate(entry.effectiveDate)}
                                                </div>
                                                <div className="w-32">
                                                    {entry.quantity && entry.quantity > 1 ? (
                                                        <div>
                                                            <div className="text-sm font-mono text-white">
                                                                {formatCurrency(entry.costPrice)} × {entry.quantity}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                Total: {formatCurrency(entry.costPrice * entry.quantity)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-lg font-bold text-white">
                                                            {formatCurrency(entry.costPrice)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                {entry.ignoreForTrend && (
                                                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border bg-amber-500/20 text-amber-300 border-amber-500/30">
                                                        <Icons.EyeOff size={12} className="mr-1" />
                                                        Ignored
                                                    </span>
                                                )}
                                                {entry.notes && (
                                                    <div className="text-sm text-slate-400 flex-1">
                                                        {entry.notes}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(entry)}
                                                    className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Icons.Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Icons.Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Manual Cost Price Input */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Manual Cost Price</h3>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Cost Price ($)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualCostPrice}
                        onChange={(e) => setManualCostPrice(e.target.value)}
                        onBlur={handleManualCostBlur}
                        disabled={costPriceSource !== 'MANUAL'}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="0.00"
                    />
                    <p className="text-xs text-slate-400 mt-2">
                        {costPriceSource === 'MANUAL'
                            ? 'This is the manual cost price used when cost source is set to Manual Entry'
                            : 'Set cost source to Manual Entry to edit this value'
                        }
                    </p>
                </div>
            </div>

            {/* Cost Price Source Settings */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Cost Price Source</h3>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="costPriceSource"
                            value="MANUAL"
                            checked={costPriceSource === 'MANUAL'}
                            onChange={handleCostSourceChange}
                            className="w-4 h-4 text-cyan-600"
                        />
                        <div>
                            <span className="text-white font-medium">Manual Entry</span>
                            <p className="text-xs text-slate-400">Use manually entered cost price</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="costPriceSource"
                            value="SUPPLIER_LOWEST"
                            checked={costPriceSource === 'SUPPLIER_LOWEST'}
                            onChange={handleCostSourceChange}
                            className="w-4 h-4 text-cyan-600"
                        />
                        <div>
                            <span className="text-white font-medium">Supplier (Lowest Price)</span>
                            <p className="text-xs text-slate-400">Automatically use lowest supplier price from history below</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="costPriceSource"
                            value="PREFERRED_SUPPLIER"
                            checked={costPriceSource === 'PREFERRED_SUPPLIER'}
                            onChange={handleCostSourceChange}
                            className="w-4 h-4 text-cyan-600"
                        />
                        <div>
                            <span className="text-white font-medium">Preferred Supplier</span>
                            <p className="text-xs text-slate-400">
                                Use price from preferred supplier
                                {preferredSupplier ? ` (${preferredSupplier})` : ''}
                            </p>
                            {!preferredSupplier && costPriceSource === 'PREFERRED_SUPPLIER' && (
                                <p className="text-xs text-red-400 mt-1">Select a preferred supplier in History above</p>
                            )}
                        </div>
                    </label>
                </div>
            </div>

            {/* Forecasted Trend Analysis */}
            {hasSufficientHistory && (
                <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Icons.TrendingUp className="text-purple-400" size={20} />
                            <h3 className="text-lg font-semibold text-white">Forecasted Trend Analysis</h3>
                        </div>

                        {/* Supplier Selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-400">Analysis Source:</label>
                            <select
                                value={trendSupplier}
                                onChange={(e) => setTrendSupplier(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded text-xs text-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                                {Object.keys(groupedPricing).map(supplier => (
                                    <option key={supplier} value={supplier}>{supplier}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {trendData ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Cost Change (per month)</p>
                                    <p className={`text-lg font-bold ${trendData.slopePerMonth > 0 ? 'text-red-400' :
                                        trendData.slopePerMonth < 0 ? 'text-emerald-400' : 'text-slate-400'
                                        }`}>
                                        {trendData.slopePerMonth > 0 ? '+' : ''}
                                        ${(trendData.slopePerMonth / 100).toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <div className="text-slate-400 text-xs mb-1">Confidence (R²)</div>
                                    <div className={`font-mono font-bold ${trendData.confidence >= 0.7 ? 'text-emerald-400' :
                                        trendData.confidence >= 0.3 ? 'text-amber-400' : 'text-red-400'
                                        }`}>
                                        {(trendData.confidence * 100).toFixed(1)}%
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Current Day Forecast</p>
                                    <p className="text-lg font-bold text-cyan-400">
                                        ${(trendData.forecastToday / 100).toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Predicted Price (6 months)</p>
                                    <p className="text-lg font-bold text-white">
                                        ${(trendData.forecast6Months / 100).toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <div className="text-slate-400 text-xs mb-1">Based On</div>
                                    <div className="text-white">
                                        {trendData.dataPointCount} data points ({trendSupplier})
                                    </div>
                                </div>
                            </div>

                            {trendData.confidence < 0.3 && (
                                <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-start gap-2">
                                    <Icons.AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                    <span>Low confidence trend. System will fall back to manual cost price for calculations.</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 text-center text-slate-400 text-sm bg-slate-800/30 rounded-lg">
                            <Icons.Info size={24} className="mx-auto mb-2 opacity-50" />
                            <p>Insufficient data for <strong>{trendSupplier}</strong>.</p>
                            <p className="text-xs mt-1">Need at least 2 data points for this supplier to calculate a trend.</p>
                        </div>
                    )}
                </div>
            )}


        </div>
    );
};
