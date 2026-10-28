import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '@/components/detector-app.styles';
import { Entrance } from '@/src/components/Entrance';

export type BrandHeaderProps = {
  title: string;
  description: string;
};

/**
 * Reúne identidade visual, título e resumo no topo das telas de autenticação.
 */
export function BrandHeader({ title, description }: BrandHeaderProps) {
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
