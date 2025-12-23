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
    ALUMINIUM: 'Aluminium'
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

export const STANDARD_BELT_WIDTHS = [
    600, 650, 750, 800, 900, 1000, 1050, 1200,
    1350, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 2500
];

export const IDLER_SPACING_OPTIONS = [];
for (let i = 700; i <= 2000; i += 100) {
    IDLER_SPACING_OPTIONS.push(i);
}

export const STANDARD_ROLLER_DIAMETERS = [102, 114, 127, 152];

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
// UTILITY FUNCTIONS
// ==========================================

export const getBilletWeightCategory = (weightKg) => {
    return weightKg < 250 ? 'Small (<250kg)' : 'Large (≥250kg)';
};

export const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
};
