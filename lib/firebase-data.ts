import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { getFirebaseServices } from '@/lib/firebase';

// Formato persistido em users/{uid}/analyses no Firestore.
export type AnalysisTone = 'high' | 'medium' | 'low';
export type AnalysisType = 'message' | 'image' | 'link';

export type StoredAnalysis = {
  id: string;
  title: string;
  message: string;
  risk: number;
  level: string;
  tone: AnalysisTone;
  analysisType: AnalysisType;
  warnings: string[];
  advice: string;
  modelVersion: string;
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

export async function requestPasswordReset(email: string) {
  const { auth } = getFirebaseServices();
  return sendPasswordResetEmail(auth, email.trim());
}

export async function logout() {
  const { auth } = getFirebaseServices();
  return signOut(auth);
}

export async function updateAccountName(name: string) {
  const { auth } = getFirebaseServices();
  if (!auth.currentUser) throw new Error('auth/no-current-user');
  await updateProfile(auth.currentUser, { displayName: name.trim() });
  return auth.currentUser;
}

function accountPhotoReference(db: ReturnType<typeof getFirebaseServices>['db'], userId: string) {
  return doc(db, 'users', userId, 'profile', 'avatar');
}

export async function getAccountPhoto() {
  const { auth, db } = getFirebaseServices();
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');

  const snapshot = await getDoc(accountPhotoReference(db, user.uid));
  const imageData = snapshot.data()?.imageData;
  return typeof imageData === 'string' && imageData.startsWith('data:image/jpeg;base64,')
    ? imageData
    : '';
}

export async function updateAccountPhoto(imageData: string) {
  const { auth, db } = getFirebaseServices();
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');
  if (!imageData.startsWith('data:image/jpeg;base64,')) {
    throw new Error('profile/image-unavailable');
  }
  if (imageData.length > 200_000) throw new Error('profile/image-too-large');

  await setDoc(accountPhotoReference(db, user.uid), {
    imageData,
    updatedAt: serverTimestamp(),
  });
  // Fotos antigas salvas no Auth deixam de ser usadas após a migração para o Firestore.
  if (user.photoURL) await updateProfile(user, { photoURL: null });
  return imageData;
}

export async function removeAccountPhoto() {
  const { auth, db } = getFirebaseServices();
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');

  await deleteDoc(accountPhotoReference(db, user.uid));
  if (user.photoURL) await updateProfile(user, { photoURL: null });
}

export async function sendAccountVerification() {
  const { auth } = getFirebaseServices();
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    throw new Error('auth/email-verification-unavailable');
  }
  return sendEmailVerification(auth.currentUser);
}

export async function reloadCurrentAccount() {
  const { auth } = getFirebaseServices();
  if (!auth.currentUser) throw new Error('auth/no-current-user');
  await reload(auth.currentUser);
  return auth.currentUser;
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

export async function deleteAnalysis(userId: string, analysisId: string) {
  const { db } = getFirebaseServices();
  return deleteDoc(doc(db, 'users', userId, 'analyses', analysisId));
}

export async function deleteAccountAndHistory(password?: string) {
  const { auth, db } = getFirebaseServices();
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');

  if (!user.isAnonymous) {
    if (!user.email) throw new Error('auth/missing-email');
    if (!password) throw new Error('auth/password-required');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  // A reautenticação acontece antes da exclusão dos dados para evitar apagar o
  // histórico e depois descobrir que a sessão não permitia excluir a conta.
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'analyses'));
  for (let index = 0; index < snapshot.docs.length; index += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + 450).forEach((analysis) => batch.delete(analysis.ref));
    await batch.commit();
  }

  await deleteDoc(accountPhotoReference(db, user.uid));

  await deleteUser(user);
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
            analysisType: data.analysisType ?? 'message',
            warnings: Array.isArray(data.warnings) ? data.warnings : [],
            advice: data.advice ?? '',
            modelVersion: data.modelVersion ?? 'anterior',
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
    'auth/requires-recent-login': 'Confirme sua senha novamente para concluir esta ação.',
    'auth/wrong-password': 'A senha informada está incorreta.',
    'auth/password-required': 'Digite sua senha atual para excluir a conta.',
    'auth/no-current-user': 'Sua sessão não está mais disponível. Entre novamente.',
    'auth/missing-email': 'Esta conta não possui um e-mail válido.',
    'auth/email-verification-unavailable': 'Contas de visitante não possuem verificação de e-mail.',
    'profile/image-unavailable': 'Não foi possível abrir a imagem escolhida.',
    'profile/image-too-large': 'Não foi possível reduzir a foto ao tamanho permitido.',
    'permission-denied': 'O Firebase recusou o acesso. Verifique as regras do Firestore.',
  };

  return messages[code] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
