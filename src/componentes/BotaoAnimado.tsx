import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const ToqueAnimado = Animated.createAnimatedComponent(Pressable);

export type PropriedadesBotaoAnimado = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * Botão reutilizável com leve compressão ao toque e respeito à acessibilidade de movimento reduzido.
 */
export function BotaoAnimado({
  onPressIn: aoIniciarToque,
  onPressOut: aoSoltarToque,
  style: estilo,
  ...propriedades
}: PropriedadesBotaoAnimado) {
  const movimentoReduzido = useReducedMotion();
  const escala = useSharedValue(1);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  return (
    <ToqueAnimado
      {...propriedades}
      onPressIn={(evento) => {
        if (!movimentoReduzido) {
          // eslint-disable-next-line react-hooks/immutability -- useSharedValue do Reanimated é projetado para mutação via .value
          escala.value = withSpring(0.975, { damping: 17, stiffness: 320 });
        }
        aoIniciarToque?.(evento);
      }}
      onPressOut={(evento) => {
        // eslint-disable-next-line react-hooks/immutability -- useSharedValue do Reanimated é projetado para mutação via .value
        escala.value = movimentoReduzido ? 1 : withSpring(1, { damping: 16, stiffness: 260 });
        aoSoltarToque?.(evento);
      }}
      style={[estilo, estiloAnimado]}
    />
  );
}
