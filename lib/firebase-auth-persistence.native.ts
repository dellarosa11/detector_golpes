import AsyncStorage from '@react-native-async-storage/async-storage';
// O Firebase disponibiliza esta função pela entrada React Native durante o empacotamento.
// @ts-expect-error A resolução padrão do TypeScript encontra as declarações do navegador.
import { getReactNativePersistence } from 'firebase/auth';

// Implementação mobile: liga o Firebase Auth ao armazenamento persistente do aparelho.
export function getFirebaseAuthPersistence() {
  return getReactNativePersistence(AsyncStorage);
}
