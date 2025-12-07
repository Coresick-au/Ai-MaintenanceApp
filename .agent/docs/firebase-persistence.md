# Firebase Data Persistence Guide

## Overview

Your application now uses **Firebase Firestore** for cloud-based data storage with real-time synchronization across all devices.

---

## How It Works

### Real-Time Sync
- **Automatic Updates**: Changes made on any device instantly appear on all other devices
- **No Manual Save**: Data saves automatically when you make changes
- **Offline Support**: View and edit data offline; changes sync when reconnected

### Data Structure

```
Firebase Firestore
├── sites/
│   ├── site-123456789/
│   │   ├── name: "Example Mine"
│   │   ├── customer: "ABC Mining"
│   │   ├── serviceData: [...]
│   │   ├── rollerData: [...]
│   │   └── issues: [...]
│   └── site-987654321/
│       └── ...
└── employees/
    ├── emp-123456789/
    │   ├── name: "John Smith"
    │   ├── certifications: [...]
    │   └── inductions: [...]
    └── ...
```

### Storage Locations
- **Database**: Firestore (sites, employees, assets, reports metadata)
- **Files**: Firebase Storage (PDF reports)
- **Local Cache**: Browser localStorage (offline fallback)

---

## Backup & Restore

### Automatic Backups
Firebase automatically backs up your data:
- **Daily snapshots** (retained for 7 days on free plan)
- **Point-in-time recovery** available
- Access via Firebase Console → Firestore → Backups

### Manual Export (JSON)

**Export All Data:**
1. Open Firebase Console
2. Go to Firestore Database
3. Click "Import/Export" → "Export"
4. Select collections: `sites`, `employees`
5. Download to Cloud Storage bucket
6. Download from bucket to your computer

**Or use the app's built-in export:**
```javascript
// In browser console on your app:
const sites = await getDocs(collection(db, "sites"));
const data = sites.docs.map(doc => doc.data());
console.log(JSON.stringify(data, null, 2));
// Copy and save to a .json file
```

### Restore from Backup

**Option 1: Firebase Console Import**
1. Go to Firestore → Import/Export
2. Upload your JSON export
3. Select target collections
4. Import

**Option 2: Programmatic Restore**
```javascript
// Contact developer to restore from JSON file
// Requires running a script to upload each document
```

---

## Data Security

### Firebase Security Rules
Your data is protected by Firebase Security Rules (configured in Firebase Console):

```javascript
// Example rules (configure in Firebase Console)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sites - authenticated users only
    match /sites/{siteId} {
      allow read, write: if request.auth != null;
    }
    
    // Employees - authenticated users only
    match /employees/{empId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Current Setup**: Public read/write (development mode)
**Recommended**: Add Firebase Authentication and restrict access

### Best Practices
1. **Enable Authentication**: Add user login to restrict access
2. **Set Security Rules**: Limit who can read/write data
3. **Regular Exports**: Download backups monthly
4. **Monitor Usage**: Check Firebase Console for unusual activity

---

## Troubleshooting

### Data Not Syncing
1. Check internet connection
2. Open browser console (F12) for errors
3. Verify Firebase project is active in Console
4. Check if you hit quota limits (free plan: 50K reads/day)

### Lost Data Recovery
1. Check Firebase Console → Firestore for data
2. Restore from automatic backup (last 7 days)
3. Use manual JSON export if available

### Migration from Old SQLite Database
Your old local database files are still in:
```
C:\Users\[YourName]\AppData\Roaming\maintenance-app\
```

To migrate:
1. Export old data to JSON (if needed)
2. Import to Firebase via Console or script
3. Contact developer for migration assistance

---

## Firebase Console Access

**URL**: https://console.firebase.google.com/project/accurate-industries-database

**What You Can Do:**
- View all data in Firestore
- Download backups
- Monitor usage and costs
- Configure security rules
- Manage users (when auth is enabled)
- View uploaded PDFs in Storage

---

## Cost & Limits (Free Spark Plan)

**Firestore:**
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage

**Storage:**
- 5 GB total
- 1 GB downloads/day

**Typical Usage:**
- 10 users × 100 actions/day = ~1,000 operations/day
- Well within free limits ✅

**If You Exceed:**
- Upgrade to Blaze plan (pay-as-you-go)
- ~$0.06 per 100K reads
- Very affordable for small teams
