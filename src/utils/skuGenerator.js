// SKU Generation Utilities
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const CATEGORY_PREFIXES = {
    'Integrator': 'INT',
    'Load Cell': 'LC',
    'Speed Sensor': 'SS',
    'Consumable': 'CON'
};

/**
 * Generate category prefix from category name
 * Default categories use predefined prefixes, custom categories use first 3 letters
 */
export const getCategoryPrefix = (categoryName) => {
    if (CATEGORY_PREFIXES[categoryName]) {
        return CATEGORY_PREFIXES[categoryName];
    }

    // For custom categories, use first 3 letters uppercase
    return categoryName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
};

/**
 * Get the next available SKU for a category
 * Format: PREFIX-XXX (e.g., INT-001, LC-042)
 */
export const generateNextSKU = async (categoryName) => {
    try {
        const prefix = getCategoryPrefix(categoryName);

        // Query all parts with SKUs starting with this prefix
        const partsRef = collection(db, 'part_catalog');
        const snapshot = await getDocs(partsRef);

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
 * Check if SKU already exists
 */
export const checkSKUExists = async (sku, excludePartId = null) => {
    try {
        const partsRef = collection(db, 'part_catalog');
        const q = query(partsRef, where('sku', '==', sku));
        const snapshot = await getDocs(q);

        // If editing a part, exclude it from the check
        if (excludePartId) {
            return snapshot.docs.some(doc => doc.id !== excludePartId);
        }

        return !snapshot.empty;
    } catch (error) {
        console.error('[SKU] Error checking SKU:', error);
        return false;
    }
};
