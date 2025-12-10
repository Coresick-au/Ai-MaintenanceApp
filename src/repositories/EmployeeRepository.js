import { BaseRepository } from './BaseRepository';

/**
 * @summary Repository for managing Employee data in Firestore.
 * Extends BaseRepository to centralize all CRUD and real-time operations
 * for the 'employees' collection, enforcing the data abstraction layer.
 */
export class EmployeeRepository extends BaseRepository {
    constructor() {
        super('employees');
    }

    // --- READ OPERATIONS ---

    /**
     * @function getAllEmployees
     * @description Fetches all employees from the database once.
     * @returns {Promise<Array<object>>} A list of all employee objects.
     */
    async getAllEmployees() {
        return this.getAll();
    }

    /**
     * @function subscribeToEmployees
     * @description Subscribes to employees with real-time updates.
     * @param {Function} callback - Called with updated employees
     * @param {Function} errorCallback - Called on error
     * @returns {Function} Unsubscribe function
     */
    subscribeToEmployees(callback, errorCallback) {
        return this.subscribe([], callback, errorCallback);
    }

    // --- WRITE OPERATIONS ---

    /**
     * @function saveEmployee
     * @description Creates a new employee or updates an existing one.
     * Uses BaseRepository.save() for auto-ID generation and timestamps.
     * @param {object} employeeData - The employee data to save.
     * @param {string} [employeeData.id] - Optional. If provided, updates existing employee.
     * @param {string} employeeData.name - Employee's full name (required).
     * @param {string} employeeData.email - Employee's email, must be unique (required).
     * @param {string} employeeData.phone - Employee's primary phone.
     * @param {string} employeeData.address - Employee's full residential address.
     * @param {string} employeeData.emergencyContactName - Emergency contact name.
     * @param {string} employeeData.emergencyContactPhone - Emergency contact phone.
     * @param {string} employeeData.role - Employee's role (e.g., Service Technician, Office Manager).
     * @param {string} employeeData.status - Employee's status: 'active' or 'archived' (default: 'active').
     * @param {Array} [employeeData.certifications] - Array of certification objects.
     * @param {Array} [employeeData.inductions] - Array of site induction objects.
     * @returns {Promise<object>} The saved employee object with ID and timestamps.
     */
    async saveEmployee(employeeData) {
        // Ensure status defaults to 'active' if not provided
        const dataWithDefaults = {
            status: 'active',
            ...employeeData
        };
        return this.save(dataWithDefaults);
    }

    /**
     * @function deleteEmployee
     * @description Deletes a specific employee record.
     * Note: Consider using status='archived' instead for data retention.
     * @param {string} employeeId - The ID of the employee to delete.
     * @returns {Promise<void>}
     */
    async deleteEmployee(employeeId) {
        return this.delete(employeeId);
    }

    /**
     * @function archiveEmployee
     * @description Archives an employee (soft delete) by setting status to 'archived'.
     * @param {string} employeeId - The ID of the employee to archive.
     * @returns {Promise<object>} The updated employee object.
     */
    async archiveEmployee(employeeId) {
        return this.update(employeeId, { status: 'archived', archivedAt: new Date().toISOString() });
    }

    /**
     * @function restoreEmployee
     * @description Restores an archived employee by setting status to 'active'.
     * @param {string} employeeId - The ID of the employee to restore.
     * @returns {Promise<object>} The updated employee object.
     */
    async restoreEmployee(employeeId) {
        return this.update(employeeId, { status: 'active', archivedAt: null });
    }
}
