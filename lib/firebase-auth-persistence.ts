import type { Persistence } from 'firebase/auth';

// Fallback usado somente se o resolvedor da plataforma não selecionar o arquivo nativo.
// Falha explicitamente para evitar iniciar o Firebase Auth sem persistência adequada.
export function getFirebaseAuthPersistence(): Persistence {
  throw new Error('firebase/native-persistence-unavailable');
}
