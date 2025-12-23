// JavaScript version of categoryService (TypeScript version had compilation issues)
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Collection names
const CATEGORIES_COLLECTION = 'categories';
const PARTS_COLLECTION = 'part_catalog';
const FASTENERS_COLLECTION = 'fastener_catalog';
const PRODUCTS_COLLECTION = 'products';

/**
 * Fetches all categories from Firestore.
 */
export async function getAllCategories() {
    try {
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const snapshot = await getDocs(categoriesRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw new Error(`Failed to fetch categories: ${error.message}`);
    }
}

/**
 * Fetches a single category by ID.
 */
export async function getCategoryById(id) {
    try {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
        const snapshot = await getDoc(categoryRef);

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data()
        };
    } catch (error) {
        console.error(`Error fetching category ${id}:`, error);
        throw new Error(`Failed to fetch category: ${error.message}`);
    }
}

/**
 * Creates a new category with automatic path generation.
 */
export async function createCategory(data) {
    try {
        if (!data.name || data.name.trim() === '') {
            throw new Error('Category name is required');
        }

        // Generate path array based on parentId
        let path = [];
        if (data.parentId) {
            const parent = await getCategoryById(data.parentId);
            if (!parent) {
                throw new Error(`Parent category ${data.parentId} not found`);
            }
            path = [...parent.path, data.parentId];
        }

        const categoryDTO = {
            name: data.name.trim(),
            parentId: data.parentId || null,
            path,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const docRef = await addDoc(categoriesRef, categoryDTO);

        return docRef.id;
    } catch (error) {
        console.error('Error creating category:', error);
        throw new Error(`Failed to create category: ${error.message}`);
    }
}

/**
 * Updates an existing category.
 */
export async function updateCategory(id, data) {
    try {
        if (!id) {
            throw new Error('Category ID is required');
        }

        // Verify category exists
        const existing = await getCategoryById(id);
        if (!existing) {
            throw new Error(`Category ${id} not found`);
        }

        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };

        // If parentId is being updated, regenerate path
        if (data.parentId !== undefined) {
            if (data.parentId) {
                const parent = await getCategoryById(data.parentId);
                if (!parent) {
                    throw new Error(`Parent category ${data.parentId} not found`);
                }
                updateData.path = [...parent.path, data.parentId];
            } else {
                // Moving to root level
                updateData.path = [];
            }
        }

        const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
        await updateDoc(categoryRef, updateData);
    } catch (error) {
        console.error(`Error updating category ${id}:`, error);
        throw new Error(`Failed to update category: ${error.message}`);
    }
}

/**
 * Deletes a category.
 */
export async function deleteCategory(id) {
    try {
        if (!id) {
            throw new Error('Category ID is required');
        }

        // Verify category exists
        const existing = await getCategoryById(id);
        if (!existing) {
            throw new Error(`Category ${id} not found`);
        }

        const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
        await deleteDoc(categoryRef);
    } catch (error) {
        console.error(`Error deleting category ${id}:`, error);
        throw new Error(`Failed to delete category: ${error.message}`);
    }
}

/**
 * Checks if a category is currently in use by inventory items.
 */
export async function checkCategoryUsage(id) {
    try {
        if (!id) {
            throw new Error('Category ID is required');
        }

        const collectionsToCheck = [
            { name: PARTS_COLLECTION, ref: collection(db, PARTS_COLLECTION) },
            { name: FASTENERS_COLLECTION, ref: collection(db, FASTENERS_COLLECTION) },
            { name: PRODUCTS_COLLECTION, ref: collection(db, PRODUCTS_COLLECTION) }
        ];

        let totalCount = 0;
        const usedInCollections = [];

        for (const { name, ref } of collectionsToCheck) {
            // Check for categoryId match
            const categoryQuery = query(ref, where('categoryId', '==', id));
            const categorySnapshot = await getDocs(categoryQuery);

            // Check for subcategoryId match
            const subcategoryQuery = query(ref, where('subcategoryId', '==', id));
            const subcategorySnapshot = await getDocs(subcategoryQuery);

            const count = categorySnapshot.size + subcategorySnapshot.size;

            if (count > 0) {
                totalCount += count;
                usedInCollections.push(name);
            }
        }

        return {
            inUse: totalCount > 0,
            count: totalCount,
            collections: usedInCollections.length > 0 ? usedInCollections : undefined
        };
    } catch (error) {
        console.error(`Error checking category usage for ${id}:`, error);
        throw new Error(`Failed to check category usage: ${error.message}`);
    }
}

/**
 * Initializes default categories for the inventory system.
 */
export async function initializeDefaultCategories() {
    try {
        console.log('[CategoryService] Initializing default categories...');

        // Check if categories already exist
        const existing = await getAllCategories();
        if (existing.length > 0) {
            console.log('[CategoryService] Categories already exist, skipping initialization');
            return;
        }

        // Define default category structure
        const defaultCategories = [
            {
                name: 'Parts',
                subcategories: ['Mechanical', 'Electrical', 'Pneumatic', 'Hydraulic']
            },
            {
                name: 'Fasteners',
                subcategories: ['Bolts', 'Nuts', 'Washers', 'Screws', 'Rivets']
            },
            {
                name: 'Products',
                subcategories: ['Assemblies', 'Kits', 'Custom Solutions']
            },
            {
                name: 'Consumables',
                subcategories: ['Lubricants', 'Cleaning', 'Safety Equipment']
            }
        ];

        // Create root categories and their subcategories
        for (const category of defaultCategories) {
            // Create root category
            const rootId = await createCategory({
                name: category.name,
                parentId: null
            });

            console.log(`[CategoryService] Created root category: ${category.name} (${rootId})`);

            // Create subcategories
            for (const subName of category.subcategories) {
                const subId = await createCategory({
                    name: subName,
                    parentId: rootId
                });

                console.log(`[CategoryService] Created subcategory: ${subName} (${subId}) under ${category.name}`);
            }
        }

        console.log('[CategoryService] Default categories initialized successfully');
    } catch (error) {
        console.error('[CategoryService] Error initializing default categories:', error);
        throw new Error(`Failed to initialize default categories: ${error.message}`);
    }
}

export const addCategory = createCategory;
