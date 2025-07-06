import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATub63xoKR6CrMEq92jqkdebdqoJUa6Rs",
  authDomain: "varnacheck.firebaseapp.com",
  projectId: "varnacheck",
  storageBucket: "varnacheck.appspot.com",
  messagingSenderId: "124095126243",
  appId: "1:124095126243:web:f4e51994a8316b367203d6"
};

// Initialize Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
