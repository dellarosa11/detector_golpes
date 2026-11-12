import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { User as UsuarioFirebase } from 'firebase/auth';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { paleta, estilos } from '@/src/estilos/aplicativo';
import {
  excluirContaEHistorico,
  mensagemErroFirebase,
  sairDaConta,
  recarregarConta,
  solicitarRedefinicaoSenha,
  enviarVerificacaoEmail,
} from '@/src/servicos/firebase/conta';
import { TelaBase, AvisoAutenticacao, EntradaAnimada, BotaoAnimado } from '@/src/componentes';
import type { Navegar } from '@/src/tipos/navegacao';

export type PropriedadesTelaConta = {
  navegar: Navegar;
  usuario: UsuarioFirebase | null;
};

// Linha reutilizável para ações de conta com ícone, descrição e estado desabilitado.
function AcaoDaConta({
  rotulo,
  descricao,
  icon,
  desabilitado = false,
  aoPressionar,
}: {
  rotulo: string;
  descricao: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  desabilitado?: boolean;
  aoPressionar: () => void;
}) {
  return (
    <BotaoAnimado
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={aoPressionar}
      style={[estilos.accountActionRow, desabilitado && estilos.buttonDisabled]}
    >
      <View style={estilos.accountActionIcon}>
        <Ionicons name={icon} size={18} color={paleta.green} />
      </View>
      <View style={estilos.accountActionText}>
        <Text style={estilos.accountActionLabel}>{rotulo}</Text>
        <Text style={estilos.accountActionDescription}>{descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={paleta.muted} />
    </BotaoAnimado>
  );
}

/**
 * Centraliza as operações reais da conta do Firebase e diferencia visitantes de cadastros por e-mail.
 */
export function TelaConta({ navegar, usuario }: PropriedadesTelaConta) {
  const [emailVerificado, definirEmailVerificado] = useState(Boolean(usuario?.emailVerified));
  const [acaoEmAndamento, definirAcaoEmAndamento] = useState<
    'verification' | 'refresh' | 'reset' | 'logout' | 'delete'
  >();
  const [aviso, definirAviso] = useState<{ mensagem: string; tom: 'error' | 'success' }>();
  const [confirmarExclusao, definirConfirmacaoExclusao] = useState(false);
  const [senhaAtual, definirSenhaAtual] = useState('');

  const ehVisitante = Boolean(usuario?.isAnonymous);

  const executarAcaoDaConta = async (
    acao: NonNullable<typeof acaoEmAndamento>,
    operacao: () => Promise<void>
  ) => {
    definirAcaoEmAndamento(acao);
    definirAviso(undefined);
    try {
      await operacao();
    } catch (erro) {
      definirAviso({ mensagem: mensagemErroFirebase(erro), tom: 'error' });
    } finally {
      definirAcaoEmAndamento(undefined);
    }
  };

  const enviarVerificacao = () => {
    void executarAcaoDaConta('verification', async () => {
      await enviarVerificacaoEmail();
      definirAviso({
        mensagem: 'Enviamos o link de verificação para o seu e-mail.',
        tom: 'success',
      });
    });
  };

  const atualizarVerificacao = () => {
    void executarAcaoDaConta('refresh', async () => {
      const usuarioAtualizado = await recarregarConta();
      definirEmailVerificado(usuarioAtualizado.emailVerified);
      definirAviso({
        mensagem: usuarioAtualizado.emailVerified
          ? 'E-mail verificado com sucesso.'
          : 'O e-mail ainda não foi verificado. Abra o link recebido e tente novamente.',
        tom: usuarioAtualizado.emailVerified ? 'success' : 'error',
      });
    });
  };

  const redefinirSenhaDaConta = () => {
    if (!usuario?.email) return;
    void executarAcaoDaConta('reset', async () => {
      await solicitarRedefinicaoSenha(usuario.email!);
      definirAviso({
        mensagem: 'Enviamos as instruções para redefinir sua senha.',
        tom: 'success',
      });
    });
  };

  const encerrarSessao = () => {
    void executarAcaoDaConta('logout', async () => {
      await sairDaConta();
      navegar('entrada');
    });
  };

  const excluirConta = () => {
    void executarAcaoDaConta('delete', async () => {
      await excluirContaEHistorico(ehVisitante ? undefined : senhaAtual);
      navegar('entrada');
    });
  };

  return (
    <TelaBase abaAtiva='conta' navegar={navegar}>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.accountContent}
      >
        <EntradaAnimada atraso={30}>
          <Text style={estilos.pageTitle}>Sua conta</Text>
          <Text style={estilos.pageSubtitle}>Gerencie seus dados, acesso e privacidade.</Text>
        </EntradaAnimada>

        <EntradaAnimada atraso={90}>
          <View style={estilos.accountProfileCard}>
            <View style={estilos.accountAvatar}>
              <Image
                accessibilityLabel="Foto de perfil"
                contentFit="cover"
                source={require('@/assets/images/FIORI.jpg')}
                style={estilos.accountAvatarImage}
              />
            </View>
            <View style={estilos.accountProfileText}>
              <Text numberOfLines={1} style={estilos.accountName}>
                {usuario?.displayName || (ehVisitante ? 'Visitante' : 'Usuário')}
              </Text>
              <Text numberOfLines={1} style={estilos.accountEmail}>
                {ehVisitante
                  ? 'Acesso temporário como visitante'
                  : usuario?.email || 'E-mail indisponível'}
              </Text>
              <View
                style={[estilos.accountTypeBadge, ehVisitante && estilos.accountTypeBadgeGuest]}
              >
                <Ionicons
                  name={ehVisitante ? 'person-outline' : 'shield-checkmark-outline'}
                  size={12}
                  color={ehVisitante ? paleta.amber : paleta.greenSuccess}
                />
                <Text
                  style={[estilos.accountTypeText, ehVisitante && estilos.accountTypeTextGuest]}
                >
                  {ehVisitante ? 'Conta de visitante' : 'Conta cadastrada'}
                </Text>
              </View>
            </View>
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={150}>
          <View style={estilos.accountSectionCard}>
            <Text style={estilos.accountSectionTitle}>
              {ehVisitante ? 'Conta de visitante' : 'E-mail'}
            </Text>
            {!ehVisitante ? (
              <>
                <View style={estilos.accountStatusRow}>
                  <View style={estilos.accountActionIcon}>
                    <Ionicons name="mail-outline" size={18} color={paleta.green} />
                  </View>
                  <View style={estilos.accountActionText}>
                    <Text style={estilos.accountActionLabel}>Verificação do e-mail</Text>
                    <Text
                      style={[
                        estilos.accountActionDescription,
                        emailVerificado && estilos.verifiedText,
                      ]}
                    >
                      {emailVerificado ? 'E-mail verificado' : 'Verificação pendente'}
                    </Text>
                  </View>
                  <Ionicons
                    name={emailVerificado ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={21}
                    color={emailVerificado ? paleta.greenSuccess : paleta.amber}
                  />
                </View>
                {!emailVerificado ? (
                  <View style={estilos.verificationActions}>
                    <BotaoAnimado
                      accessibilityRole="button"
                      disabled={Boolean(acaoEmAndamento)}
                      onPress={enviarVerificacao}
                      style={estilos.verificationPrimaryButton}
                    >
                      <Text style={estilos.verificationPrimaryText}>
                        {acaoEmAndamento === 'verification' ? 'Enviando…' : 'Enviar verificação'}
                      </Text>
                    </BotaoAnimado>
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(acaoEmAndamento)}
                      onPress={atualizarVerificacao}
                      style={estilos.verificationRefreshButton}
                    >
                      <Text style={estilos.verificationRefreshText}>
                        {acaoEmAndamento === 'refresh' ? 'Atualizando…' : 'Já verifiquei'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={estilos.guestAccountNotice}>
                <Ionicons name="information-circle-outline" size={17} color={paleta.amber} />
                <Text style={estilos.guestAccountNoticeText}>
                  Se você sair, não será possível entrar novamente nesta mesma conta de visitante.
                </Text>
              </View>
            )}
          </View>
        </EntradaAnimada>

        <EntradaAnimada atraso={230}>
          <View style={estilos.accountSectionCard}>
            <Text style={estilos.accountSectionTitle}>Acesso e segurança</Text>
            {!ehVisitante ? (
              <>
                <AcaoDaConta
                  descricao="Receba um link seguro no seu e-mail"
                  desabilitado={Boolean(acaoEmAndamento)}
                  icon="key-outline"
                  rotulo={acaoEmAndamento === 'reset' ? 'Enviando instruções…' : 'Redefinir senha'}
                  aoPressionar={redefinirSenhaDaConta}
                />
                <View style={estilos.accountRowDivider} />
              </>
            ) : null}
            <AcaoDaConta
              descricao="Voltar para a tela de entrada"
              desabilitado={Boolean(acaoEmAndamento)}
              icon="log-out-outline"
              rotulo={acaoEmAndamento === 'logout' ? 'Saindo…' : 'Sair da conta'}
              aoPressionar={encerrarSessao}
            />
          </View>
        </EntradaAnimada>

        {aviso ? (
          <EntradaAnimada atraso={260}>
            <AvisoAutenticacao mensagem={aviso.mensagem} tom={aviso.tom} />
          </EntradaAnimada>
        ) : null}

        <EntradaAnimada atraso={300}>
          <View style={estilos.accountDangerCard}>
            <Text style={estilos.accountDangerTitle}>Excluir conta</Text>
            <Text style={estilos.accountDangerDescription}>
              Exclui definitivamente sua conta e todas as análises salvas no Firebase.
            </Text>
            {confirmarExclusao ? (
              <View style={estilos.accountDeleteConfirm}>
                {!ehVisitante ? (
                  <>
                    <Text style={estilos.accountFieldLabel}>Confirme sua senha atual</Text>
                    <TextInput
                      accessibilityLabel="Senha atual"
                      autoCapitalize="none"
                      onChangeText={definirSenhaAtual}
                      placeholder="Digite sua senha"
                      placeholderTextColor={paleta.muted}
                      secureTextEntry
                      style={estilos.accountNameInput}
                      value={senhaAtual}
                    />
                  </>
                ) : null}
                <Text style={estilos.accountDeleteWarning}>Esta ação não poderá ser desfeita.</Text>
                <View style={estilos.accountInlineActions}>
                  <BotaoAnimado
                    accessibilityRole="button"
                    disabled={Boolean(acaoEmAndamento)}
                    onPress={() => {
                      definirConfirmacaoExclusao(false);
                      definirSenhaAtual('');
                    }}
                    style={estilos.accountCancelButton}
                  >
                    <Text style={estilos.accountCancelButtonText}>Cancelar</Text>
                  </BotaoAnimado>
                  <BotaoAnimado
                    accessibilityRole="button"
                    disabled={Boolean(acaoEmAndamento) || (!ehVisitante && !senhaAtual)}
                    onPress={excluirConta}
                    style={[
                      estilos.accountDeleteButton,
                      (Boolean(acaoEmAndamento) || (!ehVisitante && !senhaAtual)) &&
                        estilos.buttonDisabled,
                    ]}
                  >
                    <Text style={estilos.accountDeleteButtonText}>
                      {acaoEmAndamento === 'delete' ? 'Excluindo…' : 'Excluir definitivamente'}
                    </Text>
                  </BotaoAnimado>
                </View>
              </View>
            ) : (
              <BotaoAnimado
                accessibilityRole="button"
                onPress={() => {
                  definirConfirmacaoExclusao(true);
                  definirAviso(undefined);
                }}
                style={estilos.accountDangerButton}
              >
                <Ionicons name="trash-outline" size={17} color={paleta.red} />
                <Text style={estilos.accountDangerButtonText}>Excluir minha conta</Text>
              </BotaoAnimado>
            )}
          </View>
        </EntradaAnimada>
      </ScrollView>
    </TelaBase>
  );
}
