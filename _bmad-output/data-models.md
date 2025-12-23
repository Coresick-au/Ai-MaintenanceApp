# Data Models

## Firestore Collections

### `part_catalog`
**Purpose**: Stores master data for all parts available in the system.
- `id`: string (`part-{timestamp}`)
- `name`: string
- `description`: string
- `sku`: string
- `category`: string
- `createdAt`: ISO Date
- `updatedAt`: ISO Date

### `inventory_state`
**Purpose**: Tracks quantity of a part at a specific location.
- `id`: string (Composite: `{locationId}_{partId}`)
- `partId`: string (Ref: `part_catalog`)
- `locationId`: string (Ref: `locations`)
- `quantity`: number
- `lastUpdated`: ISO Date

### `serialized_assets`
**Purpose**: Tracks individual high-value items with serial numbers.
- `id`: string (`asset-{timestamp}`)
- `partId`: string
- `currentLocationId`: string
- `serialNumber`: string
- `status`: string (e.g., 'INSTALLED', 'AVAILABLE')
- `createdAt`: ISO Date
- `updatedAt`: ISO Date

### `stock_movements`
**Purpose**: Audit trail for all inventory changes.
- `id`: string (`mov-{timestamp}-{random}`)
- `partId`: string
- `locationId`: string
- `movementType`: string ('ADJUSTMENT', 'TRANSFER', 'INSTALLATION')
- `quantityDelta`: number
- `userId`: string
- `notes`: string
- `timestamp`: ISO Date

### `locations` / `suppliers`
Standard reference collections storing `name`, `address`, etc.

## Validation Schemas (`src/utils/validation.ts`)

### Site Form Data
Used when creating/editing customer sites.
```typescript
interface SiteFormData {
  name: string;        // Required
  customer: string;    // Required
  location: string;    // Required
  type?: string;
  contactEmail?: string; // Validated format
  contactPhone1?: string; // Validated format
}
```

### Asset Form Data
Used for maintenance assets.
```typescript
interface AssetFormData {
  name: string;        // Required
  code: string;        // Required, Alphanumeric
  frequency: number;   // 1-3650 days
  lastCal: Date;       // Valid date
}
```

### Report Form Data
Used for maintenance calibration reports.
```typescript
interface ReportFormData {
  assetName: string;   // Required
  technician: string;  // Required
  date: Date;          // Required
  tare: number;        // -1000 to 1000
  span: number;        // -1000 to 1000
  linearity: number;   // -100 to 100
}
```
