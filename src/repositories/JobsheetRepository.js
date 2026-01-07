import { BaseRepository } from './BaseRepository';
import { orderBy } from 'firebase/firestore';

/**
 * Repository for managing jobsheets in Firestore
 */
export class JobsheetRepository extends BaseRepository {
    constructor() {
        super('jobsheets');
    }

    /**
     * Subscribe to jobsheets ordered by last updated date
     * @param {Function} callback - Called with updated jobsheets
     * @param {Function} errorCallback - Called on error
     * @returns {Function} Unsubscribe function
     */
    subscribeToJobsheets(callback, errorCallback) {
        return this.subscribe([orderBy('updatedAt', 'desc')], callback, errorCallback);
    }

    /**
     * Save a job (create or update)
     * @param {Object} jobData - Job data with optional id
     * @returns {Promise<Object>} Saved job with ID
     */
    async saveJob(jobData) {
        const now = new Date().toISOString();

        if (jobData.id) {
            // Update existing job
            const updateData = {
                ...jobData,
                updatedAt: now
            };
            return this.update(jobData.id, updateData);
        } else {
            // Create new job
            const id = crypto.randomUUID();
            const newJob = {
                ...jobData,
                id,
                createdAt: now,
                updatedAt: now
            };
            return this.create(id, newJob);
        }
    }

    /**
     * Delete a job by ID
     * @param {string} id - Job ID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteJob(id) {
        return this.delete(id);
    }

    /**
     * Get next job number in YYNNN format
     * @param {Array} existingJobs - Current jobs array for determining next number
     * @returns {string} Next job number
     */
    getNextJobNumber(existingJobs = []) {
        const now = new Date();
        const yearPrefix = now.getFullYear().toString().slice(-2);

        // Find existing jobs for this year to determine next sequence
        const yearJobs = existingJobs.filter(r =>
            r.jobNumber && r.jobNumber.toString().startsWith(yearPrefix)
        );

        // Count jobs in current year to determine next number
        const nextNum = yearJobs.length + 1;
        return `${yearPrefix}${nextNum.toString().padStart(3, '0')}`;
    }

    /**
     * Import multiple jobs from CSV/backup
     * @param {Array} jobs - Array of job objects
     * @returns {Promise<boolean>} True if successful
     */
    async importJobs(jobs) {
        const now = new Date().toISOString();
        const operations = jobs.map(job => ({
            type: 'set',
            id: job.id || crypto.randomUUID(),
            data: {
                ...job,
                id: job.id || crypto.randomUUID(),
                updatedAt: now,
                createdAt: job.createdAt || now
            }
        }));

        return this.batchWrite(operations);
    }
}
