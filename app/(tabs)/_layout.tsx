import { Tabs } from 'expo-router';
import React from 'react';

export default function LayoutAbas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // A barra padrão fica oculta porque DetectorApp possui uma navegação inferior própria.
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Detector de Golpes',
        }}
      />
    </Tabs>
  );
}
