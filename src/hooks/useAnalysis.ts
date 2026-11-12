import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

import { classifierErrorMessage, classifyRisk } from '@/lib/risk-classifier';
import type { RiskAnalysis } from '@/lib/risk-classifier';
import type { ScreenName } from '@/src/types/navigation';

const analysisCacheTtlMs = 15 * 60 * 1000;

type CachedAnalysis = {
  input: string;
  result: RiskAnalysis;
  expiresAt: number;
};

export type UseAnalysisReturn = {
  analysisMessage: string;
  analysisResult: RiskAnalysis | undefined;
  analysisError: string | undefined;
  /** Inicia a análise via API. Navega para 'processing' → 'result' ou volta para 'analyze' em erro. */
  startAnalysis: () => Promise<void>;
  openAnalyzer: () => void;
  changeAnalysisMessage: (message: string) => void;
};

/**
 * Centraliza todo o estado e a lógica da análise de risco.
 *
 * - Validação da entrada antes de chamar a API
 * - Chamada à API de classificação com o token do Firebase
 * - Navegação entre telas do fluxo de análise
 *
 * @param user    - Usuário autenticado; necessário para obter o token da API.
 * @param setScreen - Dispatcher estável do useState<ScreenName>.
 *
 * Uso:
 *   const analysis = useAnalysis({ user, setScreen });
 */
export function useAnalysis({
  user,
  setScreen,
}: {
  user: FirebaseUser | null;
  setScreen: Dispatch<SetStateAction<ScreenName>>;
}): UseAnalysisReturn {
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysis>();
  const [analysisError, setAnalysisError] = useState<string>();
  const userId = user?.uid;
  const analysisCache = useMemo(
    () => (userId ? { current: undefined as CachedAnalysis | undefined } : null),
    [userId]
  );

  // ---------------------------------------------------------------------------
  // Funções de estado simples (sem async)
  // ---------------------------------------------------------------------------

  const openAnalyzer = useCallback(() => {
    setAnalysisMessage('');
    setAnalysisResult(undefined);
    setAnalysisError(undefined);
    setScreen('analyze');
  }, [setScreen]);

  const changeAnalysisMessage = useCallback((message: string) => {
    setAnalysisMessage(message);
    setAnalysisError(undefined);
  }, []);

  const startAnalysis = useCallback(async () => {
    const cleanMessage = analysisMessage.trim();
    setAnalysisError(undefined);

    if (!cleanMessage) {
      setAnalysisError('Cole ou digite uma mensagem antes de iniciar a análise.');
      return;
    }

    if (!user || !analysisCache) {
      setAnalysisError('Entre em uma conta para analisar e proteger seu histórico.');
      return;
    }

    setAnalysisResult(undefined);
    setScreen('processing');

    try {
      // O token identifica o usuário para a API; em produção ele é validado pelo Firebase Admin.
      const cached = analysisCache.current;
      let result: RiskAnalysis;

      if (cached?.input === cleanMessage && cached.expiresAt > Date.now()) {
        result = cached.result;
      } else {
        const token = await user.getIdToken();
        result = await classifyRisk(cleanMessage, token);
        analysisCache.current = {
          input: cleanMessage,
          result,
          expiresAt: Date.now() + analysisCacheTtlMs,
        };
      }

      setAnalysisResult(result);
      setScreen('result');
    } catch (error) {
      setAnalysisError(classifierErrorMessage(error));
      setScreen('analyze');
    }
  }, [user, setScreen, analysisCache, analysisMessage]);

  return {
    analysisMessage,
    analysisResult,
    analysisError,
    startAnalysis,
    openAnalyzer,
    changeAnalysisMessage,
  };
}
