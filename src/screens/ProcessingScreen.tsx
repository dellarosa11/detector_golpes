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

import { palette, styles } from '@/components/detector-app.styles';
import type { AnalysisType } from '@/lib/firebase-data';
import { AppScreen, Entrance } from '@/src/components';

export type ProcessingScreenProps = {
  analysisType: AnalysisType;
};

/**
 * Feedback visual exibido enquanto a requisição real aguarda a resposta do BERTimbau.
 */
export function ProcessingScreen({ analysisType }: ProcessingScreenProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 1;
      rotation.value = 0;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    rotation.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(rotation);
    };
  }, [pulse, reducedMotion, rotation]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  const firstChecks =
    analysisType === 'image'
      ? ['Preparação da imagem', 'Leitura do texto com OCR']
      : analysisType === 'link'
        ? ['Validação do endereço', 'Estrutura do domínio']
        : ['Preparação do texto', 'Tokenização em português'];
  const checks = [
    { icon: '✓', label: firstChecks[0], status: 'Concluído', color: palette.greenSuccess },
    { icon: '✓', label: firstChecks[1], status: 'Concluído', color: palette.greenSuccess },
    { icon: '•', label: 'Padrões de fraude', status: 'Analisando…', color: palette.green },
    { icon: '○', label: 'Classificação de risco', status: 'Aguardando', color: palette.muted },
  ];

  return (
    <AppScreen>
      <View style={styles.processingContent}>
        <Entrance delay={20}>
          <Text style={styles.processingTitle}>Analisando conteúdo</Text>
          <Text style={styles.processingSubtitle}>
            Estamos verificando sinais comuns de fraude e engenharia social.
          </Text>
        </Entrance>

        <Entrance delay={110}>
          <View style={styles.processingCircleStage}>
            <Animated.View style={[styles.processingOuterCircle, pulseStyle]}>
              <View style={styles.processingInnerCircle}>
                <Ionicons name="shield-checkmark" size={50} color="#FFFFFF" />
              </View>
            </Animated.View>
            <Animated.View style={[styles.processingOrbit, orbitStyle]}>
              <View style={styles.processingOrbitDot} />
            </Animated.View>
          </View>
        </Entrance>

        <View style={styles.checkList}>
          {checks.map((item, index) => (
            <Entrance key={item.label} delay={220 + index * 80}>
              <View style={styles.checkRow}>
                <Text style={[styles.checkIcon, { color: item.color }]}>{item.icon}</Text>
                <Text style={styles.checkLabel}>{item.label}</Text>
                <Text style={[styles.checkStatus, { color: item.color }]}>{item.status}</Text>
              </View>
            </Entrance>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}
