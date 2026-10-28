import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';

export type BackHeaderProps = {
  title: string;
  onBack: () => void;
};

/**
 * Cabeçalho compacto para retornar à tela anterior e identificar a etapa atual.
 */
export function BackHeader({ title, onBack }: BackHeaderProps) {
  return (
    <View style={styles.backHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} hitSlop={10} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </Pressable>
      <Text style={styles.backHeaderTitle}>{title}</Text>
    </View>
  );
}
