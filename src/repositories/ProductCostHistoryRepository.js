import { BaseRepository } from './BaseRepository';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

/**
 * Repository for managing product cost history
 * @description Tracks product costs over time with support for both manual and
 * calculated (BOM-based) cost types. Stores calculation details for auditability.
 * @extends BaseRepository
 */
export class ProductCostHistoryRepository extends BaseRepository {
    constructor() {
        super('product_cost_history');
    }

    /**
     * Get the effective cost for a product at a specific date
     * @description Finds the most recent cost entry where effectiveDate <= targetDate.
     * Returns both manual and calculated costs with their metadata.
     * @param {string} productId - The product ID to query
     * @param {Date|string} targetDate - The date to find the effective cost for
     * @returns {Promise<Object|null>} Cost entry object or null if no history found
     * @example
     * const cost = await repo.getCostAtDate('prod-123', new Date('2025-12-13'));
     * // returns { id: 'pch-789', productId: 'prod-123', costPrice: 5000, costType: 'CALCULATED', ... }
     */
    async getCostAtDate(productId, targetDate) {
        try {
            const dateString = targetDate instanceof Date
                ? targetDate.toISOString()
                : new Date(targetDate).toISOString();

            const q = query(
                collection(db, this.collectionName),
                where('productId', '==', productId),
                where('effectiveDate', '<=', dateString),
                orderBy('effectiveDate', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('[ProductCostHistory] Error getting cost at date:', error);
            throw error;
        }
    }

    /**
     * Get all cost history entries for a specific product
     * @description Retrieves all historical cost entries for a product, ordered by
     * effective date descending (most recent first).
     * @param {string} productId - The product ID to query
     * @returns {Promise<Array>} Array of cost history entries
     * @example
     * const history = await repo.getCostHistory('prod-123');
     */
    async getCostHistory(productId) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('productId', '==', productId),
                orderBy('effectiveDate', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('[ProductCostHistory] Error getting cost history:', error);
            throw error;
        }
    }

    /**
     * Save a product cost entry (manual or calculated)
     * @description Creates a new cost history entry with type distinction and optional
     * calculation details for auditability.
     * @param {string} productId - The product ID
     * @param {number} costPrice - Cost in cents
     * @param {string} costType - 'MANUAL' or 'CALCULATED'
     * @param {Date|string} effectiveDate - When this cost becomes effective
     * @param {Object} [calculationDetails] - BOM breakdown for calculated costs
     * @param {string} createdBy - User ID who created this entry
     * @returns {Promise<Object>} Created cost entry with ID
     * @example
     * const entry = await repo.saveCost('prod-123', 5000, 'CALCULATED', '2025-12-13', 
     *   { bomSnapshot: [...], totalCost: 5000 }, 'user-456');
     */
    async saveCost(productId, costPrice, costType, effectiveDate, calculationDetails = null, createdBy) {
        try {
            if (!['MANUAL', 'CALCULATED'].includes(costType)) {
                throw new Error('Cost type must be MANUAL or CALCULATED');
            }

            const now = new Date().toISOString();
            const effectiveDateString = effectiveDate instanceof Date
                ? effectiveDate.toISOString()
                : new Date(effectiveDate).toISOString();

            const costEntry = {
                productId,
                costPrice,
                costType,
                effectiveDate: effectiveDateString,
                createdAt: now,
                createdBy
            };

            // Add calculation details only for calculated costs
            if (costType === 'CALCULATED' && calculationDetails) {
                costEntry.calculationDetails = calculationDetails;
            }

            return await this.save(costEntry);
        } catch (error) {
            console.error('[ProductCostHistory] Error saving cost:', error);
            throw error;
        }
    }
}
