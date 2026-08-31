import { Stack } from 'expo-router';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mantém o grupo principal de telas como ponto de entrada do Expo Router.
export const unstable_settings = {
  anchor: '(tabs)',
};

// Layout global: fornece áreas seguras no celular e remove cabeçalhos nativos,
// porque toda a navegação e os títulos são desenhados pelo próprio aplicativo.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
