import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MODULES } from '../../constants/modules';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  const router = useRouter();

  // Function to render each module card
  const renderModule = ({ item }: { item: typeof MODULES[0] }) => (
    <TouchableOpacity 
      style={styles.moduleCard} 
      onPress={() => router.push(`/module/${item.id}`)}
    >
      {/* Icon Box with Light Blue Background */}
      <View style={styles.iconBox}>
        {/* This specifically uses MaterialCommunityIcons to match your modules.ts file */}
        <MaterialCommunityIcons name={item.icon} size={28} color="#2563EB" />
      </View>
      
      <View style={styles.moduleInfo}>
        <Text style={styles.moduleTitle}>{item.title}</Text>
        <Text style={styles.moduleSub}>{item.category}</Text>
      </View>
      
      {/* Chevron Arrow (using standard Ionicons) */}
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Candidate!</Text>
            <Text style={styles.subGreeting}>Ready to boost your score today?</Text>
          </View>
        </View>

        {/* Orange Daily Goal Card */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>DAILY GOAL</Text>
          <Text style={styles.goalTitle}>Complete 3 Speaking Tasks</Text>
          
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>
          <Text style={styles.goalStats}>2 of 3 tasks completed</Text>
        </View>

        {/* Modules List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Practice Modules</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Modules List Loop */}
        <View style={styles.modulesList}>
           {MODULES.map((item) => (
             <View key={item.id}>
               {renderModule({ item })}
             </View>
           ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20 },
  
  // Header Styles
  header: { marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  subGreeting: { fontSize: 16, color: '#64748B', marginTop: 4 },
  
  // Goal Card Styles
  goalCard: { 
    backgroundColor: '#F97316', 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 30, 
    shadowColor: '#F97316', 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 } 
  },
  goalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  goalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 12 },
  progressBarFill: { width: '66%', height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  goalStats: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Section Header Styles
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  seeAll: { color: '#2563EB', fontWeight: '600' },
  modulesList: { paddingBottom: 20 },

  // Module Card Styles
  moduleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    shadowOffset: { width: 0, height: 2 } 
  },
  
  // Icon Box Styles
  iconBox: { 
    width: 52, 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    backgroundColor: '#EFF6FF', // Light Blue Background
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  moduleSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
});