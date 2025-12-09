// Initialize Inventory System with Default Data
import { addLocation } from './inventoryService';
import { initializeDefaultCategories } from './categoryService';

export const initializeInventorySystem = async () => {
    try {
        console.log('[Inventory] Initializing system with default data...');

        // Initialize default categories
        await initializeDefaultCategories();

        // Create default location: Warehouse - Banyo
        const banyoId = await addLocation({
            name: 'Warehouse - Banyo',
            type: 'warehouse',
            isReorderLocation: true
        });

        console.log('[Inventory] System initialized successfully');
        return { banyoId };
    } catch (error) {
        console.error('[Inventory] Error during initialization:', error);
        throw error;
    }
};
