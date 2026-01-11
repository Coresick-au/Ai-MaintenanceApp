import { BaseRepository } from './BaseRepository';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Repository for managing product composition (Bill of Materials)
 * @description Handles the many-to-many relationship between products and parts.
 * Each entry represents a part used in a product with a specific quantity.
 * @extends BaseRepository
 */
export class ProductCompositionRepository extends BaseRepository {
    constructor() {
        super('product_composition');
    }

    /**
     * Get all parts in a product's Bill of Materials
     * @description Retrieves all BOM entries for a specific product, showing which
     * parts are used and in what quantities.
     * @param {string} productId - The product ID to query
     * @returns {Promise<Array>} Array of BOM entries with partId and quantityUsed
     * @returns {Promise<{ parts: Array<Object>, fasteners: Array<Object> }>} Object containing arrays of parts and fasteners BOM entries.
     * @example
     * const bom = await repo.getBOMForProduct('prod-123');
     * // returns {
     * //   parts: [{ id: 'prod-123_part-456', partId: 'part-456', quantityUsed: 2.5 }],
     * //   fasteners: [{ id: 'prod-123_fastener-789', fastenerId: 'fastener-789', quantityUsed: 10 }]
     * // }
     */
    async getBOMForProduct(productId) {
        try {
            // Get parts BOM
            const partsQuery = query(
                collection(db, 'product_composition'),
                where('productId', '==', productId)
            );
            const partsSnapshot = await getDocs(partsQuery);
            const parts = partsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get fasteners BOM
            const fastenersQuery = query(
                collection(db, 'product_fastener_composition'),
                where('productId', '==', productId)
            );
            const fastenersSnapshot = await getDocs(fastenersQuery);
            const fasteners = fastenersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get sub assemblies BOM
            const subAssembliesQuery = query(
                collection(db, 'product_sub_assembly_composition'),
                where('productId', '==', productId)
            );
            const subAssembliesSnapshot = await getDocs(subAssembliesQuery);
            const subAssemblies = subAssembliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get electrical BOM
            const electricalQuery = query(
                collection(db, 'product_electrical_composition'),
                where('productId', '==', productId)
            );
            const electricalSnapshot = await getDocs(electricalQuery);
            const electrical = electricalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Return structured object with all four
            return {
                parts,
                fasteners,
                subAssemblies,
                electrical
            };
        } catch (error) {
            console.error('[ProductComposition] Error getting BOM:', error);
            throw error;
        }
    }

    /**
     * Add a part to a product's BOM
     * @description Creates a new BOM entry linking a part to a product with quantity.
     * Uses composite ID format: {productId}_{partId} for easy lookups.
     * @param {string} productId - The product ID
     * @param {string} partId - The part ID to add
     * @param {number} quantityUsed - Quantity of this part used in the product
     * @returns {Promise<Object>} Created BOM entry
     * @example
     * const entry = await repo.addPartToBOM('prod-123', 'part-456', 2.5);
     */
    async addPartToBOM(productId, partId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomEntry = {
                id: `${productId}_${partId}`,
                productId,
                partId,
                quantityUsed,
                createdAt: new Date().toISOString()
            };

            return await this.create(bomEntry.id, bomEntry);
        } catch (error) {
            console.error('[ProductComposition] Error adding part to BOM:', error);
            throw error;
        }
    }

    /**
     * Remove a part from a product's BOM
     * @description Deletes a BOM entry, removing the part from the product.
     * @param {string} productId - The product ID
     * @param {string} partId - The part ID to remove
     * @returns {Promise<boolean>} True if successful
     * @example
     * await repo.removePartFromBOM('prod-123', 'part-456');
     */
    async removePartFromBOM(productId, partId) {
        try {
            const bomId = `${productId}_${partId}`;
            await deleteDoc(doc(db, this.collectionName, bomId));
            return true;
        } catch (error) {
            console.error('[ProductComposition] Error removing part from BOM:', error);
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
     * await repo.updatePartQuantity('prod-123', 'part-456', 3.0);
     */
    async updatePartQuantity(productId, partId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomId = `${productId}_${partId}`;
            return await this.update(bomId, { quantityUsed });
        } catch (error) {
            console.error('[ProductComposition] Error updating part quantity:', error);
            throw error;
        }
    }

    // ==========================================
    // FASTENER BOM OPERATIONS
    // ==========================================

    /**
     * Add a fastener to a product's BOM
     */
    async addFastenerToBOM(productId, fastenerId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomEntry = {
                id: `${productId}_${fastenerId}`,
                productId,
                fastenerId,
                quantityUsed,
                createdAt: new Date().toISOString()
            };

            await this.createInCollection('product_fastener_composition', bomEntry.id, bomEntry);
            return bomEntry;
        } catch (error) {
            console.error('[ProductComposition] Error adding fastener to BOM:', error);
            throw error;
        }
    }

    /**
     * Remove a fastener from a product's BOM
     */
    async removeFastenerFromBOM(productId, fastenerId) {
        try {
            const bomId = `${productId}_${fastenerId}`;
            await deleteDoc(doc(db, 'product_fastener_composition', bomId));
            return true;
        } catch (error) {
            console.error('[ProductComposition] Error removing fastener from BOM:', error);
            throw error;
        }
    }

    /**
     * Update the quantity of a fastener in a product's BOM
     */
    async updateFastenerQuantity(productId, fastenerId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomId = `${productId}_${fastenerId}`;
            await this.updateInCollection('product_fastener_composition', bomId, { quantityUsed });
            return { id: bomId, productId, fastenerId, quantityUsed };
        } catch (error) {
            console.error('[ProductComposition] Error updating fastener quantity:', error);
            throw error;
        }
    }

    /**
     * Helper method to create in a specific collection
     */
    async createInCollection(collectionName, id, data) {
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, data);
    }

    /**
     * Helper method to update in a specific collection
     */
    async updateInCollection(collectionName, id, updates) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, updates);
    }

    // ==========================================
    // ELECTRICAL BOM OPERATIONS
    // ==========================================

    /**
     * Add an electrical component to a product's BOM
     */
    async addElectricalToBOM(productId, electricalId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomEntry = {
                id: `${productId}_${electricalId}`,
                productId,
                electricalId,
                quantityUsed,
                createdAt: new Date().toISOString()
            };

            await this.createInCollection('product_electrical_composition', bomEntry.id, bomEntry);
            return bomEntry;
        } catch (error) {
            console.error('[ProductComposition] Error adding electrical to BOM:', error);
            throw error;
        }
    }

    /**
     * Remove an electrical component from a product's BOM
     */
    async removeElectricalFromBOM(productId, electricalId) {
        try {
            const bomId = `${productId}_${electricalId}`;
            await deleteDoc(doc(db, 'product_electrical_composition', bomId));
            return true;
        } catch (error) {
            console.error('[ProductComposition] Error removing electrical from BOM:', error);
            throw error;
        }
    }

    /**
     * Update the quantity of an electrical component in a product's BOM
     */
    async updateElectricalQuantity(productId, electricalId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomId = `${productId}_${electricalId}`;
            await this.updateInCollection('product_electrical_composition', bomId, { quantityUsed });
            return { id: bomId, productId, electricalId, quantityUsed };
        } catch (error) {
            console.error('[ProductComposition] Error updating electrical quantity:', error);
            throw error;
        }
    }

    // ==========================================
    // SUB ASSEMBLY BOM OPERATIONS
    // ==========================================

    /**
     * Add a sub assembly to a product's BOM
     */
    async addSubAssemblyToBOM(productId, subAssemblyId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomEntry = {
                id: `${productId}_${subAssemblyId}`,
                productId,
                subAssemblyId,
                quantityUsed,
                createdAt: new Date().toISOString()
            };

            await this.createInCollection('product_sub_assembly_composition', bomEntry.id, bomEntry);
            return bomEntry;
        } catch (error) {
            console.error('[ProductComposition] Error adding sub assembly to BOM:', error);
            throw error;
        }
    }

    /**
     * Remove a sub assembly from a product's BOM
     */
    async removeSubAssemblyFromBOM(productId, subAssemblyId) {
        try {
            const bomId = `${productId}_${subAssemblyId}`;
            await deleteDoc(doc(db, 'product_sub_assembly_composition', bomId));
            return true;
        } catch (error) {
            console.error('[ProductComposition] Error removing sub assembly from BOM:', error);
            throw error;
        }
    }

    /**
     * Update the quantity of a sub assembly in a product's BOM
     */
    async updateSubAssemblyQuantity(productId, subAssemblyId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomId = `${productId}_${subAssemblyId}`;
            await this.updateInCollection('product_sub_assembly_composition', bomId, { quantityUsed });
            return { id: bomId, productId, subAssemblyId, quantityUsed };
        } catch (error) {
            console.error('[ProductComposition] Error updating sub assembly quantity:', error);
            throw error;
        }
    }
}

