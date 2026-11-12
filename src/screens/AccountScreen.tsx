import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { User as FirebaseUser } from 'firebase/auth';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import {
  deleteAccountAndHistory,
  firebaseErrorMessage,
  logout,
  reloadCurrentAccount,
  requestPasswordReset,
  sendAccountVerification,
} from '@/lib/firebase-data';
import { AppScreen, AuthFeedback, Entrance, MotionPressable } from '@/src/components';
import type { Navigate } from '@/src/types/navigation';

export type AccountScreenProps = {
  navigate: Navigate;
  user: FirebaseUser | null;
};

// Linha reutilizável para ações de conta com ícone, descrição e estado desabilitado.
function AccountActionRow({
  label,
  description,
  icon,
  disabled = false,
  onPress,
}: {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.accountActionRow, disabled && styles.buttonDisabled]}>
      <View style={styles.accountActionIcon}>
        <Ionicons name={icon} size={18} color={palette.green} />
      </View>
      <View style={styles.accountActionText}>
        <Text style={styles.accountActionLabel}>{label}</Text>
        <Text style={styles.accountActionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </MotionPressable>
  );
}

/**
 * Centraliza as operações reais da conta do Firebase e diferencia visitantes de cadastros por e-mail.
 */
export function AccountScreen({ navigate, user }: AccountScreenProps) {
  const [emailVerified, setEmailVerified] = useState(Boolean(user?.emailVerified));
  const [busyAction, setBusyAction] = useState<
    'verification' | 'refresh' | 'reset' | 'logout' | 'delete'
  >();
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const isGuest = Boolean(user?.isAnonymous);

  const runAccountAction = async (
    action: NonNullable<typeof busyAction>,
    operation: () => Promise<void>
  ) => {
    setBusyAction(action);
    setFeedback(undefined);
    try {
      await operation();
    } catch (error) {
      setFeedback({ message: firebaseErrorMessage(error), tone: 'error' });
    } finally {
      setBusyAction(undefined);
    }
  };

  const sendVerification = () => {
    void runAccountAction('verification', async () => {
      await sendAccountVerification();
      setFeedback({ message: 'Enviamos o link de verificação para o seu e-mail.', tone: 'success' });
    });
  };

  const refreshVerification = () => {
    void runAccountAction('refresh', async () => {
      const refreshedUser = await reloadCurrentAccount();
      setEmailVerified(refreshedUser.emailVerified);
      setFeedback({
        message: refreshedUser.emailVerified
          ? 'E-mail verificado com sucesso.'
          : 'O e-mail ainda não foi verificado. Abra o link recebido e tente novamente.',
        tone: refreshedUser.emailVerified ? 'success' : 'error',
      });
    });
  };

  const resetAccountPassword = () => {
    if (!user?.email) return;
    void runAccountAction('reset', async () => {
      await requestPasswordReset(user.email!);
      setFeedback({ message: 'Enviamos as instruções para redefinir sua senha.', tone: 'success' });
    });
  };

  const leaveAccount = () => {
    void runAccountAction('logout', async () => {
      await logout();
      navigate('login');
    });
  };

  const removeAccount = () => {
    void runAccountAction('delete', async () => {
      await deleteAccountAndHistory(isGuest ? undefined : currentPassword);
      navigate('login');
    });
  };

  return (
    <AppScreen activeTab="account" navigate={navigate}>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.accountContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Sua conta</Text>
          <Text style={styles.pageSubtitle}>Gerencie seus dados, acesso e privacidade.</Text>
        </Entrance>

        <Entrance delay={90}>
          <View style={styles.accountProfileCard}>
            <View style={styles.accountAvatar}>
              <Image
                accessibilityLabel="Foto de perfil"
                contentFit="cover"
                source={require('@/assets/images/FIORI.jpg')}
                style={styles.accountAvatarImage}
              />
            </View>
            <View style={styles.accountProfileText}>
              <Text numberOfLines={1} style={styles.accountName}>{user?.displayName || (isGuest ? 'Visitante' : 'Usuário')}</Text>
              <Text numberOfLines={1} style={styles.accountEmail}>
                {isGuest ? 'Acesso temporário como visitante' : user?.email || 'E-mail indisponível'}
              </Text>
              <View style={[styles.accountTypeBadge, isGuest && styles.accountTypeBadgeGuest]}>
                <Ionicons
                  name={isGuest ? 'person-outline' : 'shield-checkmark-outline'}
                  size={12}
                  color={isGuest ? palette.amber : palette.greenSuccess}
                />
                <Text style={[styles.accountTypeText, isGuest && styles.accountTypeTextGuest]}>
                  {isGuest ? 'Conta de visitante' : 'Conta cadastrada'}
                </Text>
              </View>
            </View>
          </View>
        </Entrance>

        <Entrance delay={150}>
          <View style={styles.accountSectionCard}>
            <Text style={styles.accountSectionTitle}>{isGuest ? 'Conta de visitante' : 'E-mail'}</Text>
            {!isGuest ? (
              <>
                <View style={styles.accountStatusRow}>
                  <View style={styles.accountActionIcon}>
                    <Ionicons name="mail-outline" size={18} color={palette.green} />
                  </View>
                  <View style={styles.accountActionText}>
                    <Text style={styles.accountActionLabel}>Verificação do e-mail</Text>
                    <Text style={[styles.accountActionDescription, emailVerified && styles.verifiedText]}>
                      {emailVerified ? 'E-mail verificado' : 'Verificação pendente'}
                    </Text>
                  </View>
                  <Ionicons
                    name={emailVerified ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={21}
                    color={emailVerified ? palette.greenSuccess : palette.amber}
                  />
                </View>
                {!emailVerified ? (
                  <View style={styles.verificationActions}>
                    <MotionPressable
                      accessibilityRole="button"
                      disabled={Boolean(busyAction)}
                      onPress={sendVerification}
                      style={styles.verificationPrimaryButton}>
                      <Text style={styles.verificationPrimaryText}>
                        {busyAction === 'verification' ? 'Enviando…' : 'Enviar verificação'}
                      </Text>
                    </MotionPressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(busyAction)}
                      onPress={refreshVerification}
                      style={styles.verificationRefreshButton}>
                      <Text style={styles.verificationRefreshText}>
                        {busyAction === 'refresh' ? 'Atualizando…' : 'Já verifiquei'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.guestAccountNotice}>
                <Ionicons name="information-circle-outline" size={17} color={palette.amber} />
                <Text style={styles.guestAccountNoticeText}>
                  Se você sair, não será possível entrar novamente nesta mesma conta de visitante.
                </Text>
              </View>
            )}
          </View>
        </Entrance>

        <Entrance delay={230}>
          <View style={styles.accountSectionCard}>
            <Text style={styles.accountSectionTitle}>Acesso e segurança</Text>
            {!isGuest ? (
              <>
                <AccountActionRow
                  description="Receba um link seguro no seu e-mail"
                  disabled={Boolean(busyAction)}
                  icon="key-outline"
                  label={busyAction === 'reset' ? 'Enviando instruções…' : 'Redefinir senha'}
                  onPress={resetAccountPassword}
                />
                <View style={styles.accountRowDivider} />
              </>
            ) : null}
            <AccountActionRow
              description="Voltar para a tela de entrada"
              disabled={Boolean(busyAction)}
              icon="log-out-outline"
              label={busyAction === 'logout' ? 'Saindo…' : 'Sair da conta'}
              onPress={leaveAccount}
            />
          </View>
        </Entrance>

        {feedback ? (
          <Entrance delay={260}>
            <AuthFeedback message={feedback.message} tone={feedback.tone} />
          </Entrance>
        ) : null}

        <Entrance delay={300}>
          <View style={styles.accountDangerCard}>
            <Text style={styles.accountDangerTitle}>Excluir conta</Text>
            <Text style={styles.accountDangerDescription}>
              Exclui definitivamente sua conta e todas as análises salvas no Firebase.
            </Text>
            {confirmDelete ? (
              <View style={styles.accountDeleteConfirm}>
                {!isGuest ? (
                  <>
                    <Text style={styles.accountFieldLabel}>Confirme sua senha atual</Text>
                    <TextInput
                      accessibilityLabel="Senha atual"
                      autoCapitalize="none"
                      onChangeText={setCurrentPassword}
                      placeholder="Digite sua senha"
                      placeholderTextColor={palette.muted}
                      secureTextEntry
                      style={styles.accountNameInput}
                      value={currentPassword}
                    />
                  </>
                ) : null}
                <Text style={styles.accountDeleteWarning}>Esta ação não poderá ser desfeita.</Text>
                <View style={styles.accountInlineActions}>
                  <MotionPressable
                    accessibilityRole="button"
                    disabled={Boolean(busyAction)}
                    onPress={() => {
                      setConfirmDelete(false);
                      setCurrentPassword('');
                    }}
                    style={styles.accountCancelButton}>
                    <Text style={styles.accountCancelButtonText}>Cancelar</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    disabled={Boolean(busyAction) || (!isGuest && !currentPassword)}
                    onPress={removeAccount}
                    style={[
                      styles.accountDeleteButton,
                      (Boolean(busyAction) || (!isGuest && !currentPassword)) && styles.buttonDisabled,
                    ]}>
                    <Text style={styles.accountDeleteButtonText}>
                      {busyAction === 'delete' ? 'Excluindo…' : 'Excluir definitivamente'}
                    </Text>
                  </MotionPressable>
                </View>
              </View>
            ) : (
              <MotionPressable
                accessibilityRole="button"
                onPress={() => {
                  setConfirmDelete(true);
                  setFeedback(undefined);
                }}
                style={styles.accountDangerButton}>
                <Ionicons name="trash-outline" size={17} color={palette.red} />
                <Text style={styles.accountDangerButtonText}>Excluir minha conta</Text>
              </MotionPressable>
            )}
          </View>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
