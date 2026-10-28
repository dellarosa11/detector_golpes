import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import { deleteAnalysis, firebaseErrorMessage, type StoredAnalysis } from '@/lib/firebase-data';
import { AppScreen, AuthFeedback, BackHeader, Entrance, MotionPressable } from '@/src/components';
import { formatHistoryDate } from '@/src/utils/formatters';
import { analysisTypePresentation, historyToneStyle } from './historyHelpers';

export type HistoryDetailScreenProps = {
  entry: StoredAnalysis;
  userId: string;
  onBack: () => void;
  onDeleted: () => void;
};

/**
 * Mostra os dados completos de uma análise salva e permite removê-la do Firestore.
 */
export function HistoryDetailScreen({
  entry,
  userId,
  onBack,
  onDeleted,
}: HistoryDetailScreenProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const toneStyle = historyToneStyle(entry.tone);
  const type = analysisTypePresentation[entry.analysisType];

  const removeEntry = async () => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteAnalysis(userId, entry.id);
      onDeleted();
    } catch (error) {
      setDeleteError(firebaseErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.historyDetailContent}>
        <Entrance delay={20}>
          <BackHeader title="Detalhes da análise" onBack={onBack} />
        </Entrance>

        <Entrance delay={80}>
          <View style={[styles.historyDetailRiskCard, { backgroundColor: toneStyle.backgroundColor }]}>
            <View style={styles.historyDetailRiskText}>
              <Text style={[styles.historyDetailRiskLabel, { color: toneStyle.color }]}>RISCO {entry.level.toUpperCase()}</Text>
              <Text numberOfLines={2} style={styles.historyDetailTitle}>{entry.title}</Text>
            </View>
            <Text style={[styles.historyDetailScore, { color: toneStyle.color }]}>{entry.risk}%</Text>
          </View>
        </Entrance>

        <Entrance delay={140}>
          <View style={styles.historyMetadataCard}>
            <View style={styles.historyMetadataItem}>
              <Ionicons name={type.icon} size={17} color={palette.green} />
              <View>
                <Text style={styles.historyMetadataLabel}>Tipo</Text>
                <Text style={styles.historyMetadataValue}>{type.label}</Text>
              </View>
            </View>
            <View style={styles.historyMetadataDivider} />
            <View style={styles.historyMetadataItem}>
              <Ionicons name="calendar-outline" size={17} color={palette.green} />
              <View>
                <Text style={styles.historyMetadataLabel}>Salva em</Text>
                <Text style={styles.historyMetadataValue}>{formatHistoryDate(entry.createdAt)}</Text>
              </View>
            </View>
          </View>
        </Entrance>

        <Entrance delay={200}>
          <Text style={styles.historyDetailSectionTitle}>Conteúdo analisado</Text>
          <View style={styles.historyMessageCard}>
            <Text selectable style={styles.historyMessageText}>
              {entry.message || 'O conteúdo original não está disponível neste registro.'}
            </Text>
          </View>
        </Entrance>

        <Entrance delay={260}>
          <Text style={styles.historyDetailSectionTitle}>Sinais encontrados</Text>
          <View style={styles.historyDetailWarnings}>
            {(entry.warnings.length > 0 ? entry.warnings : ['Este registro antigo não possui sinais detalhados.']).map((warning) => (
              <View key={warning} style={styles.historyDetailWarningRow}>
                <View style={styles.warningIconBox}>
                  <Text style={styles.warningIcon}>!</Text>
                </View>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        </Entrance>

        <Entrance delay={320}>
          <View style={styles.adviceCard}>
            <View style={styles.adviceTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={palette.green} />
              <Text style={styles.adviceTitle}>Recomendação</Text>
            </View>
            <Text style={styles.adviceText}>
              {entry.advice || 'Analise novamente a mensagem para receber uma recomendação detalhada.'}
            </Text>
            <Text style={styles.historyModelText}>Modelo: {entry.modelVersion}</Text>
          </View>
        </Entrance>

        <Entrance delay={380}>
          {deleteError ? <AuthFeedback message={deleteError} /> : null}
          {confirmDelete ? (
            <View style={styles.deleteConfirmCard}>
              <Text style={styles.deleteConfirmTitle}>Excluir esta análise?</Text>
              <Text style={styles.deleteConfirmText}>Ela será removida do seu histórico e não poderá ser recuperada.</Text>
              <View style={styles.deleteConfirmActions}>
                <MotionPressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={() => setConfirmDelete(false)}
                  style={styles.cancelDeleteButton}>
                  <Text style={styles.cancelDeleteText}>Cancelar</Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={removeEntry}
                  style={[styles.confirmDeleteButton, deleting && styles.buttonDisabled]}>
                  <Text style={styles.confirmDeleteText}>{deleting ? 'Excluindo…' : 'Sim, excluir'}</Text>
                </MotionPressable>
              </View>
            </View>
          ) : (
            <MotionPressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              style={styles.deleteHistoryButton}>
              <Ionicons name="trash-outline" size={17} color={palette.red} />
              <Text style={styles.deleteHistoryButtonText}>Excluir do histórico</Text>
            </MotionPressable>
          )}
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
