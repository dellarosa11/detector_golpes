// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Usa as regras recomendadas pelo Expo e reforça react-hooks explicitamente.
// O plugin react-hooks já é registrado pelo eslint-config-expo/flat, portanto
// não precisamos declarar `plugins` de novo — apenas sobrescrevemos as rules.
module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Impede chamar hooks fora de componentes ou outros hooks.
      'react-hooks/rules-of-hooks': 'error',
      // Avisa quando dependências de useEffect/useCallback/useMemo estão incompletas.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);

