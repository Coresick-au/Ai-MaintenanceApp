// Category Management Service
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, query, where, writeBatch } from 'firebase/firestore';

export const addCategory = async (categoryName) => {
    try {
        const categoryId = `cat-${Date.now()}`;
        await setDoc(doc(db, 'part_categories', categoryId), {
            id: categoryId,
            name: categoryName.trim(),
            createdAt: new Date().toISOString()
        });
        console.log('[Inventory] Category added:', categoryId);
        return categoryId;
    } catch (error) {
        console.error('[Inventory] Error adding category:', error);
        throw new Error('Failed to add category');
    }
};

export const updateCategory = async (categoryId, newName, oldName) => {
    try {
        // Update the category document
        await setDoc(doc(db, 'part_categories', categoryId), {
            id: categoryId,
            name: newName.trim(),
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update all parts that use this category
        const partsRef = collection(db, 'part_catalog');
        const q = query(partsRef, where('category', '==', oldName));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { category: newName.trim() });
            });
            await batch.commit();
            console.log(`[Inventory] Updated ${snapshot.size} parts with new category name`);
        }

        console.log('[Inventory] Category updated:', categoryId);
    } catch (error) {
        console.error('[Inventory] Error updating category:', error);
        throw new Error('Failed to update category');
    }
};

export const getCategoryUsageCount = async (categoryName) => {
    try {
        const partsRef = collection(db, 'part_catalog');
        const q = query(partsRef, where('category', '==', categoryName));
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('[Inventory] Error checking category usage:', error);
        return 0;
    }
};

export const deleteCategory = async (categoryId) => {
    try {
        await deleteDoc(doc(db, 'part_categories', categoryId));
        console.log('[Inventory] Category deleted:', categoryId);
    } catch (error) {
        console.error('[Inventory] Error deleting category:', error);
        throw new Error('Failed to delete category');
    }
};

export const initializeDefaultCategories = async () => {
    try {
        const defaultCategories = ['Integrator', 'Load Cell', 'Speed Sensor', 'Consumable'];

        for (const catName of defaultCategories) {
            const categoryId = `cat-default-${catName.toLowerCase().replace(/\s+/g, '-')}`;
            await setDoc(doc(db, 'part_categories', categoryId), {
                id: categoryId,
                name: catName,
                isDefault: true,
                createdAt: new Date().toISOString()
            }, { merge: true }); // merge to avoid overwriting if already exists
        }

        console.log('[Inventory] Default categories initialized');
    } catch (error) {
        console.error('[Inventory] Error initializing categories:', error);
        throw error;
    }
};
