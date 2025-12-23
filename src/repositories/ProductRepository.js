import { BaseRepository } from './BaseRepository';

/**
 * Repository for managing product catalog
 * @description Handles CRUD operations for products (assemblies made from parts).
 * Products have metadata like SKU, name, category, and target margin percentage.
 * Extends BaseRepository for standard Firestore operations.
 * @extends BaseRepository
 */
export class ProductRepository extends BaseRepository {
    constructor() {
        super('products');
    }

    /**
     * Create a new product with validation
     * @description Creates a product with required fields validation. Auto-generates
     * timestamps and ensures SKU uniqueness should be handled at service layer.
     * @param {Object} productData - Product data
     * @param {string} productData.sku - Unique product SKU
     * @param {string} productData.name - Product name
     * @param {string} productData.category - Product category
     * @param {string} [productData.description] - Optional description
     * @param {number} [productData.targetMarginPercent] - Target margin percentage
     * @returns {Promise<Object>} Created product with ID
     * @example
     * const product = await repo.createProduct({
     *   sku: 'PROD-001',
     *   name: 'Conveyor Assembly',
     *   category: 'Assemblies',
     *   targetMarginPercent: 35
     * });
     */
    async createProduct(productData) {
        try {
            if (!productData.sku || !productData.name) {
                throw new Error('SKU and name are required');
            }

            return await this.save(productData);
        } catch (error) {
            console.error('[ProductRepository] Error creating product:', error);
            throw error;
        }
    }
}
