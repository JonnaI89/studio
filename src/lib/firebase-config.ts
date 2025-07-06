// IMPORTANT: Replace with your app's Firebase project configuration.
// Go to your Firebase project, open Project Settings > General, and find your web app's config.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app;
if (!getApps().length) {
    // Check if the config values are placeholders. If so, don't initialize.
    if (firebaseConfig.apiKey.startsWith("YOUR_")) {
        console.warn("Firebase is not configured. Please add your project credentials to src/lib/firebase-config.ts");
        app = null;
    } else {
        app = initializeApp(firebaseConfig);
    }
} else {
    app = getApp();
}

const db = app ? getFirestore(app) : null;

export { app, db };
