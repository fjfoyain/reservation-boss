import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

export default function AdminLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: -4, padding: 4 }}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="requests" options={{ title: 'Review Requests' }} />
      <Stack.Screen name="users" options={{ title: 'User Management' }} />
    </Stack>
  );
}
