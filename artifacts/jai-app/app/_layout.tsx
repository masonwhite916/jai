import React, { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider } from '@/context/AppContext';
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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="request/[service]"
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
      <Stack.Screen name="tracking" />
    </Stack>
  );
}

export default function RootLayout() {
  const [initialLang, setInitialLang] = useState<Lang>('en');
  const [langReady, setLangReady] = useState(false);

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

  // Load stored language and set RTL before first render
  useEffect(() => {
    AsyncStorage.getItem('jai_lang').then((stored) => {
      const lang: Lang = stored === 'ar' ? 'ar' : 'en';
      I18nManager.forceRTL(lang === 'ar');
      setInitialLang(lang);
      setLangReady(true);
    });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && langReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, langReady]);

  if ((!fontsLoaded && !fontError) || !langReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <LanguageProvider initialLang={initialLang}>
                <AppProvider>
                  <RootLayoutNav />
                </AppProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
