import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import { AppScreen, Entrance, MotionPressable } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type LearnScreenProps = {
  navigate: Navigate;
};

const lessons = [
  {
    icon: 'business-outline',
    title: 'Golpe do falso banco',
    description: 'Mensagens e ligações que simulam centrais bancárias.',
    source: 'Febraban',
    url: 'https://portal.febraban.org.br/noticia/4471/pt-br/',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Golpe do Pix',
    description: 'Pedidos urgentes de transferência ou devolução.',
    source: 'Banco Central',
    url: 'https://bcb.gov.br/estabilidadefinanceira/pix-seguranca',
  },
  {
    icon: 'link-outline',
    title: 'Phishing',
    description: 'Links falsos criados para capturar dados pessoais.',
    source: 'Febraban',
    url: 'https://portal.febraban.org.br/DetalheAntifraude/8/pt-br/',
  },
  {
    icon: 'people-outline',
    title: 'Falso familiar',
    description: 'Alguém se passa por parente usando outro número.',
    source: 'Nubank',
    url: 'https://blog.nubank.com.br/golpe-do-novo-numero/',
  },
] as const;

export function LearnScreen({ navigate }: LearnScreenProps) {
  return (
    <AppScreen activeTab="learn" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.learnContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Aprenda a se proteger</Text>
          <Text style={styles.pageSubtitle}>Conheça os golpes mais comuns e os sinais de alerta.</Text>
        </Entrance>

        <View style={styles.lessonList}>
          {lessons.map((lesson, index) => (
            <Entrance key={lesson.url} delay={110 + index * 70}>
              <Link href={lesson.url} asChild target="_blank" rel="noopener noreferrer">
                <MotionPressable
                  accessibilityRole="link"
                  accessibilityLabel={`${lesson.title}, guia de ${lesson.source}`}
                  accessibilityHint="Abre no navegador"
                  style={styles.lessonCard}>
                  <View style={styles.lessonIconBox}>
                    <Ionicons name={lesson.icon} size={23} color={palette.green} />
                  </View>
                  <View style={styles.lessonBody}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDescription}>{lesson.description}</Text>
                    <Text style={styles.lessonLink}>Ver guia · {lesson.source} ↗</Text>
                  </View>
                </MotionPressable>
              </Link>
            </Entrance>
          ))}
        </View>

        <Entrance delay={430}>
          <View style={styles.goldenRuleCard}>
            <Text style={styles.goldenRuleLabel}>Regra de ouro</Text>
            <Text style={styles.goldenRuleText}>Na dúvida, confirme sempre por um canal oficial.</Text>
          </View>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
