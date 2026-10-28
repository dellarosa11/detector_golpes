import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';

export type AuthFeedbackProps = {
  message?: string;
  tone?: 'error' | 'success';
};

/**
 * Apresenta erros ou confirmações de autenticação com anúncio acessível para leitores de tela.
 */
export function AuthFeedback({
  message,
  tone = 'error',
}: AuthFeedbackProps) {
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
