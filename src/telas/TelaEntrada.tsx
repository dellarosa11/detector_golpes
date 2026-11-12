import { Image } from 'expo-image';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { estilos } from '@/src/estilos/aplicativo';
import {
  mensagemErroFirebase,
  entrarComoVisitante,
  entrarComEmail,
  solicitarRedefinicaoSenha,
} from '@/src/servicos/firebase/conta';
import {
  BotaoAutenticacao,
  AvisoAutenticacao,
  CabecalhoMarca,
  EntradaAnimada,
  CampoFormulario,
  MolduraTela,
} from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';
import { validarEmail } from '@/src/utilitarios/validacao';

export type PropriedadesTelaEntrada = {
  navegar: Navegar;
};

/**
 * Tela de entrada conectada ao Firebase Auth e com acesso anônimo opcional.
 */
export function TelaEntrada({ navegar }: PropriedadesTelaEntrada) {
  const [email, definirEmail] = useState('');
  const [senha, definirSenha] = useState('');
  const [exibirErros, definirExibicaoErros] = useState(false);
  const [erroFirebase, definirErroFirebase] = useState<string>();
  const [avisoAutenticacao, definirAvisoAutenticacao] = useState<string>();
  const [acaoEmAndamento, definirAcaoEmAndamento] = useState<'entrada' | 'guest' | 'reset'>();

  const erros = {
    email: validarEmail(email),
    password: senha ? undefined : 'Informe sua senha.',
  };

  const enviarEntrada = async () => {
    definirExibicaoErros(true);
    definirErroFirebase(undefined);
    definirAvisoAutenticacao(undefined);
    if (erros.email || erros.password) return;

    definirAcaoEmAndamento('entrada');
    try {
      await entrarComEmail(email, senha);
      navegar('inicio');
    } catch (erro) {
      definirErroFirebase(mensagemErroFirebase(erro));
    } finally {
      definirAcaoEmAndamento(undefined);
    }
  };

  const continuarComoVisitante = async () => {
    definirErroFirebase(undefined);
    definirAvisoAutenticacao(undefined);
    definirAcaoEmAndamento('guest');
    try {
      await entrarComoVisitante();
      navegar('inicio');
    } catch (erro) {
      definirErroFirebase(mensagemErroFirebase(erro));
    } finally {
      definirAcaoEmAndamento(undefined);
    }
  };

  const redefinirSenha = async () => {
    definirErroFirebase(undefined);
    definirAvisoAutenticacao(undefined);
    if (erros.email) {
      definirErroFirebase(erros.email);
      return;
    }

    definirAcaoEmAndamento('reset');
    try {
      await solicitarRedefinicaoSenha(email);
      definirAvisoAutenticacao('Enviamos as instruções de redefinição para o seu e-mail.');
    } catch (erro) {
      definirErroFirebase(mensagemErroFirebase(erro));
    } finally {
      definirAcaoEmAndamento(undefined);
    }
  };

  return (
    <MolduraTela autenticacao>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.keyboardView}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={estilos.authContent}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        >
          <CabecalhoMarca
            titulo="Entre na sua conta"
            descricao="Analise mensagens suspeitas e acompanhe seu histórico de forma simples."
          />

          <EntradaAnimada atraso={180} style={estilos.fullWidth}>
            <View style={[estilos.authCard, estilos.loginCard]}>
              <CampoFormulario
                rotulo="E-mail"
                dica="voce@exemplo.com"
                valor={email}
                aoAlterarTexto={(valor) => {
                  definirEmail(valor);
                  definirErroFirebase(undefined);
                  definirAvisoAutenticacao(undefined);
                }}
                tipoTeclado="email-address"
                capitalizacao="none"
                tipoConteudoTexto="emailAddress"
                erro={exibirErros ? erros.email : undefined}
              />
              <CampoFormulario
                rotulo="Senha"
                dica="Digite sua senha"
                valor={senha}
                aoAlterarTexto={(valor) => {
                  definirSenha(valor);
                  definirErroFirebase(undefined);
                  definirAvisoAutenticacao(undefined);
                }}
                protegido
                capitalizacao="none"
                tipoConteudoTexto="password"
                erro={exibirErros ? erros.password : undefined}
              />
              <View style={estilos.forgotRow}>
                <Text style={estilos.forgotMuted}>Lembrar de mim</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={Boolean(acaoEmAndamento)}
                  hitSlop={8}
                  onPress={redefinirSenha}
                >
                  <Text style={estilos.forgotLink}>
                    {acaoEmAndamento === 'reset' ? 'Enviando…' : 'Esqueci minha senha'}
                  </Text>
                </Pressable>
              </View>
              <AvisoAutenticacao mensagem={erroFirebase} />
              <AvisoAutenticacao mensagem={avisoAutenticacao} tom="success" />
              <BotaoAutenticacao
                rotulo={acaoEmAndamento === 'entrada' ? 'Entrando…' : 'Entrar'}
                desabilitado={Boolean(acaoEmAndamento)}
                aoPressionar={enviarEntrada}
              />
              <BotaoAutenticacao
                rotulo={acaoEmAndamento === 'guest' ? 'Conectando…' : 'Continuar como visitante'}
                secundario
                desabilitado={Boolean(acaoEmAndamento)}
                aoPressionar={continuarComoVisitante}
              />
            </View>
          </EntradaAnimada>

          <EntradaAnimada atraso={260}>
            <View style={estilos.privacyBadge}>
              <Image
                source={require('@/assets/images/privacy-dot.svg')}
                style={estilos.privacyDot}
                contentFit="fill"
              />
              <Text style={estilos.privacyBadgeText}>Seus dados ficam vinculados à sua conta</Text>
            </View>
          </EntradaAnimada>

          <EntradaAnimada atraso={320}>
            <View style={estilos.authFooterRow}>
              <Text style={estilos.authFooterText}>Ainda não possui conta?</Text>
              <Pressable onPress={() => navegar('cadastro')} hitSlop={8}>
                <Text style={estilos.authFooterLink}>Criar conta</Text>
              </Pressable>
            </View>
          </EntradaAnimada>
        </ScrollView>
      </KeyboardAvoidingView>
    </MolduraTela>
  );
}
