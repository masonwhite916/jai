import React, { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, type User } from '@/context/AppContext';
import { DriverProvider } from '@/context/DriverContext';
import { LanguageProvider, type Lang } from '@/context/LanguageContext';
import { LocationProvider } from '@/context/LocationContext';
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

interface PreloadedSession {
  user: User | null;
  hasSeenOnboarding: boolean;
  role: 'customer' | 'technician' | null;
  token?: string | null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="role" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="driver-auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(driver)" />
      <Stack.Screen
        name="job/[id]"
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
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
  const [preloadedSession, setPreloadedSession] = useState<PreloadedSession | null>(null);
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

  // Pre-read lang AND session from AsyncStorage in one pass so AppProvider can
  // initialise synchronously, preventing any flash of the loading/onboarding
  // screen on cold starts caused by iOS low-memory process kills.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('jai_lang'),
      AsyncStorage.getItem('jai_user'),
      AsyncStorage.getItem('jai_onboarding'),
      AsyncStorage.getItem('jai_role'),
      AsyncStorage.getItem('jai_token'),
    ]).then(([storedLang, storedUser, storedOnboarding, storedRole, storedToken]) => {
      const lang: Lang = storedLang === 'ar' ? 'ar' : 'en';
      I18nManager.forceRTL(lang === 'ar');
      setInitialLang(lang);

      let parsedUser: User | null = null;
      if (storedUser) {
        try { parsedUser = JSON.parse(storedUser); } catch { /* ignore */ }
      }
      const role = storedRole === 'customer' || storedRole === 'technician' ? storedRole : null;
      setPreloadedSession({
        user: parsedUser,
        hasSeenOnboarding: storedOnboarding === 'true',
        role,
        token: storedToken ?? null,
      });

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
                <AppProvider initialSession={preloadedSession}>
                  <DriverProvider>
                    <LocationProvider>
                      <RootLayoutNav />
                    </LocationProvider>
                  </DriverProvider>
                </AppProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
