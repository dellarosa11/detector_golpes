import { useColorScheme } from 'react-native';

import { aplicarTema, temaEscuroAtivo } from '@/src/estilos/aplicativo';

export function useTema() {
  const temaEscuro = useColorScheme() === 'dark';

  if (temaEscuro !== temaEscuroAtivo) aplicarTema(temaEscuro);
}
