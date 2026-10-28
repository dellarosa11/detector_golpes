import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import type { AnalysisType } from '@/lib/firebase-data';
import { AppScreen, Entrance, MotionPressable } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type HomeScreenProps = {
  navigate: Navigate;
  onStartAnalysis: (type: AnalysisType) => void;
};

/**
 * Atalho reutilizável para escolher mensagem, link ou imagem na página inicial.
 */
function AnalysisOption({
  symbol,
  title,
  description,
  onPress,
}: {
  symbol: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.analysisOption}>
      <View style={styles.analysisIconBox}>
        <Text style={styles.analysisIcon}>{symbol}</Text>
      </View>
      <View style={styles.analysisTextBlock}>
        <Text style={styles.analysisTitle}>{title}</Text>
        <Text style={styles.analysisDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </MotionPressable>
  );
}

/**
 * Página inicial com os atalhos para análise, histórico e conteúdo educativo.
 */
export function HomeScreen({
  navigate,
  onStartAnalysis,
}: HomeScreenProps) {
  return (
    <AppScreen activeTab="home" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Proteja-se de golpes</Text>
          <Text style={styles.pageSubtitle}>
            Analise mensagens, links e imagens suspeitas antes de tomar qualquer ação.
          </Text>
        </Entrance>

        <Entrance delay={100}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroShield}>
              <Ionicons name="shield-checkmark-outline" size={62} color="rgba(255,255,255,0.18)" />
            </View>
            <Text style={styles.heroEyebrow}>ESCUDO</Text>
            <Text style={styles.heroTitle}>Tem algo suspeito?</Text>
            <Text style={styles.heroDescription}>
              Cole uma mensagem ou envie um print para receber uma análise de risco.
            </Text>
            <MotionPressable
              accessibilityRole="button"
              onPress={() => onStartAnalysis('message')}
              style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Analisar agora</Text>
            </MotionPressable>
          </View>
        </Entrance>

        <Entrance delay={170}>
          <Text style={styles.sectionTitle}>Como deseja analisar?</Text>
        </Entrance>
        <View style={styles.analysisOptions}>
          <Entrance delay={220}>
            <AnalysisOption symbol="Aa" title="Mensagem" description="Cole um texto recebido" onPress={() => onStartAnalysis('message')} />
          </Entrance>
          <Entrance delay={280}>
            <AnalysisOption symbol="↗" title="Link" description="Verifique um endereço" onPress={() => onStartAnalysis('link')} />
          </Entrance>
          <Entrance delay={340}>
            <AnalysisOption symbol="▣" title="Print" description="Envie uma captura de tela" onPress={() => onStartAnalysis('image')} />
          </Entrance>
        </View>

        <Entrance delay={400}>
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>Dica</Text>
            <Text style={styles.tipText}>Bancos nunca pedem senha ou código por mensagem.</Text>
          </View>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
