import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { paleta, apresentacaoRisco, estilos } from '@/src/estilos/aplicativo';
import { mensagemErroFirebase } from '@/src/servicos/firebase/conta';
import { salvarAnalise } from '@/src/servicos/firebase/historico';
import type { ResultadoAnalise } from '@/src/servicos/classificador';
import {
  TelaBase,
  CabecalhoVoltar,
  EntradaAnimada,
  BotaoAnimado,
  BarraRisco,
} from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';

export type PropriedadesTelaResultado = {
  navegar: Navegar;
  mensagem: string;
  resultado: ResultadoAnalise;
  idUsuario?: string;
};

/**
 * Exibe o resultado dinâmico da API e permite gravá-lo no histórico do usuário.
 */
export function TelaResultado({
  navegar,
  mensagem,
  resultado,
  idUsuario,
}: PropriedadesTelaResultado) {
  const [salvando, definirSalvamento] = useState(false);
  const [erroAoSalvar, definirErroAoSalvar] = useState<string>();
  const apresentacao = apresentacaoRisco[resultado.level];

  const salvarNoHistorico = async () => {
    definirErroAoSalvar(undefined);
    if (!idUsuario) {
      definirErroAoSalvar(
        'Entre em uma conta ou use o acesso como visitante para salvar a análise.'
      );
      return;
    }

    definirSalvamento(true);
    try {
      const mensagemLimpa = mensagem.trim().replace(/\s+/g, ' ');
      await salvarAnalise(idUsuario, {
        title: mensagemLimpa ? mensagemLimpa.slice(0, 44) : 'Mensagem analisada',
        message: mensagem.trim(),
        risk: Math.round(Math.max(0, Math.min(100, resultado.riskScore))),
        level: apresentacao.titulo,
        tone: apresentacao.tom,
        analysisType: 'message',
        warnings: resultado.warnings.slice(0, 8),
        advice: resultado.advice.slice(0, 1200),
        modelVersion: (resultado.modelVersion || 'não informada').slice(0, 120),
      });
      navegar('historico');
    } catch (erro) {
      definirErroAoSalvar(mensagemErroFirebase(erro));
    } finally {
      definirSalvamento(false);
    }
  };

  return (
    <TelaBase>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.resultContent}
      >
        <EntradaAnimada atraso={20}>
          <CabecalhoVoltar titulo="Resultado da análise" aoVoltar={() => navegar('analise')} />
        </EntradaAnimada>

        <EntradaAnimada atraso={90}>
          <View
            style={[
              estilos.riskCard,
              {
                backgroundColor: apresentacao.backgroundColor,
                borderColor: apresentacao.borderColor,
              },
            ]}
          >
            <View style={estilos.riskLabelRow}>
              <View style={[estilos.riskAlertIcon, { backgroundColor: `${apresentacao.cor}18` }]}>
                <Ionicons name={apresentacao.icon} size={16} color={apresentacao.cor} />
              </View>
              <Text style={[estilos.riskLabel, { color: apresentacao.cor }]}>
                RISCO {apresentacao.titulo.toUpperCase()}
              </Text>
            </View>
            <Text style={[estilos.riskValue, { color: apresentacao.cor }]}>
              {resultado.riskScore}%
            </Text>
            <Text style={estilos.riskDescription}>pontuação estimada pela análise combinada</Text>
            <View style={[estilos.riskTrack, { backgroundColor: apresentacao.trackColor }]}>
              <BarraRisco valor={resultado.riskScore / 100} cor={apresentacao.cor} />
            </View>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={180}>
          <Text style={estilos.resultSectionTitle}>Sinais observados na mensagem</Text>
        </EntradaAnimada>
        <View style={estilos.warningList}>
          {resultado.warnings.map((alerta, indice) => (
            <EntradaAnimada key={alerta} atraso={230 + indice * 65}>
              <View style={estilos.warningCard}>
                <View style={estilos.warningIconBox}>
                  <Text style={estilos.warningIcon}>!</Text>
                </View>
                <Text style={estilos.warningText}>{alerta}</Text>
              </View>
            </EntradaAnimada>
          ))}
        </View>

        <EntradaAnimada atraso={520}>
          <View style={estilos.adviceCard}>
            <View style={estilos.adviceTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={paleta.green} />
              <Text style={estilos.adviceTitle}>O que fazer agora</Text>
            </View>
            <Text style={estilos.adviceText}>{resultado.advice}</Text>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={580}>
          {erroAoSalvar ? (
            <View style={estilos.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={paleta.red} />
              <Text accessibilityLiveRegion="polite" style={estilos.saveFeedbackText}>
                {erroAoSalvar}
              </Text>
            </View>
          ) : null}
          <BotaoAnimado
            accessibilityRole="button"
            accessibilityState={{ disabled: salvando }}
            disabled={salvando}
            onPress={salvarNoHistorico}
            style={[estilos.secondaryGreenButton, salvando && estilos.buttonDisabled]}
          >
            <Text style={estilos.secondaryGreenButtonText}>
              {salvando ? 'Salvando…' : 'Salvar no histórico'}
            </Text>
          </BotaoAnimado>
        </EntradaAnimada>
      </ScrollView>
    </TelaBase>
  );
}
