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
import {
    addShippingRecord,
    deleteShippingRecord,
    updateShippingRecord,
    getShippingHistory,
    calculateAverageShippingCost
} from '../../services/inventoryService';
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
        quantity: '',
        ignoreForTrend: false,
        notes: ''
    });

    // Forcasting state
    const [costPriceSource, setCostPriceSource] = useState('MANUAL');
    const [trendData, setTrendData] = useState(null);
    const [hasSufficientHistory, setHasSufficientHistory] = useState(false);
    const [manualCostPrice, setManualCostPrice] = useState('');

    // Shipping history state
    const [shippingRecords, setShippingRecords] = useState([]);
    const [shippingAverage, setShippingAverage] = useState(null);
    const [editingShippingId, setEditingShippingId] = useState(null);
    const [shippingTrendData, setShippingTrendData] = useState(null);
    const [hasShippingSufficientHistory, setHasShippingSufficientHistory] = useState(false);
    const [shippingForm, setShippingForm] = useState({
        deliveryCost: '',
        units: '',
        date: new Date().toISOString().split('T')[0], // Default to today
        notes: ''
    });

    // Load pricing entries
    useEffect(() => {
        if (part?.id) {
            loadPricing();
            loadShippingData();
            setCostPriceSource(part.costPriceSource || 'MANUAL');
            setManualCostPrice((part.costPrice / 100).toFixed(2));
        }
    }, [part?.id, part?.costPrice]);

    const loadShippingData = async () => {
        try {
            const records = await getShippingHistory(part.id);
            setShippingRecords(records);

            const avgData = await calculateAverageShippingCost(part.id);
            setShippingAverage(avgData);
        } catch (err) {
            console.error('Error loading shipping data:', err);
        }
    };

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

    const handleShippingSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const deliveryCostCents = Math.round(parseFloat(shippingForm.deliveryCost) * 100);
            const units = parseInt(shippingForm.units);

            if (deliveryCostCents <= 0 || units <= 0) {
                setError('Delivery cost and units must be greater than 0');
                return;
            }

            if (editingShippingId) {
                // Update existing record
                await updateShippingRecord(editingShippingId, deliveryCostCents, units, shippingForm.date, shippingForm.notes);
            } else {
                // Add new record
                await addShippingRecord(part.id, deliveryCostCents, units, shippingForm.date, shippingForm.notes);
            }

            // Reload shipping data
            await loadShippingData();

            // Reset form
            setEditingShippingId(null);
            setShippingForm({
                deliveryCost: '',
                units: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            });
        } catch (err) {
            console.error('Error adding shipping record:', err);
            setError('Failed to save shipping record');
        }
    };

    const handleShippingEdit = (record) => {
        setEditingShippingId(record.id);
        setShippingForm({
            deliveryCost: (record.deliveryCost / 100).toFixed(2),
            units: record.units.toString(),
            date: record.date,
            notes: record.notes || ''
        });
        setError('');
    };

    const handleShippingCancelEdit = () => {
        setEditingShippingId(null);
        setShippingForm({
            deliveryCost: '',
            units: '',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setError('');
    };

    const handleShippingDelete = async (recordId) => {
        if (!confirm('Delete this shipping record?')) return;

        try {
            await deleteShippingRecord(recordId);
            await loadShippingData();
        } catch (err) {
            console.error('Error deleting shipping record:', err);
            setError('Failed to delete shipping record');
        }
    };

    // Calculate trend data when pricing history changes
    useEffect(() => {
        const calculateTrend = async () => {
            // Filter out entries marked as "ignore for trend"
            const validPricingEntries = pricingEntries.filter(p => !p.ignoreForTrend);

            if (validPricingEntries.length >= 2) {
                setHasSufficientHistory(true);

                const trend = calculateLinearTrend(validPricingEntries.map(p => ({
                    date: new Date(p.effectiveDate),
                    cost: p.costPrice
                })));

                if (trend) {
                    // Calculate slope per month (trend.slope is per millisecond)
                    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
                    const slopePerMonth = trend.slope * msPerMonth;

                    // Forecast for today
                    const today = new Date();
                    const forecastToday = forecastCostAtDate(validPricingEntries, today);

                    // Forecast 6 months from today
                    const sixMonthsFromNow = new Date();
                    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                    const forecast6Months = forecastCostAtDate(validPricingEntries, sixMonthsFromNow);

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

    // Calculate shipping trend data when shipping history changes
    useEffect(() => {
        const calculateShippingTrend = async () => {
            if (shippingRecords.length >= 2) {
                setHasShippingSufficientHistory(true);

                // Instead of trending cost per unit, we'll use linear regression on:
                // Total Delivery Cost = Base Cost + (Per-Unit Cost × Units)
                // This accounts for quantity-based pricing

                const dataPoints = shippingRecords.map(r => ({
                    units: r.units,
                    totalCost: r.deliveryCost // total delivery cost in cents
                }));

                // Calculate linear regression: y = mx + b
                // where y = total cost, x = units, m = per-unit cost, b = base cost
                const n = dataPoints.length;
                const sumX = dataPoints.reduce((sum, p) => sum + p.units, 0);
                const sumY = dataPoints.reduce((sum, p) => sum + p.totalCost, 0);
                const sumXY = dataPoints.reduce((sum, p) => sum + (p.units * p.totalCost), 0);
                const sumX2 = dataPoints.reduce((sum, p) => sum + (p.units * p.units), 0);

                // Calculate slope (per-unit cost) and intercept (base cost)
                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;

                // Calculate R² (coefficient of determination)
                const meanY = sumY / n;
                const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.totalCost - meanY, 2), 0);
                const ssResidual = dataPoints.reduce((sum, p) => {
                    const predicted = slope * p.units + intercept;
                    return sum + Math.pow(p.totalCost - predicted, 2);
                }, 0);
                const r2 = 1 - (ssResidual / ssTotal);

                // Forecast for common quantities
                const forecastSmall = Math.max(0, slope * 1 + intercept); // 1 unit
                const forecastMedium = Math.max(0, slope * 10 + intercept); // 10 units
                const forecastLarge = Math.max(0, slope * 50 + intercept); // 50 units

                setShippingTrendData({
                    baseCost: Math.max(0, Math.round(intercept)), // Minimum shipping cost in cents
                    perUnitCost: Math.max(0, Math.round(slope)), // Additional cost per unit in cents
                    confidence: Math.max(0, Math.min(1, r2)), // R² bounded 0-1
                    forecastSmall,
                    forecastMedium,
                    forecastLarge,
                    dataPoints: n
                });
            } else {
                setHasShippingSufficientHistory(false);
                setShippingTrendData(null);
            }
        };

        calculateShippingTrend();
    }, [shippingRecords]);

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

            {/* Shipping History */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Delivery Cost Tracking</h3>

                {/* Average Display */}
                {shippingAverage && shippingAverage.totalRecords > 0 && (
                    <div className="mb-4 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Average Cost/Unit</div>
                                <div className="text-xl font-bold text-cyan-400">
                                    {formatCurrency(shippingAverage.averageCostPerUnit)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Total Units Shipped</div>
                                <div className="text-xl font-bold text-white">
                                    {shippingAverage.totalUnits.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Total Records</div>
                                <div className="text-xl font-bold text-white">
                                    {shippingAverage.totalRecords}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Shipping Record Form */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 mb-4">
                    <h4 className="text-md font-medium text-white mb-3">
                        {editingShippingId ? 'Edit Delivery Record' : 'Add Delivery Record'}
                    </h4>
                    <form onSubmit={handleShippingSubmit} className="space-y-3">
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Delivery Cost ($) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={shippingForm.deliveryCost}
                                    onChange={(e) => setShippingForm(prev => ({ ...prev, deliveryCost: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Units <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={shippingForm.units}
                                    onChange={(e) => setShippingForm(prev => ({ ...prev, units: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={shippingForm.date}
                                    onChange={(e) => setShippingForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Notes
                                </label>
                                <input
                                    type="text"
                                    value={shippingForm.notes}
                                    onChange={(e) => setShippingForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Optional..."
                                    maxLength={200}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {editingShippingId && (
                                <button
                                    type="button"
                                    onClick={handleShippingCancelEdit}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Icons.Plus size={16} />
                                {editingShippingId ? 'Update Record' : 'Add Shipping Record'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Shipping Records List */}
                {shippingRecords.length > 0 && (
                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                        <h4 className="text-md font-medium text-white mb-3">Shipping History</h4>
                        <div className="space-y-2">
                            {shippingRecords.map(record => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="text-sm text-slate-300 font-mono w-24">
                                            {new Date(record.date).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-white">
                                            <span className="font-bold">{formatCurrency(record.deliveryCost)}</span>
                                            <span className="text-slate-400 mx-1">÷</span>
                                            <span className="font-bold">{record.units} units</span>
                                        </div>
                                        <div className="text-sm text-cyan-400 font-mono">
                                            = {formatCurrency(record.costPerUnit)}/unit
                                        </div>
                                        {record.notes && (
                                            <div className="text-sm text-slate-400 flex-1 truncate">
                                                {record.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleShippingEdit(record)}
                                            className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                                            title="Edit"
                                        >
                                            <Icons.Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleShippingDelete(record.id)}
                                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Icons.Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shipping Cost Trend Analysis */}
                {hasShippingSufficientHistory && shippingTrendData && (
                    <div className="mt-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-3">
                            <Icons.TrendingUp className="text-purple-400" size={20} />
                            <h4 className="text-md font-semibold text-white">Delivery Cost Model</h4>
                        </div>

                        {/* Pricing Model Formula */}
                        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div className="text-xs text-slate-400 mb-2">Estimated Cost Formula:</div>
                            <div className="font-mono text-white">
                                <span className="text-cyan-400">${(shippingTrendData.baseCost / 100).toFixed(2)}</span>
                                {shippingTrendData.perUnitCost > 0 && (
                                    <>
                                        <span className="text-slate-400"> + </span>
                                        <span className="text-emerald-400">${(shippingTrendData.perUnitCost / 100).toFixed(2)}</span>
                                        <span className="text-slate-400"> × units</span>
                                    </>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Base shipping cost {shippingTrendData.perUnitCost > 0 && '+ per-unit increment'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Base Shipping Cost</p>
                                <p className="text-lg font-bold text-cyan-400">
                                    ${(shippingTrendData.baseCost / 100).toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500">Minimum cost (1 unit)</p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400 mb-1">Per-Unit Increment</p>
                                <p className="text-lg font-bold text-emerald-400">
                                    ${(shippingTrendData.perUnitCost / 100).toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500">Additional cost per unit</p>
                            </div>

                            <div>
                                <div className="text-slate-400 text-xs mb-1">Confidence (R²)</div>
                                <div className={`font-mono font-bold ${shippingTrendData.confidence >= 0.7 ? 'text-emerald-400' :
                                    shippingTrendData.confidence >= 0.3 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                    {(shippingTrendData.confidence * 100).toFixed(1)}%
                                </div>
                            </div>

                            <div>
                                <div className="text-slate-400 text-xs mb-1">Based On</div>
                                <div className="text-white">
                                    {shippingTrendData.dataPoints} deliveries
                                </div>
                            </div>
                        </div>

                        {/* Example Forecasts */}
                        <div className="mt-4 pt-4 border-t border-purple-500/30">
                            <div className="text-xs text-slate-400 mb-2">Estimated Costs by Quantity:</div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-2 bg-slate-900/50 rounded border border-slate-700">
                                    <div className="text-xs text-slate-400">1 unit</div>
                                    <div className="text-white font-bold">${(shippingTrendData.forecastSmall / 100).toFixed(2)}</div>
                                </div>
                                <div className="p-2 bg-slate-900/50 rounded border border-slate-700">
                                    <div className="text-xs text-slate-400">10 units</div>
                                    <div className="text-white font-bold">${(shippingTrendData.forecastMedium / 100).toFixed(2)}</div>
                                </div>
                                <div className="p-2 bg-slate-900/50 rounded border border-slate-700">
                                    <div className="text-xs text-slate-400">50 units</div>
                                    <div className="text-white font-bold">${(shippingTrendData.forecastLarge / 100).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        {shippingTrendData.confidence < 0.3 && (
                            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-start gap-2">
                                <Icons.AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>Low confidence model. More delivery records with varying quantities needed for accurate forecasting.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
