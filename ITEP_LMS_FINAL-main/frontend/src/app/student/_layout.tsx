import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    </Stack>
  );
}
