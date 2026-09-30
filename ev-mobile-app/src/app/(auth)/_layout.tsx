import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="b2c" />
      <Stack.Screen name="rider" />
    </Stack>
  );
}
