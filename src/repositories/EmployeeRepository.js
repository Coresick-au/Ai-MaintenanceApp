import { BaseRepository } from './BaseRepository';

/**
 * Repository for managing employees in Firestore
 */
export class EmployeeRepository extends BaseRepository {
    constructor() {
        super('employees');
    }

    /**
     * Subscribe to employees with real-time updates
     * @param {Function} callback - Called with updated employees
     * @param {Function} errorCallback - Called on error
     * @returns {Function} Unsubscribe function
     */
    subscribeToEmployees(callback, errorCallback) {
        return this.subscribe([], callback, errorCallback);
    }
}
