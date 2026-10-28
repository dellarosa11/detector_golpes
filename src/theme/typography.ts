/**
 * Design System — Tipografia
 *
 * Tokens de tamanho, peso e altura de linha para garantir hierarquia visual
 * consistente em todo o aplicativo.
 *
 * Uso:
 *   import { FontSize, FontWeight, LineHeight } from '@/src/theme/typography';
 *   style={{ fontSize: FontSize.md, fontWeight: FontWeight.semibold }}
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Família de fontes por plataforma
// ---------------------------------------------------------------------------
export const FontFamily = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Courier New',
  },
  android: {
    sans: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
})!;

// ---------------------------------------------------------------------------
// Escala de tamanhos (rem equivalente em px — base 16)
// ---------------------------------------------------------------------------
export const FontSize = {
  /** 11px — labels minúsculos, badges */
  xs: 11,
  /** 12px — auxiliar, legendas */
  sm: 12,
  /** 13px — corpo secundário */
  smPlus: 13,
  /** 14px — corpo padrão, labels de campo */
  md: 14,
  /** 15px — corpo destacado */
  mdPlus: 15,
  /** 16px — botões primários, subtítulos */
  lg: 16,
  /** 17px — subtítulo de seção */
  lgPlus: 17,
  /** 18px — título de card */
  xl: 18,
  /** 20px — título de tela secundária */
  xxl: 20,
  /** 22px — título de tela principal */
  xxxl: 22,
  /** 26px — hero / destaque */
  display: 26,
  /** 32px — display grande */
  displayLg: 32,
} as const;

// ---------------------------------------------------------------------------
// Pesos tipográficos
// ---------------------------------------------------------------------------
export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ---------------------------------------------------------------------------
// Alturas de linha (multiplicadores de FontSize)
// ---------------------------------------------------------------------------
export const LineHeight = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.6,
} as const;

// ---------------------------------------------------------------------------
// Letra-espaçamento (letter-spacing)
// ---------------------------------------------------------------------------
export const LetterSpacing = {
  tighter: -0.5,
  tight: -0.3,
  normal: 0,
  wide: 0.3,
  wider: 0.6,
  widest: 1.2,
} as const;
