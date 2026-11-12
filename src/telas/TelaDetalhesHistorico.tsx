import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import { mensagemErroFirebase } from '@/src/servicos/firebase/conta';
import { excluirAnalise, type AnaliseSalva } from '@/src/servicos/firebase/historico';
import {
  TelaBase,
  AvisoAutenticacao,
  CabecalhoVoltar,
  EntradaAnimada,
  BotaoAnimado,
} from '@/src/componentes';
import { formatarDataHistorico } from '@/src/utilitarios/formatacao';
import { apresentacaoTipoAnalise, obterEstiloRisco } from './apresentacaoHistorico';

export type PropriedadesDetalhesHistorico = {
  registro: AnaliseSalva;
  idUsuario: string;
  aoVoltar: () => void;
  aoExcluir: () => void;
};

/**
 * Mostra os dados completos de uma análise salva e permite removê-la do Firestore.
 */
export function TelaDetalhesHistorico({
  registro,
  idUsuario,
  aoVoltar,
  aoExcluir,
}: PropriedadesDetalhesHistorico) {
  const [confirmarExclusao, definirConfirmacaoExclusao] = useState(false);
  const [excluindo, definirExclusao] = useState(false);
  const [erroAoExcluir, definirErroAoExcluir] = useState<string>();
  const estiloDoRisco = obterEstiloRisco(registro.tone);
  const tipo = apresentacaoTipoAnalise[registro.analysisType];

  const excluirRegistro = async () => {
    definirExclusao(true);
    definirErroAoExcluir(undefined);
    try {
      await excluirAnalise(idUsuario, registro.id);
      aoExcluir();
    } catch (erro) {
      definirErroAoExcluir(mensagemErroFirebase(erro));
    } finally {
      definirExclusao(false);
    }
  };

  return (
    <TelaBase>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.historyDetailContent}
      >
        <EntradaAnimada atraso={20}>
          <CabecalhoVoltar titulo="Detalhes da análise" aoVoltar={aoVoltar} />
        </EntradaAnimada>

        <EntradaAnimada atraso={80}>
          <View
            style={[
              estilos.historyDetailRiskCard,
              { backgroundColor: estiloDoRisco.backgroundColor },
            ]}
          >
            <View style={estilos.historyDetailRiskText}>
              <Text style={[estilos.historyDetailRiskLabel, { color: estiloDoRisco.color }]}>
                RISCO {registro.level.toUpperCase()}
              </Text>
              <Text numberOfLines={2} style={estilos.historyDetailTitle}>
                {registro.title}
              </Text>
            </View>
            <Text style={[estilos.historyDetailScore, { color: estiloDoRisco.color }]}>
              {registro.risk}%
            </Text>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={140}>
          <View style={estilos.historyMetadataCard}>
            <View style={estilos.historyMetadataItem}>
              <Ionicons name={tipo.icon} size={17} color={paleta.green} />
              <View>
                <Text style={estilos.historyMetadataLabel}>Tipo</Text>
                <Text style={estilos.historyMetadataValue}>{tipo.rotulo}</Text>
              </View>
            </View>
            <View style={estilos.historyMetadataDivider} />
            <View style={estilos.historyMetadataItem}>
              <Ionicons name="calendar-outline" size={17} color={paleta.green} />
              <View>
                <Text style={estilos.historyMetadataLabel}>Salva em</Text>
                <Text style={estilos.historyMetadataValue}>
                  {formatarDataHistorico(registro.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={200}>
          <Text style={estilos.historyDetailSectionTitle}>Conteúdo analisado</Text>
          <View style={estilos.historyMessageCard}>
            <Text selectable style={estilos.historyMessageText}>
              {registro.message || 'O conteúdo original não está disponível neste registro.'}
            </Text>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={260}>
          <Text style={estilos.historyDetailSectionTitle}>Sinais encontrados</Text>
          <View style={estilos.historyDetailWarnings}>
            {(registro.warnings.length > 0
              ? registro.warnings
              : ['Este registro antigo não possui sinais detalhados.']
            ).map((alerta) => (
              <View key={alerta} style={estilos.historyDetailWarningRow}>
                <View style={estilos.warningIconBox}>
                  <Text style={estilos.warningIcon}>!</Text>
                </View>
                <Text style={estilos.warningText}>{alerta}</Text>
              </View>
            ))}
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={320}>
          <View style={estilos.adviceCard}>
            <View style={estilos.adviceTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={paleta.green} />
              <Text style={estilos.adviceTitle}>Recomendação</Text>
            </View>
            <Text style={estilos.adviceText}>
              {registro.advice ||
                'Analise novamente a mensagem para receber uma recomendação detalhada.'}
            </Text>
            <Text style={estilos.historyModelText}>Modelo: {registro.modelVersion}</Text>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={380}>
          {erroAoExcluir ? <AvisoAutenticacao mensagem={erroAoExcluir} /> : null}
          {confirmarExclusao ? (
            <View style={estilos.deleteConfirmCard}>
              <Text style={estilos.deleteConfirmTitle}>Excluir esta análise?</Text>
              <Text style={estilos.deleteConfirmText}>
                Ela será removida do seu histórico e não poderá ser recuperada.
              </Text>
              <View style={estilos.deleteConfirmActions}>
                <BotaoAnimado
                  accessibilityRole="button"
                  disabled={excluindo}
                  onPress={() => definirConfirmacaoExclusao(false)}
                  style={estilos.cancelDeleteButton}
                >
                  <Text style={estilos.cancelDeleteText}>Cancelar</Text>
                </BotaoAnimado>
                <BotaoAnimado
                  accessibilityRole="button"
                  disabled={excluindo}
                  onPress={excluirRegistro}
                  style={[estilos.confirmDeleteButton, excluindo && estilos.buttonDisabled]}
                >
                  <Text style={estilos.confirmDeleteText}>
                    {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                  </Text>
                </BotaoAnimado>
              </View>
            </View>
          ) : (
            <BotaoAnimado
              accessibilityRole="button"
              onPress={() => definirConfirmacaoExclusao(true)}
              style={estilos.deleteHistoryButton}
            >
              <Ionicons name="trash-outline" size={17} color={paleta.red} />
              <Text style={estilos.deleteHistoryButtonText}>Excluir do histórico</Text>
            </BotaoAnimado>
          )}
        </EntradaAnimada>
      </ScrollView>
    </TelaBase>
  );
}
