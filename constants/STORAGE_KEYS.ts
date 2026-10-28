/**
 * Chaves do AsyncStorage usadas pelo aplicativo.
 * Centralizar aqui evita strings duplicadas e facilita a busca em caso de
 * migração ou limpeza de cache.
 *
 * Convenção: UPPER_SNAKE_CASE para constantes de módulo.
 */

/** Preferência de tema escolhida pelo usuário: 'system' | 'light' | 'dark' */
export const THEME_STORAGE_KEY = '@detector-golpes/theme';

/**
 * Chave de cache das análises por usuário.
 * É uma função porque depende do UID, que só é conhecido em tempo de execução.
 */
export const analysesCacheKey = (userId: string): string =>
  `@detector-golpes/analyses/v1/${userId}`;
