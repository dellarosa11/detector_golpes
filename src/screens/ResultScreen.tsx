import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { palette, riskPresentation, styles } from '@/components/detector-app.styles';
import { firebaseErrorMessage, saveAnalysis, type AnalysisType } from '@/lib/firebase-data';
import type { RiskAnalysis } from '@/lib/risk-classifier';
import { AppScreen, BackHeader, Entrance, MotionPressable, RiskProgress } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type ResultScreenProps = {
  navigate: Navigate;
  analysisType: AnalysisType;
  message: string;
  result: RiskAnalysis;
  userId?: string;
};

/**
 * Exibe o resultado dinâmico da API e permite gravá-lo no histórico do usuário.
 */
export function ResultScreen({
  navigate,
  analysisType,
  message,
  result,
  userId,
}: ResultScreenProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const presentation = riskPresentation[result.level];

  const saveToHistory = async () => {
    setSaveError(undefined);
    if (!userId) {
      setSaveError('Entre em uma conta ou use o acesso como visitante para salvar a análise.');
      return;
    }

    setSaving(true);
    try {
      const cleanMessage = message.trim().replace(/\s+/g, ' ');
      const fallbackTitle =
        analysisType === 'image'
          ? 'Imagem analisada'
          : analysisType === 'link'
            ? 'Link analisado'
            : 'Mensagem analisada';
      await saveAnalysis(userId, {
        title: cleanMessage ? cleanMessage.slice(0, 44) : fallbackTitle,
        message: message.trim(),
        risk: Math.round(Math.max(0, Math.min(100, result.riskScore))),
        level: presentation.title,
        tone: presentation.tone,
        analysisType,
        warnings: result.warnings.slice(0, 8),
        advice: result.advice.slice(0, 1200),
        modelVersion: (result.modelVersion || 'não informada').slice(0, 120),
      });
      navigate('history');
    } catch (error) {
      setSaveError(firebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultContent}>
        <Entrance delay={20}>
          <BackHeader title="Resultado da análise" onBack={() => navigate('analyze')} />
        </Entrance>

        <Entrance delay={90}>
          <View
            style={[
              styles.riskCard,
              {
                backgroundColor: presentation.backgroundColor,
                borderColor: presentation.borderColor,
              },
            ]}>
            <View style={styles.riskLabelRow}>
              <View
                style={[
                  styles.riskAlertIcon,
                  { backgroundColor: `${presentation.color}18` },
                ]}>
                <Ionicons name={presentation.icon} size={16} color={presentation.color} />
              </View>
              <Text style={[styles.riskLabel, { color: presentation.color }]}>
                RISCO {presentation.title.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.riskValue, { color: presentation.color }]}>
              {result.riskScore}%
            </Text>
            <Text style={styles.riskDescription}>pontuação estimada pela análise combinada</Text>
            <View style={[styles.riskTrack, { backgroundColor: presentation.trackColor }]}>
              <RiskProgress value={result.riskScore / 100} color={presentation.color} />
            </View>
          </View>
        </Entrance>

        {analysisType !== 'message' ? (
          <Entrance delay={150}>
            <View style={styles.resultSourceCard}>
              <View style={styles.resultSourceTitleRow}>
                <Ionicons
                  name={analysisType === 'image' ? 'scan-outline' : 'link-outline'}
                  size={16}
                  color={palette.green}
                />
                <Text style={styles.resultSourceTitle}>
                  {analysisType === 'image' ? 'Texto identificado na imagem' : 'Endereço analisado'}
                </Text>
              </View>
              <Text numberOfLines={analysisType === 'image' ? 6 : 3} style={styles.resultSourceText}>
                {message}
              </Text>
            </View>
          </Entrance>
        ) : null}

        <Entrance delay={180}>
          <Text style={styles.resultSectionTitle}>
            {analysisType === 'image'
              ? 'Sinais observados no texto da imagem'
              : analysisType === 'link'
                ? 'Sinais observados no endereço'
                : 'Sinais observados na mensagem'}
          </Text>
        </Entrance>
        <View style={styles.warningList}>
          {result.warnings.map((warning, index) => (
            <Entrance key={warning} delay={230 + index * 65}>
              <View style={styles.warningCard}>
                <View style={styles.warningIconBox}>
                  <Text style={styles.warningIcon}>!</Text>
                </View>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            </Entrance>
          ))}
        </View>

        <Entrance delay={520}>
          <View style={styles.adviceCard}>
            <View style={styles.adviceTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={palette.green} />
              <Text style={styles.adviceTitle}>O que fazer agora</Text>
            </View>
            <Text style={styles.adviceText}>
              {result.advice}
            </Text>
          </View>
        </Entrance>

        <Entrance delay={580}>
          {saveError ? (
            <View style={styles.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.red} />
              <Text accessibilityLiveRegion="polite" style={styles.saveFeedbackText}>
                {saveError}
              </Text>
            </View>
          ) : null}
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={saveToHistory}
            style={[styles.secondaryGreenButton, saving && styles.buttonDisabled]}>
            <Text style={styles.secondaryGreenButtonText}>
              {saving ? 'Salvando…' : 'Salvar no histórico'}
            </Text>
          </MotionPressable>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
