// src/services/costEstimationService.js
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
    MATERIAL_TYPES,
    TRANSOM_TYPES,
    ROLLER_DESIGNS,
    ROLLER_MATERIAL_TYPES,
    SPEED_SENSOR_DESIGNS,
    getBilletWeightCategory
} from './specializedComponentsService';

// Tolerances for fuzzy matching
const TOLERANCES = {
    beltWidth: 100,      // ±100mm
    capacity: 20,        // ±20 kg/m
    weightKg: 50,        // ±50kg
    diameter: 13,        // Next standard size
    faceLength: 100,     // ±100mm
    idlerSpacing: 200    // ±200mm
};

/**
 * Filter data by date range
 */
export const filterByDateRange = (data, months) => {
    if (!months || months === 'all') return data;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    return data.filter(item => {
        const itemDate = new Date(item.effectiveDate);
        return itemDate >= cutoffDate;
    });
};

/**
 * Calculate recency weight (0-1, newer = higher)
 */
const getRecencyWeight = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const ageInDays = (now - date) / (1000 * 60 * 60 * 24);
    const ageInMonths = ageInDays / 30;

    // Exponential decay: 100% weight at 0 months, 50% at 6 months, 25% at 12 months
    return Math.exp(-ageInMonths / 8.66); // ln(2) / 6 ≈ 0.1155, we use 1/8.66 for smoother decay
};

/**
 * Linear interpolation
 */
const interpolateLinear = (x1, y1, x2, y2, x) => {
    if (x2 === x1) return y1; // Avoid division by zero
    return y1 + (y2 - y1) * ((x - x1) / (x2 - x1));
};

/**
 * Find exact matches for all parameters
 */
const findExactMatches = (data, params, categoricalFields) => {
    return data.filter(item => {
        return categoricalFields.every(field => {
            if (params[field] === undefined) return true;
            return item[field] === params[field];
        });
    });
};

/**
 * Find similar matches within tolerance
 */
const findSimilarMatches = (data, params, continuousField, tolerance) => {
    return data.filter(item => {
        const diff = Math.abs(item[continuousField] - params[continuousField]);
        return diff <= tolerance;
    });
};

/**
 * Calculate confidence score
 */
const calculateConfidence = (matchType, dataPointsUsed, avgRecency) => {
    let baseScore = 0;

    // Match type contribution (0-50 points)
    switch (matchType) {
        case 'exact':
            baseScore = 50;
            break;
        case 'interpolated':
            baseScore = 40;
            break;
        case 'fuzzy':
            baseScore = 30;
            break;
        case 'extrapolated':
            baseScore = 15;
            break;
        default:
            baseScore = 10;
    }

    // Data points contribution (0-30 points)
    const dataPointScore = Math.min(30, dataPointsUsed * 6);

    // Recency contribution (0-20 points)
    const recencyScore = avgRecency * 20;

    const totalScore = baseScore + dataPointScore + recencyScore;

    // Convert to level
    if (totalScore >= 90) return { level: 'High', score: totalScore, color: 'emerald' };
    if (totalScore >= 70) return { level: 'Medium', score: totalScore, color: 'yellow' };
    if (totalScore >= 50) return { level: 'Low', score: totalScore, color: 'orange' };
    return { level: 'Very Low', score: totalScore, color: 'red' };
};

/**
 * Find all matching entries and group by quantity
 * Returns entries with same specs but varying quantities
 */
const findQuantityVariations = (matches) => {
    // Group by quantity
    const byQuantity = {};

    for (const match of matches) {
        const qty = match.quantity || 1; // Default to 1 if no quantity specified
        if (!byQuantity[qty]) {
            byQuantity[qty] = [];
        }
        byQuantity[qty].push(match);
    }

    return byQuantity;
};

/**
 * Adjust unit price based on quantity using historical patterns
 * Uses linear interpolation or nearest-quantity fallback
 */
const adjustPriceForQuantity = (quantityGroups, requestedQuantity) => {
    const quantities = Object.keys(quantityGroups).map(q => parseInt(q)).sort((a, b) => a - b);

    if (quantities.length === 0) return null;

    // Calculate weighted average cost for each quantity point
    const quantityPricePoints = quantities.map(qty => {
        const entries = quantityGroups[qty];
        const totalWeight = entries.reduce((sum, e) => sum + getRecencyWeight(e.effectiveDate), 0);
        const weightedCost = entries.reduce((sum, e) =>
            sum + (e.costPrice * getRecencyWeight(e.effectiveDate)), 0
        ) / totalWeight;

        return { quantity: qty, unitCost: weightedCost, dataPoints: entries.length, entries };
    });

    // Find surrounding quantity points
    const below = quantityPricePoints.filter(p => p.quantity < requestedQuantity).sort((a, b) => b.quantity - a.quantity);
    const above = quantityPricePoints.filter(p => p.quantity > requestedQuantity).sort((a, b) => a.quantity - b.quantity);
    const exact = quantityPricePoints.find(p => p.quantity === requestedQuantity);

    // Exact quantity match
    if (exact) {
        return {
            unitCost: Math.round(exact.unitCost),
            method: `Exact Quantity Match (${exact.quantity} units)`,
            matchType: 'exact',
            dataPoints: exact.dataPoints,
            allEntries: exact.entries,
            avgRecency: exact.entries.reduce((sum, e) => sum + getRecencyWeight(e.effectiveDate), 0) / exact.entries.length
        };
    }

    // Interpolate between two quantity points
    if (below.length > 0 && above.length > 0) {
        const lower = below[0];
        const upper = above[0];

        const interpolatedCost = interpolateLinear(
            lower.quantity, lower.unitCost,
            upper.quantity, upper.unitCost,
            requestedQuantity
        );

        const combinedEntries = [...lower.entries, ...upper.entries];

        return {
            unitCost: Math.round(interpolatedCost),
            method: `Quantity Interpolation (${lower.quantity}-${upper.quantity} units)`,
            matchType: 'interpolated',
            dataPoints: lower.dataPoints + upper.dataPoints,
            quantityRange: `${lower.quantity}-${upper.quantity}`,
            allEntries: combinedEntries,
            avgRecency: combinedEntries.reduce((sum, e) => sum + getRecencyWeight(e.effectiveDate), 0) / combinedEntries.length
        };
    }

    // Extrapolate from nearest quantity (lower confidence)
    const nearest = below.length > 0 ? below[0] : above[0];

    return {
        unitCost: Math.round(nearest.unitCost),
        method: `Nearest Quantity (${nearest.quantity} units)`,
        matchType: 'fuzzy',
        dataPoints: nearest.dataPoints,
        allEntries: nearest.entries,
        avgRecency: nearest.entries.reduce((sum, e) => sum + getRecencyWeight(e.effectiveDate), 0) / nearest.entries.length,
        warning: `Extrapolating from ${nearest.quantity} units`
    };
};

/**
 * Estimate Weigh Module Cost
 */
export const estimateWeighModuleCost = async (params, dateRangeMonths = 12) => {
    try {
        // Fetch all weigh modules
        const snapshot = await getDocs(collection(db, 'weigh_modules_cost_history'));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter by date range
        data = filterByDateRange(data, dateRangeMonths);

        if (data.length === 0) {
            return {
                success: false,
                error: 'No historical data available for the specified date range'
            };
        }

        // Required exact matches
        const categoricalFields = ['modelId', 'materialType', 'idlerSpacing'];
        let matches = findExactMatches(data, params, categoricalFields);

        if (matches.length === 0) {
            return {
                success: false,
                error: 'No matching data found for the specified model, material, and idler spacing'
            };
        }

        // Try exact match on all fields including belt width and capacity
        const exactMatches = matches.filter(m =>
            m.beltWidth === params.beltWidth &&
            Math.abs(m.capacityKgPerM - params.capacityKgPerM) < 1
        );

        if (exactMatches.length > 0) {
            // Calculate weighted average
            const totalWeight = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedCost = exactMatches.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / exactMatches.length;
            const confidence = calculateConfidence('exact', exactMatches.length, avgRecency);

            return {
                success: true,
                estimatedCost: Math.round(weightedCost),
                confidence,
                method: 'Exact Match',
                dataPoints: exactMatches.length,
                matchingEntries: exactMatches.slice(0, 5).map(m => ({
                    beltWidth: m.beltWidth,
                    capacity: m.capacityKgPerM,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Try interpolation on belt width
        const belowWidth = matches.filter(m => m.beltWidth < params.beltWidth).sort((a, b) => b.beltWidth - a.beltWidth);
        const aboveWidth = matches.filter(m => m.beltWidth > params.beltWidth).sort((a, b) => a.beltWidth - b.beltWidth);

        if (belowWidth.length > 0 && aboveWidth.length > 0) {
            const lower = belowWidth[0];
            const upper = aboveWidth[0];

            const estimatedCost = interpolateLinear(
                lower.beltWidth, lower.costPrice,
                upper.beltWidth, upper.costPrice,
                params.beltWidth
            );

            const usedData = [lower, upper];
            const avgRecency = usedData.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / usedData.length;
            const confidence = calculateConfidence('interpolated', usedData.length, avgRecency);

            return {
                success: true,
                estimatedCost: Math.round(estimatedCost),
                confidence,
                method: `Linear Interpolation (${lower.beltWidth}mm - ${upper.beltWidth}mm)`,
                dataPoints: usedData.length,
                matchingEntries: usedData.map(m => ({
                    beltWidth: m.beltWidth,
                    capacity: m.capacityKgPerM,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Fuzzy match - find nearest belt width
        const sorted = matches.sort((a, b) =>
            Math.abs(a.beltWidth - params.beltWidth) - Math.abs(b.beltWidth - params.beltWidth)
        );

        if (sorted.length > 0) {
            const nearest = sorted.slice(0, 3);
            const totalWeight = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedCost = nearest.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / nearest.length;
            const confidence = calculateConfidence('fuzzy', nearest.length, avgRecency);

            return {
                success: true,
                estimatedCost: Math.round(weightedCost),
                confidence,
                method: 'Fuzzy Match (Nearest Belt Width)',
                dataPoints: nearest.length,
                matchingEntries: nearest.map(m => ({
                    beltWidth: m.beltWidth,
                    capacity: m.capacityKgPerM,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        return {
            success: false,
            error: 'Insufficient data for estimation'
        };

    } catch (error) {
        console.error('Error estimating weigh module cost:', error);
        return {
            success: false,
            error: error.message || 'Failed to estimate cost'
        };
    }
};

/**
 * Estimate Idler Frame Cost
 */
export const estimateIdlerFrameCost = async (params, dateRangeMonths = 12) => {
    try {
        const snapshot = await getDocs(collection(db, 'idler_frames_cost_history'));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        data = filterByDateRange(data, dateRangeMonths);

        if (data.length === 0) {
            return { success: false, error: 'No historical data available' };
        }

        // Exact match on categorical fields
        const categoricalFields = ['materialType', 'transomType', 'rollerDesign', 'hasCams'];
        let matches = findExactMatches(data, params, categoricalFields);

        if (matches.length === 0) {
            return { success: false, error: 'No matching data found for the specified configuration' };
        }

        // Try exact match
        const exactMatches = matches.filter(m =>
            m.beltWidth === params.beltWidth &&
            Math.abs(m.capacityKgPerM - params.capacityKgPerM) < 1 &&
            m.quantity === params.quantity
        );

        if (exactMatches.length > 0) {
            const totalWeight = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedCost = exactMatches.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / exactMatches.length;
            const confidence = calculateConfidence('exact', exactMatches.length, avgRecency);

            const unitCost = Math.round(weightedCost);
            return {
                success: true,
                estimatedCost: unitCost * params.quantity,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: unitCost * params.quantity,
                quantity: params.quantity,
                confidence,
                method: 'Exact Match',
                dataPoints: exactMatches.length,
                matchingEntries: exactMatches.slice(0, 5).map(m => ({
                    beltWidth: m.beltWidth,
                    capacity: m.capacityKgPerM,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Check for quantity variations - prioritize quantity-based pricing if available
        const quantityGroups = findQuantityVariations(matches);

        if (Object.keys(quantityGroups).length > 1) {
            // Multiple quantities available - use quantity-based adjustment
            const adjustment = adjustPriceForQuantity(quantityGroups, params.quantity);

            if (adjustment) {
                const confidence = calculateConfidence(adjustment.matchType, adjustment.dataPoints, adjustment.avgRecency);

                return {
                    success: true,
                    estimatedCost: adjustment.unitCost * params.quantity,
                    estimatedCostPerUnit: adjustment.unitCost,
                    estimatedCostTotal: adjustment.unitCost * params.quantity,
                    quantity: params.quantity,
                    confidence,
                    method: adjustment.method,
                    dataPoints: adjustment.dataPoints,
                    quantityAdjusted: true,
                    quantityRange: adjustment.quantityRange,
                    matchingEntries: adjustment.allEntries.slice(0, 10).map(m => ({
                        beltWidth: m.beltWidth,
                        capacity: m.capacityKgPerM,
                        quantity: m.quantity,
                        costPrice: m.costPrice,
                        effectiveDate: m.effectiveDate
                    })),
                    dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
                };
            }
        }

        // Try belt width interpolation
        const belowWidth = matches.filter(m => m.beltWidth < params.beltWidth).sort((a, b) => b.beltWidth - a.beltWidth);
        const aboveWidth = matches.filter(m => m.beltWidth > params.beltWidth).sort((a, b) => a.beltWidth - b.beltWidth);

        if (belowWidth.length > 0 && aboveWidth.length > 0) {
            const lower = belowWidth[0];
            const upper = aboveWidth[0];

            const unitCost = Math.round(interpolateLinear(
                lower.beltWidth, lower.costPrice,
                upper.beltWidth, upper.costPrice,
                params.beltWidth
            ));

            // Scale by quantity
            const estimatedCost = unitCost * params.quantity;

            const usedData = [lower, upper];
            const avgRecency = usedData.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / usedData.length;
            const confidence = calculateConfidence('interpolated', usedData.length, avgRecency);

            return {
                success: true,
                estimatedCost: estimatedCost,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: estimatedCost,
                quantity: params.quantity,
                confidence,
                method: `Linear Interpolation (${lower.beltWidth}mm - ${upper.beltWidth}mm)`,
                dataPoints: usedData.length,
                matchingEntries: usedData.map(m => ({
                    beltWidth: m.beltWidth,
                    capacity: m.capacityKgPerM,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Fuzzy match
        const sorted = matches.sort((a, b) =>
            Math.abs(a.beltWidth - params.beltWidth) - Math.abs(b.beltWidth - params.beltWidth)
        );

        if (sorted.length > 0) {
            const nearest = sorted.slice(0, 3);
            const totalWeight = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedCost = nearest.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / nearest.length;
            const confidence = calculateConfidence('fuzzy', nearest.length, avgRecency);

            const unitCost = Math.round(weightedCost);
            return {
                success: true,
                estimatedCost: unitCost * params.quantity,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: unitCost * params.quantity,
                quantity: params.quantity,
                confidence,
                method: 'Fuzzy Match',
                dataPoints: nearest.length,
                matchingEntries: nearest.map(m => ({
                    beltWidth: m.beltWidth,
                    capacity: m.capacityKgPerM,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        return { success: false, error: 'Insufficient data for estimation' };

    } catch (error) {
        console.error('Error estimating idler frame cost:', error);
        return { success: false, error: error.message || 'Failed to estimate cost' };
    }
};

/**
 * Estimate Billet Weight Cost
 */
export const estimateBilletWeightCost = async (params, dateRangeMonths = 12) => {
    try {
        const snapshot = await getDocs(collection(db, 'billet_weights_cost_history'));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        data = filterByDateRange(data, dateRangeMonths);

        if (data.length === 0) {
            return { success: false, error: 'No historical data available' };
        }

        // Filter by material type
        let matches = data.filter(m => m.materialType === params.materialType);

        if (matches.length === 0) {
            return { success: false, error: 'No matching data found for the specified material' };
        }

        // Important: Don't interpolate across the 250kg breakpoint
        const category = getBilletWeightCategory(params.weightKg);
        matches = matches.filter(m => getBilletWeightCategory(m.weightKg) === category);

        if (matches.length === 0) {
            return { success: false, error: `No ${category.toLowerCase()} weight data available` };
        }

        // Exact match
        const exactMatches = matches.filter(m => Math.abs(m.weightKg - params.weightKg) < 1);

        if (exactMatches.length > 0) {
            const totalWeight = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedCost = exactMatches.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / exactMatches.length;
            const confidence = calculateConfidence('exact', exactMatches.length, avgRecency);

            return {
                success: true,
                estimatedCost: Math.round(weightedCost),
                confidence,
                method: 'Exact Match',
                dataPoints: exactMatches.length,
                category,
                matchingEntries: exactMatches.slice(0, 5).map(m => ({
                    weightKg: m.weightKg,
                    costPrice: m.costPrice,
                    setupCost: m.setupCost,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Interpolation within same category
        const below = matches.filter(m => m.weightKg < params.weightKg).sort((a, b) => b.weightKg - a.weightKg);
        const above = matches.filter(m => m.weightKg > params.weightKg).sort((a, b) => a.weightKg - b.weightKg);

        if (below.length > 0 && above.length > 0) {
            const lower = below[0];
            const upper = above[0];

            const estimatedCost = interpolateLinear(
                lower.weightKg, lower.costPrice,
                upper.weightKg, upper.costPrice,
                params.weightKg
            );

            const usedData = [lower, upper];
            const avgRecency = usedData.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / usedData.length;
            const confidence = calculateConfidence('interpolated', usedData.length, avgRecency);

            return {
                success: true,
                estimatedCost: Math.round(estimatedCost),
                confidence,
                method: `Linear Interpolation (${lower.weightKg}kg - ${upper.weightKg}kg)`,
                dataPoints: usedData.length,
                category,
                matchingEntries: usedData.map(m => ({
                    weightKg: m.weightKg,
                    costPrice: m.costPrice,
                    setupCost: m.setupCost,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Fuzzy match - nearest weight
        const sorted = matches.sort((a, b) =>
            Math.abs(a.weightKg - params.weightKg) - Math.abs(b.weightKg - params.weightKg)
        );

        if (sorted.length > 0) {
            const nearest = sorted.slice(0, 3);
            const totalWeight = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedCost = nearest.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / nearest.length;
            const confidence = calculateConfidence('fuzzy', nearest.length, avgRecency);

            return {
                success: true,
                estimatedCost: Math.round(weightedCost),
                confidence,
                method: 'Fuzzy Match (Nearest Weight)',
                dataPoints: nearest.length,
                category,
                matchingEntries: nearest.map(m => ({
                    weightKg: m.weightKg,
                    costPrice: m.costPrice,
                    setupCost: m.setupCost,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        return { success: false, error: 'Insufficient data for estimation' };

    } catch (error) {
        console.error('Error estimating billet weight cost:', error);
        return { success: false, error: error.message || 'Failed to estimate cost' };
    }
};

/**
 * Estimate Roller Cost
 */
export const estimateRollerCost = async (params, dateRangeMonths = 12) => {
    try {
        const snapshot = await getDocs(collection(db, 'rollers_cost_history'));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        data = filterByDateRange(data, dateRangeMonths);

        if (data.length === 0) {
            return { success: false, error: 'No historical data available' };
        }

        // Exact match on categorical fields
        let matches = data.filter(m =>
            m.diameter === params.diameter &&
            m.materialType === params.materialType
        );

        if (matches.length === 0) {
            return { success: false, error: 'No matching data found for the specified diameter and material' };
        }

        // Exact match including face length
        const exactMatches = matches.filter(m => Math.abs(m.faceLength - params.faceLength) < 10);

        if (exactMatches.length > 0) {
            const totalWeight = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedUnitCost = exactMatches.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / exactMatches.length;
            const confidence = calculateConfidence('exact', exactMatches.length, avgRecency);

            const unitCost = Math.round(weightedUnitCost);
            return {
                success: true,
                estimatedCost: unitCost * params.quantity,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: unitCost * params.quantity,
                quantity: params.quantity,
                confidence,
                method: 'Exact Match',
                dataPoints: exactMatches.length,
                matchingEntries: exactMatches.slice(0, 5).map(m => ({
                    diameter: m.diameter,
                    faceLength: m.faceLength,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Check for quantity variations - prioritize quantity-based pricing if available
        const quantityGroups = findQuantityVariations(matches);

        if (Object.keys(quantityGroups).length > 1) {
            // Multiple quantities available - use quantity-based adjustment
            const adjustment = adjustPriceForQuantity(quantityGroups, params.quantity);

            if (adjustment) {
                const confidence = calculateConfidence(adjustment.matchType, adjustment.dataPoints, adjustment.avgRecency);

                return {
                    success: true,
                    estimatedCost: adjustment.unitCost * params.quantity,
                    estimatedCostPerUnit: adjustment.unitCost,
                    estimatedCostTotal: adjustment.unitCost * params.quantity,
                    quantity: params.quantity,
                    confidence,
                    method: adjustment.method,
                    dataPoints: adjustment.dataPoints,
                    quantityAdjusted: true,
                    quantityRange: adjustment.quantityRange,
                    matchingEntries: adjustment.allEntries.slice(0, 10).map(m => ({
                        diameter: m.diameter,
                        faceLength: m.faceLength,
                        quantity: m.quantity,
                        costPrice: m.costPrice,
                        effectiveDate: m.effectiveDate
                    })),
                    dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
                };
            }
        }

        // Interpolation on face length
        const below = matches.filter(m => m.faceLength < params.faceLength).sort((a, b) => b.faceLength - a.faceLength);
        const above = matches.filter(m => m.faceLength > params.faceLength).sort((a, b) => a.faceLength - b.faceLength);

        if (below.length > 0 && above.length > 0) {
            const lower = below[0];
            const upper = above[0];

            const unitCost = Math.round(interpolateLinear(
                lower.faceLength, lower.costPrice,
                upper.faceLength, upper.costPrice,
                params.faceLength
            ));

            const estimatedCost = unitCost * params.quantity;

            const usedData = [lower, upper];
            const avgRecency = usedData.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / usedData.length;
            const confidence = calculateConfidence('interpolated', usedData.length, avgRecency);

            return {
                success: true,
                estimatedCost: estimatedCost,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: estimatedCost,
                quantity: params.quantity,
                confidence,
                method: `Linear Interpolation (${lower.faceLength}mm - ${upper.faceLength}mm)`,
                dataPoints: usedData.length,
                matchingEntries: usedData.map(m => ({
                    diameter: m.diameter,
                    faceLength: m.faceLength,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Fuzzy match - nearest face length
        const sorted = matches.sort((a, b) =>
            Math.abs(a.faceLength - params.faceLength) - Math.abs(b.faceLength - params.faceLength)
        );

        if (sorted.length > 0) {
            const nearest = sorted.slice(0, 3);
            const totalWeight = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedUnitCost = nearest.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / nearest.length;
            const confidence = calculateConfidence('fuzzy', nearest.length, avgRecency);

            const unitCost = Math.round(weightedUnitCost);
            return {
                success: true,
                estimatedCost: unitCost * params.quantity,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: unitCost * params.quantity,
                quantity: params.quantity,
                confidence,
                method: 'Fuzzy Match',
                dataPoints: nearest.length,
                matchingEntries: nearest.map(m => ({
                    diameter: m.diameter,
                    faceLength: m.faceLength,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        return { success: false, error: 'Insufficient data for estimation' };

    } catch (error) {
        console.error('Error estimating roller cost:', error);
        return { success: false, error: error.message || 'Failed to estimate cost' };
    }
};

/**
 * Estimate Speed Sensor Cost
 */
export const estimateSpeedSensorCost = async (params, dateRangeMonths = 12) => {
    try {
        const snapshot = await getDocs(collection(db, 'speed_sensors_cost_history'));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        data = filterByDateRange(data, dateRangeMonths);

        if (data.length === 0) {
            return { success: false, error: 'No historical data available' };
        }

        // Exact match on categorical fields
        let matches = data.filter(m =>
            m.materialType === params.materialType &&
            m.design === params.design
        );

        if (matches.length === 0) {
            return { success: false, error: 'No matching data found for the specified material and design' };
        }

        // Exact match including belt width
        const exactMatches = matches.filter(m => {
            // Match on belt width if provided, otherwise allow any
            const beltWidthMatch = !m.beltWidth || !params.beltWidth || Math.abs(m.beltWidth - params.beltWidth) < 10;
            return beltWidthMatch;
        });

        if (exactMatches.length > 0) {
            const totalWeight = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedUnitCost = exactMatches.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = exactMatches.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / exactMatches.length;
            const confidence = calculateConfidence('exact', exactMatches.length, avgRecency);

            const unitCost = Math.round(weightedUnitCost);
            return {
                success: true,
                estimatedCost: unitCost * params.quantity,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: unitCost * params.quantity,
                quantity: params.quantity,
                confidence,
                method: 'Exact Match',
                dataPoints: exactMatches.length,
                matchingEntries: exactMatches.slice(0, 5).map(m => ({
                    beltWidth: m.beltWidth,
                    rhsCutLength: m.rhsCutLength,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        // Check for quantity variations - prioritize quantity-based pricing if available
        const quantityGroups = findQuantityVariations(matches);

        if (Object.keys(quantityGroups).length > 1) {
            // Multiple quantities available - use quantity-based adjustment
            const adjustment = adjustPriceForQuantity(quantityGroups, params.quantity);

            if (adjustment) {
                const confidence = calculateConfidence(adjustment.matchType, adjustment.dataPoints, adjustment.avgRecency);

                return {
                    success: true,
                    estimatedCost: adjustment.unitCost * params.quantity,
                    estimatedCostPerUnit: adjustment.unitCost,
                    estimatedCostTotal: adjustment.unitCost * params.quantity,
                    quantity: params.quantity,
                    confidence,
                    method: adjustment.method,
                    dataPoints: adjustment.dataPoints,
                    quantityAdjusted: true,
                    quantityRange: adjustment.quantityRange,
                    matchingEntries: adjustment.allEntries.slice(0, 10).map(m => ({
                        beltWidth: m.beltWidth,
                        rhsCutLength: m.rhsCutLength,
                        quantity: m.quantity,
                        costPrice: m.costPrice,
                        effectiveDate: m.effectiveDate
                    })),
                    dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
                };
            }
        }

        // Try interpolation on belt width (if belt width is tracked)
        if (params.beltWidth) {
            const belowWidth = matches.filter(m => m.beltWidth && m.beltWidth < params.beltWidth).sort((a, b) => b.beltWidth - a.beltWidth);
            const aboveWidth = matches.filter(m => m.beltWidth && m.beltWidth > params.beltWidth).sort((a, b) => a.beltWidth - b.beltWidth);

            if (belowWidth.length > 0 && aboveWidth.length > 0) {
                const lower = belowWidth[0];
                const upper = aboveWidth[0];

                const unitCost = Math.round(interpolateLinear(
                    lower.beltWidth, lower.costPrice,
                    upper.beltWidth, upper.costPrice,
                    params.beltWidth
                ));

                const estimatedCost = unitCost * params.quantity;

                const usedData = [lower, upper];
                const avgRecency = usedData.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / usedData.length;
                const confidence = calculateConfidence('interpolated', usedData.length, avgRecency);

                return {
                    success: true,
                    estimatedCost: estimatedCost,
                    estimatedCostPerUnit: unitCost,
                    estimatedCostTotal: estimatedCost,
                    quantity: params.quantity,
                    confidence,
                    method: `Linear Interpolation (${lower.beltWidth}mm - ${upper.beltWidth}mm belt width)`,
                    dataPoints: usedData.length,
                    matchingEntries: usedData.map(m => ({
                        beltWidth: m.beltWidth,
                        rhsCutLength: m.rhsCutLength,
                        quantity: m.quantity,
                        costPrice: m.costPrice,
                        effectiveDate: m.effectiveDate
                    })),
                    dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
                };
            }
        }

        // Fuzzy match - nearest match
        const sorted = params.beltWidth
            ? matches.sort((a, b) => {
                // Prefer entries with belt width that matches, then by closest value
                const aBeltDiff = a.beltWidth ? Math.abs(a.beltWidth - params.beltWidth) : 999999;
                const bBeltDiff = b.beltWidth ? Math.abs(b.beltWidth - params.beltWidth) : 999999;
                return aBeltDiff - bBeltDiff;
            })
            : matches; // If no belt width specified, just use all matches

        if (sorted.length > 0) {
            const nearest = sorted.slice(0, 3);
            const totalWeight = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0);
            const weightedUnitCost = nearest.reduce((sum, m) =>
                sum + (m.costPrice * getRecencyWeight(m.effectiveDate)), 0
            ) / totalWeight;

            const avgRecency = nearest.reduce((sum, m) => sum + getRecencyWeight(m.effectiveDate), 0) / nearest.length;
            const confidence = calculateConfidence('fuzzy', nearest.length, avgRecency);

            const unitCost = Math.round(weightedUnitCost);
            return {
                success: true,
                estimatedCost: unitCost * params.quantity,
                estimatedCostPerUnit: unitCost,
                estimatedCostTotal: unitCost * params.quantity,
                quantity: params.quantity,
                confidence,
                method: 'Fuzzy Match',
                dataPoints: nearest.length,
                matchingEntries: nearest.map(m => ({
                    beltWidth: m.beltWidth,
                    rhsCutLength: m.rhsCutLength,
                    quantity: m.quantity,
                    costPrice: m.costPrice,
                    effectiveDate: m.effectiveDate
                })),
                dateRange: dateRangeMonths === 'all' ? 'All time' : `Last ${dateRangeMonths} months`
            };
        }

        return { success: false, error: 'Insufficient data for estimation' };

    } catch (error) {
        console.error('Error estimating speed sensor cost:', error);
        return { success: false, error: error.message || 'Failed to estimate cost' };
    }
};

