import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import { AppScreen, BackHeader, Entrance, MotionPressable } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type AnalyzeScreenProps = {
  navigate: Navigate;
  message: string;
  onChangeMessage: (message: string) => void;
  onAnalyze: () => Promise<void>;
  error?: string;
};

export function AnalyzeScreen({
  navigate,
  message,
  onChangeMessage,
  onAnalyze,
  error,
}: AnalyzeScreenProps) {
  const [messageFocused, setMessageFocused] = useState(false);
  const canAnalyze = Boolean(message.trim());

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.analyzeContent}>
        <Entrance delay={20}>
          <BackHeader title="Analisar mensagem" onBack={() => navigate('home')} />
          <Text style={styles.analyzeSubtitle}>Cole abaixo a mensagem que você recebeu.</Text>
        </Entrance>

        <Entrance delay={140}>
          <Text style={[styles.fieldTitle, messageFocused && styles.fieldTitleFocused]}>
            Mensagem recebida
          </Text>
          <View style={[styles.messageBox, messageFocused && styles.messageBoxFocused]}>
            <TextInput
              accessibilityLabel="Mensagem recebida"
              maxLength={1500}
              multiline
              onBlur={() => setMessageFocused(false)}
              onChangeText={onChangeMessage}
              onFocus={() => setMessageFocused(true)}
              placeholder="Ex.: “Detectamos uma compra de R$ 2.599. Caso não reconheça, acesse imediatamente...”"
              placeholderTextColor={palette.muted}
              selectionColor={palette.green}
              style={styles.messageInput}
              textAlignVertical="top"
              value={message}
            />
            <Text style={[styles.characterCount, messageFocused && styles.characterCountFocused]}>
              {message.length} / 1500 caracteres
            </Text>
          </View>
        </Entrance>
        <Entrance delay={220}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyTitleRow}>
              <Ionicons name="lock-closed-outline" size={15} color={palette.green} />
              <Text style={styles.privacyCardTitle}>Privacidade</Text>
            </View>
            <Text style={styles.privacyCardText}>Evite enviar CPF, senha, número de cartão ou outros dados pessoais.</Text>
          </View>
        </Entrance>

        <Entrance delay={290}>
          {error ? (
            <View style={styles.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.red} />
              <Text accessibilityLiveRegion="polite" style={styles.saveFeedbackText}>
                {error}
              </Text>
            </View>
          ) : null}
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAnalyze }}
            disabled={!canAnalyze}
            onPress={() => void onAnalyze()}
            style={[styles.primaryGreenButton, !canAnalyze && styles.buttonDisabled]}>
            <Text style={styles.primaryGreenButtonText}>Analisar risco</Text>
            <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
          </MotionPressable>
          <Text style={styles.disclaimer}>
            A análise é educativa e não substitui a confirmação com a instituição oficial.
          </Text>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
