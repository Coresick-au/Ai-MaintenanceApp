import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// Keys are loaded from environment variables (.env file)
// Keys are loaded from environment variables (.env file)
const env = import.meta.env;

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "demo-api-key",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-ABCDEF123"
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
