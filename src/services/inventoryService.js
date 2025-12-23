// Inventory Management System - Firestore Service Layer
import { db } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
    runTransaction
} from 'firebase/firestore';

// ==========================================
// PART CATALOG OPERATIONS
// ==========================================

export const addPartToCatalog = async (partData) => {
    try {
        const partId = `part-${Date.now()}`;
        const now = new Date().toISOString();

        const newPart = {
            id: partId,
            ...partData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'part_catalog', partId), newPart);
        console.log('[Inventory] Part added to catalog:', partId);
        return partId;
    } catch (error) {
        console.error('[Inventory] Error adding part:', error);
        throw new Error('Failed to add part to catalog');
    }
};

export const updatePart = async (partId, updates) => {
    try {
        await updateDoc(doc(db, 'part_catalog', partId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[Inventory] Part updated:', partId);
    } catch (error) {
        console.error('[Inventory] Error updating part:', error);
        throw new Error('Failed to update part');
    }
};

export const deletePart = async (partId) => {
    try {
        // Check for existing inventory or serialized assets
        const inventorySnap = await getDocs(query(collection(db, 'inventory_state'), where('partId', '==', partId)));
        const assetsSnap = await getDocs(query(collection(db, 'serialized_assets'), where('partId', '==', partId)));

        if (!inventorySnap.empty || !assetsSnap.empty) {
            throw new Error('Cannot delete part with existing inventory or serialized assets');
        }

        await deleteDoc(doc(db, 'part_catalog', partId));
        console.log('[Inventory] Part deleted:', partId);
    } catch (error) {
        console.error('[Inventory] Error deleting part:', error);
        throw error;
    }
};

// ==========================================
// FASTENER CATALOG OPERATIONS
// ==========================================

export const addFastenerToCatalog = async (fastenerData) => {
    try {
        const fastenerId = `fastener-${Date.now()}`;
        const now = new Date().toISOString();

        const newFastener = {
            id: fastenerId,
            ...fastenerData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'fastener_catalog', fastenerId), newFastener);
        console.log('[Inventory] Fastener added to catalog:', fastenerId);
        return fastenerId;
    } catch (error) {
        console.error('[Inventory] Error adding fastener:', error);
        throw new Error('Failed to add fastener to catalog');
    }
};

export const updateFastener = async (fastenerId, updates) => {
    try {
        await updateDoc(doc(db, 'fastener_catalog', fastenerId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[Inventory] Fastener updated:', fastenerId);
    } catch (error) {
        console.error('[Inventory] Error updating fastener:', error);
        throw new Error('Failed to update fastener');
    }
};

export const deleteFastener = async (fastenerId) => {
    try {
        // Check for existing inventory or serialized assets
        const inventorySnap = await getDocs(query(collection(db, 'inventory_state'), where('partId', '==', fastenerId)));
        const assetsSnap = await getDocs(query(collection(db, 'serialized_assets'), where('partId', '==', fastenerId)));

        if (!inventorySnap.empty || !assetsSnap.empty) {
            throw new Error('Cannot delete fastener with existing inventory or serialized assets');
        }

        await deleteDoc(doc(db, 'fastener_catalog', fastenerId));
        console.log('[Inventory] Fastener deleted:', fastenerId);
    } catch (error) {
        console.error('[Inventory] Error deleting fastener:', error);
        throw error;
    }
};

// ==========================================
// STOCK ADJUSTMENT OPERATIONS
// ==========================================

export const adjustStockQuantity = async (partId, locationId, delta, userId, notes = '') => {
    try {
        const inventoryId = `${locationId}_${partId}`;
        const inventoryRef = doc(db, 'inventory_state', inventoryId);

        await runTransaction(db, async (transaction) => {
            const inventoryDoc = await transaction.get(inventoryRef);

            let newQuantity = delta;
            if (inventoryDoc.exists()) {
                const currentQuantity = inventoryDoc.data().quantity || 0;
                newQuantity = currentQuantity + delta;

                if (newQuantity < 0) {
                    throw new Error('Insufficient stock for this adjustment');
                }
            } else if (delta < 0) {
                throw new Error('Cannot remove stock from non-existent inventory record');
            }

            // Update or create inventory record
            transaction.set(inventoryRef, {
                id: inventoryId,
                partId,
                locationId,
                quantity: newQuantity,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // Log the movement
            const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const movementRef = doc(db, 'stock_movements', movementId);
            transaction.set(movementRef, {
                id: movementId,
                partId,
                locationId,
                movementType: 'ADJUSTMENT',
                quantityDelta: delta,
                userId,
                notes,
                timestamp: new Date().toISOString()
            });
        });

        console.log('[Inventory] Stock adjusted:', { partId, locationId, delta });
    } catch (error) {
        console.error('[Inventory] Error adjusting stock:', error);
        throw error;
    }
};

export const transferStock = async (partId, fromLocationId, toLocationId, quantity, userId, notes = '') => {
    try {
        if (quantity <= 0) {
            throw new Error('Transfer quantity must be positive');
        }

        await runTransaction(db, async (transaction) => {
            // Deduct from source
            const fromInventoryId = `${fromLocationId}_${partId}`;
            const fromRef = doc(db, 'inventory_state', fromInventoryId);
            const fromDoc = await transaction.get(fromRef);

            if (!fromDoc.exists()) {
                throw new Error('Source location has no stock of this part');
            }

            const currentQuantity = fromDoc.data().quantity || 0;
            if (currentQuantity < quantity) {
                throw new Error('Insufficient stock at source location');
            }

            transaction.update(fromRef, {
                quantity: currentQuantity - quantity,
                lastUpdated: new Date().toISOString()
            });

            // Add to destination
            const toInventoryId = `${toLocationId}_${partId}`;
            const toRef = doc(db, 'inventory_state', toInventoryId);
            const toDoc = await transaction.get(toRef);

            const toQuantity = toDoc.exists() ? (toDoc.data().quantity || 0) : 0;
            transaction.set(toRef, {
                id: toInventoryId,
                partId,
                locationId: toLocationId,
                quantity: toQuantity + quantity,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // Log movements
            const timestamp = new Date().toISOString();
            const movementIdOut = `mov-${Date.now()}-out`;
            const movementIdIn = `mov-${Date.now()}-in`;

            transaction.set(doc(db, 'stock_movements', movementIdOut), {
                id: movementIdOut,
                partId,
                locationId: fromLocationId,
                movementType: 'TRANSFER',
                quantityDelta: -quantity,
                userId,
                notes: `Transfer to ${toLocationId}: ${notes}`,
                timestamp
            });

            transaction.set(doc(db, 'stock_movements', movementIdIn), {
                id: movementIdIn,
                partId,
                locationId: toLocationId,
                movementType: 'TRANSFER',
                quantityDelta: quantity,
                userId,
                notes: `Transfer from ${fromLocationId}: ${notes}`,
                timestamp
            });
        });

        console.log('[Inventory] Stock transferred:', { partId, fromLocationId, toLocationId, quantity });
    } catch (error) {
        console.error('[Inventory] Error transferring stock:', error);
        throw error;
    }
};

// ==========================================
// SERIALIZED ASSET OPERATIONS
// ==========================================

export const addSerializedAsset = async (assetData, userId) => {
    try {
        const assetId = `asset-${Date.now()}`;
        const now = new Date().toISOString();

        const newAsset = {
            id: assetId,
            ...assetData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'serialized_assets', assetId), newAsset);

        // Log the creation
        const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'stock_movements', movementId), {
            id: movementId,
            partId: assetData.partId,
            locationId: assetData.currentLocationId,
            movementType: 'ADJUSTMENT',
            quantityDelta: 1,
            serializedAssetId: assetId,
            userId,
            notes: `New serialized asset registered: ${assetData.serialNumber}`,
            timestamp: now
        });

        console.log('[Inventory] Serialized asset added:', assetId);
        return assetId;
    } catch (error) {
        console.error('[Inventory] Error adding serialized asset:', error);
        throw new Error('Failed to add serialized asset');
    }
};

export const updateSerializedAsset = async (assetId, updates) => {
    try {
        await updateDoc(doc(db, 'serialized_assets', assetId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[Inventory] Serialized asset updated:', assetId);
    } catch (error) {
        console.error('[Inventory] Error updating serialized asset:', error);
        throw new Error('Failed to update serialized asset');
    }
};

export const moveSerializedAsset = async (assetId, fromLocationId, toLocationId, userId, notes = '', newStatus = null) => {
    try {
        await runTransaction(db, async (transaction) => {
            const assetRef = doc(db, 'serialized_assets', assetId);
            const assetDoc = await transaction.get(assetRef);

            if (!assetDoc.exists()) {
                throw new Error('Serialized asset not found');
            }

            const assetData = assetDoc.data();
            const updates = {
                currentLocationId: toLocationId,
                updatedAt: new Date().toISOString()
            };

            if (newStatus) {
                updates.status = newStatus;
            }

            transaction.update(assetRef, updates);

            // Log the movement
            const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            transaction.set(doc(db, 'stock_movements', movementId), {
                id: movementId,
                partId: assetData.partId,
                locationId: toLocationId,
                movementType: newStatus === 'INSTALLED' ? 'INSTALLATION' : 'TRANSFER',
                quantityDelta: 0, // Serialized assets don't affect quantity
                serializedAssetId: assetId,
                userId,
                notes: `Moved from ${fromLocationId} to ${toLocationId}. ${notes}`,
                timestamp: new Date().toISOString()
            });
        });

        console.log('[Inventory] Serialized asset moved:', { assetId, fromLocationId, toLocationId });
    } catch (error) {
        console.error('[Inventory] Error moving serialized asset:', error);
        throw error;
    }
};

// ==========================================
// LOCATION OPERATIONS
// ==========================================

export const addLocation = async (locationData) => {
    try {
        const locationId = `loc-${Date.now()}`;
        const newLocation = {
            id: locationId,
            ...locationData,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'locations', locationId), newLocation);
        console.log('[Inventory] Location added:', locationId);
        return locationId;
    } catch (error) {
        console.error('[Inventory] Error adding location:', error);
        throw new Error('Failed to add location');
    }
};

export const updateLocation = async (locationId, updates) => {
    try {
        await updateDoc(doc(db, 'locations', locationId), updates);
        console.log('[Inventory] Location updated:', locationId);
    } catch (error) {
        console.error('[Inventory] Error updating location:', error);
        throw new Error('Failed to update location');
    }
};

export const deleteLocation = async (locationId) => {
    try {
        // Check for existing inventory at this location
        const inventorySnap = await getDocs(query(collection(db, 'inventory_state'), where('locationId', '==', locationId)));
        const assetsSnap = await getDocs(query(collection(db, 'serialized_assets'), where('currentLocationId', '==', locationId)));

        if (!inventorySnap.empty || !assetsSnap.empty) {
            throw new Error('Cannot delete location with existing inventory or assets. Please move all stock first.');
        }

        await deleteDoc(doc(db, 'locations', locationId));
        console.log('[Inventory] Location deleted:', locationId);
    } catch (error) {
        console.error('[Inventory] Error deleting location:', error);
        throw error;
    }
};

// ==========================================
// SUPPLIER OPERATIONS
// ==========================================

export const addSupplier = async (supplierData) => {
    try {
        const supplierId = `sup-${Date.now()}`;
        const newSupplier = {
            id: supplierId,
            ...supplierData,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'suppliers', supplierId), newSupplier);
        console.log('[Inventory] Supplier added:', supplierId);
        return supplierId;
    } catch (error) {
        console.error('[Inventory] Error adding supplier:', error);
        throw new Error('Failed to add supplier');
    }
};

export const updateSupplier = async (supplierId, updates) => {
    try {
        await updateDoc(doc(db, 'suppliers', supplierId), updates);
        console.log('[Inventory] Supplier updated:', supplierId);
    } catch (error) {
        console.error('[Inventory] Error updating supplier:', error);
        throw new Error('Failed to update supplier');
    }
};

export const deleteSupplier = async (supplierId) => {
    try {
        await deleteDoc(doc(db, 'suppliers', supplierId));
        console.log('[Inventory] Supplier deleted:', supplierId);
    } catch (error) {
        console.error('[Inventory] Error deleting supplier:', error);
        throw new Error('Failed to delete supplier');
    }
};

export const linkPartToSupplier = async (partId, supplierId, supplierPartNumber, leadTimeDays, isPrimary = false) => {
    try {
        const linkId = `${partId}_${supplierId}`;
        const newLink = {
            id: linkId,
            partId,
            supplierId,
            supplierPartNumber,
            leadTimeDays,
            isPrimary,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'part_suppliers', linkId), newLink);
        console.log('[Inventory] Part linked to supplier:', linkId);
        return linkId;
    } catch (error) {
        console.error('[Inventory] Error linking part to supplier:', error);
        throw new Error('Failed to link part to supplier');
    }
};

/**
 * Filter suppliers by categories (OR logic)
 * Returns suppliers that have at least one category in common with the provided list
 * @param {Array} suppliers - All suppliers
 * @param {Array<string>} itemCategoryIds - Category IDs to match against
 * @returns {Array} Filtered suppliers
 */
export const filterSuppliersByCategories = (suppliers, itemCategoryIds) => {
    if (!itemCategoryIds || itemCategoryIds.length === 0) {
        // No item categories - show all suppliers
        return suppliers;
    }

    return suppliers.filter(supplier => {
        if (!supplier.categoryIds || supplier.categoryIds.length === 0) {
            // Supplier has no categories - don't show
            return false;
        }

        // Check if supplier has ANY category that matches the item (OR logic)
        return supplier.categoryIds.some(catId => itemCategoryIds.includes(catId));
    });
};


// ==========================================
// QUERY OPERATIONS
// ==========================================

export const getStockMovementHistory = async (partId = null, locationId = null) => {
    try {
        let q = collection(db, 'stock_movements');
        const constraints = [orderBy('timestamp', 'desc')];

        if (partId) constraints.push(where('partId', '==', partId));
        if (locationId) constraints.push(where('locationId', '==', locationId));

        const querySnapshot = await getDocs(query(q, ...constraints));
        return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[Inventory] Error fetching movement history:', error);
        throw new Error('Failed to fetch movement history');
    }
};

export const getStockByLocation = async (locationId) => {
    try {
        const q = query(collection(db, 'inventory_state'), where('locationId', '==', locationId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[Inventory] Error fetching stock by location:', error);
        throw new Error('Failed to fetch stock by location');
    }
};

export const getSerializedAssetsByPart = async (partId) => {
    try {
        const q = query(collection(db, 'serialized_assets'), where('partId', '==', partId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[Inventory] Error fetching serialized assets:', error);
        throw new Error('Failed to fetch serialized assets');
    }
};

// ==========================================
// BULK OPERATIONS
// ==========================================

export const bulkImportParts = async (partsArray) => {
    try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();

        partsArray.forEach((partData, index) => {
            const partId = `part-${Date.now()}-${index}`;
            const partRef = doc(db, 'part_catalog', partId);

            batch.set(partRef, {
                id: partId,
                ...partData,
                createdAt: now,
                updatedAt: now
            });
        });

        await batch.commit();
        console.log('[Inventory] Bulk import completed:', partsArray.length, 'parts');
        return partsArray.length;
    } catch (error) {
        console.error('[Inventory] Error during bulk import:', error);
        throw new Error('Failed to import parts');
    }
};
