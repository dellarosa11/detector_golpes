import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import { getFirebaseServices } from '@/lib/firebase';

// Formato persistido em users/{uid}/analyses no Firestore.
export type AnalysisTone = 'high' | 'medium' | 'low';

export type StoredAnalysis = {
  id: string;
  title: string;
  message: string;
  risk: number;
  level: string;
  tone: AnalysisTone;
  createdAt: Date | null;
};

export function observeAuth(listener: (user: User | null) => void) {
  // Mantém a interface sincronizada com entradas, saídas e restauração de sessão.
  const { auth } = getFirebaseServices();
  return onAuthStateChanged(auth, listener);
}

export async function loginWithEmail(email: string, password: string) {
  const { auth } = getFirebaseServices();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccount(name: string, email: string, password: string) {
  const { auth } = getFirebaseServices();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return credential;
}

export async function loginAsGuest() {
  const { auth } = getFirebaseServices();
  return signInAnonymously(auth);
}

export async function saveAnalysis(
  userId: string,
  analysis: Omit<StoredAnalysis, 'id' | 'createdAt'>
) {
  const { db } = getFirebaseServices();
  // Cada usuário possui sua própria subcoleção; as regras impedem acesso cruzado.
  return addDoc(collection(db, 'users', userId, 'analyses'), {
    ...analysis,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToAnalyses(
  userId: string,
  onData: (analyses: StoredAnalysis[]) => void,
  onError: (error: Error) => void
) {
  const { db } = getFirebaseServices();
  // Escuta em tempo real as 30 análises mais recentes para atualizar a tela automaticamente.
  const analysesQuery = query(
    collection(db, 'users', userId, 'analyses'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    analysesQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            title: data.title ?? 'Mensagem analisada',
            message: data.message ?? '',
            risk: data.risk ?? 0,
            level: data.level ?? 'Baixo',
            tone: data.tone ?? 'low',
            createdAt: data.createdAt?.toDate?.() ?? null,
          } as StoredAnalysis;
        })
      );
    },
    onError
  );
}

export function firebaseErrorMessage(error: unknown) {
  // Traduz códigos técnicos do SDK em mensagens curtas para quem está usando o aplicativo.
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: unknown }).code)
      : error instanceof Error
        ? error.message
        : '';

  const messages: Record<string, string> = {
    'firebase/not-configured': 'O Firebase ainda não foi configurado neste aplicativo.',
    'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'Digite um endereço de e-mail válido.',
    'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet.',
    'auth/operation-not-allowed': 'Este tipo de acesso ainda não foi ativado no Firebase.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/weak-password': 'A senha escolhida é muito fraca.',
    'permission-denied': 'O Firebase recusou o acesso. Verifique as regras do Firestore.',
  };

  return messages[code] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
