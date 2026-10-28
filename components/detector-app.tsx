import React, { useState } from 'react';
import { View } from 'react-native';

import { useAnalysis } from '@/src/hooks/useAnalysis';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import {
  AccountScreen,
  AnalyzeScreen,
  HistoryScreen,
  HomeScreen,
  LearnScreen,
  LoginScreen,
  ProcessingScreen,
  ResultScreen,
  SignupScreen,
} from '@/src/screens';
import type { ScreenName } from '@/src/types/navigation';
import { styles } from './detector-app.styles';

/**
 * Aplicativo visual principal.
 * Atua como orquestrador central de navegação em memória e provedor de estado compartilhado.
 * Toda a lógica de negócio fica nos hooks e as telas individuais em `src/screens/`.
 */
export default function DetectorApp() {
  const [screen, setScreen] = useState<ScreenName>('login');

  const { themePreference, changeTheme } = useTheme();
  const { user } = useAuth({ setScreen });
  const {
    analysisMessage,
    analysisType,
    analysisImage,
    analysisResult,
    analysisError,
    startAnalysis,
    openAnalyzer,
    changeAnalysisType,
    changeAnalysisMessage,
    chooseAnalysisImage,
    removeAnalysisImage,
  } = useAnalysis({ user, setScreen });

  let content: React.ReactNode;

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
          onChangeMessage={changeAnalysisMessage}
          onChooseImage={chooseAnalysisImage}
          onRemoveImage={removeAnalysisImage}
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
          onChangeMessage={changeAnalysisMessage}
          onChooseImage={chooseAnalysisImage}
          onRemoveImage={removeAnalysisImage}
          onAnalyze={startAnalysis}
          error={analysisError}
        />
      );
      break;
    case 'history':
      content = <HistoryScreen key={user?.uid ?? 'signed-out'} navigate={setScreen} userId={user?.uid} />;
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
    <View style={styles.screenTransition}>
      {content}
    </View>
  );
}
