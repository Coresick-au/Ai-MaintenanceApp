# ERROR_INDEX.md

**Last updated:** 2025-12-17T08:54+10:00

Common errors encountered in this repository, their root causes, and fixes.

---

## 1. Firebase: Unsupported field value: undefined

### Symptoms
- Error: `FirebaseError: Function updateDoc() called with invalid data. Unsupported field value: undefined`
- Occurs when saving customer rates, quotes, or any Firestore document
- Alert: "Failed to update customer"

### How to Reproduce
1. Load a customer with managed sites where some sites don't have rates set
2. Make any change and click "Save Customer Rates"
3. Error appears in console and alert shows

### Where to Look
- `src/apps/quoting/hooks/useQuote.ts` → `saveCustomer` function (lines 295-357)
- `src/context/GlobalDataContext.jsx` → `updateCustomer` function
- Check if any object spread includes `undefined` values in nested arrays like `managedSites`

### Root Cause (Fixed 2025-12-17)
The `saveCustomer` function was mapping `managedSites` with:
```typescript
rates: site.rates ? { ...DEFAULT_RATES, ...site.rates } : undefined
```
This created `rates: undefined` for sites without rates, which Firestore rejects.

### Fix
Build site objects conditionally without including undefined properties:
```typescript
const siteData: any = { id, name, location, contacts, isLocked };
if (site.rates) {
    siteData.rates = { ...DEFAULT_RATES, ...site.rates };
}
if (site.logo) {
    siteData.logo = site.logo;
}
return siteData;
```

**Files to check:**
- `src/apps/quoting/hooks/useQuote.ts` (main fix location, `saveCustomer` function)
- `src/apps/quoting/components/CustomerDashboard.tsx` (has local `DEFAULT_RATES`)

---

## 2. Module Import Errors in TypeScript Files

### Symptoms
- Error: `Cannot find module '../../../context/GlobalDataContext'`
- TypeScript strict mode errors on JS imports

### How to Reproduce
1. Add a new JS import to a TS file without `@ts-ignore`

### Where to Look
- Any `.ts` or `.tsx` file importing from `.js` or `.jsx` files

### Fix
Add `@ts-ignore` comment before the import:

```typescript
// @ts-ignore
import { useGlobalData } from '../../../context/GlobalDataContext';
```

---

## 3. Firebase Environment Variables Missing Warning

### Symptoms
- Console warning: `⚠️ Firebase environment variables are missing. Using demo config.`
- App still works but uses fallback credentials

### How to Reproduce
1. Delete or don't create `.env` file
2. Run `npm run dev`

### Where to Look
- `src/firebase.js`
- `.env` file (should exist, copied from `.env.example`)

### Fix
1. Copy `.env.example` to `.env`
2. Fill in actual Firebase credentials
3. Restart dev server

---

## 4. Customer Rates Not Saving (Silent Failure)

### Symptoms
- Click "Save Customer Rates" but changes revert on refresh
- No error in console

### How to Reproduce
1. Select a customer with `isLocked: true`
2. Try to modify rates

### Where to Look
- `src/apps/quoting/components/CustomerDashboard.tsx` → `handleSaveRates`
- Check if customer `isLocked` property is true

### Fix
- Unlock the customer first (toggle `isLocked` to false)
- Or check that save button is not disabled

---

## 5. Travel Charge Not Appearing in Summary

### Symptoms
- Toggle "Include Travel Charge" is on but cost shows $0.00
- Travel charge doesn't appear in invoice copy

### How to Reproduce
1. Open a quote
2. Enable travel charge toggle
3. Notice `travelChargeExBrisbane` is $0

### Where to Look
- `src/apps/quoting/hooks/useQuote.ts` → `travelChargeCost` calculation
- Customer's rates → `travelChargeExBrisbane` field

### Fix
Set customer's `travelChargeExBrisbane` rate to a non-zero value in Customer Dashboard rates.

---

## 6. Chart Width/Height Errors

### Symptoms
- Console warning: `The width(-1) and height(-1) of chart should be greater than 0`
- Recharts components not rendering

### How to Reproduce
1. Load a page with charts before container is sized
2. Container has no explicit width/height

### Where to Look
- Any component using `recharts` library
- Parent container CSS

### Fix
Ensure parent containers have explicit dimensions or use `ResponsiveContainer`:

```jsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    ...
  </LineChart>
</ResponsiveContainer>
```

---

## 7. Build Chunk Size Warning

### Symptoms
- Warning during build: `Some chunks are larger than 500 kB after minification`
- Build succeeds but with warnings

### How to Reproduce
1. Run `npm run build`

### Where to Look
- `vite.config.js`
- Large files like `src/App.jsx` (127KB)

### Fix (optional, not blocking)
- Use dynamic imports for large components
- Configure `build.rollupOptions.output.manualChunks` in `vite.config.js`

---

## 8. Offline/Network Errors with Firebase

### Symptoms
- Error: `net::ERR_BLOCKED_BY_CLIENT` or similar network errors
- Operations fail when offline

### How to Reproduce
1. Block network or go offline
2. Try to save data

### Where to Look
- `src/firebase.js` → offline persistence config
- Browser console for network errors

### Fix
The app has offline persistence enabled. Changes will sync when back online. For true offline support:
- Check that `persistentLocalCache` is configured in `src/firebase.js`
- Wait for network to restore

---

## 9. Quote Auto-Save Not Triggering

### Symptoms
- Changes to quote don't persist
- `activeQuoteId` is null

### How to Reproduce
1. Make changes to a quote before it's fully loaded
2. Or work on a quote that wasn't properly loaded

### Where to Look
- `src/apps/quoting/hooks/useQuote.ts` → auto-save `useEffect`
- Check `activeQuoteId` and `isLoaded` state

### Fix
Ensure quote is properly loaded before editing:
```javascript
if (!activeQuoteId || !isLoaded) return;
```

---

## 10. Customer/Site Composite ID Issues

### Symptoms
- Customer updates affect wrong site
- Site-specific rates not saving correctly

### How to Reproduce
1. Select a customer-site combo (composite ID format: `customerId__siteId`)
2. Save rates

### Where to Look
- `src/apps/quoting/hooks/useQuote.ts` → `saveCustomer` function
- Check ID parsing: `customer.id.split('__')`

### Fix
Ensure correct handling of composite IDs:
```javascript
const baseCustomerId = customer.id.includes('__') ? customer.id.split('__')[0] : customer.id;
const siteId = customer.id.includes('__') ? customer.id.split('__')[1] : null;
```
