import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { estilos } from '@/src/estilos/aplicativo';

export type PropriedadesBarraRisco = {
  valor: number;
  cor: string;
};

/**
 * Anima a barra até a porcentagem calculada e limita valores fora do intervalo de 0 a 100%.
 * Respeita acessibilidade de movimento reduzido.
 */
export function BarraRisco({ valor, cor }: PropriedadesBarraRisco) {
  const movimentoReduzido = useReducedMotion();
  const valorNormalizado = Math.max(0, Math.min(1, valor));
  const progress = useSharedValue(movimentoReduzido ? valorNormalizado : 0);

  useEffect(() => {
    progress.value = movimentoReduzido
      ? valorNormalizado
      : withTiming(valorNormalizado, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [valorNormalizado, progress, movimentoReduzido]);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return <Animated.View style={[estilos.riskProgress, { backgroundColor: cor }, estiloAnimado]} />;
}
