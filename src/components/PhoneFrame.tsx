import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isDarkTheme, styles } from '@/components/detector-app.styles';

export type PhoneFrameProps = {
  children: React.ReactNode;
  auth?: boolean;
};

/**
 * Mantém largura de telefone quando aberto em telas grandes (web/tablet)
 * e ocupa a tela inteira com safe area e orbs de ambientação no aparelho.
 */
export function PhoneFrame({ children, auth = false }: PhoneFrameProps) {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.stage}>
      <StatusBar
        style={isDarkTheme ? 'light' : 'dark'}
        hidden={isWeb}
      />
      <SafeAreaView
        edges={isWeb ? [] : ['top', 'right', 'bottom', 'left']}
        style={[styles.phoneFrame, auth && styles.authPhoneFrame]}>
        <View style={[styles.ambientOrb, auth ? styles.ambientOrbAuth : styles.ambientOrbApp]} />
        <View style={styles.ambientOrbBottom} />
        {children}
      </SafeAreaView>
    </View>
  );
}
