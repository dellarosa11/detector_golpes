import type { Persistence } from 'firebase/auth';

// Fallback usado somente se o resolvedor da plataforma não selecionar o arquivo nativo.
export function getFirebaseAuthPersistence(): Persistence {
  throw new Error('firebase/native-persistence-unavailable');
}
