import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  // Avoid initializing on the server during build/prerender
  if (typeof window === "undefined") {
    throw new Error("Firebase client initialized on the server. Call only in the browser.");
  }
  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  };
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApps()[0]!;
  }
  return app!;
}

export const auth: Auth = typeof window !== "undefined" ? getAuth(getFirebaseApp()) : ({} as Auth);
export const googleProvider = typeof window !== "undefined" ? new GoogleAuthProvider() : (null as unknown as GoogleAuthProvider);
export const db: Firestore = typeof window !== "undefined" ? getFirestore(getFirebaseApp()) : ({} as Firestore);
export const storage: FirebaseStorage = typeof window !== "undefined" ? getStorage(getFirebaseApp()) : ({} as FirebaseStorage);


