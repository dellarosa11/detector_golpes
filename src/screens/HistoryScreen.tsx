import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  firebaseErrorMessage,
  getCachedAnalyses,
  peekCachedAnalyses,
  subscribeToAnalyses,
  type AnalysisTone,
  type AnalysisType,
  type StoredAnalysis,
} from '@/lib/firebase-data';
import { AppScreen, Entrance, MotionPressable } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';
import { formatHistoryDate, normalizeSearch } from '@/src/utils/formatters';
import { HistoryDetailScreen } from './HistoryDetailScreen';
import { analysisTypePresentation, historyToneStyle } from './historyHelpers';

export type HistoryScreenProps = {
  navigate: Navigate;
  userId?: string;
};

// Botão visual compartilhado pelos filtros de risco e tipo no histórico.
function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </MotionPressable>
  );
}

// Resumo clicável de uma análise salva, com data, tipo e nível de risco.
function HistoryCard({ entry, onPress }: { entry: StoredAnalysis; onPress: () => void }) {
  const toneStyle = historyToneStyle(entry.tone);
  const type = analysisTypePresentation[entry.analysisType];

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir análise ${entry.title}`}
      onPress={onPress}
      style={styles.historyCard}>
      <View style={styles.historyCardTopRow}>
        <View style={styles.historyTypeRow}>
          <Ionicons name={type.icon} size={13} color={palette.muted} />
          <Text style={styles.historyDate}>{type.label} · {formatHistoryDate(entry.createdAt)}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: toneStyle.backgroundColor }]}>
          <Text style={[styles.riskBadgeText, { color: toneStyle.color }]}>{entry.level}</Text>
        </View>
      </View>
      <View style={styles.historyCardBody}>
        <View style={styles.historyCardText}>
          <Text numberOfLines={1} style={styles.historyTitle}>{entry.title}</Text>
          <Text style={[styles.historyRisk, { color: toneStyle.color }]}>Risco {entry.risk}%</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>
    </MotionPressable>
  );
}

/**
 * Assina as atualizações do Firestore e adiciona busca, filtros e detalhes completos.
 */
export function HistoryScreen({ navigate, userId }: HistoryScreenProps) {
  const cachedAtMount = userId ? peekCachedAnalyses(userId) : null;
  const [historyEntries, setHistoryEntries] = useState<StoredAnalysis[]>(cachedAtMount ?? []);
  const [loadingHistory, setLoadingHistory] = useState(
    Boolean(userId && isFirebaseConfigured && !cachedAtMount)
  );
  const [historyError, setHistoryError] = useState<string | undefined>(() => {
    if (!isFirebaseConfigured) return 'Configure o Firebase para carregar o histórico.';
    if (!userId) return 'Entre em uma conta ou use o acesso como visitante.';
    return undefined;
  });
  const [historyCacheError, setHistoryCacheError] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | AnalysisTone>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AnalysisType>('all');
  const [selectedEntry, setSelectedEntry] = useState<StoredAnalysis>();

  useEffect(() => {
    if (!isFirebaseConfigured || !userId) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;

    const startSubscription = async () => {
      try {
        const cachedAnalyses = await getCachedAnalyses(userId);
        if (active && cachedAnalyses) {
          setHistoryEntries(cachedAnalyses);
          setLoadingHistory(false);
        }
      } catch {
        if (active) setHistoryCacheError(true);
      }

      if (!active) return;

      try {
        unsubscribe = subscribeToAnalyses(
          userId,
          (analyses) => {
            setHistoryEntries(analyses);
            setHistoryError(undefined);
            setLoadingHistory(false);
          },
          (error) => {
            setHistoryError(firebaseErrorMessage(error));
            setLoadingHistory(false);
          },
          () => setHistoryCacheError(true)
        );
      } catch (error) {
        setHistoryError(firebaseErrorMessage(error));
        setLoadingHistory(false);
      }
    };

    void startSubscription();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [userId]);

  const filteredEntries = useMemo(() => {
    const term = normalizeSearch(search.trim());
    return historyEntries.filter((entry) => {
      const matchesRisk = riskFilter === 'all' || entry.tone === riskFilter;
      const matchesType = typeFilter === 'all' || entry.analysisType === typeFilter;
      const searchableText = normalizeSearch(
        `${entry.title} ${entry.message} ${entry.level} ${analysisTypePresentation[entry.analysisType].label}`
      );
      return matchesRisk && matchesType && (!term || searchableText.includes(term));
    });
  }, [historyEntries, riskFilter, search, typeFilter]);

  if (selectedEntry && userId) {
    return (
      <HistoryDetailScreen
        entry={selectedEntry}
        onBack={() => setSelectedEntry(undefined)}
        onDeleted={() => setSelectedEntry(undefined)}
        userId={userId}
      />
    );
  }

  const hasActiveFilters = Boolean(search.trim()) || riskFilter !== 'all' || typeFilter !== 'all';

  return (
    <AppScreen activeTab="history" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.historyContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Histórico</Text>
          <Text style={styles.pageSubtitle}>Pesquise, filtre e reveja suas análises salvas.</Text>
        </Entrance>
        {historyCacheError ? (
          <Text style={styles.historyStateText}>
            Não foi possível salvar o histórico neste aparelho. Ele continuará sincronizado com o Firebase.
          </Text>
        ) : null}
        {historyError && historyEntries.length > 0 ? (
          <Text style={styles.historyStateText}>
            Não foi possível atualizar. Exibindo as análises salvas neste aparelho.
          </Text>
        ) : null}

        {historyEntries.length > 0 ? (
          <Entrance delay={85}>
            <View style={styles.historyControls}>
              <View style={styles.historySearchBox}>
                <Ionicons name="search-outline" size={18} color={palette.muted} />
                <TextInput
                  accessibilityLabel="Pesquisar no histórico"
                  autoCapitalize="none"
                  onChangeText={setSearch}
                  placeholder="Pesquisar mensagem ou título"
                  placeholderTextColor={palette.muted}
                  style={styles.historySearchInput}
                  value={search}
                />
                {search ? (
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={palette.muted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilterRow}>
                <FilterChip label="Todos os riscos" selected={riskFilter === 'all'} onPress={() => setRiskFilter('all')} />
                <FilterChip label="Alto" selected={riskFilter === 'high'} onPress={() => setRiskFilter('high')} />
                <FilterChip label="Médio" selected={riskFilter === 'medium'} onPress={() => setRiskFilter('medium')} />
                <FilterChip label="Baixo" selected={riskFilter === 'low'} onPress={() => setRiskFilter('low')} />
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilterRow}>
                <FilterChip label="Todos os tipos" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
                <FilterChip label="Mensagens" selected={typeFilter === 'message'} onPress={() => setTypeFilter('message')} />
                <FilterChip label="Links" selected={typeFilter === 'link'} onPress={() => setTypeFilter('link')} />
                <FilterChip label="Imagens" selected={typeFilter === 'image'} onPress={() => setTypeFilter('image')} />
              </ScrollView>
            </View>
          </Entrance>
        ) : null}

        {loadingHistory && historyEntries.length === 0 ? (
          <View style={styles.historyState}>
            <ActivityIndicator color={palette.green} size="small" />
            <Text style={styles.historyStateText}>Carregando análises…</Text>
          </View>
        ) : historyError && historyEntries.length === 0 ? (
          <View style={styles.historyState}>
            <View style={styles.historyStateIcon}>
              <Ionicons name="cloud-offline-outline" size={23} color={palette.muted} />
            </View>
            <Text style={styles.historyStateTitle}>Histórico indisponível</Text>
            <Text style={styles.historyStateText}>{historyError}</Text>
          </View>
        ) : historyEntries.length === 0 ? (
          <View style={styles.historyState}>
            <View style={styles.historyStateIcon}>
              <Ionicons name="document-text-outline" size={23} color={palette.green} />
            </View>
            <Text style={styles.historyStateTitle}>Nenhuma análise salva</Text>
            <Text style={styles.historyStateText}>Seus próximos resultados aparecerão aqui.</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.historyState}>
            <View style={styles.historyStateIcon}>
              <Ionicons name="search-outline" size={23} color={palette.green} />
            </View>
            <Text style={styles.historyStateTitle}>Nenhum resultado encontrado</Text>
            <Text style={styles.historyStateText}>Tente mudar a pesquisa ou limpar os filtros.</Text>
            {hasActiveFilters ? (
              <MotionPressable
                accessibilityRole="button"
                onPress={() => {
                  setSearch('');
                  setRiskFilter('all');
                  setTypeFilter('all');
                }}
                style={styles.clearFiltersButton}>
                <Text style={styles.clearFiltersText}>Limpar filtros</Text>
              </MotionPressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.historyList}>
            <Text style={styles.historyCount}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'análise' : 'análises'}
            </Text>
            {filteredEntries.map((entry, index) => (
              <Entrance key={entry.id} delay={110 + Math.min(index, 5) * 55}>
                <HistoryCard entry={entry} onPress={() => setSelectedEntry(entry)} />
              </Entrance>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}
