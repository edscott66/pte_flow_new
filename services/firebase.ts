import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  initializeAuth
} from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from './firebase-applet-config.json';
import { Platform } from 'react-native';

// 🔐 Prevent auto-login after logout
let preventAutoLogin = false;

export const disableAutoLogin = () => {
  preventAutoLogin = true;
};

export const enableAutoLogin = () => {
  preventAutoLogin = false;
};

export const isAutoLoginPrevented = () => preventAutoLogin;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const isWeb = Platform.OS === 'web';

// Initialize Auth with platform-specific persistence
let authInstance;

if (isWeb) {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } catch (e) {
    console.warn("Native persistence initialization failed, falling back to default.", e);
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    if (typeof signInWithPopup !== 'function') {
      throw new Error("signInWithPopup is not available in this environment.");
    }
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error("Google Sign In failed:", error);
    if (typeof signInWithRedirect === 'function') {
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        console.error("Google Sign In Redirect failed:", redirectError);
      }
    } else {
      console.warn("signInWithRedirect is also not available.");
    }
  }
};

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
  if (!auth.currentUser && !preventAutoLogin) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Firebase Anonymous Auth failed:", error);
    }
  }
};

