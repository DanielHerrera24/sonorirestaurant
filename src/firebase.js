import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDvWpEn0PP2uRkdo66myVBUPBxGSzTD_4w",
  authDomain: "sonori-sushi.firebaseapp.com",
  projectId: "sonori-sushi",
  storageBucket: "sonori-sushi.firebasestorage.app",
  messagingSenderId: "1086943530845",
  appId: "1:1086943530845:web:8db6ead131c7e3d26ca2b4",
  measurementId: "G-KH123SDMSP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// eslint-disable-next-line no-unused-vars
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
