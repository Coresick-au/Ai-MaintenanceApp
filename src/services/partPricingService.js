import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Add a new pricing entry for a part from a supplier
 * @param {string} partId - The part ID
 * @param {string} partSku - The part SKU (denormalized)
 * @param {string} supplierName - The supplier name
 * @param {number} costPrice - Cost price in cents (per unit)
 * @param {Date} effectiveDate - Date when this price becomes effective
 * @param {string} notes - Optional notes
 * @param {number} quantity - Number of units (default 1)
 * @param {boolean} ignoreForTrend - Exclude from trend calculations (default false)
 * @returns {Promise<string>} The new pricing entry ID
 */
export async function addPricing(partId, partSku, supplierName, costPrice, effectiveDate, notes = '', quantity = 1, ignoreForTrend = false) {
    try {
        // Convert date to midnight timestamp
        const dateOnly = new Date(effectiveDate);
        dateOnly.setHours(0, 0, 0, 0);

        const pricingData = {
            partId,
            partSku,
            supplierName,
            costPrice: Math.round(costPrice), // per unit price in cents
            quantity: parseInt(quantity) || 1, // number of units
            ignoreForTrend: !!ignoreForTrend, // exclude from trend analysis
            effectiveDate: Timestamp.fromDate(dateOnly),
            notes: notes || '',
            createdAt: Timestamp.now(),
            createdBy: 'current-user' // TODO: get from auth context
        };

        const docRef = await addDoc(collection(db, 'part_supplier_pricing'), pricingData);
        console.log('[PartPricingService] Added pricing:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[PartPricingService] Error adding pricing:', error);
        throw error;
    }
}

/**
 * Update an existing pricing entry
 * @param {string} pricingId - The pricing entry ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updatePricing(pricingId, updates) {
    try {
        const updateData = { ...updates };

        // Convert effectiveDate if provided
        if (updates.effectiveDate) {
            const dateOnly = new Date(updates.effectiveDate);
            dateOnly.setHours(0, 0, 0, 0);
            updateData.effectiveDate = Timestamp.fromDate(dateOnly);
        }

        // Ensure costPrice is integer if provided
        if (updates.costPrice !== undefined) {
            updateData.costPrice = Math.round(updates.costPrice);
        }

        // Ensure quantity is integer if provided
        if (updates.quantity !== undefined) {
            updateData.quantity = parseInt(updates.quantity) || 1;
        }

        // Ensure ignoreForTrend is boolean if provided
        if (updates.ignoreForTrend !== undefined) {
            updateData.ignoreForTrend = !!updates.ignoreForTrend;
        }

        await updateDoc(doc(db, 'part_supplier_pricing', pricingId), updateData);
        console.log('[PartPricingService] Updated pricing:', pricingId);
    } catch (error) {
        console.error('[PartPricingService] Error updating pricing:', error);
        throw error;
    }
}

/**
 * Delete a pricing entry
 * @param {string} pricingId - The pricing entry ID
 * @returns {Promise<void>}
 */
export async function deletePricing(pricingId) {
    try {
        await deleteDoc(doc(db, 'part_supplier_pricing', pricingId));
        console.log('[PartPricingService] Deleted pricing:', pricingId);
    } catch (error) {
        console.error('[PartPricingService] Error deleting pricing:', error);
        throw error;
    }
}

/**
 * Get all pricing entries for a part
 * @param {string} partId - The part ID
 * @returns {Promise<Array>} Array of pricing entries with IDs
 */
export async function getPricingForPart(partId) {
    try {
        const q = query(
            collection(db, 'part_supplier_pricing'),
            where('partId', '==', partId),
            orderBy('effectiveDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const pricing = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            effectiveDate: doc.data().effectiveDate?.toDate() // Convert Timestamp to Date
        }));

        console.log('[PartPricingService] Retrieved pricing for part:', partId, pricing.length);
        return pricing;
    } catch (error) {
        console.error('[PartPricingService] Error getting pricing for part:', error);
        throw error;
    }
}

/**
 * Get current price for a supplier as of a specific date
 * @param {string} partId - The part ID
 * @param {string} supplierName - The supplier name
 * @param {Date} asOfDate - Date to check (defaults to today)
 * @returns {Promise<Object|null>} Current pricing entry or null
 */
export async function getCurrentPriceForSupplier(partId, supplierName, asOfDate = new Date()) {
    try {
        const q = query(
            collection(db, 'part_supplier_pricing'),
            where('partId', '==', partId),
            where('supplierName', '==', supplierName),
            orderBy('effectiveDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const pricing = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            effectiveDate: doc.data().effectiveDate?.toDate()
        }));

        // Find the most recent price that's effective as of the given date
        const currentPricing = pricing.find(p => p.effectiveDate <= asOfDate);

        return currentPricing || null;
    } catch (error) {
        console.error('[PartPricingService] Error getting current price for supplier:', error);
        throw error;
    }
}

/**
 * Get the lowest current supplier price for a part
 * @param {string} partId - The part ID
 * @param {Date} asOfDate - Date to check (defaults to today)
 * @param {Array<string>} validSuppliers - Optional array of valid supplier names to consider
 * @returns {Promise<Object|null>} Object with { costPrice, supplierName, pricingId } or null
 */
export async function getLowestSupplierPrice(partId, asOfDate = new Date(), validSuppliers = null) {
    try {
        const allPricing = await getPricingForPart(partId);

        // Group by supplier and get current price for each
        const supplierPrices = {};

        for (const pricing of allPricing) {
            // Skip if validSuppliers is provided and this supplier is not in the list
            if (validSuppliers && !validSuppliers.includes(pricing.supplierName)) {
                continue;
            }

            // Skip entries marked as ignored
            if (pricing.ignoreForTrend) {
                continue;
            }

            // Only consider prices effective as of the given date
            if (pricing.effectiveDate <= asOfDate) {
                // Keep the most recent price for each supplier
                if (!supplierPrices[pricing.supplierName] ||
                    pricing.effectiveDate > supplierPrices[pricing.supplierName].effectiveDate) {
                    supplierPrices[pricing.supplierName] = pricing;
                }
            }
        }

        // Find the lowest price among current supplier prices
        const currentPrices = Object.values(supplierPrices);
        if (currentPrices.length === 0) return null;

        const lowest = currentPrices.reduce((min, current) =>
            current.costPrice < min.costPrice ? current : min
        );

        return {
            costPrice: lowest.costPrice,
            supplierName: lowest.supplierName,
            pricingId: lowest.id,
            effectiveDate: lowest.effectiveDate
        };
    } catch (error) {
        console.error('[PartPricingService] Error getting lowest supplier price:', error);
        throw error;
    }
}

/**
 * Get pricing history for a specific supplier
 * @param {string} partId - The part ID
 * @param {string} supplierName - The supplier name
 * @returns {Promise<Array>} Array of pricing entries sorted by date (newest first)
 */
export async function getPricingHistory(partId, supplierName) {
    try {
        const q = query(
            collection(db, 'part_supplier_pricing'),
            where('partId', '==', partId),
            where('supplierName', '==', supplierName),
            orderBy('effectiveDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const pricing = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            effectiveDate: doc.data().effectiveDate?.toDate()
        }));

        console.log('[PartPricingService] Retrieved pricing history for supplier:', supplierName, pricing.length);
        return pricing;
    } catch (error) {
        console.error('[PartPricingService] Error getting pricing history:', error);
        throw error;
    }
}
