/**
 * Design System — ponto de entrada único
 *
 * Importar deste arquivo garante que qualquer componente ou tela acesse todos
 * os tokens do design system sem precisar conhecer a estrutura interna de pastas.
 *
 * Uso:
 *   import { palette, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '@/src/theme';
 */

export {
  // Paleta de cores (mutável, reflete tema claro/escuro ativo)
  palette,
  lightPalette,
  darkPalette,
  applyPalette,
} from './palette';
export type { AppPalette } from './palette';

export {
  FontFamily,
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
} from './typography';

export { Spacing, BorderRadius, TouchTarget } from './spacing';

export { Shadows, WebShadow } from './shadows';
