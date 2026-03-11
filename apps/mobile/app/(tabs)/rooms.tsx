import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '@/lib/constants';

export default function RoomsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚪</Text>
      <Text style={styles.title}>Rooms</Text>
      <Text style={styles.sub}>Room reservations coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.xs },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
