# Debugging: Cannot Add Assets

## Quick Checklist

### 1. **Refresh Your Browser** ⚡
The code was just updated with the `activeTab` fix. You need to refresh to load the new code:
- Press **Ctrl + R** or **F5**
- Or do a hard refresh: **Ctrl + Shift + R**

### 2. **Check Browser Console** 🔍
1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Look for any error messages (red text)
4. Try adding an asset again and watch for errors

### 3. **Required Fields** ✏️
The `handleAddAsset` function requires BOTH fields to be filled in:
- ✅ **Asset Name** (required)
- ✅ **Code** (required)

If either is missing, the asset won't be added (but no error will show).

### 4. **Selected Site** 🏢
Make sure you have a site selected. The function checks:
```javascript
if (!selectedSite || !newAsset.name || !newAsset.code) return;
```

---

## Step-by-Step Test

1. **Open Browser DevTools** (F12)
2. **Navigate to Console tab**
3. **Click "+ Add Asset"**
4. **Fill in the form:**
   - Name: `Test Conveyor`
   - Code: `CONV-001`
   - Weigher: `Weigher 1` (optional)
   - Frequency: Leave blank for default (3 months for service, 12 for roller)
   - Last Cal: Pick any date
5. **Click "Save Asset"**
6. **Watch the console for:**
   - `[SiteContext] Updated site {id} via GlobalDataContext` (success)
   - Any error messages (failure)

---

## Common Issues

### Issue 1: Modal Opens But Nothing Happens
**Symptom:** Click "Save Asset" but nothing happens
**Cause:** Missing required fields OR selectedSite is null
**Solution:** 
- Ensure Name and Code are filled in
- Check console for `Cannot update site: no customer ID found`
- Make sure you selected a site from the sidebar

### Issue 2: "Cannot update site: no customer ID found"
**Symptom:** Console error about missing customer ID
**Cause:** Site doesn't have a `customerId` property
**Solution:**
1. Check the site data in console: `console.log(selectedSite)`
2. Look for `customerId` property
3. If missing, the site needs to be migrated/fixed

### Issue 3: Changes Don't Persist
**Symptom:** Asset appears then disappears
**Cause:** Firebase update failed
**Solution:** 
- Check Network tab for failed Firebase requests
- Check Firestore rules
- Look for error in console

---

## Debug Code to Paste in Browser Console

Paste this in the browser console (F12 → Console) to check the current state:

```javascript
// Check selected site
console.log('Selected Site:', window.siteContext?.selectedSite);

// Check if site has customer ID
console.log('Customer ID:', window.siteContext?.selectedSite?.customerId);

// Check current service data
console.log('Service Data:', window.siteContext?.currentServiceData);

// Check current roller data  
console.log('Roller Data:', window.siteContext?.currentRollerData);

// Check active tab
console.log('Active Tab:', window.filterContext?.activeTab);
```

---

## Enhanced Logging

If you need more detailed logging, I can add console.log statements to the `handleAddAsset` function to see exactly where it's failing.

Would you like me to:
1. Add detailed logging to `handleAddAsset`?
2. Add user-facing error messages when validation fails?
3. Check if the site has a valid `customerId`?
