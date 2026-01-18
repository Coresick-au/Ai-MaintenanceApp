// Specialized Components Service - Historical Cost Tracking
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
    Timestamp
} from 'firebase/firestore';

// Re-export supplier filtering function for use in specialized components
export { filterSuppliersByCategories } from './inventoryService';


// ==========================================
// CONSTANTS
// ==========================================

export const MATERIAL_TYPES = {
    STAINLESS_STEEL: 'Stainless Steel',
    GALVANISED: 'Galvanised',
    STAINLESS_STEEL_FILLED: 'Stainless Steel Filled'
};

export const ROLLER_MATERIAL_TYPES = {
    HDPE: 'HDPE',
    STEEL: 'Steel',
    STEEL_HYBRID: 'Steel Hybrid',
    ALUMINIUM: 'Aluminium',
    FRAS: 'FRAS'
};

export const TRANSOM_TYPES = {
    ANGLE: 'Angle',
    SHS: 'SHS'
};

export const ROLLER_DESIGNS = {
    ONE_ROLLER: '1 Roller',
    THREE_ROLLER: '3 Roller',
    FIVE_ROLLER: '5 Roller'
};

export const SCALE_POSITION = {
    ON_SCALE: 'On-Scale',
    OFF_SCALE: 'Off-Scale'
};

export const SPEED_SENSOR_DESIGNS = {
    HARD_ROCK: 'HR - Hard Rock',
    SOFT_ROCK: 'SR - Soft Rock'
};

export const STANDARD_BELT_WIDTHS = [
    600, 650, 750, 800, 900, 1000, 1050, 1200,
    1350, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 2500
];

export const IDLER_SPACING_OPTIONS = [];
for (let i = 700; i <= 2000; i += 100) {
    IDLER_SPACING_OPTIONS.push(i);
}

export const STANDARD_ROLLER_DIAMETERS = [102, 114, 127, 152, 178, 194];

// ==========================================
// WEIGHER MODEL CONFIGURATION
// ==========================================

export const addWeigherModel = async (modelData) => {
    try {
        const modelId = `wmodel-${Date.now()}`;
        const newModel = {
            id: modelId,
            ...modelData,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'weigher_models', modelId), newModel);
        console.log('[SpecializedComponents] Weigher model added:', modelId);
        return modelId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding weigher model:', error);
        throw new Error('Failed to add weigher model');
    }
};

export const updateWeigherModel = async (modelId, updates) => {
    try {
        await updateDoc(doc(db, 'weigher_models', modelId), updates);
        console.log('[SpecializedComponents] Weigher model updated:', modelId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating weigher model:', error);
        throw new Error('Failed to update weigher model');
    }
};

export const deleteWeigherModel = async (modelId) => {
    try {
        // Check if model is in use
        const inUse = await getDocs(
            query(collection(db, 'weigh_modules_cost_history'), where('modelId', '==', modelId))
        );

        if (!inUse.empty) {
            throw new Error('Cannot delete model that is in use by cost history records');
        }

        await deleteDoc(doc(db, 'weigher_models', modelId));
        console.log('[SpecializedComponents] Weigher model deleted:', modelId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting weigher model:', error);
        throw error;
    }
};

export const getAllWeigherModels = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'weigher_models'));
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching weigher models:', error);
        throw new Error('Failed to fetch weigher models');
    }
};

// ==========================================
// WEIGH MODULES
// ==========================================

export const addWeighModule = async (moduleData) => {
    try {
        const moduleId = `wm-${Date.now()}`;
        const now = new Date().toISOString();

        const newModule = {
            id: moduleId,
            ...moduleData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'weigh_modules_cost_history', moduleId), newModule);
        console.log('[SpecializedComponents] Weigh module added:', moduleId);
        return moduleId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding weigh module:', error);
        throw new Error('Failed to add weigh module');
    }
};

export const updateWeighModule = async (moduleId, updates) => {
    try {
        await updateDoc(doc(db, 'weigh_modules_cost_history', moduleId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[SpecializedComponents] Weigh module updated:', moduleId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating weigh module:', error);
        throw new Error('Failed to update weigh module');
    }
};

export const deleteWeighModule = async (moduleId) => {
    try {
        await deleteDoc(doc(db, 'weigh_modules_cost_history', moduleId));
        console.log('[SpecializedComponents] Weigh module deleted:', moduleId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting weigh module:', error);
        throw error;
    }
};

export const getAllWeighModules = async () => {
    try {
        const snapshot = await getDocs(
            query(collection(db, 'weigh_modules_cost_history'), orderBy('effectiveDate', 'desc'))
        );
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching weigh modules:', error);
        throw new Error('Failed to fetch weigh modules');
    }
};

// ==========================================
// IDLER FRAMES
// ==========================================

export const addIdlerFrame = async (frameData) => {
    try {
        const frameId = `if-${Date.now()}`;
        const now = new Date().toISOString();

        const newFrame = {
            id: frameId,
            ...frameData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'idler_frames_cost_history', frameId), newFrame);
        console.log('[SpecializedComponents] Idler frame added:', frameId);
        return frameId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding idler frame:', error);
        throw new Error('Failed to add idler frame');
    }
};

export const updateIdlerFrame = async (frameId, updates) => {
    try {
        await updateDoc(doc(db, 'idler_frames_cost_history', frameId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[SpecializedComponents] Idler frame updated:', frameId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating idler frame:', error);
        throw new Error('Failed to update idler frame');
    }
};

export const deleteIdlerFrame = async (frameId) => {
    try {
        await deleteDoc(doc(db, 'idler_frames_cost_history', frameId));
        console.log('[SpecializedComponents] Idler frame deleted:', frameId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting idler frame:', error);
        throw error;
    }
};

export const getAllIdlerFrames = async () => {
    try {
        const snapshot = await getDocs(
            query(collection(db, 'idler_frames_cost_history'), orderBy('effectiveDate', 'desc'))
        );
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching idler frames:', error);
        throw new Error('Failed to fetch idler frames');
    }
};

// ==========================================
// BILLET WEIGHTS
// ==========================================

export const addBilletWeight = async (weightData) => {
    try {
        const weightId = `bw-${Date.now()}`;
        const now = new Date().toISOString();

        const newWeight = {
            id: weightId,
            ...weightData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'billet_weights_cost_history', weightId), newWeight);
        console.log('[SpecializedComponents] Billet weight added:', weightId);
        return weightId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding billet weight:', error);
        throw new Error('Failed to add billet weight');
    }
};

export const updateBilletWeight = async (weightId, updates) => {
    try {
        await updateDoc(doc(db, 'billet_weights_cost_history', weightId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[SpecializedComponents] Billet weight updated:', weightId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating billet weight:', error);
        throw new Error('Failed to update billet weight');
    }
};

export const deleteBilletWeight = async (weightId) => {
    try {
        await deleteDoc(doc(db, 'billet_weights_cost_history', weightId));
        console.log('[SpecializedComponents] Billet weight deleted:', weightId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting billet weight:', error);
        throw error;
    }
};

export const getAllBilletWeights = async () => {
    try {
        const snapshot = await getDocs(
            query(collection(db, 'billet_weights_cost_history'), orderBy('effectiveDate', 'desc'))
        );
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching billet weights:', error);
        throw new Error('Failed to fetch billet weights');
    }
};

// ==========================================
// ROLLERS
// ==========================================

export const addRoller = async (rollerData) => {
    try {
        const rollerId = `rol-${Date.now()}`;
        const now = new Date().toISOString();

        const newRoller = {
            id: rollerId,
            ...rollerData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'rollers_cost_history', rollerId), newRoller);
        console.log('[SpecializedComponents] Roller added:', rollerId);
        return rollerId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding roller:', error);
        throw new Error('Failed to add roller');
    }
};

export const updateRoller = async (rollerId, updates) => {
    try {
        await updateDoc(doc(db, 'rollers_cost_history', rollerId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[SpecializedComponents] Roller updated:', rollerId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating roller:', error);
        throw new Error('Failed to update roller');
    }
};

export const deleteRoller = async (rollerId) => {
    try {
        await deleteDoc(doc(db, 'rollers_cost_history', rollerId));
        console.log('[SpecializedComponents] Roller deleted:', rollerId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting roller:', error);
        throw error;
    }
};

export const getAllRollers = async () => {
    try {
        const snapshot = await getDocs(
            query(collection(db, 'rollers_cost_history'), orderBy('effectiveDate', 'desc'))
        );
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching rollers:', error);
        throw new Error('Failed to fetch rollers');
    }
};

// ==========================================
// SPIRAL CAGE SPEED SENSORS
// ==========================================

export const addSpeedSensor = async (sensorData) => {
    try {
        const sensorId = `scs-${Date.now()}`;
        const now = new Date().toISOString();

        const newSensor = {
            id: sensorId,
            ...sensorData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'speed_sensors_cost_history', sensorId), newSensor);
        console.log('[SpecializedComponents] Speed sensor added:', sensorId);
        return sensorId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding speed sensor:', error);
        throw new Error('Failed to add speed sensor');
    }
};

export const updateSpeedSensor = async (sensorId, updates) => {
    try {
        await updateDoc(doc(db, 'speed_sensors_cost_history', sensorId), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        console.log('[SpecializedComponents] Speed sensor updated:', sensorId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating speed sensor:', error);
        throw new Error('Failed to update speed sensor');
    }
};

export const deleteSpeedSensor = async (sensorId) => {
    try {
        await deleteDoc(doc(db, 'speed_sensors_cost_history', sensorId));
        console.log('[SpecializedComponents] Speed sensor deleted:', sensorId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting speed sensor:', error);
        throw error;
    }
};

export const getAllSpeedSensors = async () => {
    try {
        const snapshot = await getDocs(
            query(collection(db, 'speed_sensors_cost_history'), orderBy('effectiveDate', 'desc'))
        );
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching speed sensors:', error);
        throw new Error('Failed to fetch speed sensors');
    }
};

// ==========================================
// BATCH IMPORT FUNCTIONS
// ==========================================

/**
 * Batch import rollers from CSV data
 * @param {Array} dataArray - Array of roller objects from CSV
 * @returns {Object} Import result with success/failure counts
 */
export const importRollers = async (dataArray) => {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    try {
        // Get existing IDs to check for duplicates
        const existingSnapshot = await getDocs(collection(db, 'rollers_cost_history'));
        const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

        for (const item of dataArray) {
            try {
                // Skip if ID already exists
                if (item.id && existingIds.has(item.id)) {
                    results.skipped++;
                    continue;
                }

                // Generate new ID if not provided
                const rollerId = item.id || `rol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();

                const newRoller = {
                    id: rollerId,
                    ...item,
                    createdAt: item.createdAt || now,
                    updatedAt: now
                };

                await setDoc(doc(db, 'rollers_cost_history', rollerId), newRoller);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row error: ${error.message}`);
            }
        }

        console.log('[SpecializedComponents] Roller import complete:', results);
        return results;
    } catch (error) {
        console.error('[SpecializedComponents] Error importing rollers:', error);
        throw new Error('Failed to import rollers: ' + error.message);
    }
};

/**
 * Batch import weigh modules from CSV data
 */
export const importWeighModules = async (dataArray) => {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    try {
        const existingSnapshot = await getDocs(collection(db, 'weigh_modules_cost_history'));
        const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

        for (const item of dataArray) {
            try {
                if (item.id && existingIds.has(item.id)) {
                    results.skipped++;
                    continue;
                }

                const moduleId = item.id || `wm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();

                const newModule = {
                    id: moduleId,
                    ...item,
                    createdAt: item.createdAt || now,
                    updatedAt: now
                };

                await setDoc(doc(db, 'weigh_modules_cost_history', moduleId), newModule);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row error: ${error.message}`);
            }
        }

        console.log('[SpecializedComponents] Weigh module import complete:', results);
        return results;
    } catch (error) {
        console.error('[SpecializedComponents] Error importing weigh modules:', error);
        throw new Error('Failed to import weigh modules: ' + error.message);
    }
};

/**
 * Batch import idler frames from CSV data
 */
export const importIdlerFrames = async (dataArray) => {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    try {
        const existingSnapshot = await getDocs(collection(db, 'idler_frames_cost_history'));
        const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

        for (const item of dataArray) {
            try {
                if (item.id && existingIds.has(item.id)) {
                    results.skipped++;
                    continue;
                }

                const frameId = item.id || `if-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();

                const newFrame = {
                    id: frameId,
                    ...item,
                    createdAt: item.createdAt || now,
                    updatedAt: now
                };

                await setDoc(doc(db, 'idler_frames_cost_history', frameId), newFrame);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row error: ${error.message}`);
            }
        }

        console.log('[SpecializedComponents] Idler frame import complete:', results);
        return results;
    } catch (error) {
        console.error('[SpecializedComponents] Error importing idler frames:', error);
        throw new Error('Failed to import idler frames: ' + error.message);
    }
};

/**
 * Batch import billet weights from CSV data
 */
export const importBilletWeights = async (dataArray) => {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    try {
        const existingSnapshot = await getDocs(collection(db, 'billet_weights_cost_history'));
        const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

        for (const item of dataArray) {
            try {
                if (item.id && existingIds.has(item.id)) {
                    results.skipped++;
                    continue;
                }

                const weightId = item.id || `bw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();

                const newWeight = {
                    id: weightId,
                    ...item,
                    createdAt: item.createdAt || now,
                    updatedAt: now
                };

                await setDoc(doc(db, 'billet_weights_cost_history', weightId), newWeight);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row error: ${error.message}`);
            }
        }

        console.log('[SpecializedComponents] Billet weight import complete:', results);
        return results;
    } catch (error) {
        console.error('[SpecializedComponents] Error importing billet weights:', error);
        throw new Error('Failed to import billet weights: ' + error.message);
    }
};

/**
 * Batch import speed sensors from CSV data
 */
export const importSpeedSensors = async (dataArray) => {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    try {
        const existingSnapshot = await getDocs(collection(db, 'speed_sensors_cost_history'));
        const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

        for (const item of dataArray) {
            try {
                if (item.id && existingIds.has(item.id)) {
                    results.skipped++;
                    continue;
                }

                const sensorId = item.id || `scs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();

                const newSensor = {
                    id: sensorId,
                    ...item,
                    createdAt: item.createdAt || now,
                    updatedAt: now
                };

                await setDoc(doc(db, 'speed_sensors_cost_history', sensorId), newSensor);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row error: ${error.message}`);
            }
        }

        console.log('[SpecializedComponents] Speed sensor import complete:', results);
        return results;
    } catch (error) {
        console.error('[SpecializedComponents] Error importing speed sensors:', error);
        throw new Error('Failed to import speed sensors: ' + error.message);
    }
};

// ==========================================
// TMD FRAMES (Tramp Metal Detector Frames)
// ==========================================

export const addTMDFrame = async (frameData) => {
    try {
        const frameId = `tmd-${Date.now()}`;
        const now = new Date().toISOString();

        const newFrame = {
            id: frameId,
            ...frameData,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, 'tmd_frames_cost_history', frameId), newFrame);
        console.log('[SpecializedComponents] TMD Frame added:', frameId);
        return frameId;
    } catch (error) {
        console.error('[SpecializedComponents] Error adding TMD Frame:', error);
        throw new Error('Failed to add TMD Frame');
    }
};

export const updateTMDFrame = async (frameId, updates) => {
    try {
        const updateData = {
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'tmd_frames_cost_history', frameId), updateData);
        console.log('[SpecializedComponents] TMD Frame updated:', frameId);
    } catch (error) {
        console.error('[SpecializedComponents] Error updating TMD Frame:', error);
        throw new Error('Failed to update TMD Frame');
    }
};

export const deleteTMDFrame = async (frameId) => {
    try {
        await deleteDoc(doc(db, 'tmd_frames_cost_history', frameId));
        console.log('[SpecializedComponents] TMD Frame deleted:', frameId);
    } catch (error) {
        console.error('[SpecializedComponents] Error deleting TMD Frame:', error);
        throw new Error('Failed to delete TMD Frame');
    }
};

/**
 * Batch import TMD Frames from CSV data
 */
export const importTMDFrames = async (dataArray) => {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] };

    try {
        const existingSnapshot = await getDocs(collection(db, 'tmd_frames_cost_history'));
        const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

        for (const item of dataArray) {
            try {
                if (item.id && existingIds.has(item.id)) {
                    results.skipped++;
                    continue;
                }

                const frameId = item.id || `tmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();

                const newFrame = {
                    id: frameId,
                    ...item,
                    createdAt: item.createdAt || now,
                    updatedAt: now
                };

                await setDoc(doc(db, 'tmd_frames_cost_history', frameId), newFrame);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row error: ${error.message}`);
            }
        }

        console.log('[SpecializedComponents] TMD Frame import complete:', results);
        return results;
    } catch (error) {
        console.error('[SpecializedComponents] Error importing TMD Frames:', error);
        throw new Error('Failed to import TMD Frames: ' + error.message);
    }
};

// ==========================================
// IDLER FRAME CONFIGURATION
// ==========================================

const CONFIG_DOC_ID = 'current';

/**
 * Get the current idler frame configuration (includes cam price)
 */
export const getIdlerFrameConfig = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'idler_frame_config'));
        if (!snapshot.empty) {
            return snapshot.docs[0].data();
        }

        // Return default config if none exists
        return {
            id: CONFIG_DOC_ID,
            camPricePerUnit: 0, // in cents
            effectiveDate: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('[SpecializedComponents] Error fetching idler frame config:', error);
        throw new Error('Failed to fetch idler frame configuration');
    }
};

/**
 * Update the idler frame configuration
 */
export const updateIdlerFrameConfig = async (configData) => {
    try {
        const configWithMeta = {
            id: CONFIG_DOC_ID,
            ...configData,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'idler_frame_config', CONFIG_DOC_ID), configWithMeta);
        console.log('[SpecializedComponents] Idler frame config updated');
        return configWithMeta;
    } catch (error) {
        console.error('[SpecializedComponents] Error updating idler frame config:', error);
        throw new Error('Failed to update idler frame configuration');
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export const getBilletWeightCategory = (weightKg) => {
    return weightKg < 250 ? 'Small (<250kg)' : 'Large (≥250kg)';
};

export const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
};

