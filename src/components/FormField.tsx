import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';

export type FormFieldProps = {
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

/**
 * Campo reutilizado no login e cadastro, incluindo foco, erro, senha e acessibilidade.
 */
export function FormField({
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
