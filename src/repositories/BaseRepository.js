import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    onSnapshot,
    writeBatch
} from 'firebase/firestore';

/**
 * Base Repository class providing common CRUD operations
 * All repositories should extend this class
 */
export class BaseRepository {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.collectionRef = collection(db, collectionName);
    }

    /**
     * Get a single document by ID
     * @param {string} id - Document ID
     * @returns {Promise<Object|null>} Document data with ID or null if not found
     */
    async getById(id) {
        try {
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error(`Error getting ${this.collectionName} by ID:`, error);
            throw error;
        }
    }

    /**
     * Get all documents in the collection
     * @returns {Promise<Array>} Array of documents with IDs
     */
    async getAll() {
        try {
            const snapshot = await getDocs(this.collectionRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(`Error getting all ${this.collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Create a new document
     * @param {string} id - Document ID
     * @param {Object} data - Document data
     * @returns {Promise<Object>} Created document with ID
     */
    async create(id, data) {
        try {
            const docRef = doc(db, this.collectionName, id);
            await setDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error(`Error creating ${this.collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing document
     * @param {string} id - Document ID
     * @param {Object} data - Fields to update
     * @returns {Promise<Object>} Updated document with ID
     */
    async update(id, data) {
        try {
            const docRef = doc(db, this.collectionName, id);
            await updateDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error(`Error updating ${this.collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete a document
     * @param {string} id - Document ID
     * @returns {Promise<boolean>} True if successful
     */
    async delete(id) {
        try {
            const docRef = doc(db, this.collectionName, id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error(`Error deleting ${this.collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Subscribe to real-time updates
     * @param {Array} queryConstraints - Firestore query constraints (orderBy, where, etc.)
     * @param {Function} callback - Called with updated data
     * @param {Function} errorCallback - Called on error
     * @returns {Function} Unsubscribe function
     */
    subscribe(queryConstraints = [], callback, errorCallback) {
        const q = query(this.collectionRef, ...queryConstraints);

        return onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(data);
            },
            (error) => {
                console.error(`Error subscribing to ${this.collectionName}:`, error);
                if (errorCallback) errorCallback(error);
            }
        );
    }

    /**
     * Batch write operations
     * @param {Array} operations - Array of {type, id, data} objects
     * @returns {Promise<boolean>} True if successful
     */
    async batchWrite(operations) {
        try {
            const batch = writeBatch(db);

            operations.forEach(({ type, id, data }) => {
                const docRef = doc(db, this.collectionName, id);

                switch (type) {
                    case 'set':
                        batch.set(docRef, data);
                        break;
                    case 'update':
                        batch.update(docRef, data);
                        break;
                    case 'delete':
                        batch.delete(docRef);
                        break;
                    default:
                        console.warn(`Unknown batch operation type: ${type}`);
                }
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error(`Error in batch write for ${this.collectionName}:`, error);
            throw error;
        }
    }
}
