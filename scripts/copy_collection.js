import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";

// ==========================================
// 1. CONFIGURATION
// ==========================================

// COLLECTION to copy
const COLLECTION_NAME = "rollers_cost_history";

// DESTINATION Config (Current Project: accurate-industries-database)
const destConfig = {
    apiKey: "AIzaSyAcXwlK_851kGBtp_khuFh3w3fSuFkGZxA",
    authDomain: "accurate-industries-database.firebaseapp.com",
    projectId: "accurate-industries-database",
    storageBucket: "accurate-industries-database.firebasestorage.app",
    messagingSenderId: "838257999536",
    appId: "1:838257999536:web:7f93b7417ddaada1ee0575",
    measurementId: "G-4JENK2898F"
};

// SOURCE Config (Provided by User: ai-quoting-program)
const sourceConfig = {
    apiKey: "AIzaSyAohuXZNai-udqJj6i_cxRLdkEYGHMo2MU",
    authDomain: "ai-quoting-program.firebaseapp.com",
    projectId: "ai-quoting-program",
    storageBucket: "ai-quoting-program.firebasestorage.app",
    messagingSenderId: "374837707492",
    appId: "1:374837707492:web:387ba1afa752d0c4cee2f1"
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
