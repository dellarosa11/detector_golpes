import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { THEME_STORAGE_KEY } from '@/constants/STORAGE_KEYS';
import { applyAppTheme, isDarkTheme } from '@/components/detector-app.styles';
import type { ThemePreference } from '@/src/types/analysis';

export type UseThemeReturn = {
  /** Preferência explícita do usuário: 'system' | 'light' | 'dark'. */
  themePreference: ThemePreference;
  /** Tema efetivo resolvido (preferência + sistema operacional). */
  darkTheme: boolean;
  /** Persiste a preferência no AsyncStorage e aplica imediatamente. */
  changeTheme: (next: ThemePreference) => void;
};

/**
 * Gerencia a preferência de tema do usuário.
 *
 * - Restaura a preferência salva no AsyncStorage na primeira montagem.
 * - Deriva `darkTheme` combinando preferência explícita com o tema do SO.
 * - Chama `applyAppTheme` durante o render (antes da pintura) para evitar
 *   o flash de cor errada que ocorreria se a chamada fosse feita em useEffect.
 *
 * Uso:
 *   const { themePreference, darkTheme, changeTheme } = useTheme();
 */
export function useTheme(): UseThemeReturn {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const systemColorScheme = useColorScheme();

  const darkTheme =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemColorScheme === 'dark');

  // Recria a folha de estilos somente quando o tema resolvido realmente muda.
  // Chamada durante o render (não em useEffect) é intencional: garante que o
  // primeiro frame já use o tema correto, evitando flash visual.
  if (darkTheme !== isDarkTheme) applyAppTheme(darkTheme);

  useEffect(() => {
    // Restaura a escolha feita no Perfil. Na primeira abertura, segue o tema do aparelho.
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
          setThemePreference(storedTheme);
        }
      })
      .catch(() => undefined);
  }, []);

  const changeTheme = useCallback((next: ThemePreference) => {
    setThemePreference(next);
    // A interface muda imediatamente; a gravação mantém a escolha nas próximas aberturas.
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  return { themePreference, darkTheme, changeTheme };
}
