# Fix: Adding Assets to Service Schedule Not Working

## Problem
The "Add Asset" button on the Service Schedule was not working correctly. Users could not add new assets to the customer service schedule.

## Root Cause
The `AddAssetModal` component requires an `activeTab` prop to:
1. Determine which schedule to add the asset to (service or roller)
2. Set the appropriate default frequency (3 months for service, 12 months for roller)
3. Generate the correct ID prefix (`s-` for service, `r-` for roller)

**The `activeTab` prop was missing** from the `AddAssetModal` component in `App.jsx` (line 2092).

## What Was Fixed

### File: `src/App.jsx`
**Line 2090:** Added missing `activeTab={activeTab}` prop to the `AddAssetModal` component.

**Before:**
```javascript
<AddAssetModal
  isOpen={isAssetModalOpen}
  onClose={() => setIsAssetModalOpen(false)}
  onSave={(asset, tab) => {
    handleAddAsset(asset, tab);
    setIsAssetModalOpen(false);
    setNewAsset({ name: '', code: '', weigher: '', frequency: '', lastCal: '' });
  }}
  newAsset={newAsset}
  setNewAsset={setNewAsset}
  isRollerOnlyMode={isRollerOnlyMode}  // ❌ Missing activeTab prop
/>
```

**After:**
```javascript
<AddAssetModal
  isOpen={isAssetModalOpen}
  onClose={() => setIsAssetModalOpen(false)}
  onSave={(asset, tab) => {
    handleAddAsset(asset, tab);
    setIsAssetModalOpen(false);
    setNewAsset({ name: '', code: '', weigher: '', frequency: '', lastCal: '' });
  }}
  newAsset={newAsset}
  setNewAsset={setNewAsset}
  activeTab={activeTab}  // ✅ Fixed: Added activeTab prop
  isRollerOnlyMode={isRollerOnlyMode}
/>
```

## How activeTab Is Used

The `activeTab` value comes from `FilterContext` (defined in `src/context/FilterContext.jsx`, line 11) and is consumed by `App.jsx` through the `useFilterContext()` hook (line 214).

The `AddAssetModal` component uses `activeTab` to:
- Show the correct default frequency placeholder text:
  - Service tab: "Default: 3" (months)
  - Roller tab: "Default: 12" (months)
- Pass the correct tab value to the `handleAddAsset` function
- Create assets with the appropriate schedule type

## Testing

To verify the fix:
1. Navigate to a customer site in the dev server
2. Ensure you're on the "Service Schedule" tab
3. Click the "+ Add Asset" button
4. Fill in the asset details
5. Click "Save Asset"
6. The asset should now be added to both the service and roller schedules correctly

## Related Code Flow

```
User clicks "Add Asset" button
  ↓
AddAssetModal opens with activeTab="service"
  ↓
User fills in asset details and clicks "Save Asset"
  ↓
onSave handler calls: handleAddAsset(asset, activeTab)
  ↓
SiteContext.handleAddAsset creates two items:
  - serviceItem with id: "s-{baseId}"
  - rollerItem with id: "r-{baseId}"
  ↓
updateSiteData updates both serviceData and rollerData arrays
  ↓
GlobalDataContext.updateManagedSite persists to Firestore
```

---

**Status:** ✅ Fixed
**Date:** 2026-01-06
**Affected Component:** AddAssetModal
**Severity:** High (blocking feature)
