import { BaseRepository } from './BaseRepository';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Repository for managing build guides for products and sub assemblies
 * @description Handles CRUD operations for assembly instructions and build guides
 * that reference product or sub assembly BOMs (Bill of Materials).
 * @extends BaseRepository
 */
export class BuildGuideRepository extends BaseRepository {
    constructor() {
        super('build_guides');
    }

    /**
     * Get build guide for a specific item (product or sub assembly)
     * @description Retrieves the build guide document for an item.
     * Returns null if no guide exists for the item.
     * @param {string} itemId - The item ID to query
     * @param {string} itemType - The item type ('product' or 'subassembly')
     * @returns {Promise<Object|null>} Build guide document or null
     * @example
     * const guide = await repo.getBuildGuideForItem('prod-123', 'product');
     * // returns { id: 'guide-xxx', itemId: 'prod-123', itemType: 'product', steps: [...] }
     */
    async getBuildGuideForItem(itemId, itemType) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('itemId', '==', itemId),
                where('itemType', '==', itemType)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            // Return the first matching guide (there should only be one per item)
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('[BuildGuideRepository] Error getting build guide for item:', error);
            throw error;
        }
    }

    /**
     * Get build guide for a specific product (legacy method for backward compatibility)
     * @deprecated Use getBuildGuideForItem instead
     * @param {string} productId - The product ID to query
     * @returns {Promise<Object|null>} Build guide document or null
     */
    async getBuildGuideForProduct(productId) {
        return this.getBuildGuideForItem(productId, 'product');
    }

    /**
     * Save a build guide (create or update)
     * @description Creates a new guide or updates existing one.
     * Uses the save method from BaseRepository for automatic ID generation.
     * @param {Object} buildGuideData - Build guide data (with or without id)
     * @returns {Promise<Object>} Saved build guide with ID
     * @example
     * const guide = await repo.save({
     *   productId: 'prod-123',
     *   steps: [{ stepNumber: 1, instruction: 'Step 1', notes: '' }]
     * });
     */
    async save(buildGuideData) {
        try {
            // Validate required fields
            if (!buildGuideData.itemId) {
                throw new Error('itemId is required');
            }
            if (!buildGuideData.itemType) {
                throw new Error('itemType is required (product or subassembly)');
            }
            if (!['product', 'subassembly'].includes(buildGuideData.itemType)) {
                throw new Error('itemType must be either "product" or "subassembly"');
            }
            if (!buildGuideData.steps || !Array.isArray(buildGuideData.steps)) {
                throw new Error('steps array is required');
            }

            return await super.save(buildGuideData);
        } catch (error) {
            console.error('[BuildGuideRepository] Error saving build guide:', error);
            throw error;
        }
    }

    /**
     * Delete a build guide
     * @description Deletes a build guide document by ID.
     * @param {string} guideId - The guide ID to delete
     * @returns {Promise<boolean>} True if successful
     */
    async delete(guideId) {
        try {
            return await super.delete(guideId);
        } catch (error) {
            console.error('[BuildGuideRepository] Error deleting build guide:', error);
            throw error;
        }
    }
}
