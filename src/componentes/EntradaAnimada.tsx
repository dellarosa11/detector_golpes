import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, useReducedMotion } from 'react-native-reanimated';

export type PropriedadesEntradaAnimada = {
  children: React.ReactNode;
  atraso?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Aplica a entrada suave e escalonada usada nos elementos de cada tela,
 * respeitando a preferência de movimento reduzido do sistema operacional.
 */
export function EntradaAnimada({
  children,
  atraso = 0,
  style: estilo,
}: PropriedadesEntradaAnimada) {
  const movimentoReduzido = useReducedMotion();

  return (
    <Animated.View
      entering={
        movimentoReduzido
          ? undefined
          : FadeInDown.delay(atraso).duration(420).easing(Easing.out(Easing.cubic))
      }
      style={estilo}
    >
      {children}
    </Animated.View>
  );
}
