/**
 * Design System — Espaçamento
 *
 * Escala baseada em múltiplos de 4px, alinhada com as práticas do Material Design
 * e do iOS HIG. Usar apenas estes valores evita espaçamentos ad-hoc no código.
 *
 * Uso:
 *   import { Spacing } from '@/src/theme/spacing';
 *   style={{ padding: Spacing.md, marginBottom: Spacing.lg }}
 */

export const Spacing = {
  /** 2px */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  smPlus: 12,
  /** 16px */
  md: 16,
  /** 20px */
  mdPlus: 20,
  /** 24px */
  lg: 24,
  /** 32px */
  xl: 32,
  /** 40px */
  xxl: 40,
  /** 48px */
  xxxl: 48,
  /** 64px */
  huge: 64,
} as const;

// ---------------------------------------------------------------------------
// Raios de borda
// ---------------------------------------------------------------------------
export const BorderRadius = {
  /** 4px — inputs, chips pequenos */
  sm: 4,
  /** 8px — cards secundários */
  md: 8,
  /** 12px — cards principais */
  lg: 12,
  /** 16px — modais, botões grandes */
  xl: 16,
  /** 20px — frames e containers */
  xxl: 20,
  /** 28px — phone frame web */
  phoneFrame: 28,
  /** 999px — pill / fully rounded */
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Tamanho mínimo de alvo de toque (WCAG 2.5.5 — pelo menos 44×44px)
// ---------------------------------------------------------------------------
export const TouchTarget = {
  min: 44,
} as const;
