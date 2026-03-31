import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>My Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar} />
          <Text style={styles.name}>PTE Student</Text>
          <Text style={styles.target}>Target Score: 79</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statLabel}>EXERCISES</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumGreen}>74</Text>
            <Text style={styles.statLabel}>AVG SCORE</Text>
          </View>
        </View>

        {/* Progress Bars */}
        <Text style={styles.sectionTitle}>Learning Progress</Text>
        
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.skillName}>Vocabulary Expansion</Text>
            <Text style={styles.skillVal}>82%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: '82%', backgroundColor: '#2563EB' }]} />
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.skillName}>Grammar Accuracy</Text>
            <Text style={styles.skillVal}>64%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: '64%', backgroundColor: '#F97316' }]} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', marginBottom: 16 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  target: { color: '#64748B', marginTop: 4 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', shadowOpacity: 0.05, shadowRadius: 5 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#2563EB', marginBottom: 4 },
  statNumGreen: { fontSize: 24, fontWeight: 'bold', color: '#10B981', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  progressCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  skillName: { fontWeight: '600', color: '#1E293B' },
  skillVal: { fontWeight: 'bold', color: '#2563EB' },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },
  barFill: { height: '100%', borderRadius: 4 }
});