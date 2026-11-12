import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';

export type PropriedadesAvisoAutenticacao = {
  mensagem?: string;
  tom?: 'error' | 'success';
};

/**
 * Apresenta erros ou confirmações de autenticação com anúncio acessível para leitores de tela.
 */
export function AvisoAutenticacao({ mensagem, tom = 'error' }: PropriedadesAvisoAutenticacao) {
  if (!mensagem) return null;

  const sucesso = tom === 'success';

  return (
    <View style={[estilos.authFeedback, sucesso && estilos.authFeedbackSuccess]}>
      <Ionicons
        name={sucesso ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={17}
        color={sucesso ? paleta.greenSuccess : paleta.red}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={[estilos.authFeedbackText, sucesso && estilos.authFeedbackTextSuccess]}
      >
        {mensagem}
      </Text>
    </View>
  );
}
