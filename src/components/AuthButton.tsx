import React from 'react';
import { Text } from 'react-native';

import { styles } from '@/components/detector-app.styles';
import { MotionPressable } from '@/src/components/MotionPressable';

export type AuthButtonProps = {
  label: string;
  secondary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Padroniza os botões de autenticação, incluindo estado secundário e indisponível.
 */
export function AuthButton({
  label,
  secondary = false,
  disabled = false,
  onPress,
}: AuthButtonProps) {
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
