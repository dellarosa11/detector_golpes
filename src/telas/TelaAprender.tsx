import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import { TelaBase, EntradaAnimada, BotaoAnimado } from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';

export type PropriedadesTelaAprender = {
  navegar: Navegar;
};

const guias = [
  {
    icone: 'business-outline',
    titulo: 'Golpe do falso banco',
    descricao: 'Mensagens e ligações que simulam centrais bancárias.',
    fonte: 'Febraban',
    url: 'https://portal.febraban.org.br/noticia/4471/pt-br/',
  },
  {
    icone: 'swap-horizontal-outline',
    titulo: 'Golpe do Pix',
    descricao: 'Pedidos urgentes de transferência ou devolução.',
    fonte: 'Banco Central',
    url: 'https://bcb.gov.br/estabilidadefinanceira/pix-seguranca',
  },
  {
    icone: 'link-outline',
    titulo: 'Phishing',
    descricao: 'Links falsos criados para capturar dados pessoais.',
    fonte: 'Febraban',
    url: 'https://portal.febraban.org.br/DetalheAntifraude/8/pt-br/',
  },
  {
    icone: 'people-outline',
    titulo: 'Falso familiar',
    descricao: 'Alguém se passa por parente usando outro número.',
    fonte: 'Nubank',
    url: 'https://blog.nubank.com.br/golpe-do-novo-numero/',
  },
] as const;

export function TelaAprender({ navegar }: PropriedadesTelaAprender) {
  return (
    <TelaBase abaAtiva="aprender" navegar={navegar}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.learnContent}
      >
        <EntradaAnimada atraso={30}>
          <Text style={estilos.pageTitle}>Aprenda a se proteger</Text>
          <Text style={estilos.pageSubtitle}>
            Conheça os golpes mais comuns e os sinais de alerta.
          </Text>
        </EntradaAnimada>

        <View style={estilos.lessonList}>
          {guias.map((guia, indice) => (
            <EntradaAnimada key={guia.url} atraso={110 + indice * 70}>
              <Link href={guia.url} asChild target="_blank" rel="noopener noreferrer">
                <BotaoAnimado
                  accessibilityRole="link"
                  accessibilityLabel={`${guia.titulo}, guia de ${guia.fonte}`}
                  accessibilityHint="Abre no navegador"
                  style={estilos.lessonCard}
                >
                  <View style={estilos.lessonIconBox}>
                    <Ionicons name={guia.icone} size={23} color={paleta.green} />
                  </View>
                  <View style={estilos.lessonBody}>
                    <Text style={estilos.lessonTitle}>{guia.titulo}</Text>
                    <Text style={estilos.lessonDescription}>{guia.descricao}</Text>
                    <Text style={estilos.lessonLink}>Ver guia · {guia.fonte} ↗</Text>
                  </View>
                </BotaoAnimado>
              </Link>
            </EntradaAnimada>
          ))}
        </View>

        <EntradaAnimada atraso={430}>
          <View style={estilos.goldenRuleCard}>
            <Text style={estilos.goldenRuleLabel}>Regra de ouro</Text>
            <Text style={estilos.goldenRuleText}>
              Na dúvida, confirme sempre por um canal oficial.
            </Text>
          </View>
        </EntradaAnimada>
      </ScrollView>
    </TelaBase>
  );
}
