import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'site_part_numbers';

/**
 * Add a new site-specific part number
 * @param {Object} data - Site part data
 * @returns {Promise<string>} New document ID
 */
export const addSitePart = async (data) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding site part:', error);
        throw error;
    }
};

/**
 * Update a site-specific part number
 * @param {string} id - Document ID
 * @param {Object} data - Updates
 * @returns {Promise<void>}
 */
export const updateSitePart = async (id, data) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating site part:', error);
        throw error;
    }
};

/**
 * Delete a site-specific part number
 * @param {string} id - Document ID
 * @returns {Promise<void>}
 */
export const deleteSitePart = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error('Error deleting site part:', error);
        throw error;
    }
};

/**
 * Get all site-specific part numbers, optionally filtered by site ID
 * @param {string} [siteId] - Optional site ID to filter by
 * @returns {Promise<Array>} Array of site parts
 */
export const getSiteParts = async (siteId = null) => {
    try {
        let q;
        if (siteId) {
            q = query(collection(db, COLLECTION_NAME), where('siteId', '==', siteId));
        } else {
            q = collection(db, COLLECTION_NAME);
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching site parts:', error);
        throw error;
    }
};

/**
 * Get a single site part by ID
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export const getSitePartById = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching site part:', error);
        throw error;
    }
};
