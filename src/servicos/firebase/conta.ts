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
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';

import { obterServicosFirebase } from './configuracao';

export function observarSessao(observador: (usuario: User | null) => void) {
  // Mantém a interface sincronizada com entradas, saídas e restauração de sessão.
  const { autenticacao } = obterServicosFirebase();
  return onAuthStateChanged(autenticacao, observador);
}

export async function entrarComEmail(email: string, senha: string) {
  const { autenticacao } = obterServicosFirebase();
  return signInWithEmailAndPassword(autenticacao, email.trim(), senha);
}

// Cria uma conta de e-mail no Firebase e grava o nome exibido no perfil de autenticação.
export async function criarConta(nome: string, email: string, senha: string) {
  const { autenticacao } = obterServicosFirebase();
  const credencial = await createUserWithEmailAndPassword(autenticacao, email.trim(), senha);
  await updateProfile(credencial.user, { displayName: nome.trim() });
  return credencial;
}

// Cria uma sessão anônima para permitir uso sem cadastro tradicional.
export async function entrarComoVisitante() {
  const { autenticacao } = obterServicosFirebase();
  return signInAnonymously(autenticacao);
}

export async function solicitarRedefinicaoSenha(email: string) {
  const { autenticacao } = obterServicosFirebase();
  return sendPasswordResetEmail(autenticacao, email.trim());
}

export async function sairDaConta() {
  const { autenticacao } = obterServicosFirebase();
  return signOut(autenticacao);
}

// Localiza fotos de perfil legadas para a exclusão da conta.
function referenciaFotoLegada(
  banco: ReturnType<typeof obterServicosFirebase>['banco'],
  idUsuario: string
) {
  return doc(banco, 'users', idUsuario, 'profile', 'avatar');
}

export async function enviarVerificacaoEmail() {
  const { autenticacao } = obterServicosFirebase();
  if (!autenticacao.currentUser || autenticacao.currentUser.isAnonymous) {
    throw new Error('auth/email-verification-unavailable');
  }
  return sendEmailVerification(autenticacao.currentUser);
}

export async function recarregarConta() {
  const { autenticacao } = obterServicosFirebase();
  if (!autenticacao.currentUser) throw new Error('auth/no-current-user');
  await reload(autenticacao.currentUser);
  return autenticacao.currentUser;
}

export async function excluirContaEHistorico(senha?: string) {
  const { autenticacao, banco } = obterServicosFirebase();
  const usuario = autenticacao.currentUser;
  if (!usuario) throw new Error('auth/no-current-user');

  if (!usuario.isAnonymous) {
    if (!usuario.email) throw new Error('auth/missing-email');
    if (!senha) throw new Error('auth/password-required');
    const credencial = EmailAuthProvider.credential(usuario.email, senha);
    await reauthenticateWithCredential(usuario, credencial);
  }

  // A reautenticação acontece antes da exclusão dos dados para evitar apagar o
  // histórico e depois descobrir que a sessão não permitia excluir a conta.
  const instantaneo = await getDocs(collection(banco, 'users', usuario.uid, 'analyses'));
  for (let indice = 0; indice < instantaneo.docs.length; indice += 450) {
    const lote = writeBatch(banco);
    instantaneo.docs.slice(indice, indice + 450).forEach((analise) => lote.delete(analise.ref));
    await lote.commit();
  }

  await deleteDoc(referenciaFotoLegada(banco, usuario.uid));

  await deleteUser(usuario);
}

// Converte códigos do Firebase Auth e Firestore em mensagens úteis para a interface.
export function mensagemErroFirebase(erro: unknown) {
  // Traduz códigos técnicos do SDK em mensagens curtas para quem está usando o aplicativo.
  const codigo =
    typeof erro === 'object' && erro && 'code' in erro
      ? String(erro.code)
      : erro instanceof Error
        ? erro.message
        : '';

  const mensagens: Record<string, string> = {
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
    'permission-denied': 'O Firebase recusou o acesso. Verifique as regras do Firestore.',
  };

  return mensagens[codigo] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
