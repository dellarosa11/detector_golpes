/**
 * Tipos de navegação interna do aplicativo.
 *
 * Centraliza a union de nomes de telas e o tipo da função `navigate`,
 * evitando que strings de tela fiquem duplicadas em vários componentes.
 *
 * Uso:
 *   import type { ScreenName, Navigate } from '@/src/types/navigation';
 */

/** Nomes de todas as telas da navegação interna (estado em memória). */
export type ScreenName =
  | 'login'
  | 'signup'
  | 'home'
  | 'analyze'
  | 'processing'
  | 'result'
  | 'history'
  | 'learn'
  | 'account';

/** Função de navegação tipada passada como prop para cada tela. */
export type Navigate = (screen: ScreenName) => void;
