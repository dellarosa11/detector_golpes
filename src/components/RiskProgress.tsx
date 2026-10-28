import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { styles } from '@/components/detector-app.styles';

export type RiskProgressProps = {
  value: number;
  color: string;
};

/**
 * Anima a barra até a porcentagem calculada e limita valores fora do intervalo de 0 a 100%.
 * Respeita acessibilidade de movimento reduzido.
 */
export function RiskProgress({ value, color }: RiskProgressProps) {
  const reducedMotion = useReducedMotion();
  const normalizedValue = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(reducedMotion ? normalizedValue : 0);

  useEffect(() => {
    progress.value = reducedMotion
      ? normalizedValue
      : withTiming(normalizedValue, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [normalizedValue, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return <Animated.View style={[styles.riskProgress, { backgroundColor: color }, animatedStyle]} />;
}
