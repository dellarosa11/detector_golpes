import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { styles } from '@/components/detector-app.styles';
import { firebaseErrorMessage, loginAsGuest, loginWithEmail, requestPasswordReset } from '@/lib/firebase-data';
import {
  AuthButton,
  AuthFeedback,
  BrandHeader,
  Entrance,
  FormField,
  PhoneFrame,
} from '@/src/components';
import type { Navigate } from '@/src/types/navigation';
import { emailError } from '@/src/utils/validators';

export type LoginScreenProps = {
  navigate: Navigate;
};

/**
 * Tela de entrada conectada ao Firebase Auth e com acesso anônimo opcional.
 */
export function LoginScreen({ navigate }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string>();
  const [authNotice, setAuthNotice] = useState<string>();
  const [busyAction, setBusyAction] = useState<'login' | 'guest' | 'reset'>();

  const errors = {
    email: emailError(email),
    password: password ? undefined : 'Informe sua senha.',
  };

  const submitLogin = async () => {
    setShowErrors(true);
    setFirebaseError(undefined);
    setAuthNotice(undefined);
    if (errors.email || errors.password) return;

    setBusyAction('login');
    try {
      await loginWithEmail(email, password);
      navigate('home');
    } catch (error) {
      setFirebaseError(firebaseErrorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const continueAsGuest = async () => {
    setFirebaseError(undefined);
    setAuthNotice(undefined);
    setBusyAction('guest');
    try {
      await loginAsGuest();
      navigate('home');
    } catch (error) {
      setFirebaseError(firebaseErrorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const resetPassword = async () => {
    setFirebaseError(undefined);
    setAuthNotice(undefined);
    if (errors.email) {
      setFirebaseError(errors.email);
      return;
    }

    setBusyAction('reset');
    try {
      await requestPasswordReset(email);
      setAuthNotice('Enviamos as instruções de redefinição para o seu e-mail.');
    } catch (error) {
      setFirebaseError(firebaseErrorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  return (
    <PhoneFrame auth>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.authContent}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}>
          <BrandHeader
            title="Entre na sua conta"
            description="Analise mensagens suspeitas e acompanhe seu histórico de forma simples."
          />

          <Entrance delay={180} style={styles.fullWidth}>
            <View style={[styles.authCard, styles.loginCard]}>
              <FormField
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setFirebaseError(undefined);
                  setAuthNotice(undefined);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                error={showErrors ? errors.email : undefined}
              />
              <FormField
                label="Senha"
                placeholder="Digite sua senha"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setFirebaseError(undefined);
                  setAuthNotice(undefined);
                }}
                secure
                autoCapitalize="none"
                textContentType="password"
                error={showErrors ? errors.password : undefined}
              />
              <View style={styles.forgotRow}>
                <Text style={styles.forgotMuted}>Lembrar de mim</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={Boolean(busyAction)}
                  hitSlop={8}
                  onPress={resetPassword}>
                  <Text style={styles.forgotLink}>
                    {busyAction === 'reset' ? 'Enviando…' : 'Esqueci minha senha'}
                  </Text>
                </Pressable>
              </View>
              <AuthFeedback message={firebaseError} />
              <AuthFeedback message={authNotice} tone="success" />
              <AuthButton
                label={busyAction === 'login' ? 'Entrando…' : 'Entrar'}
                disabled={Boolean(busyAction)}
                onPress={submitLogin}
              />
              <AuthButton
                label={busyAction === 'guest' ? 'Conectando…' : 'Continuar como visitante'}
                secondary
                disabled={Boolean(busyAction)}
                onPress={continueAsGuest}
              />
            </View>
          </Entrance>

          <Entrance delay={260}>
            <View style={styles.privacyBadge}>
              <Image
                source={require('@/assets/images/privacy-dot.svg')}
                style={styles.privacyDot}
                contentFit="fill"
              />
              <Text style={styles.privacyBadgeText}>Seus dados ficam vinculados à sua conta</Text>
            </View>
          </Entrance>

          <Entrance delay={320}>
            <View style={styles.authFooterRow}>
              <Text style={styles.authFooterText}>Ainda não possui conta?</Text>
              <Pressable onPress={() => navigate('signup')} hitSlop={8}>
                <Text style={styles.authFooterLink}>Criar conta</Text>
              </Pressable>
            </View>
          </Entrance>
        </ScrollView>
      </KeyboardAvoidingView>
    </PhoneFrame>
  );
}
