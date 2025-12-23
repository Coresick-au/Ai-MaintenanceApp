import { BaseRepository } from './BaseRepository';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

/**
 * Repository for managing historical part cost data
 * @description Handles CRUD operations for part cost history entries and provides
 * methods to query effective costs at specific dates. Extends BaseRepository for
 * standard Firestore operations.
 * @extends BaseRepository
 */
export class PartCostHistoryRepository extends BaseRepository {
    constructor() {
        super('part_cost_history');
    }

    /**
     * Get the effective cost for a part at a specific date
     * @description Finds the most recent cost entry where effectiveDate <= targetDate.
     * Uses Firestore query with orderBy and limit for efficient retrieval.
     * @param {string} partId - The part ID to query
     * @param {Date|string} targetDate - The date to find the effective cost for
     * @returns {Promise<Object|null>} Cost entry object or null if no history found
     * @example
     * const cost = await repo.getCostAtDate('part-123', new Date('2025-12-13'));
     * // returns { id: 'pch-456', partId: 'part-123', costPrice: 1250, effectiveDate: '2025-12-01T00:00:00.000Z' }
     */
    async getCostAtDate(partId, targetDate) {
        try {
            const dateString = targetDate instanceof Date
                ? targetDate.toISOString()
                : new Date(targetDate).toISOString();

            const q = query(
                collection(db, this.collectionName),
                where('partId', '==', partId),
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
            console.error('[PartCostHistory] Error getting cost at date:', error);
            throw error;
        }
    }

    /**
     * Get all cost history entries for a specific part
     * @description Retrieves all historical cost entries for a part, ordered by
     * effective date descending (most recent first).
     * @param {string} partId - The part ID to query
     * @returns {Promise<Array>} Array of cost history entries
     * @example
     * const history = await repo.getCostHistory('part-123');
     * // returns [{ id: 'pch-1', costPrice: 1500, effectiveDate: '2025-12-01' }, ...]
     */
    async getCostHistory(partId) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('partId', '==', partId),
                orderBy('effectiveDate', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('[PartCostHistory] Error getting cost history:', error);
            throw error;
        }
    }

    /**
     * Add a new cost entry for a part
     * @description Creates a new cost history entry with the specified effective date.
     * Supports backdated and future-dated entries for historical data entry and planning.
     * @param {string} partId - The part ID
     * @param {number} costPrice - Cost in cents
     * @param {Date|string} effectiveDate - When this cost becomes effective
     * @param {string} createdBy - User ID who created this entry
     * @returns {Promise<Object>} Created cost entry with ID
     * @example
     * const entry = await repo.addCostEntry('part-123', 1250, '2025-01-01', 'user-456');
     */
    async addCostEntry(partId, costPrice, effectiveDate, createdBy) {
        try {
            const now = new Date().toISOString();
            const effectiveDateString = effectiveDate instanceof Date
                ? effectiveDate.toISOString()
                : new Date(effectiveDate).toISOString();

            const costEntry = {
                partId,
                costPrice,
                effectiveDate: effectiveDateString,
                createdAt: now,
                createdBy
            };

            return await this.save(costEntry);
        } catch (error) {
            console.error('[PartCostHistory] Error adding cost entry:', error);
            throw error;
        }
    }
}
