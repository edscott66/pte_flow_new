import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import * as FirebaseAuth from 'firebase/auth';
const { initializeAuth, getAuth, signInAnonymously, getReactNativePersistence } = FirebaseAuth as any;
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from './firebase-applet-config.json';
import { Platform } from 'react-native';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth with platform-specific persistence
let authInstance;

if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    if (getReactNativePersistence) {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
      });
    } else {
      console.warn("getReactNativePersistence is not available, falling back to default.");
      authInstance = getAuth(app);
    }
  } catch (e) {
    console.warn("Native persistence initialization failed, falling back to default.", e);
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure anonymous auth for security rules if needed
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Firebase Anonymous Auth failed:", error);
    }
  }
};
