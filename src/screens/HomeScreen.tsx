import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import { AppScreen, Entrance, MotionPressable } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type HomeScreenProps = {
  navigate: Navigate;
  onStartAnalysis: () => void;
};

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
            Analise mensagens suspeitas antes de tomar qualquer ação.
          </Text>
        </Entrance>

        <Entrance delay={100}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroShield}>
              <Ionicons name="shield-checkmark-outline" size={62} color="rgba(255,255,255,0.18)" />
            </View>
            <Text style={styles.heroTitle}>Tem algo suspeito?</Text>
            <Text style={styles.heroDescription}>
              Cole uma mensagem suspeita para receber uma análise de risco.
            </Text>
            <MotionPressable
              accessibilityRole="button"
              onPress={onStartAnalysis}
              style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Analisar agora</Text>
            </MotionPressable>
          </View>
        </Entrance>

        <Entrance delay={170}>
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>Dica</Text>
            <Text style={styles.tipText}>Bancos nunca pedem senha ou código por mensagem.</Text>
          </View>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
