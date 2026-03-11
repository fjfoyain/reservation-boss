import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: Colors.navy, borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: Colors.teal,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color }) => <MaterialIcons name="meeting-room" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <MaterialIcons name="event" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <MaterialIcons name="pending-actions" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
