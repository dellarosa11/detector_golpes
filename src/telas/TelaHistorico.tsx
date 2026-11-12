import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import { firebaseConfigurado } from '@/src/servicos/firebase/configuracao';
import { mensagemErroFirebase } from '@/src/servicos/firebase/conta';
import {
  lerHistoricoLocal,
  consultarHistoricoEmMemoria,
  acompanharHistorico,
  type TomAnalise,
  type TipoAnalise,
  type AnaliseSalva,
} from '@/src/servicos/firebase/historico';
import { TelaBase, EntradaAnimada, BotaoAnimado } from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';
import { formatarDataHistorico, normalizarBusca } from '@/src/utilitarios/formatacao';
import { TelaDetalhesHistorico } from './TelaDetalhesHistorico';
import { apresentacaoTipoAnalise, obterEstiloRisco } from './apresentacaoHistorico';

export type PropriedadesTelaHistorico = {
  navegar: Navegar;
  idUsuario?: string;
};

// Botão visual compartilhado pelos filtros de risco e tipo no histórico.
function BotaoFiltro({
  rotulo,
  selecionado,
  aoPressionar,
}: {
  rotulo: string;
  selecionado: boolean;
  aoPressionar: () => void;
}) {
  return (
    <BotaoAnimado
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      onPress={aoPressionar}
      style={[estilos.filterChip, selecionado && estilos.filterChipSelected]}
    >
      <Text style={[estilos.filterChipText, selecionado && estilos.filterChipTextSelected]}>
        {rotulo}
      </Text>
    </BotaoAnimado>
  );
}

// Resumo clicável de uma análise salva, com data, tipo e nível de risco.
function CartaoHistorico({
  registro,
  aoPressionar,
}: {
  registro: AnaliseSalva;
  aoPressionar: () => void;
}) {
  const estiloDoRisco = obterEstiloRisco(registro.tone);
  const tipo = apresentacaoTipoAnalise[registro.analysisType];

  return (
    <BotaoAnimado
      accessibilityRole="button"
      accessibilityLabel={`Abrir análise ${registro.title}`}
      onPress={aoPressionar}
      style={estilos.historyCard}
    >
      <View style={estilos.historyCardTopRow}>
        <View style={estilos.historyTypeRow}>
          <Ionicons name={tipo.icon} size={13} color={paleta.muted} />
          <Text style={estilos.historyDate}>
            {tipo.rotulo} · {formatarDataHistorico(registro.createdAt)}
          </Text>
        </View>
        <View style={[estilos.riskBadge, { backgroundColor: estiloDoRisco.backgroundColor }]}>
          <Text style={[estilos.riskBadgeText, { color: estiloDoRisco.color }]}>
            {registro.level}
          </Text>
        </View>
      </View>
      <View style={estilos.historyCardBody}>
        <View style={estilos.historyCardText}>
          <Text numberOfLines={1} style={estilos.historyTitle}>
            {registro.title}
          </Text>
          <Text style={[estilos.historyRisk, { color: estiloDoRisco.color }]}>
            Risco {registro.risk}%
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={paleta.muted} />
      </View>
    </BotaoAnimado>
  );
}

/**
 * Assina as atualizações do Firestore e adiciona busca, filtros e detalhes completos.
 */
export function TelaHistorico({ navegar, idUsuario }: PropriedadesTelaHistorico) {
  const historicoInicial = idUsuario ? consultarHistoricoEmMemoria(idUsuario) : null;
  const [registrosHistorico, definirRegistrosHistorico] = useState<AnaliseSalva[]>(
    historicoInicial ?? []
  );
  const [carregandoHistorico, definirCarregamentoHistorico] = useState(
    Boolean(idUsuario && firebaseConfigurado && !historicoInicial)
  );
  const [erroHistorico, definirErroHistorico] = useState<string | undefined>(() => {
    if (!firebaseConfigurado) return 'Configure o Firebase para carregar o histórico.';
    if (!idUsuario) return 'Entre em uma conta ou use o acesso como visitante.';
    return undefined;
  });
  const [erroCacheHistorico, definirErroCacheHistorico] = useState(false);
  const [busca, definirBusca] = useState('');
  const [filtroRisco, definirFiltroRisco] = useState<'all' | TomAnalise>('all');
  const [filtroTipo, definirFiltroTipo] = useState<'all' | TipoAnalise>('all');
  const [registroSelecionado, definirRegistroSelecionado] = useState<AnaliseSalva>();

  useEffect(() => {
    if (!firebaseConfigurado || !idUsuario) return;

    let ativo = true;
    let cancelarInscricao: (() => void) | undefined;

    const iniciarAcompanhamento = async () => {
      try {
        const analisesEmCache = await lerHistoricoLocal(idUsuario);
        if (ativo && analisesEmCache) {
          definirRegistrosHistorico(analisesEmCache);
          definirCarregamentoHistorico(false);
        }
      } catch {
        if (ativo) definirErroCacheHistorico(true);
      }

      if (!ativo) return;

      try {
        cancelarInscricao = acompanharHistorico(
          idUsuario,
          (analises) => {
            definirRegistrosHistorico(analises);
            definirErroHistorico(undefined);
            definirCarregamentoHistorico(false);
          },
          (erro) => {
            definirErroHistorico(mensagemErroFirebase(erro));
            definirCarregamentoHistorico(false);
          },
          () => definirErroCacheHistorico(true)
        );
      } catch (erro) {
        definirErroHistorico(mensagemErroFirebase(erro));
        definirCarregamentoHistorico(false);
      }
    };

    void iniciarAcompanhamento();
    return () => {
      ativo = false;
      cancelarInscricao?.();
    };
  }, [idUsuario]);

  const registrosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    return registrosHistorico.filter((registro) => {
      const correspondeAoRisco = filtroRisco === 'all' || registro.tone === filtroRisco;
      const correspondeAoTipo = filtroTipo === 'all' || registro.analysisType === filtroTipo;
      const textoPesquisavel = normalizarBusca(
        `${registro.title} ${registro.message} ${registro.level} ${apresentacaoTipoAnalise[registro.analysisType].rotulo}`
      );
      return (
        correspondeAoRisco && correspondeAoTipo && (!termo || textoPesquisavel.includes(termo))
      );
    });
  }, [registrosHistorico, filtroRisco, busca, filtroTipo]);

  if (registroSelecionado && idUsuario) {
    return (
      <TelaDetalhesHistorico
        registro={registroSelecionado}
        aoVoltar={() => definirRegistroSelecionado(undefined)}
        aoExcluir={() => definirRegistroSelecionado(undefined)}
        idUsuario={idUsuario}
      />
    );
  }

  const temFiltrosAtivos = Boolean(busca.trim()) || filtroRisco !== 'all' || filtroTipo !== 'all';

  return (
    <TelaBase abaAtiva='historico' navegar={navegar}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estilos.historyContent}
      >
        <EntradaAnimada atraso={30}>
          <Text style={estilos.pageTitle}>Histórico</Text>
          <Text style={estilos.pageSubtitle}>Pesquise, filtre e reveja suas análises salvas.</Text>
        </EntradaAnimada>
        {erroCacheHistorico ? (
          <Text style={estilos.historyStateText}>
            Não foi possível salvar o histórico neste aparelho. Ele continuará sincronizado com o
            Firebase.
          </Text>
        ) : null}
        {erroHistorico && registrosHistorico.length > 0 ? (
          <Text style={estilos.historyStateText}>
            Não foi possível atualizar. Exibindo as análises salvas neste aparelho.
          </Text>
        ) : null}

        {registrosHistorico.length > 0 ? (
          <EntradaAnimada atraso={85}>
            <View style={estilos.historyControls}>
              <View style={estilos.historySearchBox}>
                <Ionicons name="search-outline" size={18} color={paleta.muted} />
                <TextInput
                  accessibilityLabel="Pesquisar no histórico"
                  autoCapitalize="none"
                  onChangeText={definirBusca}
                  placeholder="Pesquisar mensagem ou título"
                  placeholderTextColor={paleta.muted}
                  style={estilos.historySearchInput}
                  value={busca}
                />
                {busca ? (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => definirBusca('')}
                  >
                    <Ionicons name="close-circle" size={18} color={paleta.muted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.historyFilterRow}
              >
                <BotaoFiltro
                  rotulo="Todos os riscos"
                  selecionado={filtroRisco === 'all'}
                  aoPressionar={() => definirFiltroRisco('all')}
                />
                <BotaoFiltro
                  rotulo="Alto"
                  selecionado={filtroRisco === 'high'}
                  aoPressionar={() => definirFiltroRisco('high')}
                />
                <BotaoFiltro
                  rotulo="Médio"
                  selecionado={filtroRisco === 'medium'}
                  aoPressionar={() => definirFiltroRisco('medium')}
                />
                <BotaoFiltro
                  rotulo="Baixo"
                  selecionado={filtroRisco === 'low'}
                  aoPressionar={() => definirFiltroRisco('low')}
                />
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.historyFilterRow}
              >
                <BotaoFiltro
                  rotulo="Todos os tipos"
                  selecionado={filtroTipo === 'all'}
                  aoPressionar={() => definirFiltroTipo('all')}
                />
                <BotaoFiltro
                  rotulo="Mensagens"
                  selecionado={filtroTipo === 'message'}
                  aoPressionar={() => definirFiltroTipo('message')}
                />
                <BotaoFiltro
                  rotulo="Links"
                  selecionado={filtroTipo === 'link'}
                  aoPressionar={() => definirFiltroTipo('link')}
                />
                <BotaoFiltro
                  rotulo="Imagens"
                  selecionado={filtroTipo === 'image'}
                  aoPressionar={() => definirFiltroTipo('image')}
                />
              </ScrollView>
            </View>
          </EntradaAnimada>
        ) : null}

        {carregandoHistorico && registrosHistorico.length === 0 ? (
          <View style={estilos.historyState}>
            <ActivityIndicator color={paleta.green} size="small" />
            <Text style={estilos.historyStateText}>Carregando análises…</Text>
          </View>
        ) : erroHistorico && registrosHistorico.length === 0 ? (
          <View style={estilos.historyState}>
            <View style={estilos.historyStateIcon}>
              <Ionicons name="cloud-offline-outline" size={23} color={paleta.muted} />
            </View>
            <Text style={estilos.historyStateTitle}>Histórico indisponível</Text>
            <Text style={estilos.historyStateText}>{erroHistorico}</Text>
          </View>
        ) : registrosHistorico.length === 0 ? (
          <View style={estilos.historyState}>
            <View style={estilos.historyStateIcon}>
              <Ionicons name="document-text-outline" size={23} color={paleta.green} />
            </View>
            <Text style={estilos.historyStateTitle}>Nenhuma análise salva</Text>
            <Text style={estilos.historyStateText}>Seus próximos resultados aparecerão aqui.</Text>
          </View>
        ) : registrosFiltrados.length === 0 ? (
          <View style={estilos.historyState}>
            <View style={estilos.historyStateIcon}>
              <Ionicons name="search-outline" size={23} color={paleta.green} />
            </View>
            <Text style={estilos.historyStateTitle}>Nenhum resultado encontrado</Text>
            <Text style={estilos.historyStateText}>
              Tente mudar a pesquisa ou limpar os filtros.
            </Text>
            {temFiltrosAtivos ? (
              <BotaoAnimado
                accessibilityRole="button"
                onPress={() => {
                  definirBusca('');
                  definirFiltroRisco('all');
                  definirFiltroTipo('all');
                }}
                style={estilos.clearFiltersButton}
              >
                <Text style={estilos.clearFiltersText}>Limpar filtros</Text>
              </BotaoAnimado>
            ) : null}
          </View>
        ) : (
          <View style={estilos.historyList}>
            <Text style={estilos.historyCount}>
              {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'análise' : 'análises'}
            </Text>
            {registrosFiltrados.map((registro, indice) => (
              <EntradaAnimada key={registro.id} atraso={110 + Math.min(indice, 5) * 55}>
                <CartaoHistorico
                  registro={registro}
                  aoPressionar={() => definirRegistroSelecionado(registro)}
                />
              </EntradaAnimada>
            ))}
          </View>
        )}
      </ScrollView>
    </TelaBase>
  );
}
