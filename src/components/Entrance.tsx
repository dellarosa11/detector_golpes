import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, useReducedMotion } from 'react-native-reanimated';

export type EntranceProps = {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Aplica a entrada suave e escalonada usada nos elementos de cada tela,
 * respeitando a preferência de movimento reduzido do sistema operacional.
 */
export function Entrance({ children, delay = 0, style }: EntranceProps) {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.delay(delay).duration(420).easing(Easing.out(Easing.cubic))
      }
      style={style}>
      {children}
    </Animated.View>
  );
}
