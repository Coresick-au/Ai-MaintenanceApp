import { BaseRepository } from './BaseRepository';

/**
 * Repository for managing sub assembly catalog
 * @description Handles CRUD operations for sub assemblies (assemblies made from parts/fasteners).
 * Sub assemblies have metadata like SKU, name, category, and can be used in product BOMs.
 * Extends BaseRepository for standard Firestore operations.
 * @extends BaseRepository
 */
export class SubAssemblyRepository extends BaseRepository {
    constructor() {
        super('sub_assemblies');
    }

    /**
     * Create a new sub assembly with validation
     * @description Creates a sub assembly with required fields validation. Auto-generates
     * timestamps and ensures SKU uniqueness should be handled at service layer.
     * @param {Object} subAssemblyData - Sub assembly data
     * @param {string} subAssemblyData.sku - Unique sub assembly SKU
     * @param {string} subAssemblyData.name - Sub assembly name
     * @param {string} subAssemblyData.category - Sub assembly category
     * @param {string} [subAssemblyData.description] - Optional description
     * @param {number} [subAssemblyData.targetMarginPercent] - Target margin percentage
     * @returns {Promise<Object>} Created sub assembly with ID
     * @example
     * const subAssembly = await repo.createSubAssembly({
     *   sku: 'SA-001',
     *   name: 'Motor Mount Assembly',
     *   category: 'Assemblies',
     *   targetMarginPercent: 35
     * });
     */
    async createSubAssembly(subAssemblyData) {
        try {
            if (!subAssemblyData.sku || !subAssemblyData.name) {
                throw new Error('SKU and name are required');
            }

            return await this.save(subAssemblyData);
        } catch (error) {
            console.error('[SubAssemblyRepository] Error creating sub assembly:', error);
            throw error;
        }
    }
}
