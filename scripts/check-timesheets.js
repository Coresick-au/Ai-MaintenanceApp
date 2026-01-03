/**
 * Firebase Timesheet Data Inspector
 * 
 * This script checks timesheet entries and identifies which users they belong to.
 * Run with: node scripts/check-timesheets.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses your service account)
// Make sure you have GOOGLE_APPLICATION_CREDENTIALS set or use serviceAccount.json
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    console.log('\nTo fix this, either:');
    console.log('1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account JSON file');
    console.log('2. Or download service account key from Firebase Console > Project Settings > Service Accounts');
    process.exit(1);
}

const db = admin.firestore();

async function checkTimesheets() {
    console.log('🔍 Checking timesheet data...\n');

    try {
        // Get all users first
        const usersSnapshot = await db.collection('users').get();
        const usersMap = {};

        console.log('📋 Users in database:');
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            usersMap[doc.id] = {
                name: data.name || data.displayName || data.email || 'Unknown',
                email: data.email || 'No email',
                role: data.role || 'No role'
            };
            console.log(`  - ${doc.id.substring(0, 8)}... : ${usersMap[doc.id].name} (${usersMap[doc.id].role})`);
        });

        console.log('\n📊 Checking timesheets for week 2026-W01...\n');

        // Get timesheets for week 2026-W01
        const timesheetsSnapshot = await db.collection('timesheets')
            .where('weekKey', '==', '2026-W01')
            .get();

        if (timesheetsSnapshot.empty) {
            console.log('❌ No timesheets found for week 2026-W01');
            return;
        }

        // Group by userId
        const entriesByUser = {};
        timesheetsSnapshot.forEach(doc => {
            const data = doc.data();
            const userId = data.userId;

            if (!entriesByUser[userId]) {
                entriesByUser[userId] = [];
            }
            entriesByUser[userId].push({
                id: doc.id,
                day: data.day,
                activity: data.activity,
                jobNo: data.jobNo,
                status: data.status
            });
        });

        // Display results
        console.log('Found timesheets for the following users:\n');

        Object.entries(entriesByUser).forEach(([userId, entries]) => {
            const user = usersMap[userId];
            const userName = user ? user.name : `Unknown User (${userId.substring(0, 8)}...)`;
            const userRole = user ? user.role : 'Unknown';

            console.log(`👤 ${userName} (${userRole})`);
            console.log(`   User ID: ${userId}`);
            console.log(`   Entries: ${entries.length}`);

            // Show first few entries
            entries.slice(0, 3).forEach(entry => {
                console.log(`     - ${entry.day}: ${entry.activity} ${entry.jobNo ? `(Job ${entry.jobNo})` : ''} [${entry.status}]`);
            });

            if (entries.length > 3) {
                console.log(`     ... and ${entries.length - 3} more`);
            }
            console.log('');
        });

        // Check for "System Admin" specifically
        console.log('\n🔎 Checking for "System Admin" timesheets...\n');

        const systemAdminUser = Object.entries(usersMap).find(([id, data]) =>
            data.name.toLowerCase().includes('system admin') ||
            data.email.toLowerCase().includes('admin@')
        );

        if (systemAdminUser) {
            const [systemAdminId, systemAdminData] = systemAdminUser;
            console.log(`Found System Admin user:`);
            console.log(`  ID: ${systemAdminId}`);
            console.log(`  Name: ${systemAdminData.name}`);
            console.log(`  Email: ${systemAdminData.email}`);

            if (entriesByUser[systemAdminId]) {
                console.log(`  ⚠️  HAS ${entriesByUser[systemAdminId].length} TIMESHEET ENTRIES!`);
                console.log(`\nTo delete these entries, run:`);
                console.log(`  node scripts/check-timesheets.js --delete-user ${systemAdminId}`);
            } else {
                console.log(`  ✅ No timesheet entries (correct)`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the check
checkTimesheets()
    .then(() => {
        console.log('\n✅ Check complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
