import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { getFirebaseAuthPersistence } from '@/lib/firebase-auth-persistence';

// As configurações públicas do projeto são lidas do .env.local pelo Expo.
// Nenhuma credencial administrativa do Firebase deve ser colocada no aplicativo.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

// Estas referências evitam inicializar mais de uma instância durante recarregamentos do Expo.
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseServices() {
  if (!isFirebaseConfigured) {
    throw new Error('firebase/not-configured');
  }

  appInstance = appInstance ?? (getApps().length ? getApp() : initializeApp(firebaseConfig));

  if (!authInstance) {
    if (Platform.OS === 'web') {
      authInstance = getAuth(appInstance);
    } else {
      try {
        // No celular, o AsyncStorage mantém o usuário conectado após fechar o aplicativo.
        authInstance = initializeAuth(appInstance, {
          persistence: getFirebaseAuthPersistence(),
        });
      } catch {
        // Durante o recarregamento, o Firebase pode já estar inicializado.
        authInstance = getAuth(appInstance);
      }
    }
  }

  firestoreInstance = firestoreInstance ?? getFirestore(appInstance);

  return {
    app: appInstance,
    auth: authInstance,
    db: firestoreInstance,
  };
}
