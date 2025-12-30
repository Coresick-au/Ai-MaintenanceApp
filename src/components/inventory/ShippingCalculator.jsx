import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { calculateAverageShippingCost, getShippingHistory } from '../../services/inventoryService';
import { formatCurrency } from '../../utils/helpers';

export const ShippingCalculator = () => {
    const [parts, setParts] = useState([]);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [units, setUnits] = useState('');
    const [averageData, setAverageData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calculatedCost, setCalculatedCost] = useState(0);

    // Load parts from catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            const partsList = snap.docs.map(doc => doc.data());
            partsList.sort((a, b) => a.name.localeCompare(b.name));
            setParts(partsList);
        });

        return () => unsubscribe();
    }, []);

    // Load shipping data when part is selected
    useEffect(() => {
        const loadShippingData = async () => {
            if (!selectedPartId) {
                setAverageData(null);
                setCalculatedCost(0);
                return;
            }

            setLoading(true);
            try {
                // Get shipping history
                const records = await getShippingHistory(selectedPartId);

                if (records.length >= 2) {
                    // Use same quantity-aware model as PartPricingTab
                    const dataPoints = records.map(r => ({
                        units: r.units,
                        totalCost: r.deliveryCost
                    }));

                    // Linear regression: Total Cost = Base Cost + (Per-Unit Cost × Units)
                    const n = dataPoints.length;
                    const sumX = dataPoints.reduce((sum, p) => sum + p.units, 0);
                    const sumY = dataPoints.reduce((sum, p) => sum + p.totalCost, 0);
                    const sumXY = dataPoints.reduce((sum, p) => sum + (p.units * p.totalCost), 0);
                    const sumX2 = dataPoints.reduce((sum, p) => sum + (p.units * p.units), 0);

                    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                    const intercept = (sumY - slope * sumX) / n;

                    const baseCost = Math.max(0, Math.round(intercept));
                    const perUnitCost = Math.max(0, Math.round(slope));

                    setAverageData({
                        baseCost,
                        perUnitCost,
                        totalRecords: records.length
                    });

                    // Calculate cost if units are entered
                    if (units && parseFloat(units) > 0) {
                        const quantity = parseFloat(units);
                        const cost = baseCost + (perUnitCost * quantity);
                        setCalculatedCost(cost);
                    }
                } else {
                    // Fallback to simple average for single record
                    const data = await calculateAverageShippingCost(selectedPartId);
                    setAverageData(data);

                    if (units && parseFloat(units) > 0) {
                        const quantity = parseFloat(units);
                        const cost = data.averageCostPerUnit * quantity;
                        setCalculatedCost(cost);
                    }
                }
            } catch (err) {
                console.error('Error loading shipping data:', err);
                setAverageData(null);
            } finally {
                setLoading(false);
            }
        };

        loadShippingData();
    }, [selectedPartId]);

    // Recalculate when units change
    useEffect(() => {
        if (averageData && units && parseFloat(units) > 0) {
            const quantity = parseFloat(units);

            // Use quantity-aware model if available
            if (averageData.baseCost !== undefined) {
                const cost = averageData.baseCost + (averageData.perUnitCost * quantity);
                setCalculatedCost(cost);
            } else if (averageData.averageCostPerUnit) {
                // Fallback to simple average
                const cost = averageData.averageCostPerUnit * quantity;
                setCalculatedCost(cost);
            }
        } else {
            setCalculatedCost(0);
        }
    }, [units, averageData]);

    const selectedPart = parts.find(p => p.id === selectedPartId);

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Shipping Cost Calculator</h2>
                <p className="text-slate-400">Estimate shipping costs based on historical delivery data</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Calculate Shipping Cost</h3>

                    {/* Part Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Select Part <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={selectedPartId}
                            onChange={(e) => setSelectedPartId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="">-- Select a part --</option>
                            {parts.map(part => (
                                <option key={part.id} value={part.id}>
                                    {part.sku} - {part.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Units Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Quantity (Units) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={units}
                            onChange={(e) => setUnits(e.target.value)}
                            disabled={!selectedPartId}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Enter quantity..."
                        />
                    </div>

                    {/* No Data Message */}
                    {selectedPartId && averageData && averageData.totalRecords === 0 && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Icons.AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-sm font-medium text-amber-300">No Shipping History</p>
                                    <p className="text-xs text-amber-400/80 mt-1">
                                        This part has no delivery cost records yet. Add shipping records in the Part Catalog → Edit Part → Pricing tab.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Estimated Shipping Cost</h3>

                    {loading ? (
                        <div className="flex items-center justify-center h-48 text-slate-400">
                            <Icons.Loader size={24} className="animate-spin" />
                        </div>
                    ) : selectedPartId && averageData && averageData.totalRecords > 0 ? (
                        <div className="space-y-4">
                            {/* Part Info */}
                            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="text-xs text-slate-400 mb-1">Part</div>
                                <div className="font-medium text-white">{selectedPart?.name}</div>
                                <div className="text-xs text-slate-500 font-mono">{selectedPart?.sku}</div>
                            </div>

                            {/* Pricing Model */}
                            {averageData.baseCost !== undefined ? (
                                <>
                                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                        <div className="text-xs text-slate-400 mb-2">Cost Formula:</div>
                                        <div className="font-mono text-white text-sm">
                                            <span className="text-cyan-400">${(averageData.baseCost / 100).toFixed(2)}</span>
                                            {averageData.perUnitCost > 0 && (
                                                <>
                                                    <span className="text-slate-400"> + </span>
                                                    <span className="text-emerald-400">${(averageData.perUnitCost / 100).toFixed(2)}</span>
                                                    <span className="text-slate-400"> × units</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Model Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-400 mb-1">Base Cost</div>
                                            <div className="text-lg font-bold text-cyan-400">
                                                {formatCurrency(averageData.baseCost)}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-400 mb-1">Per-Unit</div>
                                            <div className="text-lg font-bold text-emerald-400">
                                                {formatCurrency(averageData.perUnitCost)}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">Avg Cost/Unit</div>
                                    <div className="text-lg font-bold text-cyan-400">
                                        {formatCurrency(averageData.averageCostPerUnit)}
                                    </div>
                                </div>
                            )}

                            {/* Calculation Breakdown */}
                            {units && parseFloat(units) > 0 && (
                                <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 space-y-3">
                                    <div className="text-sm font-medium text-cyan-300">Calculation:</div>
                                    <div className="space-y-2 font-mono text-sm">
                                        {averageData.baseCost !== undefined ? (
                                            <>
                                                <div className="flex items-center justify-between text-slate-300">
                                                    <span>Base cost:</span>
                                                    <span>{formatCurrency(averageData.baseCost)}</span>
                                                </div>
                                                {averageData.perUnitCost > 0 && (
                                                    <>
                                                        <div className="flex items-center justify-between text-slate-300">
                                                            <span>{formatCurrency(averageData.perUnitCost)} × {parseFloat(units)} units:</span>
                                                            <span>{formatCurrency(averageData.perUnitCost * parseFloat(units))}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between text-slate-300">
                                                <span>Cost per unit:</span>
                                                <span>{formatCurrency(averageData.averageCostPerUnit)}</span>
                                            </div>
                                        )}
                                        <div className="h-px bg-cyan-500/30"></div>
                                        <div className="flex items-center justify-between text-white font-bold text-lg">
                                            <span>Estimated Total:</span>
                                            <span className="text-cyan-400">{formatCurrency(calculatedCost)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Additional Stats */}
                            <div className="pt-3 border-t border-slate-700 text-xs text-slate-400">
                                <div className="flex justify-between">
                                    <span>Based on:</span>
                                    <span className="text-white">{averageData.totalRecords} delivery records</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                            <Icons.Truck size={48} className="mb-3 opacity-50" />
                            <p className="text-sm">Select a part to calculate shipping cost</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
