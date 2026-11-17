import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

console.log('\n🔍 Verificando configuração do Firebase...\n');

// 1. Carregar variáveis de ambiente do .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env.local não encontrado na raiz do projeto!');
  console.log('   Crie o arquivo .env.local com suas credenciais do Firebase.');
  process.exit(1);
}

process.loadEnvFile(envPath);

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// 2. Verificar se há valores pendentes ou padrões de exemplo
const placeholders = [
  'sua_api_key',
  'seu-projeto.firebaseapp.com',
  'seu-projeto',
  'seu-projeto.firebasestorage.app',
  '000000000000',
  '1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx',
];

const missingKeys = [];
const placeholderKeys = [];

for (const [key, value] of Object.entries(config)) {
  const envVarName = `EXPO_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (l) => `_${l}`).toUpperCase()}`;
  if (!value) {
    missingKeys.push(envVarName);
  } else if (placeholders.includes(value.trim())) {
    placeholderKeys.push(envVarName);
  }
}

if (missingKeys.length > 0 || placeholderKeys.length > 0) {
  if (missingKeys.length > 0) {
    console.error('❌ Variáveis ausentes no .env.local:');
    missingKeys.forEach((k) => console.log(`   - ${k}`));
  }
  if (placeholderKeys.length > 0) {
    console.error('⚠️ Variáveis ainda com valores de exemplo (placeholders) no .env.local:');
    placeholderKeys.forEach((k) => console.log(`   - ${k}`));
  }
  process.exit(1);
}

console.log('✅ Variáveis de ambiente encontradas no .env.local:');
console.log(`   - Project ID: ${config.projectId}`);
console.log(`   - Auth Domain: ${config.authDomain}`);
console.log(`   - App ID: ${config.appId?.slice(0, 15)}...`);

// 3. Inicializar Firebase
let app;
try {
  app = initializeApp(config);
  console.log('✅ Firebase App inicializado com sucesso.');
} catch (err) {
  console.error('❌ Falha ao inicializar Firebase App:', err.message);
  process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

async function runTests() {
  console.log('\n--- 1. Teste de Autenticação Anônima (Visitante) ---');
  try {
    const anonCred = await signInAnonymously(auth);
    console.log(`✅ Login Anônimo funcionou! UID: ${anonCred.user.uid}`);
    await deleteUser(anonCred.user);
    console.log('   (Usuário de teste anônimo removido com sucesso)');
  } catch (err) {
    if (err.code === 'auth/configuration-not-found') {
      console.warn('⚠️ O serviço de Authentication AINDA NÃO FOI ATIVADO no Firebase!');
      console.warn('   👉 Como ativar: No Firebase Console, vá em Authentication e clique no botão "Primeiros passos" (Get started).');
    } else if (err.code === 'auth/operation-not-allowed') {
      console.warn('⚠️ Login anônimo NÃO está ativado no Firebase Console.');
      console.warn('   👉 Para ativar: Authentication -> Sign-in method -> Anônimo -> Ativar.');
    } else {
      console.error(`❌ Erro no login anônimo: [${err.code}] ${err.message}`);
    }
  }

  console.log('\n--- 2. Teste de Autenticação por E-mail e Senha ---');
  const testEmail = `test_${Date.now()}@example.com`;
  const testPass = 'TesteSeguro123!';
  try {
    const userCred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
    console.log(`✅ Criação de conta funcionou! E-mail: ${testEmail}, UID: ${userCred.user.uid}`);

    // Testar login com a mesma conta
    await signInWithEmailAndPassword(auth, testEmail, testPass);
    console.log('✅ Login com e-mail e senha funcionou com sucesso!');

    // Limpar usuário de teste
    await deleteUser(userCred.user);
    console.log('   (Usuário de teste removido com sucesso)');
  } catch (err) {
    if (err.code === 'auth/configuration-not-found') {
      console.warn('⚠️ O serviço de Authentication AINDA NÃO FOI ATIVADO no Firebase!');
      console.warn('   👉 Como ativar: No Firebase Console, vá em Authentication e clique no botão "Primeiros passos" (Get started).');
      console.warn('   Depois na aba "Sign-in method", ative "E-mail/senha".');
    } else if (err.code === 'auth/operation-not-allowed') {
      console.warn('⚠️ Autenticação por e-mail/senha NÃO está ativada no Firebase Console.');
      console.warn('   👉 Para ativar: Authentication -> Sign-in method -> E-mail/senha -> Ativar.');
    } else {
      console.error(`❌ Erro no teste de e-mail/senha: [${err.code}] ${err.message}`);
    }
  }

  console.log('\n--- 3. Teste de Conexão com Firestore ---');
  try {
    // Timeout de 5 segundos para não travar se o Firestore não estiver criado
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE')), 5000)
    );

    const firestoreTest = async () => {
      const testDocRef = doc(db, '_ping_test_', 'connection_check');
      await setDoc(testDocRef, { timestamp: Date.now() });
      const snap = await getDoc(testDocRef);
      if (snap.exists()) {
        await deleteDoc(testDocRef);
        return true;
      }
      return false;
    };

    await Promise.race([firestoreTest(), timeoutPromise]);
    console.log('✅ Leitura e gravação no Firestore funcionaram!');
  } catch (err) {
    if (err.message === 'TIMEOUT_FIRESTORE') {
      console.warn('⚠️ Firestore não respondeu a tempo (provavelmente ainda não foi criado no Firebase Console).');
      console.warn('   👉 Vá em Firebase Console -> Firestore Database -> Criar banco de dados.');
    } else if (err.code === 'permission-denied') {
      console.warn('⚠️ Firestore respondeu com "permission-denied" (conectou, mas as regras bloquearam).');
    } else {
      console.warn(`⚠️ Verificação do Firestore: [${err.code ?? err.message}]`);
    }
  }

  console.log('\n🏁 Diagnóstico concluído!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Erro inesperado durante os testes:', err);
  process.exit(1);
});
