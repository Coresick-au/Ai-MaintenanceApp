import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SETTINGS_COLLECTION = 'app_settings';
const LABOUR_RATE_DOC_ID = 'labour_rate';

/**
 * Get the current labour rate in cents per hour
 * @returns {Promise<number>} Labour rate in cents (e.g., 5000 = $50.00/hr)
 */
export const getLabourRate = async () => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, LABOUR_RATE_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().value || 5000; // Default $50/hr if value is missing
        }

        // If document doesn't exist, create it with default value
        const defaultRate = 5000; // $50.00/hr
        await setDoc(docRef, {
            value: defaultRate,
            updatedAt: new Date()
        });

        return defaultRate;
    } catch (error) {
        console.error('Error getting labour rate:', error);
        return 5000; // Fallback to default
    }
};

/**
 * Set the labour rate in cents per hour
 * @param {number} rateInCents - Labour rate in cents (e.g., 5000 = $50.00/hr)
 * @returns {Promise<void>}
 */
export const setLabourRate = async (rateInCents) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, LABOUR_RATE_DOC_ID);
        await setDoc(docRef, {
            value: rateInCents,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('Error setting labour rate:', error);
        throw error;
    }
};
