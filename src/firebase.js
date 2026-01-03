import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration - REQUIRES environment variables
// Create a .env file with your Firebase credentials
const env = import.meta.env;

// Validate required environment variables
const requiredVars = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID'];
const missingVars = requiredVars.filter(v => !env[v]);

if (missingVars.length > 0) {
    console.error("❌ CRITICAL: Missing required Firebase environment variables:");
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error("\nCreate a .env file with your Firebase credentials.");
    throw new Error("Firebase configuration missing. See console for details.");
}

export const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export services
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Enable offline persistence
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;
