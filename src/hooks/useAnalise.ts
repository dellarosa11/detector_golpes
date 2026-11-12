import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User as UsuarioFirebase } from 'firebase/auth';

import { mensagemErroClassificador, classificarMensagem } from '@/src/servicos/classificador';
import type { ResultadoAnalise } from '@/src/servicos/classificador';
import type { NomeTela } from '@/src/tipos/navegacao';

const validadeCacheAnaliseMs = 15 * 60 * 1000;

type AnaliseEmCache = {
  entrada: string;
  resultado: ResultadoAnalise;
  expiraEm: number;
};

export type EstadoAnalise = {
  mensagemDaAnalise: string;
  resultadoDaAnalise: ResultadoAnalise | undefined;
  erroDaAnalise: string | undefined;
  /** Inicia a análise via API. Navega para 'processing' → 'result' ou volta para 'analyze' em erro. */
  iniciarAnalise: () => Promise<void>;
  abrirAnalise: () => void;
  alterarMensagem: (mensagem: string) => void;
};

export function useAnalise({
  usuario,
  definirTela,
}: {
  usuario: UsuarioFirebase | null;
  definirTela: Dispatch<SetStateAction<NomeTela>>;
}): EstadoAnalise {
  const [mensagemDaAnalise, definirMensagemDaAnalise] = useState('');
  const [resultadoDaAnalise, definirResultadoDaAnalise] = useState<ResultadoAnalise>();
  const [erroDaAnalise, definirErroDaAnalise] = useState<string>();
  const idUsuario = usuario?.uid;
  const cacheAnalise = useRef<{ idUsuario: string; sessao: symbol; atual?: AnaliseEmCache } | null>(
    null
  );

  useEffect(() => {
    cacheAnalise.current = idUsuario ? { idUsuario, sessao: Symbol() } : null;
  }, [idUsuario]);

  const abrirAnalise = useCallback(() => {
    definirMensagemDaAnalise('');
    definirResultadoDaAnalise(undefined);
    definirErroDaAnalise(undefined);
    definirTela('analise');
  }, [definirTela]);

  const alterarMensagem = useCallback((mensagem: string) => {
    definirMensagemDaAnalise(mensagem);
    definirErroDaAnalise(undefined);
  }, []);

  const iniciarAnalise = useCallback(async () => {
    const mensagemLimpa = mensagemDaAnalise.trim();
    definirErroDaAnalise(undefined);

    if (!mensagemLimpa) {
      definirErroDaAnalise('Cole ou digite uma mensagem antes de iniciar a análise.');
      return;
    }

    if (!usuario) {
      definirErroDaAnalise('Entre em uma conta para analisar e proteger seu histórico.');
      return;
    }

    const cacheAnterior = cacheAnalise.current;
    const cacheDoUsuario =
      cacheAnterior?.idUsuario === usuario.uid
        ? cacheAnterior
        : { idUsuario: usuario.uid, sessao: Symbol() };
    cacheAnalise.current = cacheDoUsuario;

    definirResultadoDaAnalise(undefined);
    definirTela('processamento');

    try {
      // O token identifica o usuário para a API; em produção ele é validado pelo Firebase Admin.
      const emCache = cacheDoUsuario.atual;
      let resultado: ResultadoAnalise;

      if (emCache?.entrada === mensagemLimpa && emCache.expiraEm > Date.now()) {
        resultado = emCache.resultado;
      } else {
        const token = await usuario.getIdToken();
        resultado = await classificarMensagem(mensagemLimpa, token);
        if (cacheAnalise.current?.sessao === cacheDoUsuario.sessao) {
          cacheAnalise.current = {
            ...cacheDoUsuario,
            atual: {
              entrada: mensagemLimpa,
              resultado,
              expiraEm: Date.now() + validadeCacheAnaliseMs,
            },
          };
        }
      }

      definirResultadoDaAnalise(resultado);
      definirTela('resultado');
    } catch (erro) {
      definirErroDaAnalise(mensagemErroClassificador(erro));
      definirTela('analise');
    }
  }, [usuario, definirTela, mensagemDaAnalise]);

  return {
    mensagemDaAnalise,
    resultadoDaAnalise,
    erroDaAnalise,
    iniciarAnalise,
    abrirAnalise,
    alterarMensagem,
  };
}
