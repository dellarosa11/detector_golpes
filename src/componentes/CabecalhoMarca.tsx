import React from 'react';
import { Text, View } from 'react-native';

import { estilos } from '@/src/estilos/aplicativo';
import { EntradaAnimada } from '@/src/componentes/EntradaAnimada';

export type PropriedadesCabecalhoMarca = {
  titulo: string;
  descricao: string;
};

/**
 * Reúne identidade visual, título e resumo no topo das telas de autenticação.
 */
export function CabecalhoMarca({ titulo, descricao }: PropriedadesCabecalhoMarca) {
  return (
    <View style={estilos.authHeader}>
      <EntradaAnimada atraso={30}>
        <View style={estilos.brandRow}>
          <View style={estilos.logoBox}>
            <Text style={estilos.logoText}>DG</Text>
          </View>
          <View>
            <Text style={estilos.brandName}>Detector de Golpes</Text>
            <Text style={estilos.brandTagline}>Segurança digital</Text>
          </View>
        </View>
      </EntradaAnimada>
      <EntradaAnimada atraso={90}>
        <Text style={estilos.authTitle}>{titulo}</Text>
      </EntradaAnimada>
      <EntradaAnimada atraso={140}>
        <Text style={estilos.authDescription}>{descricao}</Text>
      </EntradaAnimada>
    </View>
  );
}
