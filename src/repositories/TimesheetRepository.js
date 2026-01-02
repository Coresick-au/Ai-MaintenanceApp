import { BaseRepository } from './BaseRepository';
import { query, where, getDocs, orderBy } from 'firebase/firestore';

/**
 * Repository for managing timesheet entries in Firestore
 */
export class TimesheetRepository extends BaseRepository {
    constructor() {
        super('timesheets');
    }

    /**
     * Get all timesheet entries for a specific user
     * @param {string} userId - The user ID to filter by
     * @returns {Promise<Array>} Array of timesheet documents
     */
    async getByUserId(userId) {
        try {
            const q = query(
                this.collectionRef,
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort desc (newest first)
        } catch (error) {
            console.error(`Error getting timesheets for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get all timesheet entries for a specific user and week
     * @param {string} userId - The user ID to filter by
     * @param {string} weekKey - The week key (YYYY-WXX) to filter by
     * @returns {Promise<Array>} Array of timesheet documents
     */
    async getByUserAndWeek(userId, weekKey) {
        try {
            const q = query(
                this.collectionRef,
                where('userId', '==', userId),
                where('weekKey', '==', weekKey)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort asc
        } catch (error) {
            console.error(`Error getting timesheets for user ${userId} and week ${weekKey}:`, error);
            throw error;
        }
    }
}
