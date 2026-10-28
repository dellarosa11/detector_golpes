/**
 * Tipos de análise de risco compartilhados.
 *
 * Re-exporta os tipos dos serviços para que telas e hooks não precisem
 * importar diretamente de `lib/`, mantendo o acoplamento baixo.
 *
 * Uso:
 *   import type { AnalysisType, StoredAnalysis, RiskAnalysis } from '@/src/types/analysis';
 */

export type { AnalysisTone, AnalysisType, StoredAnalysis } from '@/lib/firebase-data';
export type { RiskAnalysis, RiskLevel, ClassifierAnalysisType } from '@/lib/risk-classifier';

/** URI da imagem selecionada + dados em base64 para envio à API. */
export type SelectedAnalysisImage = {
  uri: string;
  imageData: string;
};

/** Preferência de tema do usuário persistida no AsyncStorage. */
export type ThemePreference = 'system' | 'light' | 'dark';
