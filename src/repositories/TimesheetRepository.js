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

    /**
     * Get all timesheet entries for a specific week (admin only)
     * @param {string} weekKey - The week key (YYYY-WXX) to filter by
     * @returns {Promise<Array>} Array of timesheet documents for all users
     */
    async getAllByWeek(weekKey) {
        try {
            const q = query(
                this.collectionRef,
                where('weekKey', '==', weekKey)
                // Note: Removed orderBy to avoid composite index requirement
                // Sorting is handled in the component layer
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(`Error getting all timesheets for week ${weekKey}:`, error);
            throw error;
        }
    }

    /**
     * Get all timesheet entries for a specific quarter (admin only)
     * @param {number} year - The year (e.g., 2026)
     * @param {number} quarter - The quarter (1-4)
     * @returns {Promise<Array>} Array of timesheet documents for all users in the quarter
     */
    async getAllByQuarter(year, quarter) {
        try {
            // Calculate week range for quarter
            const startWeek = (quarter - 1) * 13 + 1;
            const endWeek = Math.min(quarter * 13, 53);

            // Generate week keys for the quarter
            const weekKeys = [];
            for (let week = startWeek; week <= endWeek; week++) {
                weekKeys.push(`${year}-W${week.toString().padStart(2, '0')}`);
            }

            // Firestore 'in' operator supports up to 30 values, so we're safe with 13 weeks
            const q = query(
                this.collectionRef,
                where('weekKey', 'in', weekKeys)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(`Error getting timesheets for Q${quarter} ${year}:`, error);
            throw error;
        }
    }

    /**
     * Get all timesheet entries for an entire year (admin only)
     * Uses batched queries to work around Firestore 'in' operator limit
     * @param {number} year - The year (e.g., 2026)
     * @returns {Promise<Array>} Array of timesheet documents for all users in the year
     */
    async getAllByYear(year) {
        try {
            const allEntries = [];

            // Query each quarter separately and combine results
            for (let quarter = 1; quarter <= 4; quarter++) {
                const quarterEntries = await this.getAllByQuarter(year, quarter);
                allEntries.push(...quarterEntries);
            }

            return allEntries;
        } catch (error) {
            console.error(`Error getting timesheets for year ${year}:`, error);
            throw error;
        }
    }
}
