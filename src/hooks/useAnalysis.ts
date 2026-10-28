import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

import { classifierErrorMessage, classifyImageRisk, classifyRisk } from '@/lib/risk-classifier';
import type { RiskAnalysis } from '@/lib/risk-classifier';
import type { AnalysisType } from '@/lib/firebase-data';
import type { ScreenName } from '@/src/types/navigation';
import type { SelectedAnalysisImage } from '@/src/types/analysis';

export type UseAnalysisReturn = {
  analysisMessage: string;
  analysisType: AnalysisType;
  analysisImage: SelectedAnalysisImage | undefined;
  analysisResult: RiskAnalysis | undefined;
  analysisError: string | undefined;
  /** Inicia a análise via API. Navega para 'processing' → 'result' ou volta para 'analyze' em erro. */
  startAnalysis: () => Promise<void>;
  /** Abre o analisador para o tipo especificado, limpando estado anterior. */
  openAnalyzer: (type: AnalysisType) => void;
  /** Troca o tipo de análise sem navegar; limpa campos dependentes. */
  changeAnalysisType: (type: AnalysisType) => void;
  /** Atualiza a mensagem e limpa o erro. */
  changeAnalysisMessage: (message: string) => void;
  /** Abre câmera ou galeria, processa a imagem e atualiza analysisImage. */
  chooseAnalysisImage: (source: 'camera' | 'library') => Promise<void>;
  /** Remove a imagem selecionada e limpa campos dependentes. */
  removeAnalysisImage: () => void;
};

/**
 * Centraliza todo o estado e a lógica da análise de risco.
 *
 * - Validação da entrada antes de chamar a API
 * - Compressão e redimensionamento de imagem
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
  const [analysisType, setAnalysisType] = useState<AnalysisType>('message');
  const [analysisImage, setAnalysisImage] = useState<SelectedAnalysisImage>();
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysis>();
  const [analysisError, setAnalysisError] = useState<string>();

  // ---------------------------------------------------------------------------
  // Funções de estado simples (sem async)
  // ---------------------------------------------------------------------------

  const openAnalyzer = useCallback(
    (nextType: AnalysisType) => {
      setAnalysisType(nextType);
      setAnalysisMessage('');
      setAnalysisImage(undefined);
      setAnalysisResult(undefined);
      setAnalysisError(undefined);
      setScreen('analyze');
    },
    [setScreen]
  );

  const changeAnalysisType = useCallback((nextType: AnalysisType) => {
    setAnalysisType((current) => {
      if (nextType === current) return current;
      setAnalysisMessage('');
      setAnalysisImage(undefined);
      setAnalysisResult(undefined);
      setAnalysisError(undefined);
      return nextType;
    });
  }, []);

  const changeAnalysisMessage = useCallback((message: string) => {
    setAnalysisMessage(message);
    setAnalysisError(undefined);
  }, []);

  const removeAnalysisImage = useCallback(() => {
    setAnalysisImage(undefined);
    setAnalysisMessage('');
    setAnalysisError(undefined);
  }, []);

  // ---------------------------------------------------------------------------
  // Seleção e compressão de imagem
  // ---------------------------------------------------------------------------

  const chooseAnalysisImage = useCallback(
    async (source: 'camera' | 'library') => {
      setAnalysisError(undefined);
      try {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          setAnalysisError(
            source === 'camera'
              ? 'Permita o acesso à câmera para fotografar uma mensagem.'
              : 'Permita o acesso às fotos para escolher um print.'
          );
          return;
        }

        const selection =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

        if (selection.canceled || !selection.assets[0]) return;
        const selected = selection.assets[0];
        const resizeActions =
          selected.width && selected.width > 1600 ? [{ resize: { width: 1600 } }] : [];

        let processed = await manipulateAsync(selected.uri, resizeActions, {
          base64: true,
          compress: 0.78,
          format: SaveFormat.JPEG,
        });
        let imageData = `data:image/jpeg;base64,${processed.base64 || ''}`;

        // Segunda tentativa com compressão maior se ultrapassar o limite da API (5 MB).
        if (imageData.length > 5_200_000) {
          processed = await manipulateAsync(selected.uri, [{ resize: { width: 1200 } }], {
            base64: true,
            compress: 0.58,
            format: SaveFormat.JPEG,
          });
          imageData = `data:image/jpeg;base64,${processed.base64 || ''}`;
        }

        if (!processed.base64 || imageData.length > 5_200_000) {
          setAnalysisError(
            'A imagem ficou muito grande. Escolha outro print ou recorte a área da mensagem.'
          );
          return;
        }

        setAnalysisMessage('');
        setAnalysisImage({ uri: processed.uri, imageData });
      } catch {
        setAnalysisError('Não foi possível abrir ou preparar esta imagem. Tente novamente.');
      }
    },
    [] // sem deps externas — usa apenas setters estáveis
  );

  // ---------------------------------------------------------------------------
  // Chamada à API de classificação
  // ---------------------------------------------------------------------------

  const startAnalysis = useCallback(async () => {
    const cleanMessage = analysisMessage.trim();
    setAnalysisError(undefined);

    if (analysisType === 'image' ? !analysisImage : !cleanMessage) {
      setAnalysisError(
        analysisType === 'image'
          ? 'Escolha um print ou tire uma foto antes de iniciar a análise.'
          : analysisType === 'link'
            ? 'Cole ou digite um link antes de iniciar a análise.'
            : 'Cole ou digite uma mensagem antes de iniciar a análise.'
      );
      return;
    }

    if (!user) {
      setAnalysisError('Entre em uma conta para analisar e proteger seu histórico.');
      return;
    }

    setAnalysisResult(undefined);
    setScreen('processing');

    try {
      // O token identifica o usuário para a API; em produção ele é validado pelo Firebase Admin.
      const token = await user.getIdToken();
      const result =
        analysisType === 'image'
          ? await classifyImageRisk(analysisImage!.imageData, token)
          : await classifyRisk(cleanMessage, token, analysisType);

      // No fluxo de imagem, o histórico guarda o texto identificado pelo OCR, nunca o arquivo.
      if (analysisType === 'image') setAnalysisMessage(result.analyzedText);
      setAnalysisResult(result);
      setScreen('result');
    } catch (error) {
      setAnalysisError(classifierErrorMessage(error));
      setScreen('analyze');
    }
  }, [user, setScreen, analysisMessage, analysisType, analysisImage]);

  return {
    analysisMessage,
    analysisType,
    analysisImage,
    analysisResult,
    analysisError,
    startAnalysis,
    openAnalyzer,
    changeAnalysisType,
    changeAnalysisMessage,
    chooseAnalysisImage,
    removeAnalysisImage,
  };
}
