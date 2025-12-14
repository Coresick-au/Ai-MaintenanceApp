import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// Keys are loaded from environment variables (.env file)
const env = import.meta.env;

// NOTE: Hardcoded values below are DEMO/FALLBACK credentials only.
// For production, always use environment variables via .env file.
// These fallbacks allow the app to run for testing without .env setup.
export const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAcXwlK_851kGBtp_khuFh3w3fSuFkGZxA",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "accurate-industries-database.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "accurate-industries-database",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "accurate-industries-database.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "838257999536",
    appId: env.VITE_FIREBASE_APP_ID || "1:838257999536:web:7f93b7417ddaada1ee0575",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-4JENK2898F"
};

if (!env.VITE_FIREBASE_PROJECT_ID) {
    console.warn("⚠️ Firebase environment variables are missing. Using demo config.");
}

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
