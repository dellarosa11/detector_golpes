import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import { MotionPressable } from '@/src/components/MotionPressable';
import { PhoneFrame } from '@/src/components/PhoneFrame';
import type { Navigate } from '@/src/types/navigation';

export type TabKey = 'home' | 'history' | 'learn' | 'account';

export type AppScreenProps = {
  children: React.ReactNode;
  activeTab?: TabKey;
  navigate?: Navigate;
};

/**
 * Renderiza a navegação inferior interna e destaca a seção atualmente selecionada.
 */
export function BottomNavigation({
  active,
  navigate,
}: {
  active: TabKey;
  navigate: Navigate;
}) {
  const items: {
    key: TabKey;
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

/**
 * Estrutura comum das telas autenticadas, com área segura e navegação inferior personalizada.
 */
export function AppScreen({
  children,
  activeTab,
  navigate,
}: AppScreenProps) {
  return (
    <PhoneFrame>
      <View style={styles.appScreen}>{children}</View>
      {activeTab && navigate ? <BottomNavigation active={activeTab} navigate={navigate} /> : null}
    </PhoneFrame>
  );
}
