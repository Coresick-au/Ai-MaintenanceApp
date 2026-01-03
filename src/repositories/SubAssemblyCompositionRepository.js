import { BaseRepository } from './BaseRepository';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';

/**
 * Repository for managing sub assembly composition (Bill of Materials)
 * @description Handles the many-to-many relationship between sub assemblies and parts/fasteners.
 * Each entry represents a part or fastener used in a sub assembly with a specific quantity.
 * @extends BaseRepository
 */
export class SubAssemblyCompositionRepository extends BaseRepository {
    constructor() {
        super('sub_assembly_composition');
    }

    /**
     * Get all parts and fasteners in a sub assembly's Bill of Materials
     * @param {string} subAssemblyId - The sub assembly ID to query
     * @returns {Promise<{ parts: Array<Object>, fasteners: Array<Object> }>} Object containing arrays of parts and fasteners BOM entries
     */
    async getBOMForSubAssembly(subAssemblyId) {
        try {
            // Get parts BOM
            const partsQuery = query(
                collection(db, 'sub_assembly_composition'),
                where('subAssemblyId', '==', subAssemblyId)
            );
            const partsSnapshot = await getDocs(partsQuery);
            const parts = partsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get fasteners BOM
            const fastenersQuery = query(
                collection(db, 'sub_assembly_fastener_composition'),
                where('subAssemblyId', '==', subAssemblyId)
            );
            const fastenersSnapshot = await getDocs(fastenersQuery);
            const fasteners = fastenersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            return {
                parts,
                fasteners
            };
        } catch (error) {
            console.error('[SubAssemblyComposition] Error getting BOM:', error);
            throw error;
        }
    }

    /**
     * Add a part to a sub assembly's BOM
     */
    async addPartToBOM(subAssemblyId, partId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomEntry = {
                id: `${subAssemblyId}_${partId}`,
                subAssemblyId,
                partId,
                quantityUsed,
                createdAt: new Date().toISOString()
            };

            return await this.create(bomEntry.id, bomEntry);
        } catch (error) {
            console.error('[SubAssemblyComposition] Error adding part to BOM:', error);
            throw error;
        }
    }

    /**
     * Remove a part from a sub assembly's BOM
     */
    async removePartFromBOM(subAssemblyId, partId) {
        try {
            const bomId = `${subAssemblyId}_${partId}`;
            await deleteDoc(doc(db, this.collectionName, bomId));
            return true;
        } catch (error) {
            console.error('[SubAssemblyComposition] Error removing part from BOM:', error);
            throw error;
        }
    }

    /**
     * Update the quantity of a part in a sub assembly's BOM
     */
    async updatePartQuantity(subAssemblyId, partId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomId = `${subAssemblyId}_${partId}`;
            return await this.update(bomId, { quantityUsed });
        } catch (error) {
            console.error('[SubAssemblyComposition] Error updating part quantity:', error);
            throw error;
        }
    }

    // ==========================================
    // FASTENER BOM OPERATIONS
    // ==========================================

    /**
     * Add a fastener to a sub assembly's BOM
     */
    async addFastenerToBOM(subAssemblyId, fastenerId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomEntry = {
                id: `${subAssemblyId}_${fastenerId}`,
                subAssemblyId,
                fastenerId,
                quantityUsed,
                createdAt: new Date().toISOString()
            };

            await this.createInCollection('sub_assembly_fastener_composition', bomEntry.id, bomEntry);
            return bomEntry;
        } catch (error) {
            console.error('[SubAssemblyComposition] Error adding fastener to BOM:', error);
            throw error;
        }
    }

    /**
     * Remove a fastener from a sub assembly's BOM
     */
    async removeFastenerFromBOM(subAssemblyId, fastenerId) {
        try {
            const bomId = `${subAssemblyId}_${fastenerId}`;
            await deleteDoc(doc(db, 'sub_assembly_fastener_composition', bomId));
            return true;
        } catch (error) {
            console.error('[SubAssemblyComposition] Error removing fastener from BOM:', error);
            throw error;
        }
    }

    /**
     * Update the quantity of a fastener in a sub assembly's BOM
     */
    async updateFastenerQuantity(subAssemblyId, fastenerId, quantityUsed) {
        try {
            if (quantityUsed <= 0) {
                throw new Error('Quantity must be greater than zero');
            }

            const bomId = `${subAssemblyId}_${fastenerId}`;
            await this.updateInCollection('sub_assembly_fastener_composition', bomId, { quantityUsed });
            return { id: bomId, subAssemblyId, fastenerId, quantityUsed };
        } catch (error) {
            console.error('[SubAssemblyComposition] Error updating fastener quantity:', error);
            throw error;
        }
    }

    /**
     * Helper method to create in a specific collection
     */
    async createInCollection(collectionName, id, data) {
        const { doc, setDoc } = await import('firebase/firestore');
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
}
