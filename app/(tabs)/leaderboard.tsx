import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LEADERS = [
  { id: '1', name: 'Alex Johnson', score: 89, rank: 1, color: '#fff' },
  { id: '2', name: 'Sarah Miller', score: 86, rank: 2, color: '#fff' },
  { id: '3', name: 'You', score: 84, rank: 3, color: '#2563EB', isMe: true }, // Blue Highlight
  { id: '4', name: 'David Chen', score: 82, rank: 4, color: '#fff' },
  { id: '5', name: 'Emma Wilson', score: 79, rank: 5, color: '#fff' },
];

export default function Leaderboard() {
  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, item.isMe && styles.myCard]}>
      <Text style={[styles.rank, item.isMe && styles.textWhite]}>#{item.rank}</Text>
      <View style={styles.avatar} /> 
      <Text style={[styles.name, item.isMe && styles.textWhite]}>{item.name}</Text>
      <Text style={[styles.score, item.isMe && styles.textWhite]}>{item.score}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Global Leaderboard</Text>
      <Text style={styles.subHeader}>Top performers this week</Text>

      <FlatList 
        data={LEADERS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
      />
      
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Keep Practicing!</Text>
        <Text style={styles.footerText}>You're in the top 5% of candidates this week.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginTop: 20 },
  subHeader: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  myCard: { backgroundColor: '#2563EB' }, // Blue background for "You"
  
  rank: { fontSize: 16, fontWeight: 'bold', color: '#94A3B8', width: 40 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 15 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
  score: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  textWhite: { color: '#fff' },

  footer: { backgroundColor: '#EFF6FF', margin: 20, padding: 24, borderRadius: 20, alignItems: 'center' },
  footerTitle: { color: '#1E40AF', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  footerText: { color: '#3B82F6', textAlign: 'center' }
});
