import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { palette } from '@/components/detector-app.styles';
import type { AnalysisTone, AnalysisType } from '@/lib/firebase-data';

/** Labels e ícones usados para diferenciar mensagens, links e imagens no histórico */
export const analysisTypePresentation: Record<
  AnalysisType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  message: { label: 'Mensagem', icon: 'chatbubble-ellipses-outline' },
  link: { label: 'Link', icon: 'link-outline' },
  image: { label: 'Imagem', icon: 'image-outline' },
};

/** Seleciona as cores do cartão de histórico segundo a classificação armazenada */
export function historyToneStyle(tone: AnalysisTone) {
  return tone === 'high'
    ? { backgroundColor: palette.redSoft, color: palette.red }
    : tone === 'medium'
      ? { backgroundColor: palette.amberSoft, color: palette.amber }
      : { backgroundColor: palette.greenSoft, color: palette.greenSuccess };
}
