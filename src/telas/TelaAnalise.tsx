import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import { TelaBase, CabecalhoVoltar, EntradaAnimada, BotaoAnimado } from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';

export type PropriedadesTelaAnalise = {
  navegar: Navegar;
  mensagem: string;
  aoAlterarMensagem: (mensagem: string) => void;
  aoAnalisar: () => Promise<void>;
  erro?: string;
};

export function TelaAnalise({
  navegar,
  mensagem,
  aoAlterarMensagem,
  aoAnalisar,
  erro,
}: PropriedadesTelaAnalise) {
  const [mensagemEmFoco, definirFocoMensagem] = useState(false);
  const podeAnalisar = Boolean(mensagem.trim());

  return (
    <TelaBase>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.analyzeContent}
      >
        <EntradaAnimada atraso={20}>
          <CabecalhoVoltar titulo="Analisar mensagem" aoVoltar={() => navegar('inicio')} />
          <Text style={estilos.analyzeSubtitle}>Cole abaixo a mensagem que você recebeu.</Text>
        </EntradaAnimada>

        <EntradaAnimada atraso={140}>
          <Text style={[estilos.fieldTitle, mensagemEmFoco && estilos.fieldTitleFocused]}>
            Mensagem recebida
          </Text>
          <View style={[estilos.messageBox, mensagemEmFoco && estilos.messageBoxFocused]}>
            <TextInput
              accessibilityLabel="Mensagem recebida"
              maxLength={1500}
              multiline
              onBlur={() => definirFocoMensagem(false)}
              onChangeText={aoAlterarMensagem}
              onFocus={() => definirFocoMensagem(true)}
              placeholder="Ex.: “Detectamos uma compra de R$ 2.599. Caso não reconheça, acesse imediatamente...”"
              placeholderTextColor={paleta.muted}
              selectionColor={paleta.green}
              style={estilos.messageInput}
              textAlignVertical="top"
              value={mensagem}
            />
            <Text style={[estilos.characterCount, mensagemEmFoco && estilos.characterCountFocused]}>
              {mensagem.length} / 1500 caracteres
            </Text>
          </View>
        </EntradaAnimada>
        <EntradaAnimada atraso={220}>
          <View style={estilos.privacyCard}>
            <View style={estilos.privacyTitleRow}>
              <Ionicons name="lock-closed-outline" size={15} color={paleta.green} />
              <Text style={estilos.privacyCardTitle}>Privacidade</Text>
            </View>
            <Text style={estilos.privacyCardText}>
              Evite enviar CPF, senha, número de cartão ou outros dados pessoais.
            </Text>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={290}>
          {erro ? (
            <View style={estilos.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={paleta.red} />
              <Text accessibilityLiveRegion="polite" style={estilos.saveFeedbackText}>
                {erro}
              </Text>
            </View>
          ) : null}
          <BotaoAnimado
            accessibilityRole="button"
            accessibilityState={{ disabled: !podeAnalisar }}
            disabled={!podeAnalisar}
            onPress={() => void aoAnalisar()}
            style={[estilos.primaryGreenButton, !podeAnalisar && estilos.buttonDisabled]}
          >
            <Text style={estilos.primaryGreenButtonText}>Analisar risco</Text>
            <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
          </BotaoAnimado>
          <Text style={estilos.disclaimer}>
            A análise é educativa e não substitui a confirmação com a instituição oficial.
          </Text>
        </EntradaAnimada>
      </ScrollView>
    </TelaBase>
  );
}
