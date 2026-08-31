# Ativação do Firebase

## 1. Registrar o aplicativo Web

No Console do Firebase, abra **Configurações do projeto → Seus aplicativos** e registre um aplicativo Web.
Copie o objeto `firebaseConfig` exibido pelo Firebase.

## 2. Configurar o ambiente local

Crie um arquivo `.env.local` na raiz do projeto usando `.env.example` como modelo e preencha:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

O arquivo `.env.local` não deve ser enviado ao Git.

## 3. Ativar autenticação

Em **Authentication → Sign-in method**, ative:

- E-mail/senha
- Anônimo

## 4. Criar o Firestore

Crie um banco Cloud Firestore. As regras seguras usadas pelo aplicativo estão em `firestore.rules`.
Publique essas regras pelo Console do Firebase ou pelo Firebase CLI.

## 5. Reiniciar o Expo

Depois de preencher `.env.local`, encerre o Expo e execute novamente:

```bash
npm start
```

O cadastro, login, visitante e histórico passarão a usar o projeto Firebase configurado.
