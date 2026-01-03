import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";

// ==========================================
// 1. CONFIGURATION - Set these environment variables before running!
// ==========================================
// Required env vars:
//   DEST_FIREBASE_API_KEY, DEST_FIREBASE_PROJECT_ID
//   SOURCE_FIREBASE_API_KEY, SOURCE_FIREBASE_PROJECT_ID
// ==========================================

// COLLECTION to copy
const COLLECTION_NAME = "rollers_cost_history";

// Validate required environment variables
const requiredVars = [
    'DEST_FIREBASE_API_KEY', 'DEST_FIREBASE_PROJECT_ID',
    'SOURCE_FIREBASE_API_KEY', 'SOURCE_FIREBASE_PROJECT_ID'
];
const missingVars = requiredVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nSet these before running this script.');
    process.exit(1);
}

// DESTINATION Config
const destConfig = {
    apiKey: process.env.DEST_FIREBASE_API_KEY,
    authDomain: process.env.DEST_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.DEST_FIREBASE_PROJECT_ID,
    storageBucket: process.env.DEST_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.DEST_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.DEST_FIREBASE_APP_ID,
    measurementId: process.env.DEST_FIREBASE_MEASUREMENT_ID
};

// SOURCE Config
const sourceConfig = {
    apiKey: process.env.SOURCE_FIREBASE_API_KEY,
    authDomain: process.env.SOURCE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.SOURCE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.SOURCE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.SOURCE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.SOURCE_FIREBASE_APP_ID
};

// ==========================================
// 2. INITIALIZATION
// ==========================================

console.log('🚀 Starting Firestore Collection Copy...');

// Initialize Destination App (Default)
const destApp = initializeApp(destConfig);
const destDB = getFirestore(destApp);


async function copyCollection() {
    // Initialize Source App (Secondary)
    const sourceApp = initializeApp(sourceConfig, 'sourceApp');
    const sourceDB = getFirestore(sourceApp);

    console.log(`📋 Copying collection '${COLLECTION_NAME}'...`);
    console.log(`   FROM: ${sourceConfig.projectId}`);
    console.log(`   TO:   ${destConfig.projectId}`);

    try {
        // 1. Read from Source
        console.log('📥 Fetching documents from source...');
        const sourceRef = collection(sourceDB, COLLECTION_NAME);
        const snapshot = await getDocs(sourceRef);

        if (snapshot.empty) {
            console.log('⚠️ Source collection is empty. Nothing to copy.');
            return;
        }

        console.log(`✅ Found ${snapshot.size} documents.`);

        // 2. Write to Destination (in batches)
        console.log('📤 Writing to destination...');
        let batch = writeBatch(destDB);
        let count = 0;
        let totalCopied = 0;
        const BATCH_SIZE = 400; // Limit is 500

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const docRef = doc(destDB, COLLECTION_NAME, docSnap.id);

            batch.set(docRef, data);
            count++;
            totalCopied++;

            if (count >= BATCH_SIZE) {
                await batch.commit();
                console.log(`   ...committed ${totalCopied} documents`);
                batch = writeBatch(destDB); // Reset batch
                count = 0;
            }
        }

        // Commit remaining
        if (count > 0) {
            await batch.commit();
        }

        console.log(`🎉 Successfully copied ${totalCopied} documents to '${COLLECTION_NAME}' in ${destConfig.projectId}!`);

    } catch (error) {
        console.error('❌ Error copying collection:', error);
        console.error('Stack trace:', error.stack);
    }
}

copyCollection();
