import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import '../../global.css';

function RootLayoutNav() {
  const { session, userType, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!session) {
      if (inAuthGroup) {
         router.replace('/');
      }
    } else if (session) {
      if (userType === 'rider' && segments[1] !== 'rider') {
        router.replace('/(auth)/rider');
      } else if (userType === 'b2c' && segments[1] !== 'b2c') {
        router.replace('/(auth)/b2c');
      }
    }
  }, [session, userType, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="verify" options={{ title: 'Verify OTP' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
