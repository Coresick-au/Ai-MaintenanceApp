// Build Guide Management Service Layer
import { db } from '../firebase';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { buildGuideRepository, productCompositionRepository, subAssemblyCompositionRepository } from '../repositories';
import { compressImage } from '../utils/imageCompression';

/**
 * Save or update a build guide for an item (product or sub assembly)
 * @description Creates a new build guide or updates existing one.
 * Validates that steps array is not empty.
 * @param {string} itemId - The item ID (product or sub assembly)
 * @param {string} itemType - The item type ('product' or 'subassembly')
 * @param {Array<Object>} steps - Array of build steps
 * @returns {Promise<Object>} Saved build guide
 * @example
 * const guide = await saveBuildGuide('prod-123', 'product', [
 *   { stepNumber: 1, instruction: 'Attach base plate', notes: '' }
 * ]);
 */
export const saveBuildGuide = async (itemId, itemType, steps) => {
    try {
        if (!steps || steps.length === 0) {
            throw new Error('At least one build step is required');
        }

        // Validate step structure
        steps.forEach((step, index) => {
            if (!step.instruction || step.instruction.trim() === '') {
                throw new Error(`Step ${index + 1} must have an instruction`);
            }
        });

        // Check if guide already exists for this item
        const existingGuide = await buildGuideRepository.getBuildGuideForItem(itemId, itemType);

        const buildGuideData = {
            itemId,
            itemType,
            steps: steps.map((step, index) => ({
                stepNumber: index + 1,
                instruction: step.instruction,
                notes: step.notes || '',
                imageUrl: step.imageUrl || null,
                imagePath: step.imagePath || null,
                itemsUsed: step.itemsUsed || []
            }))
        };

        // If exists, include the ID for update
        if (existingGuide) {
            buildGuideData.id = existingGuide.id;
        }

        const savedGuide = await buildGuideRepository.save(buildGuideData);
        console.log('[BuildGuideService] Build guide saved:', savedGuide.id);
        return savedGuide;
    } catch (error) {
        console.error('[BuildGuideService] Error saving build guide:', error);
        throw error;
    }
};

/**
 * Get build guide with enriched BOM data
 * @description Fetches the build guide and enriches it with item BOM details
 * including parts and fasteners with full catalog information.
 * @param {string} itemId - The item ID (product or sub assembly)
 * @param {string} itemType - The item type ('product' or 'subassembly')
 * @returns {Promise<Object|null>} Build guide with BOM data or null if no guide exists
 * @example
 * const guideWithBOM = await getBuildGuideWithBOM('prod-123', 'product');
 * // returns {
 * //   guide: { id: 'guide-xxx', itemId: 'prod-123', itemType: 'product', steps: [...] },
 * //   bom: { parts: [...], fasteners: [...] }
 * // }
 */
export const getBuildGuideWithBOM = async (itemId, itemType = 'product') => {
    try {
        // Fetch the build guide
        const guide = await buildGuideRepository.getBuildGuideForItem(itemId, itemType);

        // Fetch the item's BOM based on type
        let bom;
        if (itemType === 'subassembly') {
            bom = await subAssemblyCompositionRepository.getBOMForSubAssembly(itemId);
        } else {
            bom = await productCompositionRepository.getBOMForProduct(itemId);
        }

        // Enrich BOM with catalog data
        const enrichedBOM = await enrichBOMWithCatalogData(bom);

        return {
            guide,
            bom: enrichedBOM
        };
    } catch (error) {
        console.error('[BuildGuideService] Error getting build guide with BOM:', error);
        throw error;
    }
};

/**
 * Enrich BOM data with catalog information
 * @description Fetches part and fastener details from catalogs and merges with BOM quantities
 * @param {Object} bom - BOM object with parts and fasteners arrays
 * @returns {Promise<Object>} Enriched BOM with full catalog data
 * @private
 */
const enrichBOMWithCatalogData = async (bom) => {
    try {
        // Fetch part catalog
        const partCatalogSnap = await getDocs(collection(db, 'part_catalog'));
        const partCatalog = partCatalogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch fastener catalog
        const fastenerCatalogSnap = await getDocs(collection(db, 'fastener_catalog'));
        const fastenerCatalog = fastenerCatalogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch locations for name lookup
        const locationsSnap = await getDocs(collection(db, 'locations'));
        const locations = locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch inventory state for stock levels
        const inventorySnap = await getDocs(collection(db, 'inventory_state'));
        const inventory = inventorySnap.docs.map(doc => doc.data());

        // Helper to get location name
        const getLocationName = (locationId) => {
            const location = locations.find(l => l.id === locationId);
            return location ? location.name : 'No location';
        };

        // Helper to get stock level for an item
        const getStockLevel = (itemId) => {
            const itemInventory = inventory.filter(inv => inv.partId === itemId);
            return itemInventory.reduce((total, inv) => total + (inv.quantity || 0), 0);
        };

        // Enrich parts
        const enrichedParts = bom.parts.map(bomEntry => {
            const partDetails = partCatalog.find(p => p.id === bomEntry.partId);
            return {
                ...bomEntry,
                partNumber: partDetails?.sku || partDetails?.partNumber || 'Unknown',
                description: partDetails?.name || partDetails?.description || 'No description',
                unit: partDetails?.unit || 'ea',
                locationId: partDetails?.locationId || null,
                locationName: getLocationName(partDetails?.locationId),
                currentStock: getStockLevel(bomEntry.partId),
                reorderLevel: partDetails?.reorderLevel || 0
            };
        });

        // Enrich fasteners
        const enrichedFasteners = bom.fasteners.map(bomEntry => {
            const fastenerDetails = fastenerCatalog.find(f => f.id === bomEntry.fastenerId);
            return {
                ...bomEntry,
                partNumber: fastenerDetails?.sku || fastenerDetails?.partNumber || 'Unknown',
                description: fastenerDetails?.name || fastenerDetails?.description || 'No description',
                type: fastenerDetails?.type || 'Fastener',
                locationId: fastenerDetails?.locationId || null,
                locationName: getLocationName(fastenerDetails?.locationId),
                currentStock: getStockLevel(bomEntry.fastenerId),
                reorderLevel: fastenerDetails?.reorderLevel || 0
            };
        });

        return {
            parts: enrichedParts,
            fasteners: enrichedFasteners
        };
    } catch (error) {
        console.error('[BuildGuideService] Error enriching BOM:', error);
        throw error;
    }
};

/**
 * Upload an image for a build guide step
 * @param {string} itemId - The item ID (product or sub assembly)
 * @param {string} itemType - The item type ('product' or 'subassembly')
 * @param {number} stepNumber - The step number
 * @param {File} file - Image file to upload
 * @returns {Promise<Object>} { url, path } of uploaded image
 */
export const uploadStepImage = async (itemId, itemType, stepNumber, file) => {
    try {
        // Compress the image first
        console.log('[BuildGuideService] Compressing image...');
        const compressedFile = await compressImage(file);

        // Create storage path
        const imagePath = `build-guides/${itemType}/${itemId}/${stepNumber}/image.jpg`;
        const storageRef = ref(storage, imagePath);

        // Upload compressed image
        console.log('[BuildGuideService] Uploading to:', imagePath);
        await uploadBytes(storageRef, compressedFile);

        // Get download URL
        const url = await getDownloadURL(storageRef);

        console.log('[BuildGuideService] Image uploaded successfully');
        return { url, path: imagePath };
    } catch (error) {
        console.error('[BuildGuideService] Error uploading image:', error);
        throw new Error('Failed to upload image: ' + error.message);
    }
};

/**
 * Delete an image from storage
 * @param {string} imagePath - Firebase Storage path to delete
 * @returns {Promise<boolean>} True if successful
 */
export const deleteStepImage = async (imagePath) => {
    try {
        if (!imagePath) return true;

        const storageRef = ref(storage, imagePath);
        await deleteObject(storageRef);
        console.log('[BuildGuideService] Image deleted:', imagePath);
        return true;
    } catch (error) {
        // If file doesn't exist, consider it success
        if (error.code === 'storage/object-not-found') {
            console.log('[BuildGuideService] Image already deleted or not found:', imagePath);
            return true;
        }
        console.error('[BuildGuideService] Error deleting image:', error);
        throw error;
    }
};

/**
 * Delete a build guide for an item
 * @description Removes the build guide document from Firestore and cleans up associated images
 * @param {string} itemId - The item ID (product or sub assembly)
 * @param {string} itemType - The item type ('product' or 'subassembly')
 * @returns {Promise<boolean>} True if successful
 */
export const deleteBuildGuide = async (itemId, itemType = 'product') => {
    try {
        const guide = await buildGuideRepository.getBuildGuideForItem(itemId, itemType);

        if (!guide) {
            throw new Error('No build guide found for this product');
        }

        // Delete all step images
        if (guide.steps && guide.steps.length > 0) {
            for (const step of guide.steps) {
                if (step.imagePath) {
                    try {
                        await deleteStepImage(step.imagePath);
                    } catch (err) {
                        console.warn('[BuildGuideService] Failed to delete step image:', err);
                        // Continue with deletion even if image cleanup fails
                    }
                }
            }
        }

        await buildGuideRepository.delete(guide.id);
        console.log('[BuildGuideService] Build guide deleted for item:', itemId, itemType);
        return true;
    } catch (error) {
        console.error('[BuildGuideService] Error deleting build guide:', error);
        throw error;
    }
};
