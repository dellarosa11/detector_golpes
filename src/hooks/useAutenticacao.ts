import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User as UsuarioFirebase } from 'firebase/auth';

import { firebaseConfigurado } from '@/src/servicos/firebase/configuracao';
import { observarSessao } from '@/src/servicos/firebase/conta';
import type { NomeTela } from '@/src/tipos/navegacao';

export type EstadoAutenticacao = {
  /** Usuário autenticado no Firebase, ou null quando deslogado/carregando. */
  usuario: UsuarioFirebase | null;
};

export function useAutenticacao({
  definirTela,
}: {
  definirTela: Dispatch<SetStateAction<NomeTela>>;
}): EstadoAutenticacao {
  const [usuario, definirUsuario] = useState<UsuarioFirebase | null>(null);

  useEffect(() => {
    if (!firebaseConfigurado) return;

    try {
      // Restaura a sessão salva e leva usuários autenticados diretamente para o início.
      return observarSessao((usuarioAtual) => {
        definirUsuario(usuarioAtual);
        definirTela((telaAtual) => {
          const telaDeEntrada = telaAtual === 'entrada' || telaAtual === 'cadastro';
          if (usuarioAtual) return telaDeEntrada ? 'inicio' : telaAtual;
          return telaDeEntrada ? telaAtual : 'entrada';
        });
      });
    } catch {
      return;
    }
  }, [definirTela]);

  return { usuario };
}
