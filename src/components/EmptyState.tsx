import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/components/detector-app.styles';
import { MotionPressable } from '@/src/components/MotionPressable';

export type EmptyStateProps = {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Componente padrão para telas ou seções sem conteúdo (Histórico vazio, busca sem resultado, etc).
 * Inclui ícone centralizado, título, descrição e botão de ação opcional.
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        <Ionicons name={icon} size={28} color={palette.muted} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <MotionPressable
          accessibilityRole="button"
          onPress={onAction}
          style={emptyStyles.actionButton}>
          <Text style={emptyStyles.actionText}>{actionLabel}</Text>
        </MotionPressable>
      ) : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 260,
  },
  actionButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.greenSoft,
  },
  actionText: {
    color: palette.greenSuccess,
    fontSize: 12,
    fontWeight: '700',
  },
});
