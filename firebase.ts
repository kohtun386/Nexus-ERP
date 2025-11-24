import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions'; // Functions ကို import လုပ်ပါ။

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

// Firebase App ကို Initialize လုပ်ခြင်း
const app = initializeApp(firebaseConfig);

// Firebase Services များကို Export လုပ်ခြင်း
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-east1'); // Functions region ကို သေချာထည့်ပါ။
