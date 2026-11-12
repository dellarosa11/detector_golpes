import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { temaEscuroAtivo, estilos } from '@/src/estilos/aplicativo';

export type PropriedadesMolduraTela = {
  children: React.ReactNode;
  autenticacao?: boolean;
};

/**
 * Mantém largura de telefone quando aberto em telas grandes (web/tablet)
 * e ocupa a tela inteira com safe area e orbs de ambientação no aparelho.
 */
export function MolduraTela({ children, autenticacao = false }: PropriedadesMolduraTela) {
  const naWeb = Platform.OS === 'web';

  return (
    <View style={estilos.stage}>
      <StatusBar style={temaEscuroAtivo ? 'light' : 'dark'} hidden={naWeb} />
      <SafeAreaView
        edges={naWeb ? [] : ['top', 'right', 'bottom', 'left']}
        style={[estilos.phoneFrame, autenticacao && estilos.authPhoneFrame]}
      >
        <View
          style={[
            estilos.ambientOrb,
            autenticacao ? estilos.ambientOrbAuth : estilos.ambientOrbApp,
          ]}
        />
        <View style={estilos.ambientOrbBottom} />
        {children}
      </SafeAreaView>
    </View>
  );
}
