import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, I18nManager, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, type User, useApp } from '@/context/AppContext';
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
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import { usePushNotifications } from '@/lib/usePushNotifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

interface PreloadedSession {
  user: User | null;
  hasSeenOnboarding: boolean;
  role: 'customer' | 'technician' | null;
  token?: string | null;
}

// ── In-app notification banner (foreground) ───────────────────────────────────
interface BannerData {
  id:    string;
  title: string;
  body:  string;
}

function NotificationBanner({ banner, onDismiss }: { banner: BannerData; onDismiss: () => void }) {
  const insets   = useSafeAreaInsets();
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 4500);

    return () => clearTimeout(timer);
  }, [banner.id]);

  const top = insets.top + 8 + (Platform.OS === 'web' ? 67 : 0);

  return (
    <Animated.View style={[styles.bannerWrap, { top, opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.banner} activeOpacity={0.9} onPress={onDismiss}>
        <View style={styles.bannerIcon}>
          <Text style={styles.bannerIconText}>🔔</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text>
          <Text style={styles.bannerBody}  numberOfLines={2}>{banner.body}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Push notification setup (must be inside AppProvider) ──────────────────────
function PushNotificationSetup({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  const [banner, setBanner] = useState<BannerData | null>(null);

  const onForegroundNotification = useCallback((notification: Notifications.Notification) => {
    const content = notification.request.content;
    setBanner({
      id:    notification.request.identifier,
      title: content.title ?? 'JAI',
      body:  content.body  ?? '',
    });
  }, []);

  usePushNotifications({ isAuthenticated, onForegroundNotification });

  return (
    <>
      {children}
      {banner && (
        <NotificationBanner
          banner={banner}
          onDismiss={() => setBanner(null)}
        />
      )}
    </>
  );
}

// ── Navigation stack ──────────────────────────────────────────────────────────
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

// ── Root layout ───────────────────────────────────────────────────────────────
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
    // Check for OTA updates silently on launch (production only)
    if (!__DEV__ && Updates.isEnabled) {
      Updates.checkForUpdateAsync()
        .then(({ isAvailable }) => {
          if (isAvailable) return Updates.fetchUpdateAsync().then(() => Updates.reloadAsync());
        })
        .catch(() => { /* ignore update errors — app still works */ });
    }

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
                      <PushNotificationSetup>
                        <RootLayoutNav />
                      </PushNotificationSetup>
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

const styles = StyleSheet.create({
  bannerWrap: {
    position:  'absolute',
    left:      12,
    right:     12,
    zIndex:    9999,
    elevation: 9999,
  },
  banner: {
    backgroundColor:  '#1C1040',
    borderRadius:     16,
    padding:          14,
    flexDirection:    'row',
    alignItems:       'flex-start',
    gap:              12,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.3,
    shadowRadius:     12,
  },
  bannerIcon: {
    width:            40,
    height:           40,
    borderRadius:     12,
    backgroundColor:  'rgba(255,255,255,0.1)',
    justifyContent:   'center',
    alignItems:       'center',
  },
  bannerIconText:  { fontSize: 20 },
  bannerTitle:     { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  bannerBody:      { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
});
