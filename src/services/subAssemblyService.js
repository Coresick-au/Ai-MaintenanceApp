// Sub Assembly Service - CRUD operations for sub assemblies and BOM management
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { subAssemblyRepository, subAssemblyCompositionRepository } from '../repositories';
import { getPartCostAtDate } from './costingService';

/**
 * Add a new sub assembly to the catalog
 * @param {Object} subAssemblyData - Sub assembly data
 * @returns {Promise<Object>} Created sub assembly with ID
 */
export async function addSubAssembly(subAssemblyData) {
    try {
        // Check for duplicate SKU
        const existingSubAssemblies = await getDocs(
            query(collection(db, 'sub_assemblies'), where('sku', '==', subAssemblyData.sku))
        );

        if (!existingSubAssemblies.empty) {
            throw new Error(`Sub assembly with SKU "${subAssemblyData.sku}" already exists`);
        }

        // Set defaults
        const subAssemblyWithDefaults = {
            targetMarginPercent: 30,
            ...subAssemblyData
        };

        return await subAssemblyRepository.createSubAssembly(subAssemblyWithDefaults);
    } catch (error) {
        console.error('[SubAssemblyService] Error adding sub assembly:', error);
        throw error;
    }
}

/**
 * Update an existing sub assembly
 * @param {string} subAssemblyId - The sub assembly ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated sub assembly
 */
export async function updateSubAssembly(subAssemblyId, updates) {
    try {
        return await subAssemblyRepository.update(subAssemblyId, updates);
    } catch (error) {
        console.error('[SubAssemblyService] Error updating sub assembly:', error);
        throw error;
    }
}

/**
 * Delete a sub assembly from the catalog
 * @param {string} subAssemblyId - The sub assembly ID to delete
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteSubAssembly(subAssemblyId) {
    try {
        // Check if used in any product BOMs
        const productBOM = await getDocs(
            query(collection(db, 'product_sub_assembly_composition'), where('subAssemblyId', '==', subAssemblyId))
        );

        if (!productBOM.empty) {
            throw new Error('Cannot delete sub assembly that is used in product BOMs');
        }

        // Delete BOM entries
        const bom = await subAssemblyCompositionRepository.getBOMForSubAssembly(subAssemblyId);
        const parts = bom.parts || [];
        const fasteners = bom.fasteners || [];

        // Delete part BOM entries
        for (const bomEntry of parts) {
            await subAssemblyCompositionRepository.removePartFromBOM(subAssemblyId, bomEntry.partId);
        }

        // Delete fastener BOM entries
        for (const bomEntry of fasteners) {
            await subAssemblyCompositionRepository.removeFastenerFromBOM(subAssemblyId, bomEntry.fastenerId);
        }

        // Delete electrical BOM entries
        const electrical = bom.electrical || [];
        for (const bomEntry of electrical) {
            await subAssemblyCompositionRepository.removeElectricalFromBOM(subAssemblyId, bomEntry.electricalId);
        }

        // Delete the sub assembly
        return await subAssemblyRepository.delete(subAssemblyId);
    } catch (error) {
        console.error('[SubAssemblyService] Error deleting sub assembly:', error);
        throw error;
    }
}

// ==========================================
// PART BOM OPERATIONS
// ==========================================

/**
 * Add a part to a sub assembly's Bill of Materials
 */
export async function addPartToBOM(subAssemblyId, partId, quantityUsed) {
    try {
        // Validate part exists
        const partRef = await getDocs(
            query(collection(db, 'part_catalog'), where('id', '==', partId))
        );

        if (partRef.empty) {
            throw new Error(`Part ${partId} not found in catalog`);
        }

        return await subAssemblyCompositionRepository.addPartToBOM(subAssemblyId, partId, quantityUsed);
    } catch (error) {
        console.error('[SubAssemblyService] Error adding part to BOM:', error);
        throw error;
    }
}

/**
 * Remove a part from a sub assembly's Bill of Materials
 */
export async function removePartFromBOM(subAssemblyId, partId) {
    try {
        return await subAssemblyCompositionRepository.removePartFromBOM(subAssemblyId, partId);
    } catch (error) {
        console.error('[SubAssemblyService] Error removing part from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of a part in a sub assembly's BOM
 */
export async function updatePartQuantity(subAssemblyId, partId, quantityUsed) {
    try {
        return await subAssemblyCompositionRepository.updatePartQuantity(subAssemblyId, partId, quantityUsed);
    } catch (error) {
        console.error('[SubAssemblyService] Error updating part quantity:', error);
        throw error;
    }
}

// ==========================================
// FASTENER BOM OPERATIONS
// ==========================================

/**
 * Add a fastener to a sub assembly's Bill of Materials
 */
export async function addFastenerToBOM(subAssemblyId, fastenerId, quantityUsed) {
    try {
        // Validate fastener exists
        const fastenerRef = await getDocs(
            query(collection(db, 'fastener_catalog'), where('id', '==', fastenerId))
        );

        if (fastenerRef.empty) {
            throw new Error(`Fastener ${fastenerId} not found in catalog`);
        }

        return await subAssemblyCompositionRepository.addFastenerToBOM(subAssemblyId, fastenerId, quantityUsed);
    } catch (error) {
        console.error('[SubAssemblyService] Error adding fastener to BOM:', error);
        throw error;
    }
}

/**
 * Remove a fastener from a sub assembly's Bill of Materials
 */
export async function removeFastenerFromBOM(subAssemblyId, fastenerId) {
    try {
        return await subAssemblyCompositionRepository.removeFastenerFromBOM(subAssemblyId, fastenerId);
    } catch (error) {
        console.error('[SubAssemblyService] Error removing fastener from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of a fastener in a sub assembly's BOM
 */
export async function updateFastenerQuantity(subAssemblyId, fastenerId, quantityUsed) {
    try {
        return await subAssemblyCompositionRepository.updateFastenerQuantity(subAssemblyId, fastenerId, quantityUsed);
    } catch (error) {
        console.error('[SubAssemblyService] Error updating fastener quantity:', error);
        throw error;
    }
}

/**
 * Get a sub assembly's BOM with current or historical part costs
 * @param {string} subAssemblyId - The sub assembly ID
 * @param {Date|string} [date] - Optional date for historical costs (defaults to now)
 * @returns {Promise<Array>} BOM entries with part details and costs
 */
export async function getBOMWithCosts(subAssemblyId, date = new Date()) {
    try {
        const bom = await subAssemblyCompositionRepository.getBOMForSubAssembly(subAssemblyId);

        if (!bom || (bom.parts.length === 0 && bom.fasteners.length === 0)) {
            return [];
        }

        const enrichedBOM = [];

        // Process parts
        for (const bomEntry of bom.parts) {
            const partRef = await getDocs(
                query(collection(db, 'part_catalog'), where('id', '==', bomEntry.partId))
            );

            if (partRef.empty) {
                console.warn(`[SubAssemblyService] Part ${bomEntry.partId} not found in catalog`);
                continue;
            }

            const partData = partRef.docs[0].data();
            const partCost = await getPartCostAtDate(bomEntry.partId, date);
            const subtotal = Math.round(partCost * bomEntry.quantityUsed);

            enrichedBOM.push({
                partId: bomEntry.partId,
                partSku: partData.sku,
                partName: partData.name,
                quantity: bomEntry.quantityUsed,
                cost: partCost,
                subtotal
            });
        }

        // Process fasteners
        for (const bomEntry of bom.fasteners) {
            const fastenerRef = await getDocs(
                query(collection(db, 'fastener_catalog'), where('id', '==', bomEntry.fastenerId))
            );

            if (fastenerRef.empty) {
                console.warn(`[SubAssemblyService] Fastener ${bomEntry.fastenerId} not found in catalog`);
                continue;
            }

            const fastenerData = fastenerRef.docs[0].data();
            const fastenerCost = await getPartCostAtDate(bomEntry.fastenerId, date);
            const subtotal = Math.round(fastenerCost * bomEntry.quantityUsed);

            enrichedBOM.push({
                fastenerId: bomEntry.fastenerId,
                fastenerSku: fastenerData.sku,
                fastenerName: fastenerData.name,
                quantity: bomEntry.quantityUsed,
                cost: fastenerCost,
                subtotal
            });
        }

        // Process electrical
        const electrical = bom.electrical || [];
        for (const bomEntry of electrical) {
            const electricalRef = await getDocs(
                query(collection(db, 'electrical_catalog'), where('id', '==', bomEntry.electricalId))
            );

            if (electricalRef.empty) {
                console.warn(`[SubAssemblyService] Electrical item ${bomEntry.electricalId} not found in catalog`);
                continue;
            }

            const electricalData = electricalRef.docs[0].data();
            const electricalCost = await getPartCostAtDate(bomEntry.electricalId, date);
            const subtotal = Math.round(electricalCost * bomEntry.quantityUsed);

            enrichedBOM.push({
                electricalId: bomEntry.electricalId,
                electricalSku: electricalData.sku,
                electricalName: electricalData.name,
                type: 'electrical',
                quantity: bomEntry.quantityUsed,
                cost: electricalCost,
                subtotal
            });
        }

        return enrichedBOM;
    } catch (error) {
        console.error('[SubAssemblyService] Error getting BOM with costs:', error);
        throw error;
    }
}

// ==========================================
// ELECTRICAL BOM OPERATIONS
// ==========================================

/**
 * Add an electrical component to a sub assembly's Bill of Materials
 */
export async function addElectricalToBOM(subAssemblyId, electricalId, quantityUsed) {
    try {
        // Validate electrical item exists
        const electricalRef = await getDocs(
            query(collection(db, 'electrical_catalog'), where('id', '==', electricalId))
        );

        if (electricalRef.empty) {
            throw new Error(`Electrical item ${electricalId} not found in catalog`);
        }

        return await subAssemblyCompositionRepository.addElectricalToBOM(subAssemblyId, electricalId, quantityUsed);
    } catch (error) {
        console.error('[SubAssemblyService] Error adding electrical to BOM:', error);
        throw error;
    }
}

/**
 * Remove an electrical component from a sub assembly's Bill of Materials
 */
export async function removeElectricalFromBOM(subAssemblyId, electricalId) {
    try {
        return await subAssemblyCompositionRepository.removeElectricalFromBOM(subAssemblyId, electricalId);
    } catch (error) {
        console.error('[SubAssemblyService] Error removing electrical from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of an electrical component in a sub assembly's BOM
 */
export async function updateElectricalQuantity(subAssemblyId, electricalId, quantityUsed) {
    try {
        return await subAssemblyCompositionRepository.updateElectricalQuantity(subAssemblyId, electricalId, quantityUsed);
    } catch (error) {
        console.error('[SubAssemblyService] Error updating electrical quantity:', error);
        throw error;
    }
}
