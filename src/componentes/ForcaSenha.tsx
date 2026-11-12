import React from 'react';
import { Text, View } from 'react-native';

import { estilos } from '@/src/estilos/aplicativo';
import { avaliarForcaSenha } from '@/src/utilitarios/validacao';

export type PropriedadesForcaSenha = {
  senha: string;
};

/**
 * Exibe visualmente a avaliação local da senha durante o cadastro.
 */
export function ForcaSenha({ senha }: PropriedadesForcaSenha) {
  const forca = avaliarForcaSenha(senha);

  return (
    <View style={estilos.passwordStrength}>
      <View style={estilos.passwordStrengthHeader}>
        <Text style={estilos.passwordStrengthTitle}>Força da senha</Text>
        <Text style={[estilos.passwordStrengthLabel, { color: forca.cor }]}>{forca.rotulo}</Text>
      </View>
      <View style={estilos.passwordStrengthBars}>
        {[1, 2, 3, 4].map((etapa) => (
          <View
            key={etapa}
            style={[
              estilos.passwordStrengthBar,
              etapa <= forca.pontuacao && { backgroundColor: forca.cor },
            ]}
          />
        ))}
      </View>
      <Text style={estilos.passwordRequirements}>
        Use 8+ caracteres, maiúscula, minúscula, número e símbolo.
      </Text>
    </View>
  );
}
