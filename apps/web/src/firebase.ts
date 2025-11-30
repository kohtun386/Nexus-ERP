import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

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
const auth = getAuth(app);

// Initialize Firestore with specific settings to fix "Unexpected state" errors
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true,
});

const functions = getFunctions(app, "asia-east1");
const storage = getStorage(app);

export { auth, db, functions, storage };
