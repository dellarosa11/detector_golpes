export type NivelRisco = 'baixo' | 'medio' | 'alto';

// Contrato compartilhado com o PredictionResponse da API FastAPI.
export type ResultadoAnalise = {
  level: NivelRisco;
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
  analysisType: 'message';
  analyzedText: string;
};

const tempoLimiteRequisicaoMs = 45_000;

function obterUrlClassificador() {
  // O endereço usa o IP local do computador no desenvolvimento e a URL HTTPS em produção.
  const urlConfigurada = process.env.EXPO_PUBLIC_CLASSIFIER_API_URL?.trim().replace(/\/$/, '');
  if (!urlConfigurada) throw new Error('classifier/not-configured');
  return urlConfigurada;
}

function ehResultadoAnalise(valor: unknown): valor is ResultadoAnalise {
  // Validação em tempo de execução impede que uma resposta incompleta quebre a tela de resultado.
  if (!valor || typeof valor !== 'object') return false;
  const resultado = valor as Partial<ResultadoAnalise>;
  return (
    (resultado.level === 'baixo' || resultado.level === 'medio' || resultado.level === 'alto') &&
    typeof resultado.riskScore === 'number' &&
    (resultado.label === 'legitima' || resultado.label === 'smishing') &&
    typeof resultado.fraudProbability === 'number' &&
    typeof resultado.modelFraudProbability === 'number' &&
    typeof resultado.heuristicScore === 'number' &&
    resultado.analysisMode === 'hybrid' &&
    resultado.analysisType === 'message' &&
    typeof resultado.analyzedText === 'string' &&
    Array.isArray(resultado.warnings) &&
    typeof resultado.advice === 'string'
  );
}

export async function classificarMensagem(texto: string, tokenFirebase: string) {
  // AbortController evita deixar o aplicativo preso se o computador/API estiver indisponível.
  const controlador = new AbortController();
  const tempoLimite = setTimeout(() => controlador.abort(), tempoLimiteRequisicaoMs);

  try {
    const resposta = await fetch(`${obterUrlClassificador()}/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Em produção, a API valida este token com o Firebase Admin.
        Authorization: `Bearer ${tokenFirebase}`,
      },
      body: JSON.stringify({ text: texto.trim(), analysisType: 'message' }),
      signal: controlador.signal,
    });

    if (!resposta.ok) {
      if (resposta.status === 401) throw new Error('classifier/unauthorized');
      if (resposta.status === 422) throw new Error('classifier/invalid-message');
      throw new Error(`classifier/http-${resposta.status}`);
    }

    const resultado: unknown = await resposta.json();
    if (!ehResultadoAnalise(resultado)) throw new Error('classifier/invalid-response');
    return resultado;
  } catch (erro) {
    if (erro instanceof Error && erro.name === 'AbortError') {
      throw new Error('classifier/timeout');
    }
    throw erro;
  } finally {
    clearTimeout(tempoLimite);
  }
}

export function mensagemErroClassificador(erro: unknown) {
  // Mantém detalhes técnicos fora da interface e orienta a ação que o usuário pode tomar.
  const codigo = erro instanceof Error ? erro.message : '';
  const mensagens: Record<string, string> = {
    'classifier/not-configured': 'A API de análise ainda não foi configurada neste aparelho.',
    'classifier/unauthorized': 'Sua sessão expirou. Entre novamente para analisar a mensagem.',
    'classifier/invalid-message': 'Digite uma mensagem válida com até 1.500 caracteres.',
    'classifier/invalid-response': 'A API respondeu em um formato inesperado.',
    'classifier/timeout': 'A análise demorou mais que o esperado. Tente novamente.',
  };

  if (mensagens[codigo]) return mensagens[codigo];
  if (codigo.startsWith('classifier/http-'))
    return 'O serviço de análise está indisponível no momento.';
  return 'Não foi possível conectar ao classificador. Verifique sua rede e tente novamente.';
}
