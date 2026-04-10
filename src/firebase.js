import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

let _auth = null;
export const getFirebaseAuth = async () => {
  if (!_auth) {
    const { getAuth, setPersistence, browserSessionPersistence } =
      await import("firebase/auth");
    _auth = getAuth(app);
    await setPersistence(_auth, browserSessionPersistence);
  }
  return _auth;
};

let _storage = null;
export const getFirebaseStorage = async () => {
  if (!_storage) {
    const { getStorage } = await import("firebase/storage");
    _storage = getStorage(app);
  }
  return _storage;
};

let _db = null;
export const getFirebaseDb = async () => {
  if (!_db) {
    const { getFirestore } = await import("firebase/firestore");
    _db = getFirestore(app);
  }
  return _db;
};

export default app;