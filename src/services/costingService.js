// Costing Service - Core calculation engine for product and part costs
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { partCostHistoryRepository, productCompositionRepository, productCostHistoryRepository } from '../repositories';
import { findEffectiveCost } from '../utils/dateHelpers';
import { forecastCostAtDate } from '../utils/costForecasting';
import { getLowestSupplierPrice } from './partPricingService';
import { getLabourRate } from './settingsService';

/**
 * Forecast part cost at a target date using linear regression
 * @description Fetches historical cost data from PartCostHistoryRepository and uses
 * linear regression to predict future cost. Returns forecasted cost and confidence score.
 * @param {string} partId - The part ID to forecast
 * @param {Date|string} targetDate - Date to forecast for
 * @returns {Promise<{forecastedCost: number, confidence: number}|null>} Forecast with R² confidence or null
 * @example
 * const forecast = await forecastPartCost('part-123', new Date('2026-06-01'));
 * // returns { forecastedCost: 1350, confidence: 0.92 }
 */
export async function forecastPartCost(partId, targetDate) {
    try {
        const history = await partCostHistoryRepository.getCostHistory(partId);

        if (!history || history.length < 2) {
            console.warn(`[CostingService] Insufficient history for part ${partId} (need 2+ entries for forecasting)`);
            return null;
        }

        const forecast = forecastCostAtDate(history, targetDate);

        if (forecast) {
            console.log(`[CostingService] Forecasted cost for ${partId}:`, {
                forecastedCost: forecast.forecastedCost,
                confidence: forecast.confidence.toFixed(2),
                dataPoints: history.length
            });
        }

        return forecast;
    } catch (error) {
        console.error('[CostingService] Error forecasting part cost:', error);
        return null;
    }
}

/**
 * Get the cost of a part at a specific date
 * @description Queries part cost history for the effective cost on a given date.
 * Falls back to the current catalog cost if no history exists.
 * Respects costPriceSource setting (MANUAL or SUPPLIER_LOWEST).
 * @param {string} partId - The part ID to query
 * @param {Date|string} date - The date to find the effective cost for
 * @returns {Promise<number>} Cost in cents
 * @example
 * const cost = await getPartCostAtDate('part-123', new Date('2025-12-13'));
 * // returns 1250 (cents)
 */
export async function getPartCostAtDate(partId, date) {
    try {
        // First, try to get cost from history
        const costHistory = await partCostHistoryRepository.getCostHistory(partId);

        if (costHistory && costHistory.length > 0) {
            const effectiveCost = findEffectiveCost(costHistory, date);
            if (effectiveCost) {
                return effectiveCost.costPrice;
            }
        }

        // Fallback: get current cost from part catalog
        let catalogRef = await getDocs(query(collection(db, 'part_catalog'), where('id', '==', partId)));

        // If not found in part catalog, try fastener catalog
        if (catalogRef.empty) {
            catalogRef = await getDocs(query(collection(db, 'fastener_catalog'), where('id', '==', partId)));
        }

        // If not found in fastener catalog, try electrical catalog
        if (catalogRef.empty) {
            catalogRef = await getDocs(query(collection(db, 'electrical_catalog'), where('id', '==', partId)));
        }

        if (!catalogRef.empty) {
            const itemData = catalogRef.docs[0].data();

            // Determine active cost based on costPriceSource
            if (itemData.costPriceSource === 'PROJECTED') {
                try {
                    const forecast = await forecastPartCost(partId, date);

                    if (forecast) {
                        // Log warning if confidence is low, but still use projected cost
                        if (forecast.confidence < 0.3) {
                            console.warn(`[CostingService] Low confidence (${forecast.confidence.toFixed(2)}) for ${partId}, but using projected cost anyway`);
                        } else {
                            console.log(`[CostingService] Using projected cost for ${partId}:`,
                                { cost: forecast.forecastedCost, confidence: forecast.confidence.toFixed(2) });
                        }
                        return forecast.forecastedCost;
                    } else {
                        console.warn(`[CostingService] No forecast available for ${partId}, falling back to manual cost`);
                        return itemData.costPrice || 0;
                    }
                } catch (err) {
                    console.warn(`[CostingService] Could not project cost for ${partId}, using manual cost:`, err);
                    return itemData.costPrice || 0;
                }
            }

            if (itemData.costPriceSource === 'SUPPLIER_LOWEST') {
                try {
                    const validSuppliers = itemData.suppliers || [];
                    const lowestPrice = await getLowestSupplierPrice(partId, date, validSuppliers);
                    if (lowestPrice) {
                        return lowestPrice.costPrice;
                    }
                } catch (err) {
                    console.warn(`[CostingService] Could not get lowest supplier price for ${partId}, using manual cost:`, err);
                }
            }

            // Default to manual cost
            return itemData.costPrice || 0;
        }

        console.warn(`[CostingService] No cost found for item ${partId} in either catalog`);
        return 0;
    } catch (error) {
        console.error('[CostingService] Error getting part cost at date:', error);
        throw error;
    }
}

/**
 * Get the cost of a sub assembly at a specific date
 * @description Calculates sub assembly cost from its BOM (parts + fasteners + labour).
 * Respects costType: uses manual cost if MANUAL, otherwise calculates from BOM if CALCULATED.
 * @param {string} subAssemblyId - The sub assembly ID to query
 * @param {Date|string} date - The date to find the effective cost for
 * @returns {Promise<number>} Cost in cents
 * @example
 * const cost = await getSubAssemblyCostAtDate('subassy-123', new Date('2025-12-13'));
 * // returns 3500 (cents)
 */
export async function getSubAssemblyCostAtDate(subAssemblyId, date) {
    try {
        // Get sub assembly document
        const subAssemblyRef = doc(db, 'sub_assemblies', subAssemblyId);
        const subAssemblySnap = await getDoc(subAssemblyRef);

        if (!subAssemblySnap.exists()) {
            // Try product catalog if not found in sub-assemblies
            const productRef = doc(db, 'products', subAssemblyId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = productSnap.data();
                if (productData.costType === 'MANUAL') {
                    return productData.manualCost || 0;
                }
                // Calculate from BOM
                const result = await calculateProductCost(subAssemblyId, date);
                return result.totalCost;
            }

            console.warn(`[CostingService] Sub assembly or Product ${subAssemblyId} not found`);
            return 0;
        }

        const subAssemblyData = subAssemblySnap.data();

        // If manual cost type, use the manual cost
        if (subAssemblyData.costType === 'MANUAL') {
            return subAssemblyData.manualCost || 0;
        }

        // Otherwise, calculate from BOM
        const { subAssemblyCompositionRepository } = await import('../repositories');
        const bom = await subAssemblyCompositionRepository.getBOMForSubAssembly(subAssemblyId);

        const parts = bom.parts || [];
        const fasteners = bom.fasteners || [];
        const electrical = bom.electrical || [];

        let totalCost = 0;

        // Calculate cost for parts
        for (const bomEntry of parts) {
            const partCost = await getPartCostAtDate(bomEntry.partId, date);
            totalCost += Math.round(partCost * bomEntry.quantityUsed);
        }

        // Calculate cost for fasteners
        for (const bomEntry of fasteners) {
            const fastenerCost = await getPartCostAtDate(bomEntry.fastenerId, date);
            totalCost += Math.round(fastenerCost * bomEntry.quantityUsed);
        }

        // Calculate cost for electrical items
        for (const bomEntry of electrical) {
            const electricalCost = await getPartCostAtDate(bomEntry.electricalId, date);
            totalCost += Math.round(electricalCost * bomEntry.quantityUsed);
        }

        // Add labour cost
        const labourHours = subAssemblyData.labourHours || 0;
        const labourMinutes = subAssemblyData.labourMinutes || 0;

        if (labourHours > 0 || labourMinutes > 0) {
            const labourRate = await getLabourRate();
            const totalMinutes = (labourHours * 60) + labourMinutes;
            const labourCost = Math.round((totalMinutes / 60) * labourRate);
            totalCost += labourCost;
        }

        return Math.round(totalCost);
    } catch (error) {
        console.error('[CostingService] Error getting sub assembly cost at date:', error);
        throw error;
    }
}

/**
 * Calculate the total cost of a product from its Bill of Materials
 * @description Sums the cost of all parts in a product's BOM, using historical
 * costs if a date is provided. Returns total cost and detailed breakdown.
 * @param {string} productId - The product ID to calculate cost for
 * @param {Date|string} [date] - Optional date for historical cost calculation (defaults to now)
 * @returns {Promise<{totalCost: number, breakdown: Array}>} Cost calculation result
 * @example
 * const result = await calculateProductCost('prod-123', new Date('2025-12-13'));
 * // returns { totalCost: 5000, breakdown: [{ partId: 'part-456', partCost: 1250, quantity: 2.5, subtotal: 3125 }, ...] }
 */
export async function calculateProductCost(productId, date = new Date()) {
    try {
        // Get the product's BOM
        const bom = await productCompositionRepository.getBOMForProduct(productId);

        // Handle both new structure {parts, fasteners, subAssemblies} and legacy array structure
        const parts = bom.parts || (Array.isArray(bom) ? bom : []);
        const fasteners = bom.fasteners || [];
        const subAssemblies = bom.subAssemblies || [];
        const electrical = bom.electrical || [];

        if (parts.length === 0 && fasteners.length === 0 && subAssemblies.length === 0) {
            console.warn(`[CostingService] Product ${productId} has no BOM`);
            return { totalCost: 0, breakdown: [] };
        }

        // Calculate cost for each part
        const breakdown = [];
        let totalCost = 0;

        // Process parts
        for (const bomEntry of parts) {
            const partCost = await getPartCostAtDate(bomEntry.partId, date);
            const subtotal = Math.round(partCost * bomEntry.quantityUsed);

            breakdown.push({
                partId: bomEntry.partId,
                type: 'part',
                partCost,
                quantity: bomEntry.quantityUsed,
                subtotal
            });

            totalCost += subtotal;
        }

        // Process fasteners
        for (const bomEntry of fasteners) {
            const fastenerCost = await getPartCostAtDate(bomEntry.fastenerId, date);
            const subtotal = Math.round(fastenerCost * bomEntry.quantityUsed);

            breakdown.push({
                partId: bomEntry.fastenerId,
                type: 'fastener',
                partCost: fastenerCost,
                quantity: bomEntry.quantityUsed,
                subtotal
            });

            totalCost += subtotal;
        }

        // Process sub assemblies
        for (const bomEntry of subAssemblies) {
            const subAssemblyCost = await getSubAssemblyCostAtDate(bomEntry.subAssemblyId, date);
            const subtotal = Math.round(subAssemblyCost * bomEntry.quantityUsed);

            breakdown.push({
                partId: bomEntry.subAssemblyId,
                type: 'subassembly',
                partCost: subAssemblyCost,
                quantity: bomEntry.quantityUsed,
                subtotal
            });

            totalCost += subtotal;
        }

        // Calculate labour cost if product has labour time
        let labourCost = 0;
        try {
            // Get product details to access labour time
            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const productData = productSnap.data();
                const labourHours = productData.labourHours || 0;
                const labourMinutes = productData.labourMinutes || 0;
                console.log('[CostingService] Labour data for product:', { productId, labourHours, labourMinutes });

                if (labourHours > 0 || labourMinutes > 0) {
                    const labourRate = await getLabourRate(); // cents per hour
                    const totalMinutes = (labourHours * 60) + labourMinutes;
                    labourCost = Math.round((totalMinutes / 60) * labourRate);

                    breakdown.push({
                        partId: 'LABOUR',
                        type: 'labour',
                        partCost: labourRate,
                        quantity: totalMinutes / 60, // hours
                        subtotal: labourCost
                    });

                    totalCost += labourCost;
                }
            }
        } catch (error) {
            console.warn('[CostingService] Error calculating labour cost:', error);
            // Continue without labour cost
        }

        return {
            totalCost: Math.round(totalCost),
            breakdown
        };
    } catch (error) {
        console.error('[CostingService] Error calculating product cost:', error);
        throw error;
    }
}

/**
 * Save a product cost entry (manual or calculated)
 * @description Creates a cost history entry for a product. If calculated, runs
 * the BOM calculation and stores the breakdown for auditability.
 * @param {string} productId - The product ID
 * @param {string} costType - 'MANUAL' or 'CALCULATED'
 * @param {Date|string} effectiveDate - When this cost becomes effective
 * @param {number} [manualCost] - Cost in cents (required if costType is MANUAL)
 * @param {string} createdBy - User ID who created this entry
 * @returns {Promise<Object>} Created cost entry
 * @example
 * const entry = await saveProductCost('prod-123', 'CALCULATED', new Date(), null, 'user-456');
 */
export async function saveProductCost(productId, costType, effectiveDate, manualCost = null, createdBy = 'system') {
    try {
        let costPrice;
        let calculationDetails = null;

        if (costType === 'CALCULATED') {
            // Calculate cost from BOM
            const calculation = await calculateProductCost(productId, effectiveDate);
            costPrice = calculation.totalCost;
            calculationDetails = {
                bomSnapshot: calculation.breakdown,
                totalCost: calculation.totalCost
            };
        } else if (costType === 'MANUAL') {
            if (manualCost === null || manualCost === undefined) {
                throw new Error('Manual cost is required when costType is MANUAL');
            }
            costPrice = manualCost;
        } else {
            throw new Error('Cost type must be MANUAL or CALCULATED');
        }

        return await productCostHistoryRepository.saveCost(
            productId,
            costPrice,
            costType,
            effectiveDate,
            calculationDetails,
            createdBy
        );
    } catch (error) {
        console.error('[CostingService] Error saving product cost:', error);
        throw error;
    }
}

/**
 * Forecast future product cost based on historical trends
 * @description Analyzes historical product costs to predict future cost at a
 * target date. Uses linear regression on cost history.
 * @param {string} productId - The product ID to forecast
 * @param {Date|string} forecastDate - The future date to forecast for
 * @returns {Promise<{forecastedCost: number, confidence: number}|null>} Forecast result or null
 * @example
 * const forecast = await forecastProductCost('prod-123', new Date('2026-01-01'));
 * // returns { forecastedCost: 5500, confidence: 0.92 }
 */
export async function forecastProductCost(productId, forecastDate) {
    try {
        // Get historical product costs
        const costHistory = await productCostHistoryRepository.getCostHistory(productId);

        if (!costHistory || costHistory.length < 2) {
            // Insufficient history - calculate from current part costs
            console.warn(`[CostingService] Insufficient cost history for product ${productId}, using current BOM costs`);
            const currentCost = await calculateProductCost(productId, forecastDate);
            return {
                forecastedCost: currentCost.totalCost,
                confidence: 0.5 // Low confidence without historical data
            };
        }

        // Use forecasting utility
        return forecastCostAtDate(costHistory, forecastDate);
    } catch (error) {
        console.error('[CostingService] Error forecasting product cost:', error);
        throw error;
    }
}
/**
 * Calculate estimate for a manufactured part based on design template
 * @description Fetches a design template, calculates fabricator cost from pricing matrix,
 * calculates internal BOM costs, labor costs, and applies material multipliers.
 * Handles special logic for Idler Frame setup costs.
 * @param {Object} params - Estimation parameters
 * @param {string} params.type - Part type (e.g., 'Weigher', 'Idler', 'Idler Frame')
 * @param {number} params.width - Width in mm
 * @param {string} params.material - Material code ('MS', 'SS')
 * @param {string} params.designTemplateId - ID of the design template in manufactured_templates collection
 * @param {number} params.loadingKgM - Loading capacity in kg/m
 * @param {number} [params.quantity=1] - Quantity for Idler Frame setup cost calculation
 * @returns {Promise<Object>} Estimate with fabricatorCost, internalPartCost, laborCost, totalEstimate (all in cents)
 * @example
 * const estimate = await calculateManufacturedEstimate({
 *   type: 'Weigher',
 *   width: 1200,
 *   material: 'SS',
 *   designTemplateId: 'template-123',
 *   loadingKgM: 50,
 *   quantity: 1
 * });
 */
export async function calculateManufacturedEstimate(params) {
    try {
        const { type, width, material, designTemplateId, loadingKgM, quantity = 1 } = params;

        // Fetch design template from Firestore
        const templateRef = doc(db, 'manufactured_templates', designTemplateId);
        const templateSnap = await getDoc(templateRef);

        if (!templateSnap.exists()) {
            throw new Error(`Design template ${designTemplateId} not found`);
        }

        const template = templateSnap.data();
        console.log('[CostingService] Loaded design template:', { designTemplateId, template });

        // ==========================================
        // 1. Calculate Fabricator Cost from Pricing Matrix
        // ==========================================
        let fabricatorCost = 0;

        if (type === 'Idler Frame') {
            // Special handling for Idler Frame: (BasePrice * Qty) + SetupFee
            const basePrice = template.basePrice || 0; // cents
            const setupFee = template.setupFee || 0; // cents
            fabricatorCost = (basePrice * quantity) + setupFee;
            console.log('[CostingService] Idler Frame cost calculation:', {
                basePrice,
                quantity,
                setupFee,
                fabricatorCost
            });
        } else {
            // Standard pricing matrix lookup by width
            const pricingMatrix = template.pricingMatrix || [];
            const widthEntry = pricingMatrix.find(entry => entry.width === width);

            if (!widthEntry) {
                console.warn(`[CostingService] No pricing entry found for width ${width} in template ${designTemplateId}`);
                fabricatorCost = 0;
            } else {
                const entryPrice = widthEntry.price || 0; // cents
                const templateSetupFee = template.setupFee || 0; // cents (applies to all widths)
                // Apply quantity: (price * quantity) + setupFee
                fabricatorCost = (entryPrice * quantity) + templateSetupFee;
                console.log('[CostingService] Found pricing matrix entry:', { width, price: entryPrice, quantity, setupFee: templateSetupFee, total: fabricatorCost });
            }
        }

        // ==========================================
        // 2. Calculate Internal BOM Part Costs
        // ==========================================
        let internalPartCost = 0;
        const internalBOM = template.internalBOM || [];

        if (internalBOM.length > 0) {
            // Create a temporary BOM structure matching what calculateProductCost expects
            const bomData = {
                parts: internalBOM.filter(item => item.type === 'part').map(item => ({
                    partId: item.partId || item.id,
                    quantityUsed: item.quantity || item.quantityUsed || 1
                })),
                fasteners: internalBOM.filter(item => item.type === 'fastener').map(item => ({
                    fastenerId: item.fastenerId || item.id,
                    quantityUsed: item.quantity || item.quantityUsed || 1
                }))
            };

            console.log('[CostingService] Processing internal BOM:', bomData);

            // Calculate costs for parts
            for (const bomEntry of bomData.parts) {
                const partCost = await getPartCostAtDate(bomEntry.partId, new Date());
                const subtotal = Math.round(partCost * bomEntry.quantityUsed);
                internalPartCost += subtotal;
                console.log('[CostingService] Part cost:', {
                    partId: bomEntry.partId,
                    partCost,
                    quantity: bomEntry.quantityUsed,
                    subtotal
                });
            }

            // Calculate costs for fasteners
            for (const bomEntry of bomData.fasteners) {
                const fastenerCost = await getPartCostAtDate(bomEntry.fastenerId, new Date());
                const subtotal = Math.round(fastenerCost * bomEntry.quantityUsed);
                internalPartCost += subtotal;
                console.log('[CostingService] Fastener cost:', {
                    fastenerId: bomEntry.fastenerId,
                    fastenerCost,
                    quantity: bomEntry.quantityUsed,
                    subtotal
                });
            }
        }

        // ==========================================
        // 3. Calculate Labor Cost
        // ==========================================
        let laborCost = 0;
        const laborMinutes = template.laborMinutes || 0;

        if (laborMinutes > 0) {
            const labourRate = await getLabourRate(); // cents per hour
            // Labor cost applies once (setup/configuration labor, not per-unit)
            laborCost = Math.round((laborMinutes / 60) * labourRate);
            console.log('[CostingService] Labor cost calculation:', {
                laborMinutes,
                labourRate,
                laborCost
            });
        }

        // ==========================================
        // 4. Apply Material Multiplier
        // ==========================================
        let materialMultiplier = 1.0;
        if (material === 'SS' && template.materialMultiplier) {
            materialMultiplier = template.materialMultiplier.SS || template.materialMultiplier.ss || 1.0;
            console.log('[CostingService] Applying SS material multiplier:', materialMultiplier);
        }

        // Apply multiplier to fabricator cost (most common pattern for material upgrades)
        fabricatorCost = Math.round(fabricatorCost * materialMultiplier);

        // ==========================================
        // 5. Calculate Total Estimate
        // ==========================================
        const totalEstimate = Math.round(fabricatorCost + internalPartCost + laborCost);

        const result = {
            type,
            width,
            material,
            designTemplateId,
            loadingKgM,
            fabricatorCost,
            internalPartCost,
            laborCost,
            totalEstimate
        };

        console.log('[CostingService] Manufactured estimate complete:', result);
        return result;
    } catch (error) {
        console.error('[CostingService] Error calculating manufactured estimate:', error);
        throw error;
    }
}
