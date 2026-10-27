// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Usa as regras recomendadas pelo Expo e ignora a saída compilada do aplicativo.
module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
