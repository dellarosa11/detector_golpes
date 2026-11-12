import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';

export type PropriedadesCabecalhoVoltar = {
  titulo: string;
  aoVoltar: () => void;
};

/**
 * Cabeçalho compacto para retornar à tela anterior e identificar a etapa atual.
 */
export function CabecalhoVoltar({ titulo, aoVoltar }: PropriedadesCabecalhoVoltar) {
  return (
    <View style={estilos.backHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={aoVoltar}
        hitSlop={10}
        style={estilos.backButton}
      >
        <Ionicons name="chevron-back" size={24} color={paleta.text} />
      </Pressable>
      <Text style={estilos.backHeaderTitle}>{titulo}</Text>
    </View>
  );
}
