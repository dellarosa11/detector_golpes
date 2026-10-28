/**
 * Design System — Paletas de cores
 *
 * Fonte da verdade para todas as cores do aplicativo.
 * Importado pelos estilos de cada tela/componente em vez de duplicar valores.
 *
 * Uso:
 *   import { palette, lightPalette, darkPalette } from '@/src/theme/palette';
 *   // `palette` é mutável e reflete o tema ativo (claro/escuro).
 */

export type AppPalette = {
  // Fundos
  background: string;
  authBackground: string;
  surface: string;
  surfaceRaised: string;
  stage: string;
  input: string;

  // Texto
  text: string;
  authText: string;
  muted: string;
  authMuted: string;
  heroMuted: string;

  // Bordas e divisores
  border: string;
  authBorder: string;
  divider: string;

  // Sombra
  shadow: string;

  // Feedback — perigo
  dangerSurface: string;
  dangerBorder: string;

  // Feedback — sucesso
  successSurface: string;
  successBorder: string;

  // Feedback — aviso
  warningBorder: string;

  // Paleta de primitivos
  green: string;
  greenSoft: string;
  greenLight: string;
  greenSuccess: string;
  blue: string;
  blueSoft: string;
  red: string;
  redSoft: string;
  redTrack: string;
  amber: string;
  amberSoft: string;
};

// ---------------------------------------------------------------------------
// Tema claro
// ---------------------------------------------------------------------------
export const lightPalette: AppPalette = {
  background: '#F6F8FB',
  authBackground: '#F6F8FC',
  text: '#0E131C',
  authText: '#1A1F29',
  muted: '#5C6678',
  authMuted: '#5F6E89',
  border: '#DBE0E8',
  authBorder: '#E0E7F2',
  surface: '#FFFFFF',
  surfaceRaised: '#FBFCFD',
  stage: '#DDE3EC',
  input: '#FBFCFF',
  dangerSurface: '#FFF8F8',
  dangerBorder: '#F2CCCC',
  successSurface: '#F0FAF4',
  successBorder: '#CDE9D9',
  warningBorder: '#F7E7B8',
  divider: '#E9EDF3',
  shadow: '#0F1729',
  heroMuted: '#E5F7F2',
  green: '#13473D',
  greenSoft: '#E5F5F0',
  greenLight: '#BDEBDE',
  greenSuccess: '#147347',
  blue: '#2549E6',
  blueSoft: '#E7EDFF',
  red: '#B82129',
  redSoft: '#FCE8E8',
  redTrack: '#EDC2C2',
  amber: '#B86E0F',
  amberSoft: '#FFF5DB',
};

// ---------------------------------------------------------------------------
// Tema escuro
// ---------------------------------------------------------------------------
export const darkPalette: AppPalette = {
  background: '#0B1211',
  authBackground: '#0B1118',
  text: '#F2F7F5',
  authText: '#F4F7FB',
  muted: '#9AA8A4',
  authMuted: '#9EABBC',
  border: '#2A3935',
  authBorder: '#2A3747',
  surface: '#141E1C',
  surfaceRaised: '#192421',
  stage: '#070B0B',
  input: '#111A18',
  dangerSurface: '#321D20',
  dangerBorder: '#66363B',
  successSurface: '#153128',
  successBorder: '#285848',
  warningBorder: '#66512A',
  divider: '#26332F',
  shadow: '#000000',
  heroMuted: '#C9EAE2',
  green: '#2E8B76',
  greenSoft: '#17372F',
  greenLight: '#70C7B2',
  greenSuccess: '#5DD29A',
  blue: '#6F8CFF',
  blueSoft: '#1C294D',
  red: '#FF7A82',
  redSoft: '#3B2024',
  redTrack: '#71383E',
  amber: '#F0B45C',
  amberSoft: '#3B2D18',
};

// ---------------------------------------------------------------------------
// Referência mutável ao tema ativo — atualizada por applyPalette()
// ---------------------------------------------------------------------------

/**
 * Paleta atualmente ativa. Inicializa com o tema claro.
 * Use `applyPalette(dark)` para trocar; os estilos que leram `palette`
 * diretamente precisarão ser recriados após a troca.
 */
export let palette: AppPalette = lightPalette;

/** Troca a paleta ativa e retorna a nova. */
export function applyPalette(dark: boolean): AppPalette {
  palette = dark ? darkPalette : lightPalette;
  return palette;
}
