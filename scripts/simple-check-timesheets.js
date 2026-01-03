/**
 * Simple Timesheet Checker
 * 
 * Uses your existing Firebase client config to check timesheet data.
 * Run with: node scripts/simple-check-timesheets.js
 */

// Import Firebase client SDK (already configured in your project)
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Your Firebase config (from firebase.js)
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDCEqL3VYPqQvhN8jxJ9Z8KxQvN8jxJ9Z8",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "accurate-industries-database.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "accurate-industries-database",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "accurate-industries-database.appspot.com",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTimesheets() {
    console.log('🔍 Checking timesheet data for week 2026-W01...\n');

    try {
        // Get all users
        console.log('📋 Loading users...');
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = {};

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            usersMap[doc.id] = {
                name: data.name || data.displayName || data.email || 'Unknown',
                email: data.email || 'No email',
                role: data.role || 'No role'
            };
        });

        console.log(`Found ${usersSnapshot.size} users\n`);

        // Get timesheets for week 2026-W01
        console.log('📊 Loading timesheets...');
        const timesheetsQuery = query(
            collection(db, 'timesheets'),
            where('weekKey', '==', '2026-W01')
        );
        const timesheetsSnapshot = await getDocs(timesheetsQuery);

        if (timesheetsSnapshot.empty) {
            console.log('❌ No timesheets found for week 2026-W01');
            return;
        }

        console.log(`Found ${timesheetsSnapshot.size} timesheet entries\n`);

        // Group by userId
        const entriesByUser = {};
        timesheetsSnapshot.forEach(doc => {
            const data = doc.data();
            const userId = data.userId;

            if (!entriesByUser[userId]) {
                entriesByUser[userId] = {
                    entries: [],
                    totalHours: 0
                };
            }
            entriesByUser[userId].entries.push({
                id: doc.id,
                day: data.day,
                activity: data.activity,
                status: data.status
            });
        });

        // Display results
        console.log('═══════════════════════════════════════════════════');
        console.log('TIMESHEET SUMMARY FOR WEEK 2026-W01');
        console.log('═══════════════════════════════════════════════════\n');

        Object.entries(entriesByUser).forEach(([userId, data]) => {
            const user = usersMap[userId];
            const userName = user ? user.name : `Unknown User`;
            const userRole = user ? user.role : 'Unknown';
            const userEmail = user ? user.email : 'Unknown';

            console.log(`👤 ${userName}`);
            console.log(`   Role: ${userRole}`);
            console.log(`   Email: ${userEmail}`);
            console.log(`   User ID: ${userId.substring(0, 20)}...`);
            console.log(`   Entries: ${data.entries.length}`);

            // Show entries
            data.entries.forEach(entry => {
                console.log(`     • ${entry.day}: ${entry.activity} [${entry.status}]`);
            });
            console.log('');
        });

        // Highlight System Admin if found
        console.log('═══════════════════════════════════════════════════');
        console.log('CHECKING FOR SYSTEM ADMIN ENTRIES');
        console.log('═══════════════════════════════════════════════════\n');

        const systemAdminEntry = Object.entries(usersMap).find(([id, data]) =>
            data.email.toLowerCase().includes('admin@') ||
            data.name.toLowerCase().includes('system admin')
        );

        if (systemAdminEntry) {
            const [systemAdminId, systemAdminData] = systemAdminEntry;
            console.log(`Found System Admin:`);
            console.log(`  Name: ${systemAdminData.name}`);
            console.log(`  Email: ${systemAdminData.email}`);
            console.log(`  ID: ${systemAdminId}`);

            if (entriesByUser[systemAdminId]) {
                console.log(`  ⚠️  WARNING: Has ${entriesByUser[systemAdminId].entries.length} timesheet entries!`);
                console.log(`\n  These entries should probably be deleted or reassigned.`);
            } else {
                console.log(`  ✅ No timesheet entries (correct)`);
            }
        } else {
            console.log('No "System Admin" user found in database');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nMake sure you have the correct Firebase credentials in your .env file');
    }

    process.exit(0);
}

// Run the check
checkTimesheets();
