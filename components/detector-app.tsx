import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import type { User as FirebaseUser } from 'firebase/auth';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isFirebaseConfigured } from '@/lib/firebase';
import {
  createAccount,
  deleteAccountAndHistory,
  deleteAnalysis,
  firebaseErrorMessage,
  getAccountPhoto,
  loginAsGuest,
  loginWithEmail,
  logout,
  observeAuth,
  reloadCurrentAccount,
  requestPasswordReset,
  removeAccountPhoto,
  saveAnalysis,
  sendAccountVerification,
  StoredAnalysis,
  subscribeToAnalyses,
  updateAccountName,
  updateAccountPhoto,
  type AnalysisTone,
  type AnalysisType,
} from '@/lib/firebase-data';
import {
  classifyImageRisk,
  classifyRisk,
  classifierErrorMessage,
  type RiskAnalysis,
  type RiskLevel,
} from '@/lib/risk-classifier';

/*
 * Aplicativo visual principal.
 * Reúne as telas criadas a partir do protótipo, a navegação interna, as animações,
 * os formulários funcionais, o histórico no Firebase e a chamada da API de IA.
 */

// As duas paletas usam os mesmos nomes para que todas as telas mudem de tema juntas.
type AppPalette = {
  background: string;
  authBackground: string;
  text: string;
  authText: string;
  muted: string;
  authMuted: string;
  border: string;
  authBorder: string;
  surface: string;
  surfaceRaised: string;
  stage: string;
  input: string;
  dangerSurface: string;
  dangerBorder: string;
  successSurface: string;
  successBorder: string;
  warningBorder: string;
  divider: string;
  shadow: string;
  heroMuted: string;
  green: string;
  greenSoft: string;
  greenLight: string;
  greenSuccess: string;
  blue: string;
  blueSoft: string;
  red: string;
  redSoft: string;
  redTrack: string;
  amber: string;
  amberSoft: string;
};

const lightPalette: AppPalette = {
  background: '#F6F8FB',
  authBackground: '#F6F8FC',
  text: '#0E131C',
  authText: '#1A1F29',
  muted: '#5C6678',
  authMuted: '#5F6E89',
  border: '#DBE0E8',
  authBorder: '#E0E7F2',
  surface: '#FFFFFF',
  surfaceRaised: '#FBFCFD',
  stage: '#DDE3EC',
  input: '#FBFCFF',
  dangerSurface: '#FFF8F8',
  dangerBorder: '#F2CCCC',
  successSurface: '#F0FAF4',
  successBorder: '#CDE9D9',
  warningBorder: '#F7E7B8',
  divider: '#E9EDF3',
  shadow: '#0F1729',
  heroMuted: '#E5F7F2',
  green: '#13473D',
  greenSoft: '#E5F5F0',
  greenLight: '#BDEBDE',
  greenSuccess: '#147347',
  blue: '#2549E6',
  blueSoft: '#E7EDFF',
  red: '#B82129',
  redSoft: '#FCE8E8',
  redTrack: '#EDC2C2',
  amber: '#B86E0F',
  amberSoft: '#FFF5DB',
};

const darkPalette: AppPalette = {
  background: '#0B1211',
  authBackground: '#0B1118',
  text: '#F2F7F5',
  authText: '#F4F7FB',
  muted: '#9AA8A4',
  authMuted: '#9EABBC',
  border: '#2A3935',
  authBorder: '#2A3747',
  surface: '#141E1C',
  surfaceRaised: '#192421',
  stage: '#070B0B',
  input: '#111A18',
  dangerSurface: '#321D20',
  dangerBorder: '#66363B',
  successSurface: '#153128',
  successBorder: '#285848',
  warningBorder: '#66512A',
  divider: '#26332F',
  shadow: '#000000',
  heroMuted: '#C9EAE2',
  green: '#2E8B76',
  greenSoft: '#17372F',
  greenLight: '#70C7B2',
  greenSuccess: '#5DD29A',
  blue: '#6F8CFF',
  blueSoft: '#1C294D',
  red: '#FF7A82',
  redSoft: '#3B2024',
  redTrack: '#71383E',
  amber: '#F0B45C',
  amberSoft: '#3B2D18',
};

type ThemePreference = 'system' | 'light' | 'dark';
const themeStorageKey = '@detector-golpes/theme';

// A variável ativa é atualizada apenas quando o tema muda e alimenta todos os estilos existentes.
let palette: AppPalette = lightPalette;

type ScreenName =
  | 'login'
  | 'signup'
  | 'home'
  | 'analyze'
  | 'processing'
  | 'result'
  | 'history'
  | 'learn'
  | 'account';

type Navigate = (screen: ScreenName) => void;
type SelectedAnalysisImage = { uri: string; imageData: string };

// Converte o nível retornado pela API em textos, cores e ícones usados no resultado e histórico.
type RiskPresentation = Record<
  RiskLevel,
  {
    title: string;
    tone: 'high' | 'medium' | 'low';
    color: string;
    backgroundColor: string;
    borderColor: string;
    trackColor: string;
    icon: 'checkmark-circle' | 'alert-circle' | 'warning';
  }
>;

function createRiskPresentation(activePalette: AppPalette): RiskPresentation {
  return {
    baixo: {
      title: 'Baixo',
      tone: 'low',
      color: activePalette.greenSuccess,
      backgroundColor: activePalette.greenSoft,
      borderColor: activePalette.successBorder,
      trackColor: activePalette.greenLight,
      icon: 'checkmark-circle',
    },
    medio: {
      title: 'Médio',
      tone: 'medium',
      color: activePalette.amber,
      backgroundColor: activePalette.amberSoft,
      borderColor: activePalette.warningBorder,
      trackColor: activePalette.warningBorder,
      icon: 'alert-circle',
    },
    alto: {
      title: 'Alto',
      tone: 'high',
      color: activePalette.red,
      backgroundColor: activePalette.redSoft,
      borderColor: activePalette.dangerBorder,
      trackColor: activePalette.redTrack,
      icon: 'warning',
    },
  };
}

let riskPresentation = createRiskPresentation(palette);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validações locais dão retorno imediato antes de enviar o formulário ao Firebase.
function emailError(value: string) {
  if (!value.trim()) return 'Informe seu e-mail.';
  if (!emailPattern.test(value.trim())) return 'Digite um e-mail válido, como voce@exemplo.com.';
  return undefined;
}

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) return { score: 0, label: 'Ainda não informada', color: palette.authMuted };
  if (score <= 1) return { score, label: 'Fraca', color: palette.red };
  if (score <= 3) return { score, label: 'Média', color: palette.amber };
  return { score, label: 'Forte', color: palette.greenSuccess };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MotionPressableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

// Botão reutilizável com leve compressão ao toque e respeito à acessibilidade de movimento reduzido.
function MotionPressable({ onPressIn, onPressOut, style, ...props }: MotionPressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (!reducedMotion) {
          scale.value = withSpring(0.975, { damping: 17, stiffness: 320 });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = reducedMotion ? 1 : withSpring(1, { damping: 16, stiffness: 260 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}

// Aplica a entrada suave e escalonada usada nos elementos de cada tela.
function Entrance({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.delay(delay).duration(420).easing(Easing.out(Easing.cubic))
      }
      style={style}>
      {children}
    </Animated.View>
  );
}

// Controlador central: mantém sessão, tela atual, texto analisado e resultado recebido da API.
export default function DetectorApp() {
  const [screen, setScreen] = useState<ScreenName>('login');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('message');
  const [analysisImage, setAnalysisImage] = useState<SelectedAnalysisImage>();
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysis>();
  const [analysisError, setAnalysisError] = useState<string>();
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const systemColorScheme = useColorScheme();
  const reducedMotion = useReducedMotion();

  const darkTheme =
    themePreference === 'dark' || (themePreference === 'system' && systemColorScheme === 'dark');

  // Recria a folha de estilos somente quando o tema resolvido realmente muda.
  if (darkTheme !== isDarkTheme) applyAppTheme(darkTheme);

  useEffect(() => {
    // Restaura a escolha feita no Perfil. Na primeira abertura, segue o tema do aparelho.
    AsyncStorage.getItem(themeStorageKey)
      .then((storedTheme) => {
        if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
          setThemePreference(storedTheme);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      // Restaura a sessão salva e leva usuários autenticados diretamente para o início.
      return observeAuth((currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setScreen((currentScreen) =>
            currentScreen === 'login' || currentScreen === 'signup' ? 'home' : currentScreen
          );
        } else {
          setScreen((currentScreen) =>
            currentScreen === 'login' || currentScreen === 'signup' ? currentScreen : 'login'
          );
        }
      });
    } catch {
      return;
    }
  }, []);

  const startAnalysis = async () => {
    const cleanMessage = analysisMessage.trim();
    setAnalysisError(undefined);

    if (analysisType === 'image' ? !analysisImage : !cleanMessage) {
      setAnalysisError(
        analysisType === 'image'
          ? 'Escolha um print ou tire uma foto antes de iniciar a análise.'
          : analysisType === 'link'
            ? 'Cole ou digite um link antes de iniciar a análise.'
            : 'Cole ou digite uma mensagem antes de iniciar a análise.'
      );
      return;
    }

    if (!user) {
      setAnalysisError('Entre em uma conta para analisar e proteger seu histórico.');
      return;
    }

    setAnalysisResult(undefined);
    setScreen('processing');

    try {
      // O token identifica o usuário para a API; em produção ele é validado pelo Firebase Admin.
      const token = await user.getIdToken();
      const result =
        analysisType === 'image'
          ? await classifyImageRisk(analysisImage!.imageData, token)
          : await classifyRisk(cleanMessage, token, analysisType);
      // No fluxo de imagem, o histórico guarda o texto identificado pelo OCR, nunca o arquivo.
      if (analysisType === 'image') setAnalysisMessage(result.analyzedText);
      setAnalysisResult(result);
      setScreen('result');
    } catch (error) {
      setAnalysisError(classifierErrorMessage(error));
      setScreen('analyze');
    }
  };

  const openAnalyzer = (nextType: AnalysisType) => {
    setAnalysisType(nextType);
    setAnalysisMessage('');
    setAnalysisImage(undefined);
    setAnalysisResult(undefined);
    setAnalysisError(undefined);
    setScreen('analyze');
  };

  const changeAnalysisType = (nextType: AnalysisType) => {
    if (nextType === analysisType) return;
    setAnalysisType(nextType);
    setAnalysisMessage('');
    setAnalysisImage(undefined);
    setAnalysisResult(undefined);
    setAnalysisError(undefined);
  };

  const chooseAnalysisImage = async (source: 'camera' | 'library') => {
    setAnalysisError(undefined);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setAnalysisError(
          source === 'camera'
            ? 'Permita o acesso à câmera para fotografar uma mensagem.'
            : 'Permita o acesso às fotos para escolher um print.'
        );
        return;
      }

      const selection =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

      if (selection.canceled || !selection.assets[0]) return;
      const selected = selection.assets[0];
      const resizeActions =
        selected.width && selected.width > 1600 ? [{ resize: { width: 1600 } }] : [];
      let processed = await manipulateAsync(selected.uri, resizeActions, {
        base64: true,
        compress: 0.78,
        format: SaveFormat.JPEG,
      });
      let imageData = `data:image/jpeg;base64,${processed.base64 || ''}`;

      if (imageData.length > 5_200_000) {
        processed = await manipulateAsync(selected.uri, [{ resize: { width: 1200 } }], {
          base64: true,
          compress: 0.58,
          format: SaveFormat.JPEG,
        });
        imageData = `data:image/jpeg;base64,${processed.base64 || ''}`;
      }

      if (!processed.base64 || imageData.length > 5_200_000) {
        setAnalysisError('A imagem ficou muito grande. Escolha outro print ou recorte a área da mensagem.');
        return;
      }

      setAnalysisMessage('');
      setAnalysisImage({ uri: processed.uri, imageData });
    } catch {
      setAnalysisError('Não foi possível abrir ou preparar esta imagem. Tente novamente.');
    }
  };

  const changeTheme = (nextTheme: ThemePreference) => {
    setThemePreference(nextTheme);
    // A interface muda imediatamente; a gravação mantém a escolha nas próximas aberturas.
    void AsyncStorage.setItem(themeStorageKey, nextTheme);
  };

  let content: React.ReactNode;

  // Navegação simples em memória, adequada ao fluxo linear apresentado no Figma.
  switch (screen) {
    case 'signup':
      content = <SignupScreen navigate={setScreen} />;
      break;
    case 'home':
      content = <HomeScreen navigate={setScreen} onStartAnalysis={openAnalyzer} />;
      break;
    case 'analyze':
      content = (
        <AnalyzeScreen
          navigate={setScreen}
          analysisType={analysisType}
          image={analysisImage}
          message={analysisMessage}
          onChangeType={changeAnalysisType}
          onChangeMessage={(message) => {
            setAnalysisMessage(message);
            setAnalysisError(undefined);
          }}
          onChooseImage={chooseAnalysisImage}
          onRemoveImage={() => {
            setAnalysisImage(undefined);
            setAnalysisMessage('');
            setAnalysisError(undefined);
          }}
          onAnalyze={startAnalysis}
          error={analysisError}
        />
      );
      break;
    case 'processing':
      content = <ProcessingScreen analysisType={analysisType} />;
      break;
    case 'result':
      content = analysisResult ? (
        <ResultScreen
          navigate={setScreen}
          analysisType={analysisType}
          message={analysisResult.analyzedText || analysisMessage}
          result={analysisResult}
          userId={user?.uid}
        />
      ) : (
        <AnalyzeScreen
          navigate={setScreen}
          analysisType={analysisType}
          image={analysisImage}
          message={analysisMessage}
          onChangeType={changeAnalysisType}
          onChangeMessage={(message) => {
            setAnalysisMessage(message);
            setAnalysisError(undefined);
          }}
          onChooseImage={chooseAnalysisImage}
          onRemoveImage={() => {
            setAnalysisImage(undefined);
            setAnalysisMessage('');
            setAnalysisError(undefined);
          }}
          onAnalyze={startAnalysis}
          error={analysisError}
        />
      );
      break;
    case 'history':
      content = <HistoryScreen navigate={setScreen} userId={user?.uid} />;
      break;
    case 'learn':
      content = <LearnScreen navigate={setScreen} />;
      break;
    case 'account':
      content = (
        <AccountScreen
          navigate={setScreen}
          onChangeTheme={changeTheme}
          themePreference={themePreference}
          user={user}
        />
      );
      break;
    case 'login':
    default:
      content = <LoginScreen navigate={setScreen} />;
      break;
  }

  return (
    <Animated.View
      key={screen}
      entering={reducedMotion ? undefined : FadeIn.duration(260).easing(Easing.out(Easing.cubic))}
      style={styles.screenTransition}>
      {content}
    </Animated.View>
  );
}

// Mantém largura de telefone quando aberto em telas grandes e ocupa a tela inteira no aparelho.
function PhoneFrame({ children, auth = false }: { children: React.ReactNode; auth?: boolean }) {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.stage}>
      <StatusBar
        style={isDarkTheme ? 'light' : 'dark'}
        backgroundColor={auth ? palette.authBackground : palette.background}
        hidden={isWeb}
      />
      <SafeAreaView
        edges={isWeb ? [] : ['top', 'right', 'bottom', 'left']}
        style={[styles.phoneFrame, auth && styles.authPhoneFrame]}>
        <View style={[styles.ambientOrb, auth ? styles.ambientOrbAuth : styles.ambientOrbApp]} />
        <View style={styles.ambientOrbBottom} />
        {!auth && isWeb ? <MockStatusBar /> : null}
        {children}
      </SafeAreaView>
    </View>
  );
}

function MockStatusBar() {
  return (
    <View style={styles.mockStatusBar}>
      <Text style={styles.mockTime}>9:41</Text>
      <Text style={styles.mockIndicators}>{'●  ◔  ▰'}</Text>
    </View>
  );
}

function BrandHeader({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.authHeader}>
      <Entrance delay={30}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>DG</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Detector de Golpes</Text>
            <Text style={styles.brandTagline}>Segurança digital</Text>
          </View>
        </View>
      </Entrance>
      <Entrance delay={90}>
        <Text style={styles.authTitle}>{title}</Text>
      </Entrance>
      <Entrance delay={140}>
        <Text style={styles.authDescription}>{description}</Text>
      </Entrance>
    </View>
  );
}

// Campo reutilizado no login e cadastro, incluindo foco, erro, senha e acessibilidade.
type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  textContentType?: TextInputProps['textContentType'];
  error?: string;
};

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  secure = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  textContentType,
  error,
}: FormFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, error && styles.formLabelError]}>
        {label}
      </Text>
      <View style={[styles.inputMock, error && styles.inputMockError]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.authMuted}
          secureTextEntry={secure && !passwordVisible}
          selectionColor={palette.blue}
          style={styles.textInput}
          textContentType={textContentType}
          value={value}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={10}
            onPress={() => setPasswordVisible((visible) => !visible)}>
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={palette.authMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={palette.red} />
          <Text accessibilityLiveRegion="polite" style={styles.fieldErrorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password);

  return (
    <View style={styles.passwordStrength}>
      <View style={styles.passwordStrengthHeader}>
        <Text style={styles.passwordStrengthTitle}>Força da senha</Text>
        <Text style={[styles.passwordStrengthLabel, { color: strength.color }]}>{strength.label}</Text>
      </View>
      <View style={styles.passwordStrengthBars}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.passwordStrengthBar,
              step <= strength.score && { backgroundColor: strength.color },
            ]}
          />
        ))}
      </View>
      <Text style={styles.passwordRequirements}>Use 8+ caracteres, maiúscula, minúscula, número e símbolo.</Text>
    </View>
  );
}

function AuthButton({
  label,
  secondary = false,
  disabled = false,
  onPress,
}: {
  label: string;
  secondary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.authButton,
        secondary && styles.authButtonSecondary,
        disabled && styles.authButtonDisabled,
      ]}>
      <Text style={[styles.authButtonText, secondary && styles.authButtonTextSecondary]}>{label}</Text>
    </MotionPressable>
  );
}

function AuthFeedback({
  message,
  tone = 'error',
}: {
  message?: string;
  tone?: 'error' | 'success';
}) {
  if (!message) return null;

  const success = tone === 'success';

  return (
    <View style={[styles.authFeedback, success && styles.authFeedbackSuccess]}>
      <Ionicons
        name={success ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={17}
        color={success ? palette.greenSuccess : palette.red}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.authFeedbackText, success && styles.authFeedbackTextSuccess]}>
        {message}
      </Text>
    </View>
  );
}

// Tela de entrada conectada ao Firebase Auth e com acesso anônimo opcional.
function LoginScreen({ navigate }: { navigate: Navigate }) {
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

// Tela de cadastro com validação de nome, e-mail, confirmação e força da senha.
function SignupScreen({ navigate }: { navigate: Navigate }) {
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

// Estrutura comum das telas autenticadas, com área segura e navegação inferior personalizada.
function AppScreen({
  children,
  activeTab,
  navigate,
}: {
  children: React.ReactNode;
  activeTab?: 'home' | 'history' | 'learn' | 'account';
  navigate?: Navigate;
}) {
  return (
    <PhoneFrame>
      <View style={styles.appScreen}>{children}</View>
      {activeTab && navigate ? <BottomNavigation active={activeTab} navigate={navigate} /> : null}
    </PhoneFrame>
  );
}

function BottomNavigation({
  active,
  navigate,
}: {
  active: 'home' | 'history' | 'learn' | 'account';
  navigate: Navigate;
}) {
  const items: {
    key: 'home' | 'history' | 'learn' | 'account';
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }[] = [
    { key: 'home', label: 'Início', icon: 'home-outline' },
    { key: 'history', label: 'Histórico', icon: 'menu-outline' },
    { key: 'learn', label: 'Aprender', icon: 'help-outline' },
    { key: 'account', label: 'Conta', icon: 'person-outline' },
  ];

  return (
    <View style={styles.bottomNavigation}>
      {items.map((item) => {
        const selected = active === item.key;
        const color = selected ? palette.green : palette.muted;
        return (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={item.label}
            key={item.key}
            onPress={() => navigate(item.key)}
            style={styles.navItem}>
            <View style={[styles.navIconBox, selected && styles.navIconBoxActive]}>
              <Ionicons name={item.icon} size={19} color={color} />
            </View>
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

// Página inicial com os atalhos para análise, histórico e conteúdo educativo.
function HomeScreen({
  navigate,
  onStartAnalysis,
}: {
  navigate: Navigate;
  onStartAnalysis: (type: AnalysisType) => void;
}) {
  return (
    <AppScreen activeTab="home" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Proteja-se de golpes</Text>
          <Text style={styles.pageSubtitle}>
            Analise mensagens, links e imagens suspeitas antes de tomar qualquer ação.
          </Text>
        </Entrance>

        <Entrance delay={100}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroShield}>
              <Ionicons name="shield-checkmark-outline" size={62} color="rgba(255,255,255,0.18)" />
            </View>
            <Text style={styles.heroEyebrow}>ESCUDO</Text>
            <Text style={styles.heroTitle}>Tem algo suspeito?</Text>
            <Text style={styles.heroDescription}>
              Cole uma mensagem ou envie um print para receber uma análise de risco.
            </Text>
            <MotionPressable
              accessibilityRole="button"
              onPress={() => onStartAnalysis('message')}
              style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Analisar agora</Text>
            </MotionPressable>
          </View>
        </Entrance>

        <Entrance delay={170}>
          <Text style={styles.sectionTitle}>Como deseja analisar?</Text>
        </Entrance>
        <View style={styles.analysisOptions}>
          <Entrance delay={220}>
            <AnalysisOption symbol="Aa" title="Mensagem" description="Cole um texto recebido" onPress={() => onStartAnalysis('message')} />
          </Entrance>
          <Entrance delay={280}>
            <AnalysisOption symbol="↗" title="Link" description="Verifique um endereço" onPress={() => onStartAnalysis('link')} />
          </Entrance>
          <Entrance delay={340}>
            <AnalysisOption symbol="▣" title="Print" description="Envie uma captura de tela" onPress={() => onStartAnalysis('image')} />
          </Entrance>
        </View>

        <Entrance delay={400}>
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>Dica</Text>
            <Text style={styles.tipText}>Bancos nunca pedem senha ou código por mensagem.</Text>
          </View>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}

function AnalysisOption({
  symbol,
  title,
  description,
  onPress,
}: {
  symbol: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.analysisOption}>
      <View style={styles.analysisIconBox}>
        <Text style={styles.analysisIcon}>{symbol}</Text>
      </View>
      <View style={styles.analysisTextBlock}>
        <Text style={styles.analysisTitle}>{title}</Text>
        <Text style={styles.analysisDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </MotionPressable>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.backHeader}>
      <Pressable accessibilityRole="button" onPress={onBack} hitSlop={10} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </Pressable>
      <Text style={styles.backHeaderTitle}>{title}</Text>
    </View>
  );
}

// Entrada unificada para mensagem, link e print, mantendo cada fluxo claro no celular.
function AnalyzeScreen({
  navigate,
  analysisType,
  image,
  message,
  onChangeType,
  onChangeMessage,
  onChooseImage,
  onRemoveImage,
  onAnalyze,
  error,
}: {
  navigate: Navigate;
  analysisType: AnalysisType;
  image?: SelectedAnalysisImage;
  message: string;
  onChangeType: (type: AnalysisType) => void;
  onChangeMessage: (message: string) => void;
  onChooseImage: (source: 'camera' | 'library') => Promise<void>;
  onRemoveImage: () => void;
  onAnalyze: () => Promise<void>;
  error?: string;
}) {
  const [messageFocused, setMessageFocused] = useState(false);
  const canAnalyze = analysisType === 'image' ? Boolean(image) : Boolean(message.trim());
  const copy = {
    message: {
      title: 'Analisar mensagem',
      subtitle: 'Cole abaixo a mensagem que você recebeu.',
      privacy: 'Evite enviar CPF, senha, número de cartão ou outros dados pessoais.',
      button: 'Analisar risco',
    },
    link: {
      title: 'Analisar link',
      subtitle: 'Cole o endereço sem abri-lo. A API verificará sua estrutura com segurança.',
      privacy: 'O link não será aberto. Apenas o endereço visível será analisado.',
      button: 'Verificar link',
    },
    image: {
      title: 'Analisar imagem',
      subtitle: 'Envie um print nítido da conversa, anúncio ou cobrança suspeita.',
      privacy: 'A imagem é enviada somente para sua API local e não é salva no histórico.',
      button: 'Ler imagem e analisar',
    },
  }[analysisType];

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.analyzeContent}>
        <Entrance delay={20}>
          <BackHeader title={copy.title} onBack={() => navigate('home')} />
          <Text style={styles.analyzeSubtitle}>{copy.subtitle}</Text>
        </Entrance>

        <Entrance delay={90}>
          <View accessibilityRole="tablist" style={styles.analysisModeTabs}>
            {(
              [
                { type: 'message', label: 'Mensagem', icon: 'chatbubble-outline' },
                { type: 'link', label: 'Link', icon: 'link-outline' },
                { type: 'image', label: 'Imagem', icon: 'image-outline' },
              ] as const
            ).map((item) => {
              const selected = item.type === analysisType;
              return (
                <MotionPressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.type}
                  onPress={() => onChangeType(item.type)}
                  style={[styles.analysisModeTab, selected && styles.analysisModeTabSelected]}>
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={selected ? palette.green : palette.muted}
                  />
                  <Text style={[styles.analysisModeTabText, selected && styles.analysisModeTabTextSelected]}>
                    {item.label}
                  </Text>
                </MotionPressable>
              );
            })}
          </View>
        </Entrance>

        {analysisType === 'message' ? (
          <Entrance delay={140}>
            <Text style={[styles.fieldTitle, messageFocused && styles.fieldTitleFocused]}>
              Mensagem recebida
            </Text>
            <View style={[styles.messageBox, messageFocused && styles.messageBoxFocused]}>
              <TextInput
                accessibilityLabel="Mensagem recebida"
                maxLength={1500}
                multiline
                onBlur={() => setMessageFocused(false)}
                onChangeText={onChangeMessage}
                onFocus={() => setMessageFocused(true)}
                placeholder="Ex.: “Detectamos uma compra de R$ 2.599. Caso não reconheça, acesse imediatamente...”"
                placeholderTextColor={palette.muted}
                selectionColor={palette.green}
                style={styles.messageInput}
                textAlignVertical="top"
                value={message}
              />
              <Text style={[styles.characterCount, messageFocused && styles.characterCountFocused]}>
                {message.length} / 1500 caracteres
              </Text>
            </View>
          </Entrance>
        ) : null}

        {analysisType === 'link' ? (
          <Entrance delay={140}>
            <Text style={[styles.fieldTitle, messageFocused && styles.fieldTitleFocused]}>
              Endereço recebido
            </Text>
            <View style={[styles.linkInputBox, messageFocused && styles.messageBoxFocused]}>
              <Ionicons name="link-outline" size={20} color={messageFocused ? palette.green : palette.muted} />
              <TextInput
                accessibilityLabel="Link recebido"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                maxLength={2048}
                onBlur={() => setMessageFocused(false)}
                onChangeText={onChangeMessage}
                onFocus={() => setMessageFocused(true)}
                placeholder="https://exemplo.com/verificar"
                placeholderTextColor={palette.muted}
                selectionColor={palette.green}
                style={styles.linkInput}
                value={message}
              />
              {message ? (
                <Pressable accessibilityLabel="Limpar link" hitSlop={8} onPress={() => onChangeMessage('')}>
                  <Ionicons name="close-circle" size={19} color={palette.muted} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.linkHint}>Confira principalmente o domínio antes da primeira barra “/”.</Text>
          </Entrance>
        ) : null}

        {analysisType === 'image' ? (
          <Entrance delay={140}>
            <Text style={styles.fieldTitle}>Print ou foto</Text>
            {image ? (
              <View style={styles.selectedImageCard}>
                <Image contentFit="contain" source={{ uri: image.uri }} style={styles.analysisImagePreview} />
                <View style={styles.selectedImageBadge}>
                  <Ionicons name="checkmark-circle" size={15} color={palette.greenSuccess} />
                  <Text style={styles.selectedImageBadgeText}>Imagem pronta para leitura</Text>
                </View>
                <View style={styles.imageActionRow}>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('library')}
                    style={styles.imageSecondaryButton}>
                    <Ionicons name="images-outline" size={16} color={palette.green} />
                    <Text style={styles.imageSecondaryButtonText}>Trocar</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('camera')}
                    style={styles.imageSecondaryButton}>
                    <Ionicons name="camera-outline" size={16} color={palette.green} />
                    <Text style={styles.imageSecondaryButtonText}>Câmera</Text>
                  </MotionPressable>
                  <Pressable
                    accessibilityLabel="Remover imagem"
                    hitSlop={8}
                    onPress={onRemoveImage}
                    style={styles.imageRemoveButton}>
                    <Ionicons name="trash-outline" size={16} color={palette.red} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.imageUploadCard}>
                <View style={styles.imageUploadIcon}>
                  <Ionicons name="scan-outline" size={30} color={palette.green} />
                </View>
                <Text style={styles.imageUploadTitle}>Escolha uma imagem nítida</Text>
                <Text style={styles.imageUploadDescription}>
                  O OCR localizará o texto e o BERTimbau fará a classificação de risco.
                </Text>
                <View style={styles.imagePickerButtons}>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('library')}
                    style={styles.imagePrimaryButton}>
                    <Ionicons name="images-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.imagePrimaryButtonText}>Galeria</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('camera')}
                    style={styles.imageSecondaryButton}>
                    <Ionicons name="camera-outline" size={17} color={palette.green} />
                    <Text style={styles.imageSecondaryButtonText}>Câmera</Text>
                  </MotionPressable>
                </View>
              </View>
            )}
          </Entrance>
        ) : null}

        <Entrance delay={220}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyTitleRow}>
              <Ionicons name="lock-closed-outline" size={15} color={palette.green} />
              <Text style={styles.privacyCardTitle}>Privacidade</Text>
            </View>
            <Text style={styles.privacyCardText}>{copy.privacy}</Text>
          </View>
        </Entrance>

        <Entrance delay={290}>
          {error ? (
            <View style={styles.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.red} />
              <Text accessibilityLiveRegion="polite" style={styles.saveFeedbackText}>
                {error}
              </Text>
            </View>
          ) : null}
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAnalyze }}
            disabled={!canAnalyze}
            onPress={() => void onAnalyze()}
            style={[styles.primaryGreenButton, !canAnalyze && styles.buttonDisabled]}>
            <Text style={styles.primaryGreenButtonText}>{copy.button}</Text>
            <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
          </MotionPressable>
          <Text style={styles.disclaimer}>
            A análise é educativa e não substitui a confirmação com a instituição oficial.
          </Text>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}

// Feedback visual exibido enquanto a requisição real aguarda a resposta do BERTimbau.
function ProcessingScreen({ analysisType }: { analysisType: AnalysisType }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 1;
      rotation.value = 0;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    rotation.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(rotation);
    };
  }, [pulse, reducedMotion, rotation]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  const firstChecks =
    analysisType === 'image'
      ? ['Preparação da imagem', 'Leitura do texto com OCR']
      : analysisType === 'link'
        ? ['Validação do endereço', 'Estrutura do domínio']
        : ['Preparação do texto', 'Tokenização em português'];
  const checks = [
    { icon: '✓', label: firstChecks[0], status: 'Concluído', color: palette.greenSuccess },
    { icon: '✓', label: firstChecks[1], status: 'Concluído', color: palette.greenSuccess },
    { icon: '•', label: 'Padrões de fraude', status: 'Analisando…', color: palette.green },
    { icon: '○', label: 'Classificação de risco', status: 'Aguardando', color: palette.muted },
  ];

  return (
    <AppScreen>
      <View style={styles.processingContent}>
        <Entrance delay={20}>
          <Text style={styles.processingTitle}>Analisando conteúdo</Text>
          <Text style={styles.processingSubtitle}>
            Estamos verificando sinais comuns de fraude e engenharia social.
          </Text>
        </Entrance>

        <Entrance delay={110}>
          <View style={styles.processingCircleStage}>
            <Animated.View style={[styles.processingOuterCircle, pulseStyle]}>
              <View style={styles.processingInnerCircle}>
                <Ionicons name="shield-checkmark" size={50} color="#FFFFFF" />
              </View>
            </Animated.View>
            <Animated.View style={[styles.processingOrbit, orbitStyle]}>
              <View style={styles.processingOrbitDot} />
            </Animated.View>
          </View>
        </Entrance>

        <View style={styles.checkList}>
          {checks.map((item, index) => (
            <Entrance key={item.label} delay={220 + index * 80}>
              <View style={styles.checkRow}>
                <Text style={[styles.checkIcon, { color: item.color }]}>{item.icon}</Text>
                <Text style={styles.checkLabel}>{item.label}</Text>
                <Text style={[styles.checkStatus, { color: item.color }]}>{item.status}</Text>
              </View>
            </Entrance>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

// Anima a barra até a porcentagem calculada e limita valores fora do intervalo de 0 a 100%.
function RiskProgress({ value, color }: { value: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const normalizedValue = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(reducedMotion ? normalizedValue : 0);

  useEffect(() => {
    progress.value = reducedMotion
      ? normalizedValue
      : withTiming(normalizedValue, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [normalizedValue, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return <Animated.View style={[styles.riskProgress, { backgroundColor: color }, animatedStyle]} />;
}

// Exibe o resultado dinâmico da API e permite gravá-lo no histórico do usuário.
function ResultScreen({
  navigate,
  analysisType,
  message,
  result,
  userId,
}: {
  navigate: Navigate;
  analysisType: AnalysisType;
  message: string;
  result: RiskAnalysis;
  userId?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const presentation = riskPresentation[result.level];

  const saveToHistory = async () => {
    setSaveError(undefined);
    if (!userId) {
      setSaveError('Entre em uma conta ou use o acesso como visitante para salvar a análise.');
      return;
    }

    setSaving(true);
    try {
      const cleanMessage = message.trim().replace(/\s+/g, ' ');
      const fallbackTitle =
        analysisType === 'image'
          ? 'Imagem analisada'
          : analysisType === 'link'
            ? 'Link analisado'
            : 'Mensagem analisada';
      await saveAnalysis(userId, {
        title: cleanMessage ? cleanMessage.slice(0, 44) : fallbackTitle,
        message: message.trim(),
        risk: Math.round(Math.max(0, Math.min(100, result.riskScore))),
        level: presentation.title,
        tone: presentation.tone,
        analysisType,
        warnings: result.warnings.slice(0, 8),
        advice: result.advice.slice(0, 1200),
        modelVersion: (result.modelVersion || 'não informada').slice(0, 120),
      });
      navigate('history');
    } catch (error) {
      setSaveError(firebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultContent}>
        <Entrance delay={20}>
          <BackHeader title="Resultado da análise" onBack={() => navigate('analyze')} />
        </Entrance>

        <Entrance delay={90}>
          <View
            style={[
              styles.riskCard,
              {
                backgroundColor: presentation.backgroundColor,
                borderColor: presentation.borderColor,
              },
            ]}>
            <View style={styles.riskLabelRow}>
              <View
                style={[
                  styles.riskAlertIcon,
                  { backgroundColor: `${presentation.color}18` },
                ]}>
                <Ionicons name={presentation.icon} size={16} color={presentation.color} />
              </View>
              <Text style={[styles.riskLabel, { color: presentation.color }]}>
                RISCO {presentation.title.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.riskValue, { color: presentation.color }]}>
              {result.riskScore}%
            </Text>
            <Text style={styles.riskDescription}>pontuação estimada pela análise combinada</Text>
            <View style={[styles.riskTrack, { backgroundColor: presentation.trackColor }]}>
              <RiskProgress value={result.riskScore / 100} color={presentation.color} />
            </View>
          </View>
        </Entrance>

        {analysisType !== 'message' ? (
          <Entrance delay={150}>
            <View style={styles.resultSourceCard}>
              <View style={styles.resultSourceTitleRow}>
                <Ionicons
                  name={analysisType === 'image' ? 'scan-outline' : 'link-outline'}
                  size={16}
                  color={palette.green}
                />
                <Text style={styles.resultSourceTitle}>
                  {analysisType === 'image' ? 'Texto identificado na imagem' : 'Endereço analisado'}
                </Text>
              </View>
              <Text numberOfLines={analysisType === 'image' ? 6 : 3} style={styles.resultSourceText}>
                {message}
              </Text>
            </View>
          </Entrance>
        ) : null}

        <Entrance delay={180}>
          <Text style={styles.resultSectionTitle}>
            {analysisType === 'image'
              ? 'Sinais observados no texto da imagem'
              : analysisType === 'link'
                ? 'Sinais observados no endereço'
                : 'Sinais observados na mensagem'}
          </Text>
        </Entrance>
        <View style={styles.warningList}>
          {result.warnings.map((warning, index) => (
            <Entrance key={warning} delay={230 + index * 65}>
              <View style={styles.warningCard}>
                <View style={styles.warningIconBox}>
                  <Text style={styles.warningIcon}>!</Text>
                </View>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            </Entrance>
          ))}
        </View>

        <Entrance delay={520}>
          <View style={styles.adviceCard}>
            <View style={styles.adviceTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={palette.green} />
              <Text style={styles.adviceTitle}>O que fazer agora</Text>
            </View>
            <Text style={styles.adviceText}>
              {result.advice}
            </Text>
          </View>
        </Entrance>

        <Entrance delay={580}>
          {saveError ? (
            <View style={styles.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.red} />
              <Text accessibilityLiveRegion="polite" style={styles.saveFeedbackText}>
                {saveError}
              </Text>
            </View>
          ) : null}
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={saveToHistory}
            style={[styles.secondaryGreenButton, saving && styles.buttonDisabled]}>
            <Text style={styles.secondaryGreenButtonText}>
              {saving ? 'Salvando…' : 'Salvar no histórico'}
            </Text>
          </MotionPressable>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}

// Formata timestamps do Firestore em português e trata registros que ainda aguardam o servidor.
function formatHistoryDate(date: Date | null) {
  if (!date) return 'Agora';

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoje, ${time}`;

  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${day}, ${time}`;
}

const analysisTypePresentation: Record<
  AnalysisType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  message: { label: 'Mensagem', icon: 'chatbubble-ellipses-outline' },
  link: { label: 'Link', icon: 'link-outline' },
  image: { label: 'Imagem', icon: 'image-outline' },
};

function historyToneStyle(tone: AnalysisTone) {
  return tone === 'high'
    ? { backgroundColor: palette.redSoft, color: palette.red }
    : tone === 'medium'
      ? { backgroundColor: palette.amberSoft, color: palette.amber }
      : { backgroundColor: palette.greenSoft, color: palette.greenSuccess };
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

// Assina as atualizações do Firestore e adiciona busca, filtros e detalhes completos.
function HistoryScreen({ navigate, userId }: { navigate: Navigate; userId?: string }) {
  const [historyEntries, setHistoryEntries] = useState<StoredAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string>();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | AnalysisTone>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AnalysisType>('all');
  const [selectedEntry, setSelectedEntry] = useState<StoredAnalysis>();

  useEffect(() => {
    setHistoryEntries([]);
    setHistoryError(undefined);

    if (!isFirebaseConfigured) {
      setHistoryError('Configure o Firebase para carregar o histórico.');
      return;
    }

    if (!userId) {
      setHistoryError('Entre em uma conta ou use o acesso como visitante.');
      return;
    }

    setLoadingHistory(true);
    try {
      return subscribeToAnalyses(
        userId,
        (analyses) => {
          setHistoryEntries(analyses);
          setLoadingHistory(false);
        },
        (error) => {
          setHistoryError(firebaseErrorMessage(error));
          setLoadingHistory(false);
        }
      );
    } catch (error) {
      setHistoryError(firebaseErrorMessage(error));
      setLoadingHistory(false);
      return;
    }
  }, [userId]);

  const filteredEntries = useMemo(() => {
    const term = normalizeSearch(search.trim());
    return historyEntries.filter((entry) => {
      const matchesRisk = riskFilter === 'all' || entry.tone === riskFilter;
      const matchesType = typeFilter === 'all' || entry.analysisType === typeFilter;
      const searchableText = normalizeSearch(
        `${entry.title} ${entry.message} ${entry.level} ${analysisTypePresentation[entry.analysisType].label}`
      );
      return matchesRisk && matchesType && (!term || searchableText.includes(term));
    });
  }, [historyEntries, riskFilter, search, typeFilter]);

  if (selectedEntry && userId) {
    return (
      <HistoryDetailScreen
        entry={selectedEntry}
        onBack={() => setSelectedEntry(undefined)}
        onDeleted={() => setSelectedEntry(undefined)}
        userId={userId}
      />
    );
  }

  const hasActiveFilters = Boolean(search.trim()) || riskFilter !== 'all' || typeFilter !== 'all';

  return (
    <AppScreen activeTab="history" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.historyContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Histórico</Text>
          <Text style={styles.pageSubtitle}>Pesquise, filtre e reveja suas análises salvas.</Text>
        </Entrance>

        {!loadingHistory && !historyError && historyEntries.length > 0 ? (
          <Entrance delay={85}>
            <View style={styles.historyControls}>
              <View style={styles.historySearchBox}>
                <Ionicons name="search-outline" size={18} color={palette.muted} />
                <TextInput
                  accessibilityLabel="Pesquisar no histórico"
                  autoCapitalize="none"
                  onChangeText={setSearch}
                  placeholder="Pesquisar mensagem ou título"
                  placeholderTextColor={palette.muted}
                  style={styles.historySearchInput}
                  value={search}
                />
                {search ? (
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={palette.muted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilterRow}>
                <FilterChip label="Todos os riscos" selected={riskFilter === 'all'} onPress={() => setRiskFilter('all')} />
                <FilterChip label="Alto" selected={riskFilter === 'high'} onPress={() => setRiskFilter('high')} />
                <FilterChip label="Médio" selected={riskFilter === 'medium'} onPress={() => setRiskFilter('medium')} />
                <FilterChip label="Baixo" selected={riskFilter === 'low'} onPress={() => setRiskFilter('low')} />
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilterRow}>
                <FilterChip label="Todos os tipos" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
                <FilterChip label="Mensagens" selected={typeFilter === 'message'} onPress={() => setTypeFilter('message')} />
                <FilterChip label="Links" selected={typeFilter === 'link'} onPress={() => setTypeFilter('link')} />
                <FilterChip label="Imagens" selected={typeFilter === 'image'} onPress={() => setTypeFilter('image')} />
              </ScrollView>
            </View>
          </Entrance>
        ) : null}

        {loadingHistory ? (
          <View style={styles.historyState}>
            <ActivityIndicator color={palette.green} size="small" />
            <Text style={styles.historyStateText}>Carregando análises…</Text>
          </View>
        ) : historyError ? (
          <View style={styles.historyState}>
            <View style={styles.historyStateIcon}>
              <Ionicons name="cloud-offline-outline" size={23} color={palette.muted} />
            </View>
            <Text style={styles.historyStateTitle}>Histórico indisponível</Text>
            <Text style={styles.historyStateText}>{historyError}</Text>
          </View>
        ) : historyEntries.length === 0 ? (
          <View style={styles.historyState}>
            <View style={styles.historyStateIcon}>
              <Ionicons name="document-text-outline" size={23} color={palette.green} />
            </View>
            <Text style={styles.historyStateTitle}>Nenhuma análise salva</Text>
            <Text style={styles.historyStateText}>Seus próximos resultados aparecerão aqui.</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.historyState}>
            <View style={styles.historyStateIcon}>
              <Ionicons name="search-outline" size={23} color={palette.green} />
            </View>
            <Text style={styles.historyStateTitle}>Nenhum resultado encontrado</Text>
            <Text style={styles.historyStateText}>Tente mudar a pesquisa ou limpar os filtros.</Text>
            {hasActiveFilters ? (
              <MotionPressable
                accessibilityRole="button"
                onPress={() => {
                  setSearch('');
                  setRiskFilter('all');
                  setTypeFilter('all');
                }}
                style={styles.clearFiltersButton}>
                <Text style={styles.clearFiltersText}>Limpar filtros</Text>
              </MotionPressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.historyList}>
            <Text style={styles.historyCount}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'análise' : 'análises'}
            </Text>
            {filteredEntries.map((entry, index) => (
              <Entrance key={entry.id} delay={110 + Math.min(index, 5) * 55}>
                <HistoryCard entry={entry} onPress={() => setSelectedEntry(entry)} />
              </Entrance>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </MotionPressable>
  );
}

function HistoryCard({ entry, onPress }: { entry: StoredAnalysis; onPress: () => void }) {
  const toneStyle = historyToneStyle(entry.tone);
  const type = analysisTypePresentation[entry.analysisType];

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir análise ${entry.title}`}
      onPress={onPress}
      style={styles.historyCard}>
      <View style={styles.historyCardTopRow}>
        <View style={styles.historyTypeRow}>
          <Ionicons name={type.icon} size={13} color={palette.muted} />
          <Text style={styles.historyDate}>{type.label} · {formatHistoryDate(entry.createdAt)}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: toneStyle.backgroundColor }]}>
          <Text style={[styles.riskBadgeText, { color: toneStyle.color }]}>{entry.level}</Text>
        </View>
      </View>
      <View style={styles.historyCardBody}>
        <View style={styles.historyCardText}>
          <Text numberOfLines={1} style={styles.historyTitle}>{entry.title}</Text>
          <Text style={[styles.historyRisk, { color: toneStyle.color }]}>Risco {entry.risk}%</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>
    </MotionPressable>
  );
}

function HistoryDetailScreen({
  entry,
  userId,
  onBack,
  onDeleted,
}: {
  entry: StoredAnalysis;
  userId: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const toneStyle = historyToneStyle(entry.tone);
  const type = analysisTypePresentation[entry.analysisType];

  const removeEntry = async () => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteAnalysis(userId, entry.id);
      onDeleted();
    } catch (error) {
      setDeleteError(firebaseErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.historyDetailContent}>
        <Entrance delay={20}>
          <BackHeader title="Detalhes da análise" onBack={onBack} />
        </Entrance>

        <Entrance delay={80}>
          <View style={[styles.historyDetailRiskCard, { backgroundColor: toneStyle.backgroundColor }]}>
            <View style={styles.historyDetailRiskText}>
              <Text style={[styles.historyDetailRiskLabel, { color: toneStyle.color }]}>RISCO {entry.level.toUpperCase()}</Text>
              <Text numberOfLines={2} style={styles.historyDetailTitle}>{entry.title}</Text>
            </View>
            <Text style={[styles.historyDetailScore, { color: toneStyle.color }]}>{entry.risk}%</Text>
          </View>
        </Entrance>

        <Entrance delay={140}>
          <View style={styles.historyMetadataCard}>
            <View style={styles.historyMetadataItem}>
              <Ionicons name={type.icon} size={17} color={palette.green} />
              <View>
                <Text style={styles.historyMetadataLabel}>Tipo</Text>
                <Text style={styles.historyMetadataValue}>{type.label}</Text>
              </View>
            </View>
            <View style={styles.historyMetadataDivider} />
            <View style={styles.historyMetadataItem}>
              <Ionicons name="calendar-outline" size={17} color={palette.green} />
              <View>
                <Text style={styles.historyMetadataLabel}>Salva em</Text>
                <Text style={styles.historyMetadataValue}>{formatHistoryDate(entry.createdAt)}</Text>
              </View>
            </View>
          </View>
        </Entrance>

        <Entrance delay={200}>
          <Text style={styles.historyDetailSectionTitle}>Conteúdo analisado</Text>
          <View style={styles.historyMessageCard}>
            <Text selectable style={styles.historyMessageText}>
              {entry.message || 'O conteúdo original não está disponível neste registro.'}
            </Text>
          </View>
        </Entrance>

        <Entrance delay={260}>
          <Text style={styles.historyDetailSectionTitle}>Sinais encontrados</Text>
          <View style={styles.historyDetailWarnings}>
            {(entry.warnings.length > 0 ? entry.warnings : ['Este registro antigo não possui sinais detalhados.']).map((warning) => (
              <View key={warning} style={styles.historyDetailWarningRow}>
                <View style={styles.warningIconBox}>
                  <Text style={styles.warningIcon}>!</Text>
                </View>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        </Entrance>

        <Entrance delay={320}>
          <View style={styles.adviceCard}>
            <View style={styles.adviceTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={palette.green} />
              <Text style={styles.adviceTitle}>Recomendação</Text>
            </View>
            <Text style={styles.adviceText}>
              {entry.advice || 'Analise novamente a mensagem para receber uma recomendação detalhada.'}
            </Text>
            <Text style={styles.historyModelText}>Modelo: {entry.modelVersion}</Text>
          </View>
        </Entrance>

        <Entrance delay={380}>
          {deleteError ? <AuthFeedback message={deleteError} /> : null}
          {confirmDelete ? (
            <View style={styles.deleteConfirmCard}>
              <Text style={styles.deleteConfirmTitle}>Excluir esta análise?</Text>
              <Text style={styles.deleteConfirmText}>Ela será removida do seu histórico e não poderá ser recuperada.</Text>
              <View style={styles.deleteConfirmActions}>
                <MotionPressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={() => setConfirmDelete(false)}
                  style={styles.cancelDeleteButton}>
                  <Text style={styles.cancelDeleteText}>Cancelar</Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={removeEntry}
                  style={[styles.confirmDeleteButton, deleting && styles.buttonDisabled]}>
                  <Text style={styles.confirmDeleteText}>{deleting ? 'Excluindo…' : 'Sim, excluir'}</Text>
                </MotionPressable>
              </View>
            </View>
          ) : (
            <MotionPressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              style={styles.deleteHistoryButton}>
              <Ionicons name="trash-outline" size={17} color={palette.red} />
              <Text style={styles.deleteHistoryButtonText}>Excluir do histórico</Text>
            </MotionPressable>
          )}
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}

// Conteúdo introdutório da área educativa; pode futuramente ser movido para o Firestore.
const lessons = [
  { number: '01', title: 'Golpe do falso banco', description: 'Mensagens e ligações que simulam centrais bancárias.' },
  { number: '02', title: 'Golpe do Pix', description: 'Pedidos urgentes de transferência ou devolução.' },
  { number: '03', title: 'Phishing', description: 'Links falsos criados para capturar dados pessoais.' },
  { number: '04', title: 'Falso familiar', description: 'Alguém se passa por parente usando outro número.' },
] as const;

function LearnScreen({ navigate }: { navigate: Navigate }) {
  return (
    <AppScreen activeTab="learn" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.learnContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Aprenda a se proteger</Text>
          <Text style={styles.pageSubtitle}>Conheça os golpes mais comuns e os sinais de alerta.</Text>
        </Entrance>

        <View style={styles.lessonList}>
          {lessons.map((lesson, index) => (
            <Entrance key={lesson.number} delay={110 + index * 70}>
              <View style={styles.lessonCard}>
                <View style={styles.lessonNumberBox}>
                  <Text style={styles.lessonNumber}>{lesson.number}</Text>
                </View>
                <View style={styles.lessonBody}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonDescription}>{lesson.description}</Text>
                  <Text style={styles.lessonLink}>Ver guia →</Text>
                </View>
              </View>
            </Entrance>
          ))}
        </View>

        <Entrance delay={430}>
          <View style={styles.goldenRuleCard}>
            <Text style={styles.goldenRuleLabel}>Regra de ouro</Text>
            <Text style={styles.goldenRuleText}>Na dúvida, confirme sempre por um canal oficial.</Text>
          </View>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}

function accountInitials(user: FirebaseUser | null) {
  const source = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Visitante';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

// Centraliza as operações reais da conta do Firebase e diferencia visitantes de cadastros por e-mail.
function AccountScreen({
  navigate,
  user,
  themePreference,
  onChangeTheme,
}: {
  navigate: Navigate;
  user: FirebaseUser | null;
  themePreference: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
}) {
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

// Gera uma única folha de estilos a partir da paleta ativa.
function createAppStyles(palette: AppPalette) {
  return StyleSheet.create({
  screenTransition: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.stage,
  },
  phoneFrame: {
    position: 'relative',
    flex: 1,
    width: '100%',
    maxWidth: 390,
    maxHeight: 844,
    backgroundColor: palette.background,
    overflow: 'hidden',
    borderRadius: Platform.OS === 'web' ? 28 : 0,
    ...Platform.select({
      web: {
        boxShadow: '0px 24px 70px rgba(25, 39, 66, 0.18)',
      },
      default: {},
    }),
  },
  authPhoneFrame: {
    backgroundColor: palette.authBackground,
    borderRadius: Platform.OS === 'web' ? 32 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: palette.authBorder,
  },
  ambientOrb: {
    pointerEvents: 'none',
    position: 'absolute',
    top: -90,
    right: -95,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  ambientOrbAuth: {
    backgroundColor: 'rgba(37, 73, 230, 0.055)',
  },
  ambientOrbApp: {
    backgroundColor: 'rgba(19, 71, 61, 0.055)',
  },
  ambientOrbBottom: {
    pointerEvents: 'none',
    position: 'absolute',
    bottom: -130,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(20, 115, 71, 0.035)',
  },
  mockStatusBar: {
    height: 44,
    paddingLeft: 22,
    paddingRight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockTime: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  mockIndicators: {
    color: palette.text,
    fontSize: 11,
    lineHeight: 13,
  },
  authContent: {
    flexGrow: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 34 : 10,
    paddingBottom: 24,
    gap: 22,
  },
  authHeader: {
    width: '100%',
    height: 156,
    gap: 12,
  },
  brandRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
  },
  brandName: {
    color: palette.authText,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  brandTagline: {
    marginTop: 2,
    color: palette.blue,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  authTitle: {
    color: palette.authText,
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700',
  },
  authDescription: {
    color: palette.authMuted,
    fontSize: 14,
    lineHeight: 19,
  },
  authCard: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.authBorder,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 24px rgba(15, 23, 41, 0.08)',
      },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  loginCard: {
    minHeight: 367,
    gap: 16,
  },
  signupCard: {
    minHeight: 610,
    gap: 13,
  },
  formField: {
    width: '100%',
    gap: 8,
  },
  formLabel: {
    color: palette.authText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  formLabelFocused: {
    color: palette.blue,
  },
  formLabelError: {
    color: palette.red,
  },
  inputMock: {
    width: '100%',
    height: 47,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.authBorder,
    backgroundColor: palette.surface,
  },
  inputMockFocused: {
    borderWidth: 1.5,
    borderColor: palette.blue,
    backgroundColor: palette.input,
    ...Platform.select({
      web: { boxShadow: '0px 0px 0px 3px rgba(37, 73, 230, 0.10)' },
      default: {
        shadowColor: palette.blue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
        elevation: 1,
      },
    }),
  },
  inputMockError: {
    borderWidth: 1.5,
    borderColor: palette.red,
    backgroundColor: palette.dangerSurface,
  },
  textInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: palette.authText,
    fontSize: 14,
    lineHeight: 19,
    padding: 0,
    ...Platform.select({
      web: { outlineColor: 'transparent', outlineWidth: 0 },
      default: {},
    }),
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: 3,
  },
  fieldErrorText: {
    flex: 1,
    color: palette.red,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  passwordStrength: {
    width: '100%',
    gap: 6,
    paddingHorizontal: 2,
  },
  passwordStrengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordStrengthTitle: {
    color: palette.authMuted,
    fontSize: 11,
    lineHeight: 14,
  },
  passwordStrengthLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  passwordStrengthBars: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.authBorder,
  },
  passwordRequirements: {
    color: palette.authMuted,
    fontSize: 10,
    lineHeight: 13,
  },
  forgotRow: {
    width: '100%',
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotMuted: {
    color: palette.authMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  forgotLink: {
    color: palette.blue,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  authButton: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: palette.blue,
  },
  authButtonSecondary: {
    borderWidth: 1,
    borderColor: palette.authBorder,
    backgroundColor: palette.blueSoft,
  },
  authButtonDisabled: {
    opacity: 0.58,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  authButtonTextSecondary: {
    color: palette.blue,
  },
  authFeedback: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.dangerSurface,
  },
  authFeedbackText: {
    flex: 1,
    color: palette.red,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  authFeedbackSuccess: {
    borderColor: palette.successBorder,
    backgroundColor: palette.successSurface,
  },
  authFeedbackTextSuccess: {
    color: palette.greenSuccess,
  },
  privacyBadge: {
    height: 33,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: palette.greenSoft,
  },
  privacyDot: {
    width: 8,
    height: 8,
  },
  privacyBadgeText: {
    color: palette.greenSuccess,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  authFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authFooterText: {
    color: palette.authMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  authFooterLink: {
    color: palette.blue,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  termsRow: {
    width: '100%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxMock: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
  },
  termsText: {
    flex: 1,
    color: palette.authMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  appScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomNavigation: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 70,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    ...Platform.select({
      web: { boxShadow: '0px -8px 24px rgba(15, 23, 41, 0.06)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIconBox: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  navIconBoxActive: {
    backgroundColor: palette.greenSoft,
  },
  navLabel: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 13,
  },
  navLabelActive: {
    color: palette.green,
    fontWeight: '600',
  },
  homeContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 94,
  },
  pageTitle: {
    color: palette.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '700',
  },
  pageSubtitle: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 16,
  },
  heroCard: {
    height: 176,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingTop: 26,
    borderRadius: 24,
    backgroundColor: palette.green,
    ...Platform.select({
      web: { boxShadow: '0px 14px 30px rgba(19, 71, 61, 0.22)' },
      default: {
        shadowColor: palette.green,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  heroGlow: {
    pointerEvents: 'none',
    position: 'absolute',
    top: -60,
    right: -45,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(189, 235, 222, 0.09)',
  },
  heroShield: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 18,
    right: 22,
  },
  heroEyebrow: {
    color: palette.greenLight,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  heroTitle: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
  },
  heroDescription: {
    marginTop: 8,
    maxWidth: 286,
    color: palette.heroMuted,
    fontSize: 14,
    lineHeight: 17,
  },
  heroButton: {
    position: 'absolute',
    left: 24,
    bottom: -18,
    width: 160,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 8px 18px rgba(8, 36, 31, 0.18)' },
      default: {
        shadowColor: '#08241F',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  heroButtonText: {
    color: palette.green,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 30,
    color: palette.text,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600',
  },
  analysisOptions: {
    marginTop: 16,
    gap: 16,
  },
  analysisOption: {
    width: '100%',
    height: 78,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 6px 18px rgba(15, 23, 41, 0.055)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.055,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  analysisIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: palette.greenSoft,
  },
  analysisIcon: {
    color: palette.green,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '600',
  },
  analysisTextBlock: {
    flex: 1,
    gap: 6,
  },
  analysisTitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  analysisDescription: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 14,
  },
  tipCard: {
    height: 62,
    marginTop: 34,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 5,
    borderRadius: 16,
    backgroundColor: palette.amberSoft,
    borderWidth: 1,
    borderColor: palette.warningBorder,
  },
  tipLabel: {
    color: palette.amber,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  tipText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 14,
  },
  backHeader: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 24,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backHeaderTitle: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  analyzeContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 30,
  },
  analyzeSubtitle: {
    marginTop: 22,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 16,
  },
  analysisModeTabs: {
    height: 48,
    marginTop: 20,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceRaised,
  },
  analysisModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
  },
  analysisModeTabSelected: {
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 3px 9px rgba(15, 23, 41, 0.08)' },
      default: {
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  analysisModeTabText: {
    color: palette.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  analysisModeTabTextSelected: {
    color: palette.green,
    fontWeight: '700',
  },
  fieldTitle: {
    marginTop: 23,
    color: palette.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  fieldTitleFocused: {
    color: palette.green,
  },
  messageBox: {
    position: 'relative',
    height: 242,
    marginTop: 12,
    paddingHorizontal: 17,
    paddingTop: 19,
    paddingBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 8px 22px rgba(15, 23, 41, 0.05)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      },
    }),
  },
  messageBoxFocused: {
    borderWidth: 1.5,
    borderColor: palette.green,
    ...Platform.select({
      web: { boxShadow: '0px 0px 0px 3px rgba(19, 71, 61, 0.10)' },
      default: {
        shadowColor: palette.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
        elevation: 2,
      },
    }),
  },
  messageInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: palette.muted,
    fontSize: 14,
    lineHeight: 17,
    padding: 0,
    paddingBottom: 26,
    ...Platform.select({
      web: { outlineColor: 'transparent', outlineWidth: 0 },
      default: {},
    }),
  },
  characterCount: {
    position: 'absolute',
    right: 24,
    bottom: 14,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 13,
  },
  characterCountFocused: {
    color: palette.green,
    fontWeight: '600',
  },
  linkInputBox: {
    height: 58,
    marginTop: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  linkInput: {
    flex: 1,
    height: 54,
    padding: 0,
    color: palette.text,
    fontSize: 13,
    lineHeight: 17,
    ...Platform.select({
      web: { outlineColor: 'transparent', outlineWidth: 0 },
      default: {},
    }),
  },
  linkHint: {
    marginTop: 9,
    color: palette.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  imageUploadCard: {
    minHeight: 254,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.successBorder,
    backgroundColor: palette.surface,
  },
  imageUploadIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: palette.greenSoft,
  },
  imageUploadTitle: {
    marginTop: 14,
    color: palette.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  imageUploadDescription: {
    maxWidth: 270,
    marginTop: 7,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  imagePickerButtons: {
    width: '100%',
    marginTop: 18,
    flexDirection: 'row',
    gap: 9,
  },
  imagePrimaryButton: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: palette.green,
  },
  imagePrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  imageSecondaryButton: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.successBorder,
    backgroundColor: palette.greenSoft,
  },
  imageSecondaryButtonText: {
    color: palette.green,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  selectedImageCard: {
    marginTop: 12,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  analysisImagePreview: {
    width: '100%',
    height: 230,
    borderRadius: 14,
    backgroundColor: palette.surfaceRaised,
  },
  selectedImageBadge: {
    minHeight: 34,
    marginTop: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 11,
    backgroundColor: palette.successSurface,
  },
  selectedImageBadgeText: {
    color: palette.greenSuccess,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  imageActionRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 8,
  },
  imageRemoveButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.dangerSurface,
  },
  privacyCard: {
    height: 78,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 6,
    borderRadius: 18,
    backgroundColor: palette.greenSoft,
    borderWidth: 1,
    borderColor: palette.successBorder,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  privacyCardTitle: {
    color: palette.green,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  privacyCardText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 14,
  },
  primaryGreenButton: {
    width: '100%',
    height: 52,
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 16,
    backgroundColor: palette.green,
    ...Platform.select({
      web: { boxShadow: '0px 10px 22px rgba(19, 71, 61, 0.20)' },
      default: {
        shadowColor: palette.green,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  primaryGreenButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 16,
    paddingHorizontal: 12,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
  processingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 68,
  },
  processingTitle: {
    color: palette.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '700',
  },
  processingSubtitle: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 16,
  },
  processingCircleStage: {
    position: 'relative',
    width: 222,
    height: 222,
    marginTop: 35,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingOuterCircle: {
    width: 202,
    height: 202,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 101,
    backgroundColor: palette.greenSoft,
    borderWidth: 1,
    borderColor: palette.successBorder,
  },
  processingInnerCircle: {
    width: 138,
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 69,
    backgroundColor: palette.green,
    ...Platform.select({
      web: { boxShadow: '0px 12px 28px rgba(19, 71, 61, 0.24)' },
      default: {
        shadowColor: palette.green,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
        elevation: 8,
      },
    }),
  },
  processingOrbit: {
    pointerEvents: 'none',
    position: 'absolute',
    width: 222,
    height: 222,
    borderRadius: 111,
    borderWidth: 1,
    borderColor: 'rgba(19, 71, 61, 0.10)',
  },
  processingOrbitDot: {
    position: 'absolute',
    top: -4,
    left: 107,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.green,
  },
  checkList: {
    marginTop: 38,
    paddingHorizontal: 6,
    gap: 36,
  },
  checkRow: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    width: 28,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '600',
  },
  checkLabel: {
    flex: 1,
    color: palette.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  checkStatus: {
    width: 90,
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'left',
  },
  resultContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 30,
  },
  riskCard: {
    height: 168,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderRadius: 22,
    backgroundColor: palette.redSoft,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    ...Platform.select({
      web: { boxShadow: '0px 10px 26px rgba(184, 33, 41, 0.10)' },
      default: {
        shadowColor: palette.red,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  riskLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskAlertIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(184, 33, 41, 0.10)',
  },
  riskLabel: {
    color: palette.red,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  riskValue: {
    marginTop: 4,
    color: palette.red,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700',
  },
  riskDescription: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 16,
  },
  riskTrack: {
    width: '100%',
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: palette.redTrack,
  },
  riskProgress: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.red,
    transformOrigin: 'left center',
  },
  resultSourceCard: {
    marginTop: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  resultSourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  resultSourceTitle: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  resultSourceText: {
    marginTop: 9,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  resultSectionTitle: {
    marginTop: 28,
    color: palette.text,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600',
  },
  warningList: {
    marginTop: 18,
    gap: 10,
  },
  warningCard: {
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 4px 14px rgba(15, 23, 41, 0.045)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.045,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  warningIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.redSoft,
  },
  warningIcon: {
    color: palette.red,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  warningText: {
    flex: 1,
    color: palette.text,
    fontSize: 12,
    lineHeight: 14,
  },
  adviceCard: {
    minHeight: 112,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 18,
    backgroundColor: palette.greenSoft,
    borderWidth: 1,
    borderColor: palette.successBorder,
  },
  adviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  adviceTitle: {
    color: palette.green,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  adviceText: {
    marginTop: 10,
    color: palette.text,
    fontSize: 12,
    lineHeight: 14,
  },
  secondaryGreenButton: {
    width: '100%',
    height: 52,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(15, 23, 41, 0.07)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  secondaryGreenButtonText: {
    color: palette.green,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  saveFeedback: {
    minHeight: 42,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.dangerSurface,
  },
  saveFeedbackText: {
    flex: 1,
    color: palette.red,
    fontSize: 11,
    lineHeight: 15,
  },
  historyContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 94,
  },
  historyControls: {
    marginTop: 22,
    gap: 10,
  },
  historySearchBox: {
    height: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  historySearchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 13,
    lineHeight: 17,
    padding: 0,
    ...Platform.select({
      web: { outlineColor: 'transparent', outlineWidth: 0 },
      default: {},
    }),
  },
  historyFilterRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    minHeight: 32,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  filterChipSelected: {
    borderColor: palette.green,
    backgroundColor: palette.greenSoft,
  },
  filterChipText: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: palette.green,
    fontWeight: '700',
  },
  historyList: {
    marginTop: 24,
    gap: 14,
  },
  historyCount: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  historyState: {
    minHeight: 180,
    marginTop: 42,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  historyStateIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: palette.greenSoft,
  },
  historyStateTitle: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyStateText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  clearFiltersButton: {
    minHeight: 36,
    marginTop: 4,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: palette.greenSoft,
  },
  clearFiltersText: {
    color: palette.green,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  historyCard: {
    minHeight: 106,
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 6px 18px rgba(15, 23, 41, 0.055)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.055,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  historyCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTypeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyDate: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 13,
  },
  historyCardBody: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyCardText: {
    flex: 1,
  },
  historyTitle: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  },
  historyRisk: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  riskBadge: {
    minWidth: 64,
    height: 25,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  riskBadgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
  historyDetailContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
  },
  historyDetailRiskCard: {
    minHeight: 120,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(19, 71, 61, 0.08)',
  },
  historyDetailRiskText: {
    flex: 1,
  },
  historyDetailRiskLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  historyDetailTitle: {
    marginTop: 9,
    color: palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  historyDetailScore: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  historyMetadataCard: {
    minHeight: 72,
    marginTop: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  historyMetadataItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  historyMetadataDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 10,
    backgroundColor: palette.border,
  },
  historyMetadataLabel: {
    color: palette.muted,
    fontSize: 9,
    lineHeight: 12,
  },
  historyMetadataValue: {
    marginTop: 3,
    color: palette.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  historyDetailSectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    color: palette.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  historyMessageCard: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  historyMessageText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 18,
  },
  historyDetailWarnings: {
    gap: 9,
  },
  historyDetailWarningRow: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  historyModelText: {
    marginTop: 12,
    color: palette.green,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  deleteHistoryButton: {
    height: 48,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.dangerSurface,
  },
  deleteHistoryButtonText: {
    color: palette.red,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  deleteConfirmCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.dangerSurface,
  },
  deleteConfirmTitle: {
    color: palette.red,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  deleteConfirmText: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  deleteConfirmActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  cancelDeleteButton: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  cancelDeleteText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: palette.red,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  learnContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 94,
  },
  lessonList: {
    marginTop: 48,
    gap: 20,
  },
  lessonCard: {
    height: 106,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...Platform.select({
      web: { boxShadow: '0px 6px 18px rgba(15, 23, 41, 0.055)' },
      default: {
        shadowColor: '#0F1729',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.055,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  lessonNumberBox: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: palette.greenSoft,
  },
  lessonNumber: {
    color: palette.green,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  lessonBody: {
    flex: 1,
  },
  lessonTitle: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  },
  lessonDescription: {
    marginTop: 7,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 14,
  },
  lessonLink: {
    marginTop: 3,
    color: palette.green,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
  goldenRuleCard: {
    height: 66,
    marginTop: 38,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderRadius: 18,
    backgroundColor: palette.green,
    ...Platform.select({
      web: { boxShadow: '0px 10px 24px rgba(19, 71, 61, 0.16)' },
      default: {
        shadowColor: palette.green,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  goldenRuleLabel: {
    color: palette.greenLight,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  goldenRuleText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  accountContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 100,
  },
  accountProfileCard: {
    minHeight: 112,
    marginTop: 22,
    paddingHorizontal: 17,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 21,
    backgroundColor: palette.green,
    ...Platform.select({
      web: { boxShadow: '0px 12px 26px rgba(19, 71, 61, 0.17)' },
      default: {
        shadowColor: palette.green,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.17,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  accountAvatarButton: {
    position: 'relative',
    width: 66,
    height: 66,
  },
  accountAvatar: {
    width: 62,
    height: 62,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  accountAvatarImage: {
    width: '100%',
    height: '100%',
  },
  accountAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  accountCameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 2,
    borderColor: palette.green,
    backgroundColor: '#FFFFFF',
  },
  accountProfileText: {
    flex: 1,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
  },
  accountEmail: {
    marginTop: 4,
    color: palette.heroMuted,
    fontSize: 11,
    lineHeight: 14,
  },
  accountTypeBadge: {
    minHeight: 23,
    marginTop: 9,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    backgroundColor: palette.greenSoft,
  },
  accountTypeBadgeGuest: {
    backgroundColor: palette.amberSoft,
  },
  accountTypeText: {
    color: palette.greenSuccess,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  accountTypeTextGuest: {
    color: palette.amber,
  },
  accountSectionCard: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  accountSectionTitle: {
    marginBottom: 8,
    color: palette.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  themeDescription: {
    marginBottom: 12,
    color: palette.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  themeOptions: {
    gap: 8,
  },
  themeOption: {
    minHeight: 50,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceRaised,
  },
  themeOptionSelected: {
    borderColor: palette.green,
    backgroundColor: palette.greenSoft,
  },
  themeOptionIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: palette.surface,
  },
  themeOptionIconSelected: {
    backgroundColor: palette.surface,
  },
  themeOptionText: {
    flex: 1,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  themeOptionTextSelected: {
    color: palette.text,
    fontWeight: '700',
  },
  themeRadio: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  themeRadioSelected: {
    borderColor: palette.green,
  },
  themeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.green,
  },
  accountActionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  accountActionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.greenSoft,
  },
  accountActionText: {
    flex: 1,
  },
  accountActionLabel: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  accountActionDescription: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  verifiedText: {
    color: palette.greenSuccess,
    fontWeight: '700',
  },
  accountRowDivider: {
    height: 1,
    backgroundColor: palette.divider,
  },
  removePhotoButton: {
    minHeight: 32,
    marginTop: -3,
    marginBottom: 7,
    marginLeft: 47,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  removePhotoButtonText: {
    color: palette.red,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  accountStatusRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  verificationActions: {
    paddingLeft: 47,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verificationPrimaryButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.green,
  },
  verificationPrimaryText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  verificationRefreshButton: {
    minHeight: 34,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationRefreshText: {
    color: palette.green,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  guestAccountNotice: {
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderRadius: 13,
    backgroundColor: palette.amberSoft,
  },
  guestAccountNoticeText: {
    flex: 1,
    color: palette.amber,
    fontSize: 10,
    lineHeight: 14,
  },
  accountEditBlock: {
    paddingTop: 6,
  },
  accountFieldLabel: {
    marginBottom: 7,
    color: palette.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  accountNameInput: {
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceRaised,
    color: palette.text,
    fontSize: 12,
    lineHeight: 16,
    ...Platform.select({
      web: { outlineColor: 'transparent', outlineWidth: 0 },
      default: {},
    }),
  },
  accountInlineActions: {
    marginTop: 11,
    flexDirection: 'row',
    gap: 9,
  },
  accountCancelButton: {
    flex: 1,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  accountCancelButtonText: {
    color: palette.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  accountSaveButton: {
    flex: 1,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: palette.green,
  },
  accountSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  accountDangerCard: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.dangerSurface,
  },
  accountDangerTitle: {
    color: palette.red,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  accountDangerDescription: {
    marginTop: 5,
    color: palette.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  accountDangerButton: {
    height: 41,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    backgroundColor: palette.surface,
  },
  accountDangerButtonText: {
    color: palette.red,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  accountDeleteConfirm: {
    marginTop: 13,
  },
  accountDeleteWarning: {
    marginTop: 9,
    color: palette.red,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  accountDeleteButton: {
    flex: 1.35,
    height: 39,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: palette.red,
  },
  accountDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  });
}

let isDarkTheme = false;
let styles = createAppStyles(palette);

function applyAppTheme(useDarkTheme: boolean) {
  isDarkTheme = useDarkTheme;
  palette = useDarkTheme ? darkPalette : lightPalette;
  riskPresentation = createRiskPresentation(palette);
  styles = createAppStyles(palette);
}
