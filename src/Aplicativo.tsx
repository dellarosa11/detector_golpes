import React, { useState } from 'react';
import { View } from 'react-native';

import { useAnalise } from '@/src/hooks/useAnalise';
import { useAutenticacao } from '@/src/hooks/useAutenticacao';
import { useTema } from '@/src/hooks/useTema';
import {
  TelaConta,
  TelaAnalise,
  TelaHistorico,
  TelaInicio,
  TelaAprender,
  TelaEntrada,
  TelaProcessamento,
  TelaResultado,
  TelaCadastro,
} from '@/src/telas';
import type { NomeTela } from '@/src/tipos/navegacao';
import { estilos } from './estilos/aplicativo';

export default function Aplicativo() {
  const [tela, definirTela] = useState<NomeTela>('entrada');

  useTema();
  const { usuario } = useAutenticacao({ definirTela });
  const {
    mensagemDaAnalise,
    resultadoDaAnalise,
    erroDaAnalise,
    iniciarAnalise,
    abrirAnalise,
    alterarMensagem,
  } = useAnalise({ usuario, definirTela });

  const propriedadesAnalise = {
    navegar: definirTela,
    mensagem: mensagemDaAnalise,
    aoAlterarMensagem: alterarMensagem,
    aoAnalisar: iniciarAnalise,
    erro: erroDaAnalise,
  };

  let conteudo: React.ReactNode;

  switch (tela) {
    case 'cadastro':
      conteudo = <TelaCadastro navegar={definirTela} />;
      break;
    case 'inicio':
      conteudo = <TelaInicio navegar={definirTela} aoIniciarAnalise={abrirAnalise} />;
      break;
    case 'analise':
      conteudo = <TelaAnalise {...propriedadesAnalise} />;
      break;
    case 'processamento':
      conteudo = <TelaProcessamento />;
      break;
    case 'resultado':
      conteudo = resultadoDaAnalise ? (
        <TelaResultado
          navegar={definirTela}
          mensagem={resultadoDaAnalise.analyzedText || mensagemDaAnalise}
          resultado={resultadoDaAnalise}
          idUsuario={usuario?.uid}
        />
      ) : (
        <TelaAnalise {...propriedadesAnalise} />
      );
      break;
    case 'historico':
      conteudo = (
        <TelaHistorico
          key={usuario?.uid ?? 'signed-out'}
          navegar={definirTela}
          idUsuario={usuario?.uid}
        />
      );
      break;
    case 'aprender':
      conteudo = <TelaAprender navegar={definirTela} />;
      break;
    case 'conta':
      conteudo = <TelaConta navegar={definirTela} usuario={usuario} />;
      break;
    case 'entrada':
    default:
      conteudo = <TelaEntrada navegar={definirTela} />;
      break;
  }

  return <View style={estilos.screenTransition}>{conteudo}</View>;
}
