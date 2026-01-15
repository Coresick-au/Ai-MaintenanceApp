# Asset Update Investigation Report
**Date:** 2026-01-06  
**Firebase App URL:** https://accurate-industries-database.web.app/

## Summary
Assets are stored within **customer managed sites** in Firestore. Updates to assets can be investigated and debugged through the codebase. Here's what you need to know:

---

## Architecture Overview

### Data Structure
```
Firestore Collection: customers
└── Document: {customerId}
    └── Field: managedSites (array)
        └── Object: {site}
            ├── serviceData (array of service assets)
            ├── rollerData (array of roller assets)
            └── Other site properties
```

### Key Points
1. **Assets are embedded** inside site objects
2. **Sites are embedded** inside customer documents (within `managedSites` array)
3. **Updates cascade**: Asset → Site → Customer document

---

## How Asset Updates Work

### Update Flow
```
1. User edits asset in UI
   ↓
2. SiteContext.handleInlineUpdate() or handleSaveEditedAsset()
   ↓
3. Calls updateSiteData(siteId, updates)
   ↓
4. Calls GlobalDataContext.updateManagedSite(customerId, siteId, updates)
   ↓
5. Calls CustomerRepository.updateManagedSite(customerId, siteId, updates)
   ↓
6. Fetches customer document
7. Updates the managedSites array (finds site by ID)
8. Writes entire managedSites array back to Firestore
```

### Code Locations

**SiteContext.jsx (Lines 113-133):**
```javascript
const updateSiteData = async (siteId, updates, description = 'Update Site Data') => {
    const site = sites.find(s => s.id === siteId);
    if (!site || !site.customerId) {
        console.error(`Cannot update site ${siteId}: no customer ID found`);
        return;
    }

    // Optimistic UI update
    setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...updates } : s));

    try {
        // Update through GlobalDataContext's updateManagedSite
        await updateManagedSite(site.customerId, siteId, updates);
        console.log(`[SiteContext] Updated site ${siteId} via GlobalDataContext`);
    } catch (e) {
        console.error(`Error updating site ${siteId}:`, e);
        // Revert optimistic update on error
        setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...Object.fromEntries(Object.keys(updates).map(k => [k, s[k]])) } : s));
    }
};
```

**CustomerRepository.js (Lines 192-209):**
```javascript
async updateManagedSite(customerId, siteId, updatedData) {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('Customer not found');

    const updatedSites = (customer.managedSites || []).map(site =>
        site.id === siteId ? { ...site, ...updatedData } : site
    );

    await this.update(customerId, { managedSites: updatedSites });
    return updatedSites.find(s => s.id === siteId);
}
```

---

## Firestore Security Rules

**Current Rules (firestore.rules):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default: Allow all for now
    match /{document=**} {
      allow read, write: if true;  // ⚠️ WIDE OPEN
    }
    
    // Specific rules for timesheets
    match /timesheets/{timesheetId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());
    }
  }
}
```

### Security Status
✅ **GOOD NEWS:** Your Firestore rules allow all read/write operations, so permissions are **NOT blocking asset updates**.

⚠️ **WARNING:** This is insecure for production! Anyone can read/write any data.

---

## Common Issues & Debugging Steps

### Issue 1: Assets Not Updating

**Possible Causes:**
1. **Missing customerId** - Site doesn't have a `customerId` property
2. **Network errors** - Check browser console for Firebase errors
3. **Data validation** - Check if the update payload is valid
4. **Optimistic update reversion** - Update fails silently and reverts

**How to Debug:**
1. Open browser DevTools Console (F12)
2. Look for error messages with prefix `[SiteContext]` or `[GlobalDataContext]`
3. Check for Firebase/Firestore errors
4. Verify the site has a `customerId`:
   ```javascript
   // In browser console
   console.log(selectedSite.customerId);
   ```

### Issue 2: Updates Not Persisting

**Possible Causes:**
1. **Offline mode** - Firebase is in offline mode
2. **Write conflicts** - Multiple users editing same asset
3. **Array mutation issues** - JavaScript not detecting changes

**How to Debug:**
```javascript
// In SiteContext.jsx, add more logging to updateSiteData:
console.log('Updating site:', siteId);
console.log('Customer ID:', site.customerId);
console.log('Updates:', updates);
console.log('Site found:', !!site);
```

### Issue 3: Slow Updates

**Possible Causes:**
1. **Document size** - Customer document with many sites is large
2. **Network latency** - Slow connection to Firebase
3. **Array operations** - Updating entire `managedSites` array is inefficient

**How to Debug:**
```javascript
// Time the update
const start = performance.now();
await updateManagedSite(customerId, siteId, updates);
console.log(`Update took ${performance.now() - start}ms`);
```

---

## Testing Asset Updates Locally

### Step 1: Run Dev Server
```bash
npm run dev
```
Open http://localhost:5173

### Step 2: Open Browser Console
Press `F12` → Console tab

### Step 3: Make an Update
1. Navigate to a site
2. Edit an asset (e.g., change Last Cal date)
3. Watch console for logs:
   - `[SiteContext] Updated site {id} via GlobalDataContext`
   - `[GlobalDataContext] Managed site updated: {id}`

### Step 4: Verify in Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore Database
4. Find `customers/{customerId}/managedSites` array
5. Verify the changes persisted

---

## Recommended Improvements

### 1. Add Better Error Handling
```javascript
const updateSiteData = async (siteId, updates, description = 'Update Site Data') => {
    const site = sites.find(s => s.id === siteId);
    if (!site || !site.customerId) {
        const errorMsg = `Cannot update site ${siteId}: ${!site ? 'site not found' : 'no customer ID'}`;
        console.error(errorMsg);
        alert(errorMsg); // Show user-facing error
        return;
    }

    try {
        await updateManagedSite(site.customerId, siteId, updates);
        console.log(`[SiteContext] ✅ Successfully updated site ${siteId}`);
    } catch (e) {
        console.error(`[SiteContext] ❌ Error updating site ${siteId}:`, e);
        alert(`Failed to update ${description}: ${e.message}`); // User feedback
        // Revert optimistic update
        setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...oldData } : s));
    }
};
```

### 2. Add Update Validation
```javascript
// Before updating, validate the data
if (updates.serviceData) {
    const isValid = updates.serviceData.every(asset => asset.id && asset.name);
    if (!isValid) {
        throw new Error('Invalid asset data: missing required fields');
    }
}
```

### 3. Add Loading States
```javascript
const [isUpdating, setIsUpdating] = useState(false);

const updateSiteData = async (siteId, updates) => {
    setIsUpdating(true);
    try {
        await updateManagedSite(site.customerId, siteId, updates);
    } finally {
        setIsUpdating(false);
    }
};
```

---

## Answer to Your Question

### "Can I investigate issues with updating assets through the code, or does it need to be done through Firebase?"

**Answer:** ✅ **YES, you can investigate and debug through the code!**

**Here's how:**

1. **Code-based debugging (RECOMMENDED):**
   - Add `console.log()` statements in `SiteContext.jsx` and `CustomerRepository.js`
   - Use browser DevTools to monitor network requests
   - Check the React DevTools to inspect state changes
   - Run the app locally (`npm run dev`) for live debugging

2. **Firebase Console (for verification):**
   - Use to verify final state of data
   - Check if updates actually persisted
   - Review Security Rules
   - Monitor real-time database activity

3. **Combined approach (BEST):**
   - Debug code logic first
   - Verify in Firebase Console
   - Use Firebase Debug SDK for detailed logs

---

## Quick Checklist

When investigating asset update issues:

- [ ] Check browser console for errors (`[SiteContext]` or Firebase errors)
- [ ] Verify site has `customerId` property
- [ ] Confirm user is authenticated (if you add auth later)
- [ ] Check network tab for failed Firebase requests
- [ ] Verify Firestore rules allow the operation (currently: yes)
- [ ] Test with a simple asset update (e.g., change one field)
- [ ] Check if optimistic update is reverting (UI changes then reverts)
- [ ] Verify the update payload structure is correct
- [ ] Check Firebase Console to see if data actually changed

---

## Next Steps

1. **Reproduce the issue** in your local dev environment
2. **Add detailed logging** to the update chain
3. **Monitor browser console** during the update
4. **Check Firebase Console** to verify persistence
5. **Report findings** - Share console logs or error messages for further investigation

---

## Contact Points in Code

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `handleInlineUpdate` | SiteContext.jsx | 440 | Updates single asset field |
| `handleSaveEditedAsset` | SiteContext.jsx | 399 | Saves full asset edits |
| `updateSiteData` | SiteContext.jsx | 113 | Generic site update |
| `updateManagedSite` | GlobalDataContext.jsx | 239 | Routes to repository |
| `updateManagedSite` | CustomerRepository.js | 192 | Firestore write operation |

---

## Summary

Your asset updates go through the **codebase**, not directly to Firebase. All debugging can be done in the code with proper logging and error handling. Firebase Console is only needed for verification and security rules management.
