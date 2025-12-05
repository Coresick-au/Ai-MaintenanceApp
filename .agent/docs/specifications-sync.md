# System Specifications Data Synchronization

## Overview
This document ensures that system specifications data remains synchronized between the Edit Asset & Specifications modal and the Equipment Details panel.

## Critical Data Mapping

### Specification Property Names
The following property names MUST be used consistently across all components:

#### Scale Details Section
- `scaleType` - Type of scale (e.g., "Schenck VEG20600")
- `integratorController` - Integrator/Controller model (e.g., "Siemens S7-1200")
- `speedSensorType` - Speed sensor type (e.g., "Proximity Sensor 24VDC")
- `loadCellBrand` - Load cell manufacturer (e.g., "Vishay Nobel")
- `loadCellSize` - Load cell capacity (e.g., "50 kg")
- `loadCellSensitivity` - Load cell sensitivity (e.g., "2.0 mV/V")
- `numberOfLoadCells` - Number of load cells (numeric)

#### Roller Details Section
- `rollDims` - Roller dimensions (e.g., "100mm x 50mm")
- `adjustmentType` - Adjustment mechanism type (e.g., "Manual Screw")

#### Billet Details Section
- `billetWeightType` - Type of billet (e.g., "Steel Round")
- `billetWeightSize` - Weight/size of billet (e.g., "500 kg")
- `billetWeightIds` - Array of Billet Weight IDs (e.g., `["BW-101", "BW-102"]`)

### UI Emoji Mapping
- **Scale Details**: 📦 (package emoji)
- **Billet Details**: ⚖️ (scales emoji)
- **Roller Details**: 🔧 (wrench emoji)

## Files That Must Stay Synchronized

### 1. AssetModals.jsx
**Location**: `src/components/AssetModals.jsx`

**EditAssetModal Component**:
- Lines 148-165: Specification initialization structure
- Lines 183-246: Scale Details section inputs
- Lines 248-272: Roller Details section inputs
- Lines 274-297: Billet Details section inputs

**Critical**: All input fields must use the exact property names listed above.

### 2. App.jsx
**Location**: `src/App.jsx`

**Equipment Details Panel** (specsPanelContent):
- Lines 446-454: System Info display (Scale Details)
- Lines 456-478: Roller Details display
- Lines 480-493: Billet Details display

**Critical**: All display fields must reference the exact property names from specs data.

### 3. mockData.js
**Location**: `src/data/mockData.js`

**Sample Data Generation**:
- Lines 166-190: generateSampleSite() spec data structure
- Lines 339-365: Default site spec data structure

**Critical**: Generated mock data must use the exact property names.

### 4. SiteContext.jsx
**Location**: `src/context/SiteContext.jsx`

**Specification Management**:
- Lines 367-376: handleSaveEditedSpecs() function
- Lines 434-439: handleAddSpecNote() function
- Lines 441-445: handleDeleteSpecNote() function
- Lines 447-457: saveEditedNote() function

**Critical**: All spec operations must preserve the property structure.

## Validation Checklist

Before making ANY changes to system specifications:

- [ ] Verify property names match the Critical Data Mapping section
- [ ] Check that AssetModals.jsx input fields use correct property names
- [ ] Verify App.jsx display fields reference correct property names
- [ ] Ensure mockData.js generates data with correct property names
- [ ] Test that editing specs in the modal updates the equipment details panel
- [ ] Confirm emojis are correct: 📦 for Scale, ⚖️ for Billet, 🔧 for Roller
- [ ] Verify new specifications created through the modal have all required fields

## Common Mistakes to Avoid

1. **DO NOT** use these deprecated property names:
   - ❌ `scale` (use `scaleType`)
   - ❌ `integrator` (use `integratorController`)
   - ❌ `speedSensor` (use `speedSensorType`)
   - ❌ `loadCell` (use `loadCellBrand` + `loadCellSize`)
   - ❌ `billetType` (use `billetWeightType`)
   - ❌ `billetWeight` (use `billetWeightSize`)

2. **DO NOT** change emoji assignments without updating this document

3. **DO NOT** add new specification fields without:
   - Adding them to the initialization structure in AssetModals.jsx
   - Adding display logic in App.jsx
   - Updating mock data generators in mockData.js
   - Updating this documentation

## Testing Procedure

After ANY specification-related changes:

1. Open the application
2. Select a site with existing assets
3. Click on an asset to view its equipment details
4. Click "Edit Asset & Specifications"
5. Verify all fields in the modal match the equipment details panel
6. Modify several specification fields
7. Click "Save All Changes"
8. Verify the equipment details panel immediately reflects the changes
9. Create a new specification from scratch
10. Verify all fields save and display correctly

## Emergency Rollback

If specifications become desynchronized:

1. Check git history for this file: `.agent/docs/specifications-sync.md`
2. Review the property mapping in the "Critical Data Mapping" section
3. Compare current code against the file locations listed above
4. Restore correct property names in all affected files
5. Clear browser cache and localStorage
6. Test with a fresh demo site

## Last Updated
- **Date**: 2025-12-05
- **By**: AI Assistant
- **Reason**: Initial creation to ensure data synchronization between edit modal and equipment details panel
