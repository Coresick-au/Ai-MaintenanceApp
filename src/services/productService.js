// Product Service - CRUD operations for products and BOM management
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { productRepository, productCompositionRepository } from '../repositories';
import { getPartCostAtDate } from './costingService';

/**
 * Add a new product to the catalog
 * @description Creates a product with validation for required fields and SKU uniqueness.
 * @param {Object} productData - Product data
 * @param {string} productData.sku - Unique product SKU
 * @param {string} productData.name - Product name
 * @param {string} productData.category - Product category
 * @param {string} [productData.description] - Optional description
 * @param {number} [productData.targetMarginPercent] - Target margin percentage (default: 30)
 * @returns {Promise<Object>} Created product with ID
 * @example
 * const product = await addProduct({
 *   sku: 'PROD-001',
 *   name: 'Conveyor Assembly',
 *   category: 'Assemblies',
 *   targetMarginPercent: 35
 * });
 */
export async function addProduct(productData) {
    try {
        // Check for duplicate SKU
        const existingProducts = await getDocs(
            query(collection(db, 'products'), where('sku', '==', productData.sku))
        );

        if (!existingProducts.empty) {
            throw new Error(`Product with SKU "${productData.sku}" already exists`);
        }

        // Set defaults
        const productWithDefaults = {
            targetMarginPercent: 30,
            ...productData
        };

        return await productRepository.createProduct(productWithDefaults);
    } catch (error) {
        console.error('[ProductService] Error adding product:', error);
        throw error;
    }
}

/**
 * Update an existing product
 * @description Updates product metadata. Does not affect BOM or cost history.
 * @param {string} productId - The product ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 * @example
 * await updateProduct('prod-123', { targetMarginPercent: 40 });
 */
export async function updateProduct(productId, updates) {
    try {
        return await productRepository.update(productId, updates);
    } catch (error) {
        console.error('[ProductService] Error updating product:', error);
        throw error;
    }
}

/**
 * Delete a product from the catalog
 * @description Deletes a product and its BOM. Checks for dependencies before deletion.
 * @param {string} productId - The product ID to delete
 * @returns {Promise<boolean>} True if successful
 * @example
 * await deleteProduct('prod-123');
 */
export async function deleteProduct(productId) {
    try {
        // Check if product has cost history
        const costHistory = await getDocs(
            query(collection(db, 'product_cost_history'), where('productId', '==', productId))
        );

        if (!costHistory.empty) {
            throw new Error('Cannot delete product with existing cost history');
        }

        // Delete BOM entries (both parts and fasteners)
        const bom = await productCompositionRepository.getBOMForProduct(productId);

        // Handle both new structure and legacy array
        const parts = bom.parts || (Array.isArray(bom) ? bom : []);
        const fasteners = bom.fasteners || [];

        // Delete part BOM entries
        for (const bomEntry of parts) {
            await productCompositionRepository.removePartFromBOM(productId, bomEntry.partId);
        }

        // Delete fastener BOM entries
        for (const bomEntry of fasteners) {
            await productCompositionRepository.removeFastenerFromBOM(productId, bomEntry.fastenerId);
        }

        // Delete electrical BOM entries
        const electrical = bom.electrical || [];
        for (const bomEntry of electrical) {
            await productCompositionRepository.removeElectricalFromBOM(productId, bomEntry.electricalId);
        }

        // Delete the product
        return await productRepository.delete(productId);
    } catch (error) {
        console.error('[ProductService] Error deleting product:', error);
        throw error;
    }
}

/**
 * Add a part to a product's Bill of Materials
 * @description Adds a part to the product's BOM with specified quantity.
 * Validates that the part exists in the catalog.
 * @param {string} productId - The product ID
 * @param {string} partId - The part ID to add
 * @param {number} quantityUsed - Quantity of this part used in the product
 * @returns {Promise<Object>} Created BOM entry
 * @example
 * await addPartToBOM('prod-123', 'part-456', 2.5);
 */
export async function addPartToBOM(productId, partId, quantityUsed) {
    try {
        // Validate part exists
        const partRef = await getDocs(
            query(collection(db, 'part_catalog'), where('id', '==', partId))
        );

        if (partRef.empty) {
            throw new Error(`Part ${partId} not found in catalog`);
        }

        return await productCompositionRepository.addPartToBOM(productId, partId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error adding part to BOM:', error);
        throw error;
    }
}

/**
 * Remove a part from a product's Bill of Materials
 * @description Removes a part from the product's BOM.
 * @param {string} productId - The product ID
 * @param {string} partId - The part ID to remove
 * @returns {Promise<boolean>} True if successful
 * @example
 * await removePartFromBOM('prod-123', 'part-456');
 */
export async function removePartFromBOM(productId, partId) {
    try {
        return await productCompositionRepository.removePartFromBOM(productId, partId);
    } catch (error) {
        console.error('[ProductService] Error removing part from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of a part in a product's BOM
 * @description Updates the quantityUsed field for an existing BOM entry.
 * @param {string} productId - The product ID
 * @param {string} partId - The part ID
 * @param {number} quantityUsed - New quantity value
 * @returns {Promise<Object>} Updated BOM entry
 * @example
 * await updatePartQuantity('prod-123', 'part-456', 3.0);
 */
export async function updatePartQuantity(productId, partId, quantityUsed) {
    try {
        return await productCompositionRepository.updatePartQuantity(productId, partId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error updating part quantity:', error);
        throw error;
    }
}

/**
 * Get a product's BOM with current or historical part costs
 * @description Retrieves the BOM and enriches it with part details and costs.
 * @param {string} productId - The product ID
 * @param {Date|string} [date] - Optional date for historical costs (defaults to now)
 * @returns {Promise<Array>} BOM entries with part details and costs
 * @example
 * const bom = await getBOMWithCosts('prod-123', new Date('2025-12-13'));
 * // returns [{ partId: 'part-456', partName: 'Integrator', quantity: 2.5, cost: 1250, subtotal: 3125 }, ...]
 */
export async function getBOMWithCosts(productId, date = new Date()) {
    try {
        const bom = await productCompositionRepository.getBOMForProduct(productId);

        if (!bom || bom.length === 0) {
            return [];
        }

        // Enrich with part details and costs
        const enrichedBOM = [];

        for (const bomEntry of bom) {
            // Get part details
            const partRef = await getDocs(
                query(collection(db, 'part_catalog'), where('id', '==', bomEntry.partId))
            );

            if (partRef.empty) {
                console.warn(`[ProductService] Part ${bomEntry.partId} not found in catalog`);
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

        // Process electrical
        const electrical = bom.electrical || [];
        for (const bomEntry of electrical) {
            const electricalRef = await getDocs(
                query(collection(db, 'electrical_catalog'), where('id', '==', bomEntry.electricalId))
            );

            if (electricalRef.empty) {
                console.warn(`[ProductService] Electrical item ${bomEntry.electricalId} not found in catalog`);
                continue;
            }

            const electricalData = electricalRef.docs[0].data();
            // Reuse getPartCostAtDate - we will update it to check electrical catalog
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
        console.error('[ProductService] Error getting BOM with costs:', error);
        throw error;
    }
}

// ==========================================
// FASTENER BOM OPERATIONS
// ==========================================

/**
 * Add a fastener to a product's Bill of Materials
 */
export async function addFastenerToBOM(productId, fastenerId, quantityUsed) {
    try {
        // Validate fastener exists
        const fastenerRef = await getDocs(
            query(collection(db, 'fastener_catalog'), where('id', '==', fastenerId))
        );

        if (fastenerRef.empty) {
            throw new Error(`Fastener ${fastenerId} not found in catalog`);
        }

        return await productCompositionRepository.addFastenerToBOM(productId, fastenerId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error adding fastener to BOM:', error);
        throw error;
    }
}

/**
 * Remove a fastener from a product's Bill of Materials
 */
export async function removeFastenerFromBOM(productId, fastenerId) {
    try {
        return await productCompositionRepository.removeFastenerFromBOM(productId, fastenerId);
    } catch (error) {
        console.error('[ProductService] Error removing fastener from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of a fastener in a product's BOM
 */
export async function updateFastenerQuantity(productId, fastenerId, quantityUsed) {
    try {
        return await productCompositionRepository.updateFastenerQuantity(productId, fastenerId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error updating fastener quantity:', error);
        throw error;
    }
}

// ==========================================
// SUB ASSEMBLY BOM OPERATIONS
// ==========================================

/**
 * Add a sub assembly to a product's Bill of Materials
 */
export async function addSubAssemblyToBOM(productId, subAssemblyId, quantityUsed) {
    try {
        // Validate sub assembly exists
        const subAssemblyRef = await getDocs(
            query(collection(db, 'sub_assemblies'), where('id', '==', subAssemblyId))
        );

        if (subAssemblyRef.empty) {
            throw new Error(`Sub assembly ${subAssemblyId} not found in catalog`);
        }

        return await productCompositionRepository.addSubAssemblyToBOM(productId, subAssemblyId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error adding sub assembly to BOM:', error);
        throw error;
    }
}

/**
 * Remove a sub assembly from a product's Bill of Materials
 */
export async function removeSubAssemblyFromBOM(productId, subAssemblyId) {
    try {
        return await productCompositionRepository.removeSubAssemblyFromBOM(productId, subAssemblyId);
    } catch (error) {
        console.error('[ProductService] Error removing sub assembly from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of a sub assembly in a product's BOM
 */
export async function updateSubAssemblyQuantity(productId, subAssemblyId, quantityUsed) {
    try {
        return await productCompositionRepository.updateSubAssemblyQuantity(productId, subAssemblyId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error updating sub assembly quantity:', error);
        throw error;
    }
}

// ==========================================
// ELECTRICAL BOM OPERATIONS
// ==========================================

/**
 * Add an electrical component to a product's Bill of Materials
 */
export async function addElectricalToBOM(productId, electricalId, quantityUsed) {
    try {
        // Validate electrical item exists
        const electricalRef = await getDocs(
            query(collection(db, 'electrical_catalog'), where('id', '==', electricalId))
        );

        if (electricalRef.empty) {
            throw new Error(`Electrical item ${electricalId} not found in catalog`);
        }

        return await productCompositionRepository.addElectricalToBOM(productId, electricalId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error adding electrical to BOM:', error);
        throw error;
    }
}

/**
 * Remove an electrical component from a product's Bill of Materials
 */
export async function removeElectricalFromBOM(productId, electricalId) {
    try {
        return await productCompositionRepository.removeElectricalFromBOM(productId, electricalId);
    } catch (error) {
        console.error('[ProductService] Error removing electrical from BOM:', error);
        throw error;
    }
}

/**
 * Update the quantity of an electrical component in a product's BOM
 */
export async function updateElectricalQuantity(productId, electricalId, quantityUsed) {
    try {
        return await productCompositionRepository.updateElectricalQuantity(productId, electricalId, quantityUsed);
    } catch (error) {
        console.error('[ProductService] Error updating electrical quantity:', error);
        throw error;
    }
}
