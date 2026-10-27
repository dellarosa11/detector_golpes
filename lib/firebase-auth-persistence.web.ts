import type { Persistence } from 'firebase/auth';

// O fluxo web usa getAuth diretamente; esta função existe apenas para manter a tipagem por plataforma.
// Se este fallback for chamado, sinaliza que a resolução da implementação web falhou.
export function getFirebaseAuthPersistence(): Persistence {
  throw new Error('firebase/native-persistence-unavailable');
}
