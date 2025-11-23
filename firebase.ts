
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your specific configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-XK6zHrVLLUNG1kscvobNBeG7GTFjdnw",
  authDomain: "gen-lang-client-0244893402.firebaseapp.com",
  projectId: "gen-lang-client-0244893402",
  storageBucket: "gen-lang-client-0244893402.firebasestorage.app",
  messagingSenderId: "441333911932",
  appId: "1:441333911932:web:94c58403747dd235fc14f9",
  measurementId: "G-H5XF8SZHY7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
