import { BaseRepository } from './BaseRepository';

/**
 * Repository for managing sites in Firestore
 */
export class SiteRepository extends BaseRepository {
    constructor() {
        super('sites');
    }

    /**
     * Get sites by customer ID
     * @param {string} customerId - Customer ID
     * @returns {Promise<Array>} Array of sites for the customer
     */
    async getByCustomerId(customerId) {
        const sites = await this.getAll();
        return sites.filter(s => s.customerId === customerId);
    }

    /**
     * Toggle site active status
     * @param {string} siteId - Site ID
     * @returns {Promise<boolean>} New active status
     */
    async toggleStatus(siteId) {
        const site = await this.getById(siteId);
        if (!site) throw new Error('Site not found');

        const isArchiving = site.active !== false;
        await this.update(siteId, {
            active: !isArchiving,
            archivedAt: isArchiving ? new Date().toISOString() : null
        });

        return !isArchiving;
    }

    /**
     * Find orphaned sites (sites without customerId but with customer name)
     * @returns {Promise<Array>} Array of orphaned sites
     */
    async findOrphans() {
        const sites = await this.getAll();
        return sites.filter(s => !s.customerId && s.customer);
    }

    /**
     * Link site to customer
     * @param {string} siteId - Site ID
     * @param {string} customerId - Customer ID
     * @param {string} customerName - Customer name
     * @returns {Promise<boolean>} True if successful
     */
    async linkToCustomer(siteId, customerId, customerName) {
        await this.update(siteId, {
            customerId,
            customer: customerName
        });
        return true;
    }

    /**
     * Subscribe to sites with real-time updates
     * @param {Function} callback - Called with updated sites
     * @param {Function} errorCallback - Called on error
     * @returns {Function} Unsubscribe function
     */
    subscribeToSites(callback, errorCallback) {
        return this.subscribe([], callback, errorCallback);
    }
}
