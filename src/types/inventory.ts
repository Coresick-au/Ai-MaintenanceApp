// Inventory Management System - Type Definitions

export type PartCategory = 'Integrator' | 'Load Cell' | 'Speed Sensor' | 'Consumable';

export type AssetStatus = 'IN_STOCK' | 'ALLOCATED' | 'RMA' | 'MISSING';

export type MovementType = 'ADJUSTMENT' | 'TRANSFER' | 'INSTALLATION' | 'RETURN' | 'STOCK_TAKE';

export interface Part {
    id: string;
    sku: string; // Unique identifier
    name: string;
    category: PartCategory;
    description: string;
    costPrice: number; // In cents to avoid floating point errors
    listPrice: number; // In cents
    targetMarginPercent: number; // Target gross margin percentage
    isSerialized: boolean; // If true, track individual items; if false, track counts
    reorderLevel: number;
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
}

export interface Location {
    id: string;
    name: string; // e.g., "Warehouse - Banyo", "Truck - Brad"
    type: 'warehouse' | 'truck' | 'other';
    isReorderLocation: boolean; // True for warehouses where stock is replenished
    createdAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    defaultLeadTimeDays: number;
    notes?: string;
    createdAt: string;
}

export interface PartSupplier {
    id: string; // Composite: ${partId}_${supplierId}
    partId: string;
    supplierId: string;
    supplierPartNumber: string; // Supplier's SKU for this part
    leadTimeDays: number; // Override supplier's default if needed
    isPrimary: boolean; // Flag primary supplier for this part
    createdAt: string;
}

export interface InventoryRecord {
    id: string; // Composite: ${locationId}_${partId}
    partId: string;
    locationId: string;
    quantity: number;
    lastUpdated: string; // ISO timestamp
}

export interface SerializedAsset {
    id: string;
    serialNumber: string; // Manufacturer serial number
    partId: string;
    status: AssetStatus;
    currentLocationId: string;
    customerSiteId?: string; // Link to customer site if status === 'INSTALLED'
    jobNumber?: string; // Job number if allocated
    purchaseDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StockMovement {
    id: string;
    partId: string;
    locationId: string;
    movementType: MovementType;
    quantityDelta: number; // Positive for additions, negative for removals
    serializedAssetId?: string; // If movement involves a serialized asset
    userId: string; // Who made the change
    notes?: string;
    timestamp: string; // ISO timestamp
}

// Helper type for UI display
export interface StockOverviewItem {
    part: Part;
    totalQuantity: number;
    locationBreakdown: {
        locationId: string;
        locationName: string;
        quantity: number;
    }[];
    serializedAssets?: SerializedAsset[];
    isLowStock: boolean;
    actualMarginPercent: number;
}
