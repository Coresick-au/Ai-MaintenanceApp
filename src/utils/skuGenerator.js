// SKU Generation Utilities
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get category name from category ID
 */
const getCategoryName = async (categoryId) => {
    if (!categoryId) return null;

    try {
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(categoriesRef);
        console.log('[SKU Debug] Looking for categoryId:', categoryId);
        console.log('[SKU Debug] Total categories found:', snapshot.docs.length);
        console.log('[SKU Debug] Category IDs:', snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        const category = snapshot.docs.find(doc => doc.id === categoryId);
        console.log('[SKU Debug] Matched category:', category ? category.data() : 'NOT FOUND');
        return category ? category.data().name : null;
    } catch (error) {
        console.error('[SKU] Error fetching category name:', error);
        return null;
    }
};

/**
 * Generate category prefix from category name
 * Uses first 3-4 letters uppercase, removing spaces
 */
export const getCategoryPrefix = (categoryName) => {
    if (!categoryName) return 'GEN'; // Generic prefix if no category

    // Remove spaces and special characters, take first 3-4 letters
    const cleaned = categoryName.replace(/[^a-zA-Z0-9]/g, '');
    const length = cleaned.length >= 4 ? 4 : 3;
    return cleaned.substring(0, length).toUpperCase() || 'GEN';
};

/**
 * Get the next available SKU for a category
 * Format: PREFIX-XXX (e.g., PART-001, BOLT-042)
 * @param {string} categoryId - The category ID
 * @param {string} subcategoryId - Optional subcategory ID (takes precedence)
 * @param {string} collectionName - The Firestore collection ('part_catalog', 'fastener_catalog', 'products')
 */
export const generateNextSKU = async (categoryId, subcategoryId = null, collectionName = 'part_catalog') => {
    try {
        // Use subcategory if available, otherwise use category
        const targetCategoryId = subcategoryId || categoryId;

        if (!targetCategoryId) {
            throw new Error('Category is required to generate SKU');
        }

        // Get category name
        const categoryName = await getCategoryName(targetCategoryId);
        if (!categoryName) {
            throw new Error('Category not found');
        }

        const prefix = getCategoryPrefix(categoryName);

        // Query all items with SKUs starting with this prefix
        const itemsRef = collection(db, collectionName);
        const snapshot = await getDocs(itemsRef);

        // Find highest sequence number for this prefix
        let maxSequence = 0;
        snapshot.forEach(doc => {
            const sku = doc.data().sku;
            if (sku && sku.startsWith(prefix + '-')) {
                const sequencePart = sku.split('-')[1];
                const sequence = parseInt(sequencePart, 10);
                if (!isNaN(sequence) && sequence > maxSequence) {
                    maxSequence = sequence;
                }
            }
        });

        // Generate next SKU
        const nextSequence = maxSequence + 1;
        const paddedSequence = String(nextSequence).padStart(3, '0');
        return `${prefix}-${paddedSequence}`;
    } catch (error) {
        console.error('[SKU] Error generating SKU:', error);
        throw new Error('Failed to generate SKU');
    }
};

/**
 * Generate SKU for parts
 */
export const generateNextPartSKU = async (categoryId, subcategoryId = null) => {
    return generateNextSKU(categoryId, subcategoryId, 'part_catalog');
};

/**
 * Generate SKU for fasteners
 */
export const generateNextFastenerSKU = async (categoryId, subcategoryId = null) => {
    return generateNextSKU(categoryId, subcategoryId, 'fastener_catalog');
};

/**
 * Generate SKU for products
 */
export const generateNextProductSKU = async (categoryId, subcategoryId = null) => {
    return generateNextSKU(categoryId, subcategoryId, 'products');
};

/**
 * Generate SKU for sub assemblies
 */
export const generateNextSubAssemblySKU = async (categoryId, subcategoryId = null) => {
    return generateNextSKU(categoryId, subcategoryId, 'sub_assemblies');
};

/**
 * Check if SKU already exists in a collection
 */
export const checkSKUExists = async (sku, collectionName = 'part_catalog', excludeId = null) => {
    try {
        const itemsRef = collection(db, collectionName);
        const q = query(itemsRef, where('sku', '==', sku));
        const snapshot = await getDocs(q);

        // If editing an item, exclude it from the check
        if (excludeId) {
            return snapshot.docs.some(doc => doc.id !== excludeId);
        }

        return !snapshot.empty;
    } catch (error) {
        console.error('[SKU] Error checking SKU:', error);
        return false;
    }
};

/**
 * Check if part SKU already exists
 */
export const checkPartSKUExists = async (sku, excludePartId = null) => {
    return checkSKUExists(sku, 'part_catalog', excludePartId);
};

/**
 * Check if fastener SKU already exists
 */
export const checkFastenerSKUExists = async (sku, excludeFastenerId = null) => {
    return checkSKUExists(sku, 'fastener_catalog', excludeFastenerId);
};

/**
 * Check if product SKU already exists
 */
export const checkProductSKUExists = async (sku, excludeProductId = null) => {
    return checkSKUExists(sku, 'products', excludeProductId);
};

// ==========================================
// MANUFACTURED PART CONFIGURATION SKU GENERATION
// ==========================================

/**
 * Generate a configuration-based SKU for manufactured parts
 * Format: [TYPE]-[WIDTH]-[MAT]-[DESIGN]
 * @param {Object} params - Configuration parameters
 * @param {string} params.type - Part type (e.g., 'BW' for Belt Weigher, 'IDL' for Idler)
 * @param {number} params.width - Width in mm
 * @param {string} params.material - Material code ('MS', 'SS')
 * @param {string} params.design - Design specification (e.g., '50x100', 'STANDARD')
 * @returns {string} Generated SKU (e.g., 'BW-1200-SS-50x100')
 * @example
 * const sku = generateConfigSKU({
 *   type: 'BW',
 *   width: 1200,
 *   material: 'SS',
 *   design: '50x100'
 * });
 * // returns 'BW-1200-SS-50x100'
 */
export const generateConfigSKU = (params) => {
    const { type, width, material, design } = params;

    // Validate required parameters
    if (!type || width == null || !material || !design) {
        throw new Error('All parameters (type, width, material, design) are required for config SKU generation');
    }

    // Normalize type to uppercase
    const typeCode = String(type).toUpperCase().replace(/\s+/g, '-');

    // Format width as integer
    const widthCode = String(Math.round(width));

    // Normalize material to uppercase
    const materialCode = String(material).toUpperCase();

    // Normalize design (remove spaces, keep alphanumeric and 'x')
    const designCode = String(design).replace(/\s+/g, '').toUpperCase();

    // Construct SKU
    const sku = `${typeCode}-${widthCode}-${materialCode}-${designCode}`;

    console.log('[SKU] Generated config SKU:', {
        input: params,
        output: sku
    });

    return sku;
};
