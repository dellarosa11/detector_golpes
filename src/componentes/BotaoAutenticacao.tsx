import React from 'react';
import { Text } from 'react-native';

import { estilos } from '@/src/estilos/aplicativo';
import { BotaoAnimado } from '@/src/componentes/BotaoAnimado';

export type PropriedadesBotaoAutenticacao = {
  rotulo: string;
  secundario?: boolean;
  desabilitado?: boolean;
  aoPressionar: () => void;
};

/**
 * Padroniza os botões de autenticação, incluindo estado secundário e indisponível.
 */
export function BotaoAutenticacao({
  rotulo,
  secundario = false,
  desabilitado = false,
  aoPressionar,
}: PropriedadesBotaoAutenticacao) {
  return (
    <BotaoAnimado
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={aoPressionar}
      style={[
        estilos.authButton,
        secundario && estilos.authButtonSecondary,
        desabilitado && estilos.authButtonDisabled,
      ]}
    >
      <Text style={[estilos.authButtonText, secundario && estilos.authButtonTextSecondary]}>
        {rotulo}
      </Text>
    </BotaoAnimado>
  );
}
