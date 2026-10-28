/**
 * Design System — Sombras
 *
 * Tokens de elevação que funcionam tanto no iOS (shadow*) quanto no Android
 * (elevation) e na web (boxShadow via Platform.select).
 *
 * Uso:
 *   import { Shadows } from '@/src/theme/shadows';
 *   style={[styles.card, Shadows.md]}
 */

import { Platform, ViewStyle } from 'react-native';

type ShadowToken = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function shadow(
  color: string,
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number
): ShadowToken {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

/**
 * Shadows.sm  — elevação leve (botões, inputs com foco)
 * Shadows.md  — elevação média (cards)
 * Shadows.lg  — elevação alta (modais, phone frame)
 */
export const Shadows = {
  sm: shadow('#0F1729', 2, 4, 0.06, 2),
  md: shadow('#0F1729', 4, 12, 0.1, 6),
  lg: shadow('#0F1729', 12, 30, 0.15, 16),
} satisfies Record<string, ShadowToken>;

/**
 * Versão web usando boxShadow (Platform.select não funciona em objetos de estilo
 * passados para StyleSheet.create em runtime web).
 */
export const WebShadow = Platform.select({
  web: {
    sm: { boxShadow: '0px 2px 6px rgba(15, 23, 41, 0.07)' },
    md: { boxShadow: '0px 4px 16px rgba(15, 23, 41, 0.10)' },
    lg: { boxShadow: '0px 24px 70px rgba(25, 39, 66, 0.18)' },
  },
  default: {
    sm: {},
    md: {},
    lg: {},
  },
})!;
