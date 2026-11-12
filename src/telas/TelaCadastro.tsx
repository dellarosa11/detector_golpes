import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { estilos } from '@/src/estilos/aplicativo';
import { criarConta, mensagemErroFirebase } from '@/src/servicos/firebase/conta';
import {
  BotaoAutenticacao,
  AvisoAutenticacao,
  CabecalhoMarca,
  EntradaAnimada,
  CampoFormulario,
  ForcaSenha,
  MolduraTela,
} from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';
import { validarEmail } from '@/src/utilitarios/validacao';

export type PropriedadesTelaCadastro = {
  navegar: Navegar;
};

/**
 * Tela de cadastro com validação de nome, e-mail, confirmação e força da senha.
 */
export function TelaCadastro({ navegar }: PropriedadesTelaCadastro) {
  const [nome, definirNome] = useState('');
  const [email, definirEmail] = useState('');
  const [senha, definirSenha] = useState('');
  const [confirmacaoSenha, definirConfirmacaoSenha] = useState('');
  const [exibirErros, definirExibicaoErros] = useState(false);
  const [erroFirebase, definirErroFirebase] = useState<string>();
  const [criandoConta, definirCriacaoConta] = useState(false);

  const senhaValida =
    senha.length >= 8 && /[a-z]/.test(senha) && /[A-Z]/.test(senha) && /\d/.test(senha);
  const erros = {
    name: !nome.trim()
      ? 'Informe seu nome completo.'
      : nome.trim().length < 3
        ? 'O nome precisa ter pelo menos 3 caracteres.'
        : undefined,
    email: validarEmail(email),
    password: !senha
      ? 'Crie uma senha.'
      : !senhaValida
        ? 'Use 8 caracteres, com maiúscula, minúscula e número.'
        : undefined,
    confirmation: !confirmacaoSenha
      ? 'Confirme sua senha.'
      : confirmacaoSenha !== senha
        ? 'As senhas não são iguais.'
        : undefined,
  };

  const enviarCadastro = async () => {
    definirExibicaoErros(true);
    definirErroFirebase(undefined);
    if (erros.name || erros.email || erros.password || erros.confirmation) return;

    definirCriacaoConta(true);
    try {
      await criarConta(nome, email, senha);
      navegar('inicio');
    } catch (erro) {
      definirErroFirebase(mensagemErroFirebase(erro));
    } finally {
      definirCriacaoConta(false);
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
            titulo="Crie sua conta"
            descricao="O cadastro permite salvar análises, acessar seu histórico e receber recursos personalizados."
          />

          <EntradaAnimada atraso={180} style={estilos.fullWidth}>
            <View style={[estilos.authCard, estilos.signupCard]}>
              <CampoFormulario
                rotulo="Nome completo"
                dica="Seu nome"
                valor={nome}
                aoAlterarTexto={(valor) => {
                  definirNome(valor);
                  definirErroFirebase(undefined);
                }}
                tipoConteudoTexto="name"
                erro={exibirErros ? erros.name : undefined}
              />
              <CampoFormulario
                rotulo="E-mail"
                dica="voce@exemplo.com"
                valor={email}
                aoAlterarTexto={(valor) => {
                  definirEmail(valor);
                  definirErroFirebase(undefined);
                }}
                tipoTeclado="email-address"
                capitalizacao="none"
                tipoConteudoTexto="emailAddress"
                erro={exibirErros ? erros.email : undefined}
              />
              <CampoFormulario
                rotulo="Senha"
                dica="Crie uma senha segura"
                valor={senha}
                aoAlterarTexto={(valor) => {
                  definirSenha(valor);
                  definirErroFirebase(undefined);
                }}
                protegido
                capitalizacao="none"
                tipoConteudoTexto="newPassword"
                erro={exibirErros ? erros.password : undefined}
              />
              <ForcaSenha senha={senha} />
              <CampoFormulario
                rotulo="Confirmar senha"
                dica="Repita a senha"
                valor={confirmacaoSenha}
                aoAlterarTexto={(valor) => {
                  definirConfirmacaoSenha(valor);
                  definirErroFirebase(undefined);
                }}
                protegido
                capitalizacao="none"
                tipoConteudoTexto="newPassword"
                erro={exibirErros ? erros.confirmation : undefined}
              />

              <View style={estilos.termsRow}>
                <View style={estilos.checkboxMock}>
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                </View>
                <Text style={estilos.termsText}>
                  Concordo com os termos de uso e a política de privacidade.
                </Text>
              </View>

              <AvisoAutenticacao mensagem={erroFirebase} />
              <BotaoAutenticacao
                rotulo={criandoConta ? 'Criando conta…' : 'Criar conta'}
                desabilitado={criandoConta}
                aoPressionar={enviarCadastro}
              />
              <BotaoAutenticacao
                rotulo="Já tenho uma conta"
                secundario
                desabilitado={criandoConta}
                aoPressionar={() => navegar('entrada')}
              />
            </View>
          </EntradaAnimada>

          <EntradaAnimada atraso={280}>
            <View style={estilos.authFooterRow}>
              <Text style={estilos.authFooterText}>Já possui cadastro?</Text>
              <Pressable onPress={() => navegar('entrada')} hitSlop={8}>
                <Text style={estilos.authFooterLink}>Entrar</Text>
              </Pressable>
            </View>
          </EntradaAnimada>
        </ScrollView>
      </KeyboardAvoidingView>
    </MolduraTela>
  );
}
