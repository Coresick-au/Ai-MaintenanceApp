import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import {
    getPricingForPart,
    addPricing,
    updatePricing,
    deletePricing,
    checkDuplicatePricing
} from '../../services/partPricingService';
import { calculateLinearTrend, forecastCostAtDate } from '../../utils/costForecasting';
import { formatCurrency } from '../../utils/helpers';

export const PartPricingTab = ({ part, suppliers }) => {
    const [pricingEntries, setPricingEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        supplier: '',
        effectiveDate: '',
        costPrice: '',
        notes: ''
    });

    // Forecasting state
    const [costPriceSource, setCostPriceSource] = useState('MANUAL');
    const [trendData, setTrendData] = useState(null);
    const [hasSufficientHistory, setHasSufficientHistory] = useState(false);
    const [manualCostPrice, setManualCostPrice] = useState('');

    // Load pricing entries
    useEffect(() => {
        if (part?.id) {
            loadPricing();
            setCostPriceSource(part.costPriceSource || 'MANUAL');
            setManualCostPrice((part.costPrice / 100).toFixed(2));
        }
    }, [part?.id, part?.costPrice]);

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
            if (!formData.supplier || !formData.effectiveDate || !formData.costPrice) {
                setError('Please fill in all required fields');
                return;
            }

            const costPriceCents = Math.round(parseFloat(formData.costPrice) * 100);
            if (costPriceCents <= 0) {
                setError('Cost price must be greater than 0');
                return;
            }

            // Check for duplicates
            const isDuplicate = await checkDuplicatePricing(
                part.id,
                formData.supplier,
                new Date(formData.effectiveDate),
                editingId
            );

            if (isDuplicate) {
                setError(`Pricing already exists for ${formData.supplier} on this date`);
                return;
            }

            if (editingId) {
                // Update existing
                await updatePricing(editingId, {
                    supplierName: formData.supplier,
                    effectiveDate: new Date(formData.effectiveDate),
                    costPrice: costPriceCents,
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
                    formData.notes
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
            notes: ''
        });
        setEditingId(null);
        setError('');
    };

    // Calculate trend data when pricing history changes
    useEffect(() => {
        const calculateTrend = async () => {
            if (pricingEntries.length >= 2) {
                setHasSufficientHistory(true);

                const trend = calculateLinearTrend(pricingEntries.map(p => ({
                    date: new Date(p.effectiveDate),
                    cost: p.costPrice
                })));

                if (trend) {
                    // Calculate slope per month (trend.slope is per millisecond)
                    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
                    const slopePerMonth = trend.slope * msPerMonth;

                    // Forecast for today
                    const today = new Date();
                    const forecastToday = forecastCostAtDate(pricingEntries, today);

                    // Forecast 6 months from today
                    const sixMonthsFromNow = new Date();
                    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                    const forecast6Months = forecastCostAtDate(pricingEntries, sixMonthsFromNow);

                    setTrendData({
                        slopePerMonth,
                        confidence: trend.r2,
                        forecastToday: forecastToday?.forecastedCost || 0,
                        forecast6Months: forecast6Months?.forecastedCost || 0
                    });
                }
            } else {
                setHasSufficientHistory(false);
                setTrendData(null);
            }
        };

        calculateTrend();
    }, [pricingEntries]);

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

            // If switching to SUPPLIER_LOWEST, calculate and save the lowest price
            if (newSource === 'SUPPLIER_LOWEST') {
                // Get today's date to find current prices
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
            }

            // Update part in database
            await updateDoc(doc(db, collection, part.id), updateData);
        } catch (err) {
            console.error(`Error updating cost source:`, err);
            setError('Failed to update cost source');
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

                        {/* Cost Price */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Cost Price ($) <span className="text-red-400">*</span>
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
                        </div>

                        {/* Notes */}
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
                        <div key={supplierName} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                            <h4 className="text-md font-semibold text-white mb-3">{supplierName}</h4>
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
                                                <div className="text-lg font-bold text-white w-24">
                                                    {formatCurrency(entry.costPrice)}
                                                </div>
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${status.color}`}>
                                                    {status.label}
                                                </span>
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
                </div>
            </div>

            {/* Forecasted Trend Analysis - Always show when sufficient history */}
            {hasSufficientHistory && trendData && (
                <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-3">
                        <Icons.TrendingUp className="text-purple-400" size={20} />
                        <h3 className="text-lg font-semibold text-white">Forecasted Trend Analysis</h3>
                    </div>
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
                                {pricingEntries.length} data points
                            </div>
                        </div>
                    </div>

                    {trendData.confidence < 0.3 && (
                        <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-start gap-2">
                            <Icons.AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>Low confidence trend. System will fall back to manual cost price for calculations.</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
