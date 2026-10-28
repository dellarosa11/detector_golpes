import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { User as FirebaseUser } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  getAccountPhoto,
  logout,
  reloadCurrentAccount,
  removeAccountPhoto,
  requestPasswordReset,
  sendAccountVerification,
  updateAccountName,
  updateAccountPhoto,
} from '@/lib/firebase-data';
import { AppScreen, AuthFeedback, Entrance, MotionPressable } from '@/src/components';
import type { ThemePreference } from '@/src/types/analysis';
import type { Navigate } from '@/src/types/navigation';
import { accountInitials } from '@/src/utils/formatters';

export type AccountScreenProps = {
  navigate: Navigate;
  user: FirebaseUser | null;
  themePreference: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
};

// Opção selecionável do grupo de tema (sistema, claro ou escuro).
function ThemeOption({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityLabel={`Tema ${label}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.themeOption, selected && styles.themeOptionSelected]}>
      <View style={[styles.themeOptionIcon, selected && styles.themeOptionIconSelected]}>
        <Ionicons name={icon} size={18} color={selected ? palette.green : palette.muted} />
      </View>
      <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>{label}</Text>
      <View style={[styles.themeRadio, selected && styles.themeRadioSelected]}>
        {selected ? <View style={styles.themeRadioDot} /> : null}
      </View>
    </MotionPressable>
  );
}

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
export function AccountScreen({
  navigate,
  user,
  themePreference,
  onChangeTheme,
}: AccountScreenProps) {
  const [name, setName] = useState(user?.displayName || (user?.isAnonymous ? 'Visitante' : ''));
  const [draftName, setDraftName] = useState(name);
  const [editingName, setEditingName] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [emailVerified, setEmailVerified] = useState(Boolean(user?.emailVerified));
  const [busyAction, setBusyAction] = useState<
    'photo' | 'removePhoto' | 'name' | 'verification' | 'refresh' | 'reset' | 'logout' | 'delete'
  >();
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const isGuest = Boolean(user?.isAnonymous);

  useEffect(() => {
    let active = true;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guard síncrono antes de qualquer operação assíncrona; não causa cascata
      setLoadingPhoto(false);
      return;
    }

    setLoadingPhoto(true);
    getAccountPhoto()
      .then((storedPhoto) => {
        if (active) setPhotoUrl(storedPhoto);
      })
      .catch((error) => {
        if (active) setFeedback({ message: firebaseErrorMessage(error), tone: 'error' });
      })
      .finally(() => {
        if (active) setLoadingPhoto(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

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

  const saveName = () => {
    const cleanName = draftName.trim();
    if (cleanName.length < 3) {
      setFeedback({ message: 'O nome precisa ter pelo menos 3 caracteres.', tone: 'error' });
      return;
    }

    void runAccountAction('name', async () => {
      await updateAccountName(cleanName);
      setName(cleanName);
      setEditingName(false);
      setFeedback({ message: 'Nome atualizado com sucesso.', tone: 'success' });
    });
  };

  const chooseProfilePhoto = async () => {
    setFeedback(undefined);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFeedback({
          message: 'Permita o acesso às fotos do aparelho para escolher uma imagem de perfil.',
          tone: 'error',
        });
        return;
      }

      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (selection.canceled || !selection.assets[0]) return;
      const selectedPhoto = selection.assets[0];
      let processedPhoto = await manipulateAsync(
        selectedPhoto.uri,
        [{ resize: { width: 256, height: 256 } }],
        { base64: true, compress: 0.68, format: SaveFormat.JPEG }
      );
      let imageData = `data:image/jpeg;base64,${processedPhoto.base64 || ''}`;

      // Uma segunda compressão cobre imagens muito detalhadas sem ultrapassar
      // o limite adotado para o documento de perfil no Firestore.
      if (imageData.length > 200_000) {
        processedPhoto = await manipulateAsync(
          selectedPhoto.uri,
          [{ resize: { width: 256, height: 256 } }],
          { base64: true, compress: 0.42, format: SaveFormat.JPEG }
        );
        imageData = `data:image/jpeg;base64,${processedPhoto.base64 || ''}`;
      }

      if (!processedPhoto.base64 || imageData.length > 200_000) {
        setFeedback({ message: 'Não foi possível reduzir esta foto. Escolha outra imagem.', tone: 'error' });
        return;
      }

      void runAccountAction('photo', async () => {
        const newPhotoUrl = await updateAccountPhoto(imageData);
        setPhotoUrl(newPhotoUrl);
        setFeedback({ message: 'Foto de perfil atualizada com sucesso.', tone: 'success' });
      });
    } catch {
      setFeedback({ message: 'Não foi possível abrir ou preparar a imagem escolhida.', tone: 'error' });
    }
  };

  const deleteProfilePhoto = () => {
    void runAccountAction('removePhoto', async () => {
      await removeAccountPhoto();
      setPhotoUrl('');
      setFeedback({ message: 'Foto de perfil removida.', tone: 'success' });
    });
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
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel={photoUrl ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
              disabled={Boolean(busyAction)}
              onPress={chooseProfilePhoto}
              style={styles.accountAvatarButton}>
              <View style={styles.accountAvatar}>
                {photoUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: photoUrl }}
                    style={styles.accountAvatarImage}
                    transition={180}
                  />
                ) : (
                  <Text style={styles.accountAvatarText}>{accountInitials(user)}</Text>
                )}
              </View>
              <View style={styles.accountCameraBadge}>
                {loadingPhoto || busyAction === 'photo' ? (
                  <ActivityIndicator color={palette.green} size={11} />
                ) : (
                  <Ionicons name="camera" size={13} color={palette.green} />
                )}
              </View>
            </MotionPressable>
            <View style={styles.accountProfileText}>
              <Text numberOfLines={1} style={styles.accountName}>{name || 'Usuário'}</Text>
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
            <Text style={styles.accountSectionTitle}>Dados pessoais</Text>
            <AccountActionRow
              description={photoUrl ? 'Escolha outra imagem da galeria' : 'Escolha uma imagem da galeria'}
              disabled={Boolean(busyAction)}
              icon="camera-outline"
              label={busyAction === 'photo' ? 'Enviando foto…' : photoUrl ? 'Trocar foto' : 'Adicionar foto'}
              onPress={chooseProfilePhoto}
            />
            {photoUrl ? (
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(busyAction)}
                onPress={deleteProfilePhoto}
                style={styles.removePhotoButton}>
                <Ionicons name="trash-outline" size={14} color={palette.red} />
                <Text style={styles.removePhotoButtonText}>
                  {busyAction === 'removePhoto' ? 'Removendo foto…' : 'Remover foto atual'}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.accountRowDivider} />
            {editingName ? (
              <View style={styles.accountEditBlock}>
                <Text style={styles.accountFieldLabel}>Nome de exibição</Text>
                <TextInput
                  accessibilityLabel="Nome de exibição"
                  autoCapitalize="words"
                  autoFocus
                  onChangeText={setDraftName}
                  placeholder="Seu nome"
                  placeholderTextColor={palette.muted}
                  style={styles.accountNameInput}
                  value={draftName}
                />
                <View style={styles.accountInlineActions}>
                  <MotionPressable
                    accessibilityRole="button"
                    disabled={Boolean(busyAction)}
                    onPress={() => {
                      setDraftName(name);
                      setEditingName(false);
                    }}
                    style={styles.accountCancelButton}>
                    <Text style={styles.accountCancelButtonText}>Cancelar</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    disabled={Boolean(busyAction)}
                    onPress={saveName}
                    style={[styles.accountSaveButton, busyAction === 'name' && styles.buttonDisabled]}>
                    <Text style={styles.accountSaveButtonText}>
                      {busyAction === 'name' ? 'Salvando…' : 'Salvar'}
                    </Text>
                  </MotionPressable>
                </View>
              </View>
            ) : (
              <AccountActionRow
                description={name || 'Adicione um nome à conta'}
                icon="person-outline"
                label="Nome de exibição"
                onPress={() => {
                  setDraftName(name);
                  setEditingName(true);
                  setFeedback(undefined);
                }}
              />
            )}

            {!isGuest ? (
              <>
                <View style={styles.accountRowDivider} />
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

        <Entrance delay={190}>
          <View style={styles.accountSectionCard}>
            <Text style={styles.accountSectionTitle}>Aparência</Text>
            <Text style={styles.themeDescription}>
              Escolha como o Detector de Golpes aparece neste aparelho.
            </Text>
            <View accessibilityRole="radiogroup" style={styles.themeOptions}>
              <ThemeOption
                icon="phone-portrait-outline"
                label="Sistema"
                onPress={() => onChangeTheme('system')}
                selected={themePreference === 'system'}
              />
              <ThemeOption
                icon="sunny-outline"
                label="Claro"
                onPress={() => onChangeTheme('light')}
                selected={themePreference === 'light'}
              />
              <ThemeOption
                icon="moon-outline"
                label="Escuro"
                onPress={() => onChangeTheme('dark')}
                selected={themePreference === 'dark'}
              />
            </View>
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
