import DetectorApp from '@/components/detector-app';

// Rota inicial do Expo Router. A experiência completa fica centralizada no
// DetectorApp para preservar as transições animadas entre as telas do protótipo.
export default function HomeScreen() {
  return <DetectorApp />;
}
