import { BaseRepository } from './BaseRepository';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Repository for managing product build guides
 * @description Handles CRUD operations for assembly instructions and build guides
 * that reference product BOMs (Bill of Materials).
 * @extends BaseRepository
 */
export class BuildGuideRepository extends BaseRepository {
    constructor() {
        super('product_build_guides');
    }

    /**
     * Get build guide for a specific product
     * @description Retrieves the build guide document for a product.
     * Returns null if no guide exists for the product.
     * @param {string} productId - The product ID to query
     * @returns {Promise<Object|null>} Build guide document or null
     * @example
     * const guide = await repo.getBuildGuideForProduct('prod-123');
     * // returns { id: 'guide-xxx', productId: 'prod-123', steps: [...] }
     */
    async getBuildGuideForProduct(productId) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('productId', '==', productId)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            // Return the first matching guide (there should only be one per product)
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('[BuildGuideRepository] Error getting build guide for product:', error);
            throw error;
        }
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
            if (!buildGuideData.productId) {
                throw new Error('productId is required');
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
