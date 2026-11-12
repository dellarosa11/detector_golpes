import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import { BotaoAnimado } from '@/src/componentes/BotaoAnimado';
import { MolduraTela } from '@/src/componentes/MolduraTela';
import type { Navegar } from '@/src/tipos/navegacao';

export type Aba = 'inicio' | 'historico' | 'aprender' | 'conta';

export type PropriedadesTelaBase = {
  children: React.ReactNode;
  abaAtiva?: Aba;
  navegar?: Navegar;
};

/**
 * Renderiza a navegação inferior interna e destaca a seção atualmente selecionada.
 */
export function BarraDeAbas({ ativo, navegar }: { ativo: Aba; navegar: Navegar }) {
  const itens: {
    chave: Aba;
    rotulo: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }[] = [
    { chave: 'inicio', rotulo: 'Início', icon: 'home-outline' },
    { chave: 'historico', rotulo: 'Histórico', icon: 'menu-outline' },
    { chave: 'aprender', rotulo: 'Aprender', icon: 'help-outline' },
    { chave: 'conta', rotulo: 'Conta', icon: 'person-outline' },
  ];

  return (
    <View style={estilos.bottomNavigation}>
      {itens.map((item) => {
        const selecionado = ativo === item.chave;
        const cor = selecionado ? paleta.green : paleta.muted;
        return (
          <BotaoAnimado
            accessibilityRole="button"
            accessibilityLabel={item.rotulo}
            key={item.chave}
            onPress={() => navegar(item.chave)}
            style={estilos.navItem}
          >
            <View style={[estilos.navIconBox, selecionado && estilos.navIconBoxActive]}>
              <Ionicons name={item.icon} size={19} color={cor} />
            </View>
            <Text style={[estilos.navLabel, selecionado && estilos.navLabelActive]}>
              {item.rotulo}
            </Text>
          </BotaoAnimado>
        );
      })}
    </View>
  );
}

/**
 * Estrutura comum das telas autenticadas, com área segura e navegação inferior personalizada.
 */
export function TelaBase({ children, abaAtiva, navegar }: PropriedadesTelaBase) {
  return (
    <MolduraTela>
      <View style={estilos.appScreen}>{children}</View>
      {abaAtiva && navegar ? <BarraDeAbas ativo={abaAtiva} navegar={navegar} /> : null}
    </MolduraTela>
  );
}
