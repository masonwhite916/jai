import React, { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DriverProvider } from '@/context/DriverContext';
import { LanguageProvider, type Lang } from '@/context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="job/[id]"
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [initialLang, setInitialLang] = useState<Lang>('en');
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    AsyncStorage.getItem('jai_driver_lang').then((storedLang) => {
      const lang: Lang = storedLang === 'ar' ? 'ar' : 'en';
      I18nManager.forceRTL(lang === 'ar');
      setInitialLang(lang);
      setBootstrapReady(true);
    });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && bootstrapReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, bootstrapReady]);

  if ((!fontsLoaded && !fontError) || !bootstrapReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <LanguageProvider initialLang={initialLang}>
                <DriverProvider>
                  <RootLayoutNav />
                </DriverProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
