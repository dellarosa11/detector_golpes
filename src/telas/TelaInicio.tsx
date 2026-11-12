import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

import { estilos } from '@/src/estilos/aplicativo';
import { TelaBase, EntradaAnimada, BotaoAnimado } from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';

export type PropriedadesTelaInicio = {
  navegar: Navegar;
  aoIniciarAnalise: () => void;
};

/**
 * Página inicial com os atalhos para análise, histórico e conteúdo educativo.
 */
export function TelaInicio({ navegar, aoIniciarAnalise }: PropriedadesTelaInicio) {
  return (
    <TelaBase abaAtiva='inicio' navegar={navegar}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.homeContent}
      >
        <EntradaAnimada atraso={30}>
          <Text style={estilos.pageTitle}>Proteja-se de golpes</Text>
          <Text style={estilos.pageSubtitle}>
            Analise mensagens suspeitas antes de tomar qualquer ação.
          </Text>
        </EntradaAnimada>

        <EntradaAnimada atraso={100}>
          <View style={estilos.heroCard}>
            <View style={estilos.heroGlow} />
            <View style={estilos.heroShield}>
              <Ionicons name="shield-checkmark-outline" size={62} color="rgba(255,255,255,0.18)" />
            </View>
            <Text style={estilos.heroTitle}>Tem algo suspeito?</Text>
            <Text style={estilos.heroDescription}>
              Cole uma mensagem suspeita para receber uma análise de risco.
            </Text>
            <BotaoAnimado
              accessibilityRole="button"
              onPress={aoIniciarAnalise}
              style={estilos.heroButton}
            >
              <Text style={estilos.heroButtonText}>Analisar agora</Text>
            </BotaoAnimado>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={170}>
          <View style={estilos.tipCard}>
            <Text style={estilos.tipLabel}>Dica</Text>
            <Text style={estilos.tipText}>Bancos nunca pedem senha ou código por mensagem.</Text>
          </View>
        </EntradaAnimada>
      </ScrollView>
    </TelaBase>
  );
}
