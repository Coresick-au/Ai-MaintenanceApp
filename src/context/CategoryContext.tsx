import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Category } from '../types/Category';

// Collection name
const CATEGORIES_COLLECTION = 'categories';

/**
 * Category Context interface defining the shape of category state.
 */
interface CategoryContextType {
    /** All categories from Firestore */
    categories: Category[];

    /** Loading state indicator */
    loading: boolean;

    /** Error state */
    error: string | null;

    /** Manual refresh method to force reload categories */
    refreshCategories: () => Promise<void>;
}

/**
 * Create the Category Context
 */
const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

/**
 * Props for Category Provider component
 */
interface CategoryProviderProps {
    children: ReactNode;
}

/**
 * Category Provider Component
 * Provides real-time category data to all child components via React Context.
 * Uses a single onSnapshot listener for efficient real-time synchronization.
 */
export function CategoryProvider({ children }: CategoryProviderProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Create Firestore query with ordering by name
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const categoriesQuery = query(categoriesRef, orderBy('name'));

        // Single onSnapshot listener for real-time updates
        const unsubscribe = onSnapshot(
            categoriesQuery,
            (snapshot) => {
                try {
                    const categoryData: Category[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Category));

                    setCategories(categoryData);
                    setError(null);
                } catch (err) {
                    console.error('Error processing category snapshot:', err);
                    setError(err instanceof Error ? err.message : 'Failed to process categories');
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                console.error('Error listening to categories:', err);
                setError(err instanceof Error ? err.message : 'Failed to listen to categories');
                setLoading(false);
            }
        );

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);

    /**
     * Manual refresh method (primarily for forcing reload if needed)
     * Note: With onSnapshot, categories auto-update, but this provides explicit control
     */
    const refreshCategories = async (): Promise<void> => {
        // onSnapshot handles auto-refresh, but we can reset loading state
        setLoading(true);
        // The onSnapshot listener will automatically fetch latest data
        // This is here for API consistency and future extensibility
    };

    const value: CategoryContextType = {
        categories,
        loading,
        error,
        refreshCategories
    };

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
}

/**
 * Custom hook to consume category context.
 * Throws error if used outside CategoryProvider.
 * @returns CategoryContextType
 */
export function useCategories(): CategoryContextType {
    const context = useContext(CategoryContext);

    if (context === undefined) {
        throw new Error('useCategories must be used within a CategoryProvider');
    }

    return context;
}
