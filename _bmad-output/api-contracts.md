# API Contracts: Internal Service Layer

Since this is a Monolith architecture using Firebase directly, the "API" consists of the exported functions in the **Service Layer** (`src/services`).

## Inventory Service (`src/services/inventoryService.js`)

These functions handle complex domain logic and transactions. **All UI components must calls these functions, never update Firestore directly.**

### Part Catalog
- `addPartToCatalog(partData)`: Creates new part with auto-ID.
- `updatePart(partId, updates)`
- `deletePart(partId)`: **Critical**: Checks for existing inventory/assets before allowing deletion.

### Stock Operations
- `adjustStockQuantity(partId, locationId, delta, userId, notes)`
    - **Transaction**: Updates `inventory_state` AND creates `stock_movements` record atomically.
    - Prevents negative stock.
- `transferStock(partId, fromLoc, toLoc, quantity, userId, notes)`
    - **Transaction**: Decrements source, increments dest, logs TWO movement records (OUT and IN).

### Assets
- `addSerializedAsset(assetData, userId)`
- `moveSerializedAsset(assetId, fromLoc, toLoc, userId, notes)`
    - Updates location and logs movement.

### Bulk
- `bulkImportParts(partsArray)`: Batch write operation for CSV imports.

## Data Access Layer (`src/repositories/BaseRepository.js`)

Generic capabilities available to all repositories (`CustomerRepository`, `QuoteRepository`, etc.):

- `getById(id)`
- `getAll()`
- `create(id, data)` / `save(data)`
- `update(id, data)`
- `delete(id)`
- `subscribe(query, callback)`: Real-time listener wrapper.
