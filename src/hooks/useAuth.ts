import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

import { isFirebaseConfigured } from '@/lib/firebase';
import { observeAuth } from '@/lib/firebase-data';
import type { ScreenName } from '@/src/types/navigation';

export type UseAuthReturn = {
  /** Usuário autenticado no Firebase, ou null quando deslogado/carregando. */
  user: FirebaseUser | null;
};

/**
 * Observa o estado de autenticação do Firebase e sincroniza a tela atual.
 *
 * - Quando o usuário autentica: redireciona para 'home' (se estava em login/signup).
 * - Quando o usuário desautentica: redireciona para 'login' (se estava em tela protegida).
 * - Se o Firebase não estiver configurado, o hook é no-op.
 *
 * @param setScreen - Dispatcher do useState<ScreenName> do componente pai.
 *   Recebe a referência estável do useState; não precisa de useCallback.
 *
 * Uso:
 *   const { user } = useAuth({ setScreen });
 */
export function useAuth({
  setScreen,
}: {
  setScreen: Dispatch<SetStateAction<ScreenName>>;
}): UseAuthReturn {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      // Restaura a sessão salva e leva usuários autenticados diretamente para o início.
      // observeAuth retorna um unsubscribe — passado como cleanup do useEffect.
      return observeAuth((currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setScreen((currentScreen) =>
            currentScreen === 'login' || currentScreen === 'signup' ? 'home' : currentScreen
          );
        } else {
          setScreen((currentScreen) =>
            currentScreen === 'login' || currentScreen === 'signup' ? currentScreen : 'login'
          );
        }
      });
    } catch {
      return;
    }
    // setScreen é o dispatcher estável do useState; não muda entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user };
}
