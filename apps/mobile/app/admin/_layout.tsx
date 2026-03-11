import { Stack } from 'expo-router';
import { Colors } from '@/lib/constants';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="requests" options={{ title: 'Review Requests' }} />
    </Stack>
  );
}
