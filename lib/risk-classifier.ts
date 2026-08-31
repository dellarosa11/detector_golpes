export type RiskLevel = 'baixo' | 'medio' | 'alto';

// Contrato compartilhado com o PredictionResponse da API FastAPI.
export type RiskAnalysis = {
  level: RiskLevel;
  riskScore: number;
  label: 'legitima' | 'smishing';
  confidence: number;
  fraudProbability: number;
  modelFraudProbability: number;
  heuristicScore: number;
  analysisMode: 'hybrid';
  probabilities: {
    legitima: number;
    smishing: number;
  };
  warnings: string[];
  advice: string;
  modelVersion: string;
};

const requestTimeoutMs = 45_000;

function classifierApiUrl() {
  // O endereço usa o IP local do computador no desenvolvimento e a URL HTTPS em produção.
  const configuredUrl = process.env.EXPO_PUBLIC_CLASSIFIER_API_URL?.trim().replace(/\/$/, '');
  if (!configuredUrl) throw new Error('classifier/not-configured');
  return configuredUrl;
}

function isRiskAnalysis(value: unknown): value is RiskAnalysis {
  // Validação em tempo de execução impede que uma resposta incompleta quebre a tela de resultado.
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<RiskAnalysis>;
  return (
    (result.level === 'baixo' || result.level === 'medio' || result.level === 'alto') &&
    typeof result.riskScore === 'number' &&
    (result.label === 'legitima' || result.label === 'smishing') &&
    typeof result.fraudProbability === 'number' &&
    typeof result.modelFraudProbability === 'number' &&
    typeof result.heuristicScore === 'number' &&
    result.analysisMode === 'hybrid' &&
    Array.isArray(result.warnings) &&
    typeof result.advice === 'string'
  );
}

export async function classifyRisk(text: string, firebaseIdToken?: string) {
  // AbortController evita deixar o aplicativo preso se o computador/API estiver indisponível.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${classifierApiUrl()}/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Em produção, a API valida este token com o Firebase Admin.
        ...(firebaseIdToken ? { Authorization: `Bearer ${firebaseIdToken}` } : {}),
      },
      body: JSON.stringify({ text: text.trim() }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('classifier/unauthorized');
      if (response.status === 422) throw new Error('classifier/invalid-message');
      throw new Error(`classifier/http-${response.status}`);
    }

    const result: unknown = await response.json();
    if (!isRiskAnalysis(result)) throw new Error('classifier/invalid-response');
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('classifier/timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function classifierErrorMessage(error: unknown) {
  // Mantém detalhes técnicos fora da interface e orienta a ação que o usuário pode tomar.
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    'classifier/not-configured': 'A API de análise ainda não foi configurada neste aparelho.',
    'classifier/unauthorized': 'Sua sessão expirou. Entre novamente para analisar a mensagem.',
    'classifier/invalid-message': 'Digite uma mensagem válida com até 1.500 caracteres.',
    'classifier/invalid-response': 'A API respondeu em um formato inesperado.',
    'classifier/timeout': 'A análise demorou mais que o esperado. Tente novamente.',
  };

  if (messages[code]) return messages[code];
  if (code.startsWith('classifier/http-')) return 'O serviço de análise está indisponível no momento.';
  return 'Não foi possível conectar ao classificador. Verifique sua rede e tente novamente.';
}
