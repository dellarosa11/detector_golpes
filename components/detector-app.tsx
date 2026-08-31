import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import type { User as FirebaseUser } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
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
  firebaseErrorMessage,
  loginAsGuest,
  loginWithEmail,
  observeAuth,
  saveAnalysis,
  StoredAnalysis,
  subscribeToAnalyses,
} from '@/lib/firebase-data';
import {
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

// Paleta compartilhada para manter cores e estados visuais consistentes em todas as telas.
const palette = {
  background: '#F6F8FB',
  authBackground: '#F6F8FC',
  text: '#0E131C',
  authText: '#1A1F29',
  muted: '#5C6678',
  authMuted: '#5F6E89',
  border: '#DBE0E8',
  authBorder: '#E0E7F2',
  surface: '#FFFFFF',
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
} as const;

type ScreenName =
  | 'login'
  | 'signup'
  | 'home'
  | 'analyze'
  | 'processing'
  | 'result'
  | 'history'
  | 'learn';

type Navigate = (screen: ScreenName) => void;

// Converte o nível retornado pela API em textos, cores e ícones usados no resultado e histórico.
const riskPresentation: Record<
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
> = {
  baixo: {
    title: 'Baixo',
    tone: 'low',
    color: palette.greenSuccess,
    backgroundColor: palette.greenSoft,
    borderColor: '#CFE8DF',
    trackColor: palette.greenLight,
    icon: 'checkmark-circle',
  },
  medio: {
    title: 'Médio',
    tone: 'medium',
    color: palette.amber,
    backgroundColor: palette.amberSoft,
    borderColor: '#EEDBA8',
    trackColor: '#F0D99D',
    icon: 'alert-circle',
  },
  alto: {
    title: 'Alto',
    tone: 'high',
    color: palette.red,
    backgroundColor: palette.redSoft,
    borderColor: '#F4D6D6',
    trackColor: palette.redTrack,
    icon: 'warning',
  },
};

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
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysis>();
  const [analysisError, setAnalysisError] = useState<string>();
  const reducedMotion = useReducedMotion();

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
        }
      });
    } catch {
      return;
    }
  }, []);

  const startAnalysis = async () => {
    const cleanMessage = analysisMessage.trim();
    setAnalysisError(undefined);

    if (!cleanMessage) {
      setAnalysisError('Cole ou digite uma mensagem antes de iniciar a análise.');
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
      const result = await classifyRisk(cleanMessage, token);
      setAnalysisResult(result);
      setScreen('result');
    } catch (error) {
      setAnalysisError(classifierErrorMessage(error));
      setScreen('analyze');
    }
  };

  let content: React.ReactNode;

  // Navegação simples em memória, adequada ao fluxo linear apresentado no Figma.
  switch (screen) {
    case 'signup':
      content = <SignupScreen navigate={setScreen} />;
      break;
    case 'home':
      content = <HomeScreen navigate={setScreen} />;
      break;
    case 'analyze':
      content = (
        <AnalyzeScreen
          navigate={setScreen}
          message={analysisMessage}
          onChangeMessage={(message) => {
            setAnalysisMessage(message);
            setAnalysisError(undefined);
          }}
          onAnalyze={startAnalysis}
          error={analysisError}
        />
      );
      break;
    case 'processing':
      content = <ProcessingScreen />;
      break;
    case 'result':
      content = analysisResult ? (
        <ResultScreen
          navigate={setScreen}
          message={analysisMessage}
          result={analysisResult}
          userId={user?.uid}
        />
      ) : (
        <AnalyzeScreen
          navigate={setScreen}
          message={analysisMessage}
          onChangeMessage={(message) => {
            setAnalysisMessage(message);
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
      <StatusBar style="dark" backgroundColor={auth ? palette.authBackground : palette.background} hidden={isWeb} />
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
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, focused && styles.formLabelFocused, error && styles.formLabelError]}>
        {label}
      </Text>
      <View style={[styles.inputMock, focused && styles.inputMockFocused, error && styles.inputMockError]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
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

function AuthFeedback({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <View style={styles.authFeedback}>
      <Ionicons name="alert-circle-outline" size={17} color={palette.red} />
      <Text accessibilityLiveRegion="polite" style={styles.authFeedbackText}>
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
  const [busyAction, setBusyAction] = useState<'login' | 'guest'>();

  const errors = {
    email: emailError(email),
    password: password ? undefined : 'Informe sua senha.',
  };

  const submitLogin = async () => {
    setShowErrors(true);
    setFirebaseError(undefined);
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

  return (
    <PhoneFrame auth>
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
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
              }}
              secure
              autoCapitalize="none"
              textContentType="password"
              error={showErrors ? errors.password : undefined}
            />
            <View style={styles.forgotRow}>
              <Text style={styles.forgotMuted}>Lembrar de mim</Text>
              <Text style={styles.forgotLink}>Esqueci minha senha</Text>
            </View>
            <AuthFeedback message={firebaseError} />
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
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
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
  activeTab?: 'home' | 'history' | 'learn';
  navigate?: Navigate;
}) {
  return (
    <PhoneFrame>
      <View style={styles.appScreen}>{children}</View>
      {activeTab && navigate ? <BottomNavigation active={activeTab} navigate={navigate} /> : null}
    </PhoneFrame>
  );
}

function BottomNavigation({ active, navigate }: { active: 'home' | 'history' | 'learn'; navigate: Navigate }) {
  const items: {
    key: 'home' | 'history' | 'learn';
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }[] = [
    { key: 'home', label: 'Início', icon: 'home-outline' },
    { key: 'history', label: 'Histórico', icon: 'menu-outline' },
    { key: 'learn', label: 'Aprender', icon: 'help-outline' },
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
function HomeScreen({ navigate }: { navigate: Navigate }) {
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
              onPress={() => navigate('analyze')}
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
            <AnalysisOption symbol="Aa" title="Mensagem" description="Cole um texto recebido" onPress={() => navigate('analyze')} />
          </Entrance>
          <Entrance delay={280}>
            <AnalysisOption symbol="↗" title="Link" description="Verifique um endereço" onPress={() => navigate('analyze')} />
          </Entrance>
          <Entrance delay={340}>
            <AnalysisOption symbol="▣" title="Print" description="Envie uma captura de tela" onPress={() => navigate('analyze')} />
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

// Campo controlado de até 1.500 caracteres; o botão só é liberado quando há conteúdo.
function AnalyzeScreen({
  navigate,
  message,
  onChangeMessage,
  onAnalyze,
  error,
}: {
  navigate: Navigate;
  message: string;
  onChangeMessage: (message: string) => void;
  onAnalyze: () => Promise<void>;
  error?: string;
}) {
  const [messageFocused, setMessageFocused] = useState(false);
  const canAnalyze = Boolean(message.trim());

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.analyzeContent}>
        <Entrance delay={20}>
          <BackHeader title="Analisar mensagem" onBack={() => navigate('home')} />
          <Text style={styles.analyzeSubtitle}>Cole abaixo a mensagem que você recebeu.</Text>
        </Entrance>
        <Entrance delay={90}>
          <Text style={[styles.fieldTitle, messageFocused && styles.fieldTitleFocused]}>Mensagem recebida</Text>
        </Entrance>

        <Entrance delay={140}>
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

        <Entrance delay={220}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyTitleRow}>
              <Ionicons name="lock-closed-outline" size={15} color={palette.green} />
              <Text style={styles.privacyCardTitle}>Privacidade</Text>
            </View>
            <Text style={styles.privacyCardText}>
              Evite enviar CPF, senha, número de cartão ou outros dados pessoais.
            </Text>
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
            <Text style={styles.primaryGreenButtonText}>Analisar risco</Text>
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
function ProcessingScreen() {
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

  const checks = [
    { icon: '✓', label: 'Preparação do texto', status: 'Concluído', color: palette.greenSuccess },
    { icon: '✓', label: 'Tokenização em português', status: 'Concluído', color: palette.greenSuccess },
    { icon: '•', label: 'Padrões linguísticos', status: 'Analisando…', color: palette.green },
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
  message,
  result,
  userId,
}: {
  navigate: Navigate;
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
      await saveAnalysis(userId, {
        title: cleanMessage ? cleanMessage.slice(0, 44) : 'Mensagem analisada',
        message: message.trim(),
        risk: result.riskScore,
        level: presentation.title,
        tone: presentation.tone,
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

        <Entrance delay={180}>
          <Text style={styles.resultSectionTitle}>Sinais observados na mensagem</Text>
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

// Assina as atualizações do Firestore e representa carregamento, erro, vazio e lista preenchida.
function HistoryScreen({ navigate, userId }: { navigate: Navigate; userId?: string }) {
  const [historyEntries, setHistoryEntries] = useState<StoredAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string>();

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

  return (
    <AppScreen activeTab="history" navigate={navigate}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.historyContent}>
        <Entrance delay={30}>
          <Text style={styles.pageTitle}>Histórico</Text>
          <Text style={styles.pageSubtitle}>Suas análises recentes ficam organizadas aqui.</Text>
        </Entrance>

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
        ) : (
          <View style={styles.historyList}>
            {historyEntries.map((entry, index) => (
              <Entrance key={entry.id} delay={110 + index * 70}>
                <HistoryCard
                  date={formatHistoryDate(entry.createdAt)}
                  title={entry.title}
                  level={entry.level}
                  risk={`Risco ${entry.risk}%`}
                  tone={entry.tone}
                />
              </Entrance>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function HistoryCard({
  date,
  title,
  level,
  risk,
  tone,
}: {
  date: string;
  title: string;
  level: string;
  risk: string;
  tone: 'high' | 'medium' | 'low';
}) {
  const toneStyle =
    tone === 'high'
      ? { backgroundColor: palette.redSoft, color: palette.red }
      : tone === 'medium'
        ? { backgroundColor: palette.amberSoft, color: palette.amber }
        : { backgroundColor: '#E5F7ED', color: palette.greenSuccess };

  return (
    <View style={styles.historyCard}>
      <Text style={styles.historyDate}>{date}</Text>
      <Text numberOfLines={1} style={styles.historyTitle}>{title}</Text>
      <Text style={[styles.historyRisk, { color: toneStyle.color }]}>{risk}</Text>
      <View style={[styles.riskBadge, { backgroundColor: toneStyle.backgroundColor }]}>
        <Text style={[styles.riskBadgeText, { color: toneStyle.color }]}>{level}</Text>
      </View>
    </View>
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

// Estilos do protótipo mobile: espaçamentos, tipografia, cartões, estados e sombras por plataforma.
const styles = StyleSheet.create({
  screenTransition: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDE3EC',
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
    backgroundColor: '#FBFCFF',
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
    backgroundColor: '#FFF9F9',
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
    borderColor: '#F2CCCC',
    backgroundColor: '#FFF5F5',
  },
  authFeedbackText: {
    flex: 1,
    color: palette.red,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  privacyBadge: {
    height: 33,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#EBF8F0',
  },
  privacyDot: {
    width: 8,
    height: 8,
  },
  privacyBadgeText: {
    color: '#0E9261',
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
    borderTopColor: '#E9EDF3',
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
    color: '#E5F7F2',
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
    borderColor: '#F7E7B8',
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
  privacyCard: {
    height: 78,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 6,
    borderRadius: 18,
    backgroundColor: palette.greenSoft,
    borderWidth: 1,
    borderColor: '#D4ECE5',
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
    borderColor: '#CDE9E1',
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
    borderColor: '#F4D6D6',
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
    borderColor: '#D4ECE5',
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
    borderColor: '#F2CCCC',
    backgroundColor: '#FFF5F5',
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
  historyList: {
    marginTop: 42,
    gap: 20,
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
  historyCard: {
    position: 'relative',
    height: 96,
    paddingHorizontal: 17,
    paddingTop: 12,
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
  historyDate: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 13,
  },
  historyTitle: {
    marginTop: 8,
    color: palette.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  },
  historyRisk: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  riskBadge: {
    position: 'absolute',
    top: 16,
    right: 19,
    width: 70,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  riskBadgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
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
  pressed: {
    opacity: 0.72,
  },
});
