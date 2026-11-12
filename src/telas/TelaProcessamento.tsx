import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import { TelaBase, EntradaAnimada } from '@/src/componentes';

/**
 * Feedback visual exibido enquanto a requisição real aguarda a resposta do BERTimbau.
 */
export function TelaProcessamento() {
  const movimentoReduzido = useReducedMotion();
  const pulso = useSharedValue(1);
  const rotacao = useSharedValue(0);

  useEffect(() => {
    if (movimentoReduzido) {
      pulso.value = 1;
      rotacao.value = 0;
      return;
    }

    pulso.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    rotacao.value = withRepeat(withTiming(1, { duration: 2100, easing: Easing.linear }), -1, false);

    return () => {
      cancelAnimation(pulso);
      cancelAnimation(rotacao);
    };
  }, [pulso, movimentoReduzido, rotacao]);

  const estiloPulso = useAnimatedStyle(() => ({
    transform: [{ scale: pulso.value }],
  }));
  const estiloOrbita = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotacao.value * 360}deg` }],
  }));

  const verificacoes = [
    { icon: '✓', label: 'Preparação do texto', status: 'Concluído', color: paleta.greenSuccess },
    {
      icon: '✓',
      label: 'Tokenização em português',
      status: 'Concluído',
      color: paleta.greenSuccess,
    },
    { icon: '•', label: 'Padrões de fraude', status: 'Analisando…', color: paleta.green },
    { icon: '○', label: 'Classificação de risco', status: 'Aguardando', color: paleta.muted },
  ];

  return (
    <TelaBase>
      <View style={estilos.processingContent}>
        <EntradaAnimada atraso={20}>
          <Text style={estilos.processingTitle}>Analisando conteúdo</Text>
          <Text style={estilos.processingSubtitle}>
            Estamos verificando sinais comuns de fraude e engenharia social.
          </Text>
        </EntradaAnimada>

        <EntradaAnimada atraso={110}>
          <View style={estilos.processingCircleStage}>
            <Animated.View style={[estilos.processingOuterCircle, estiloPulso]}>
              <View style={estilos.processingInnerCircle}>
                <Ionicons name="shield-checkmark" size={50} color="#FFFFFF" />
              </View>
            </Animated.View>
            <Animated.View style={[estilos.processingOrbit, estiloOrbita]}>
              <View style={estilos.processingOrbitDot} />
            </Animated.View>
          </View>
        </EntradaAnimada>

        <View style={estilos.checkList}>
          {verificacoes.map((item, indice) => (
            <EntradaAnimada key={item.label} atraso={220 + indice * 80}>
              <View style={estilos.checkRow}>
                <Text style={[estilos.checkIcon, { color: item.color }]}>{item.icon}</Text>
                <Text style={estilos.checkLabel}>{item.label}</Text>
                <Text style={[estilos.checkStatus, { color: item.color }]}>{item.status}</Text>
              </View>
            </EntradaAnimada>
          ))}
        </View>
      </View>
    </TelaBase>
  );
}
