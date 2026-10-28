import React from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type MotionPressableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * Botão reutilizável com leve compressão ao toque e respeito à acessibilidade de movimento reduzido.
 */
export function MotionPressable({
  onPressIn,
  onPressOut,
  style,
  ...props
}: MotionPressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (!reducedMotion) {
          // eslint-disable-next-line react-hooks/immutability -- useSharedValue do Reanimated é projetado para mutação via .value
          scale.value = withSpring(0.975, { damping: 17, stiffness: 320 });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability -- useSharedValue do Reanimated é projetado para mutação via .value
        scale.value = reducedMotion ? 1 : withSpring(1, { damping: 16, stiffness: 260 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
