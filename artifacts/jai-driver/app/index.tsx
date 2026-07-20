import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useDriver } from '@/context/DriverContext';
import { View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { driver, isLoading } = useDriver();

  useEffect(() => {
    if (isLoading) return;
    if (driver) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth');
    }
  }, [driver, isLoading, router]);

  return <View style={{ flex: 1, backgroundColor: '#0B0A0F' }} />;
}
