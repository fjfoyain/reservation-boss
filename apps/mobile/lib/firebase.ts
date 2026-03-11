import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
// getReactNativePersistence is exported from the RN build but absent from browser TS types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as { getReactNativePersistence: (s: unknown) => Persistence };
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Capture existing apps BEFORE potentially calling initializeApp.
// getApps().length > 1 after initializeApp is always 1 — never > 1.
// We must snapshot the count first to know if this is a fresh init.
const existingApps = getApps();
const app = existingApps[0] ?? initializeApp(firebaseConfig);

// Only call initializeAuth on the very first initialization.
// On hot reload the app already exists, so use getAuth to get the same instance.
export const auth = existingApps.length === 0
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);
