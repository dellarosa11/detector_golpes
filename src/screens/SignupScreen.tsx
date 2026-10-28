import { Ionicons } from '@expo/vector-icons';
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
import { createAccount, firebaseErrorMessage } from '@/lib/firebase-data';
import {
  AuthButton,
  AuthFeedback,
  BrandHeader,
  Entrance,
  FormField,
  PasswordStrength,
  PhoneFrame,
} from '@/src/components';
import type { Navigate } from '@/src/types/navigation';
import { emailError } from '@/src/utils/validators';

export type SignupScreenProps = {
  navigate: Navigate;
};

/**
 * Tela de cadastro com validação de nome, e-mail, confirmação e força da senha.
 */
export function SignupScreen({ navigate }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string>();
  const [creatingAccount, setCreatingAccount] = useState(false);

  const passwordIsValid =
    password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
  const errors = {
    name:
      !name.trim()
        ? 'Informe seu nome completo.'
        : name.trim().length < 3
          ? 'O nome precisa ter pelo menos 3 caracteres.'
          : undefined,
    email: emailError(email),
    password:
      !password
        ? 'Crie uma senha.'
        : !passwordIsValid
          ? 'Use 8 caracteres, com maiúscula, minúscula e número.'
          : undefined,
    confirmation:
      !passwordConfirmation
        ? 'Confirme sua senha.'
        : passwordConfirmation !== password
          ? 'As senhas não são iguais.'
          : undefined,
  };

  const submitSignup = async () => {
    setShowErrors(true);
    setFirebaseError(undefined);
    if (errors.name || errors.email || errors.password || errors.confirmation) return;

    setCreatingAccount(true);
    try {
      await createAccount(name, email, password);
      navigate('home');
    } catch (error) {
      setFirebaseError(firebaseErrorMessage(error));
    } finally {
      setCreatingAccount(false);
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
            title="Crie sua conta"
            description="O cadastro permite salvar análises, acessar seu histórico e receber recursos personalizados."
          />

          <Entrance delay={180} style={styles.fullWidth}>
            <View style={[styles.authCard, styles.signupCard]}>
              <FormField
                label="Nome completo"
                placeholder="Seu nome"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setFirebaseError(undefined);
                }}
                textContentType="name"
                error={showErrors ? errors.name : undefined}
              />
              <FormField
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setFirebaseError(undefined);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                error={showErrors ? errors.email : undefined}
              />
              <FormField
                label="Senha"
                placeholder="Crie uma senha segura"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setFirebaseError(undefined);
                }}
                secure
                autoCapitalize="none"
                textContentType="newPassword"
                error={showErrors ? errors.password : undefined}
              />
              <PasswordStrength password={password} />
              <FormField
                label="Confirmar senha"
                placeholder="Repita a senha"
                value={passwordConfirmation}
                onChangeText={(value) => {
                  setPasswordConfirmation(value);
                  setFirebaseError(undefined);
                }}
                secure
                autoCapitalize="none"
                textContentType="newPassword"
                error={showErrors ? errors.confirmation : undefined}
              />

              <View style={styles.termsRow}>
                <View style={styles.checkboxMock}>
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                </View>
                <Text style={styles.termsText}>Concordo com os termos de uso e a política de privacidade.</Text>
              </View>

              <AuthFeedback message={firebaseError} />
              <AuthButton
                label={creatingAccount ? 'Criando conta…' : 'Criar conta'}
                disabled={creatingAccount}
                onPress={submitSignup}
              />
              <AuthButton
                label="Já tenho uma conta"
                secondary
                disabled={creatingAccount}
                onPress={() => navigate('login')}
              />
            </View>
          </Entrance>

          <Entrance delay={280}>
            <View style={styles.authFooterRow}>
              <Text style={styles.authFooterText}>Já possui cadastro?</Text>
              <Pressable onPress={() => navigate('login')} hitSlop={8}>
                <Text style={styles.authFooterLink}>Entrar</Text>
              </Pressable>
            </View>
          </Entrance>
        </ScrollView>
      </KeyboardAvoidingView>
    </PhoneFrame>
  );
}
