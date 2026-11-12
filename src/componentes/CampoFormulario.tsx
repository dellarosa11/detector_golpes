import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';

export type PropriedadesCampoFormulario = {
  rotulo: string;
  dica: string;
  valor: string;
  aoAlterarTexto: (valor: string) => void;
  protegido?: boolean;
  tipoTeclado?: TextInputProps['keyboardType'];
  capitalizacao?: TextInputProps['autoCapitalize'];
  tipoConteudoTexto?: TextInputProps['textContentType'];
  erro?: string;
};

/**
 * Campo reutilizado no login e cadastro, incluindo foco, erro, senha e acessibilidade.
 */
export function CampoFormulario({
  rotulo,
  dica,
  valor,
  aoAlterarTexto,
  protegido = false,
  tipoTeclado = 'default',
  capitalizacao = 'sentences',
  tipoConteudoTexto,
  erro,
}: PropriedadesCampoFormulario) {
  const [senhaVisivel, definirSenhaVisivel] = useState(false);

  return (
    <View style={estilos.formField}>
      <Text style={[estilos.formLabel, erro && estilos.formLabelError]}>{rotulo}</Text>
      <View style={[estilos.inputMock, erro && estilos.inputMockError]}>
        <TextInput
          accessibilityLabel={rotulo}
          autoCapitalize={capitalizacao}
          autoCorrect={false}
          keyboardType={tipoTeclado}
          onChangeText={aoAlterarTexto}
          placeholder={dica}
          placeholderTextColor={paleta.authMuted}
          secureTextEntry={protegido && !senhaVisivel}
          selectionColor={paleta.blue}
          style={estilos.textInput}
          textContentType={tipoConteudoTexto}
          value={valor}
        />
        {protegido ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={10}
            onPress={() => definirSenhaVisivel((visivel) => !visivel)}
          >
            <Ionicons
              name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={paleta.authMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <View style={estilos.fieldErrorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={paleta.red} />
          <Text accessibilityLiveRegion="polite" style={estilos.fieldErrorText}>
            {erro}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
