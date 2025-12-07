import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAcXwlK_851kGBtp_khuFh3w3fSuFkGZxA",
    authDomain: "accurate-industries-database.firebaseapp.com",
    projectId: "accurate-industries-database",
    storageBucket: "accurate-industries-database.firebasestorage.app",
    messagingSenderId: "838257999536",
    appId: "1:838257999536:web:7f93b7417ddaada1ee0575",
    measurementId: "G-4JENK2898F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;
