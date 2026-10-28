import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { styles } from '@/components/detector-app.styles';
import { AppScreen, Entrance } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type LearnScreenProps = {
  navigate: Navigate;
};

// Conteúdo introdutório da área educativa; pode futuramente ser movido para o Firestore.
const lessons = [
  { number: '01', title: 'Golpe do falso banco', description: 'Mensagens e ligações que simulam centrais bancárias.' },
  { number: '02', title: 'Golpe do Pix', description: 'Pedidos urgentes de transferência ou devolução.' },
  { number: '03', title: 'Phishing', description: 'Links falsos criados para capturar dados pessoais.' },
  { number: '04', title: 'Falso familiar', description: 'Alguém se passa por parente usando outro número.' },
] as const;

/**
 * Apresenta os tópicos educativos estáticos junto da navegação principal.
 */
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
            <Entrance key={lesson.number} delay={110 + index * 70}>
              <View style={styles.lessonCard}>
                <View style={styles.lessonNumberBox}>
                  <Text style={styles.lessonNumber}>{lesson.number}</Text>
                </View>
                <View style={styles.lessonBody}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonDescription}>{lesson.description}</Text>
                  <Text style={styles.lessonLink}>Ver guia →</Text>
                </View>
              </View>
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
