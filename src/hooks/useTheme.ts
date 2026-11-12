import { useColorScheme } from 'react-native';

import { applyAppTheme, isDarkTheme } from '@/components/detector-app.styles';

export function useTheme() {
  const darkTheme = useColorScheme() === 'dark';

  if (darkTheme !== isDarkTheme) applyAppTheme(darkTheme);
}
