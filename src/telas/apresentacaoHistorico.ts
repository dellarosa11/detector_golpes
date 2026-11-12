import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { paleta } from '@/src/estilos/aplicativo';
import type { TomAnalise, TipoAnalise } from '@/src/servicos/firebase/historico';

/** Labels e ícones usados para diferenciar mensagens, links e imagens no histórico */
export const apresentacaoTipoAnalise: Record<
  TipoAnalise,
  { rotulo: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  message: { rotulo: 'Mensagem', icon: 'chatbubble-ellipses-outline' },
  link: { rotulo: 'Link', icon: 'link-outline' },
  image: { rotulo: 'Imagem', icon: 'image-outline' },
};

/** Seleciona as cores do cartão de histórico segundo a classificação armazenada */
export function obterEstiloRisco(tom: TomAnalise) {
  return tom === 'high'
    ? { backgroundColor: paleta.redSoft, color: paleta.red }
    : tom === 'medium'
      ? { backgroundColor: paleta.amberSoft, color: paleta.amber }
      : { backgroundColor: paleta.greenSoft, color: paleta.greenSuccess };
}
