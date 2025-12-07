# Backup & Restore Guide

## Quick Reference

| Action | Method | Frequency |
|--------|--------|-----------|
| **Automatic Backup** | Firebase (built-in) | Daily |
| **Manual Export** | Firebase Console | Monthly (recommended) |
| **Local Cache** | Browser localStorage | Automatic |

---

## Export Data (Backup)

### Method 1: Firebase Console (Recommended)

1. **Go to Firebase Console**
   - URL: https://console.firebase.google.com/project/accurate-industries-database
   - Navigate to: Firestore Database

2. **Export Collections**
   - Click "Import/Export" tab
   - Select "Export"
   - Choose collections: `sites`, `employees`
   - Export to Cloud Storage bucket
   - Download from bucket to your computer

3. **Save the File**
   - Name format: `backup-YYYY-MM-DD.json`
   - Store in safe location (OneDrive, external drive)

### Method 2: Browser Console (Quick Export)

1. **Open Your App**
   - Go to: https://accurate-industries-database.web.app

2. **Open Developer Console**
   - Press `F12` or right-click → Inspect
   - Go to "Console" tab

3. **Run Export Script**
   ```javascript
   // Export sites
   const sitesSnapshot = await getDocs(collection(db, "sites"));
   const sitesData = sitesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
   console.log(JSON.stringify(sitesData, null, 2));
   
   // Export employees
   const empSnapshot = await getDocs(collection(db, "employees"));
   const empData = empSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
   console.log(JSON.stringify(empData, null, 2));
   ```

4. **Copy and Save**
   - Right-click the output → Copy
   - Paste into a text editor
   - Save as `.json` file

---

## Restore Data (Import)

### Method 1: Firebase Console Import

1. **Prepare JSON File**
   - Ensure proper format (array of objects with `id` field)

2. **Upload to Firebase**
   - Firebase Console → Firestore → Import/Export
   - Click "Import"
   - Upload your JSON file
   - Select target collection
   - Confirm import

### Method 2: Programmatic Restore

**Contact developer for assistance with:**
- Bulk import from JSON
- Merging with existing data
- Data transformation/migration

---

## Download PDFs (Reports)

### All Reports

1. **Firebase Console → Storage**
   - Navigate to: `reports/` folder
   - Browse by asset ID
   - Download individual PDFs

2. **Bulk Download**
   - Use Firebase CLI:
   ```bash
   firebase storage:download reports/ ./local-backup/
   ```

---

## Disaster Recovery

### Scenario 1: Accidental Deletion

**Within 7 Days:**
1. Firebase Console → Firestore → Backups
2. Select automatic backup from before deletion
3. Restore specific collection or entire database

**After 7 Days:**
1. Use your manual JSON export
2. Import via Firebase Console
3. Or contact developer for assistance

### Scenario 2: Data Corruption

1. **Identify Good Backup**
   - Check manual exports
   - Or use Firebase automatic backup (last 7 days)

2. **Restore**
   - Clear corrupted collection
   - Import from backup

### Scenario 3: Complete Data Loss

1. **Restore from Manual Export**
   - Import sites collection
   - Import employees collection

2. **Restore PDFs**
   - Re-upload to Firebase Storage
   - Or regenerate reports if data is intact

---

## Best Practices

### Regular Backups
- ✅ **Weekly**: Quick browser console export
- ✅ **Monthly**: Full Firebase Console export
- ✅ **Before Major Changes**: Export before bulk edits

### Storage
- 📁 Keep 3 copies: Local, Cloud (OneDrive), External Drive
- 📅 Name with dates: `backup-2024-12-07.json`
- 🗂️ Organize by month/year

### Testing Restores
- Test restore process quarterly
- Verify data integrity after import
- Document any issues for improvement

---

## Migration from Old Database

### If You Have Old SQLite Data

**Location:**
```
C:\Users\[YourName]\AppData\Roaming\maintenance-app\maintenance.db
```

**Export to JSON:**
1. Open old Electron app (if still installed)
2. Use "Download Data" feature
3. Save JSON file

**Import to Firebase:**
1. Contact developer for migration script
2. Or manually import via Firebase Console

---

## Support

**Need Help?**
- Check Firebase Console for data status
- Review browser console for errors
- Contact developer for complex restores
- Firebase Support: https://firebase.google.com/support
