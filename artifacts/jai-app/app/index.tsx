import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useDriver } from '@/context/DriverContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { hasSeenOnboarding, isAuthenticated, isLoading, role } = useApp();
  const { driver, isLoading: driverLoading } = useDriver();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || driverLoading) return;

    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (!role) {
      router.replace('/role');
      return;
    }

    if (role === 'customer') {
      if (!isAuthenticated) {
        router.replace('/auth');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    // technician
    if (!driver) {
      router.replace('/driver-auth');
    } else {
      router.replace('/(driver)');
    }
  }, [isLoading, driverLoading, hasSeenOnboarding, role, isAuthenticated, driver]);

  return (
    <LinearGradient colors={['#2D1B69', '#5B2C91', '#C21875']} style={styles.container}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
