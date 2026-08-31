import type { Persistence } from 'firebase/auth';

// O fluxo web usa getAuth diretamente; esta função existe apenas para manter a tipagem por plataforma.
export function getFirebaseAuthPersistence(): Persistence {
  throw new Error('firebase/native-persistence-unavailable');
}
