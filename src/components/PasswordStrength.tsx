import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '@/components/detector-app.styles';
import { getPasswordStrength } from '@/src/utils/validators';

export type PasswordStrengthProps = {
  password: string;
};

/**
 * Exibe visualmente a avaliação local da senha durante o cadastro.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
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
