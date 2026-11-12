import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { obterPersistenciaFirebase } from '@/src/servicos/firebase/persistencia';

// As configurações públicas do projeto são lidas do .env.local pelo Expo.
// Nenhuma credencial administrativa do Firebase deve ser colocada no aplicativo.
const configuracaoFirebase = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Object.values(configuracaoFirebase).every(Boolean);

// Estas referências evitam inicializar mais de uma instância durante recarregamentos do Expo.
let instanciaFirebase: FirebaseApp | null = null;
let instanciaAutenticacao: Auth | null = null;
let instanciaFirestore: Firestore | null = null;

export function obterServicosFirebase() {
  // Impede inicialização parcial caso falte alguma variável pública do projeto Firebase.
  if (!firebaseConfigurado) {
    throw new Error('firebase/not-configured');
  }

  instanciaFirebase =
    instanciaFirebase ?? (getApps().length ? getApp() : initializeApp(configuracaoFirebase));

  if (!instanciaAutenticacao) {
    if (Platform.OS === 'web') {
      // No navegador, o SDK padrão já gerencia a persistência de autenticação.
      instanciaAutenticacao = getAuth(instanciaFirebase);
    } else {
      try {
        // No celular, o AsyncStorage mantém o usuário conectado após fechar o aplicativo.
        instanciaAutenticacao = initializeAuth(instanciaFirebase, {
          persistence: obterPersistenciaFirebase(),
        });
      } catch {
        // Durante o recarregamento, o Firebase pode já estar inicializado.
        instanciaAutenticacao = getAuth(instanciaFirebase);
      }
    }
  }

  // Cria o Firestore apenas uma vez e devolve os serviços reutilizáveis pelo app.
  instanciaFirestore = instanciaFirestore ?? getFirestore(instanciaFirebase);

  return {
    autenticacao: instanciaAutenticacao,
    banco: instanciaFirestore,
  };
}
