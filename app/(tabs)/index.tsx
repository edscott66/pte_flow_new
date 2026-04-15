import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { scoreService } from '../../services/scoreService';

// --- PRACTICE MODULES DATA ---
const PRACTICE_MODULES = [
  {
    id: 'speaking',
    title: 'Speaking',
    icon: 'mic-outline',
    color: '#2563EB',
    tasks: ['Read Aloud', 'Repeat Sentence', 'Describe Image', 'Summarize Group Discussion'],
  },
  {
    id: 'writing',
    title: 'Writing',
    icon: 'create-outline',
    color: '#F97316',
    tasks: ['Summarize Written Text', 'Essay'],
  },
  {
    id: 'reading',
    title: 'Reading',
    icon: 'book-outline',
    color: '#10B981',
    tasks: ['Fill in the Blanks', 'Re-order Paragraphs'],
  },
  {
    id: 'listening',
    title: 'Listening',
    icon: 'headset-outline',
    color: '#8B5CF6',
    tasks: ['Summarize Spoken Text', 'Write From Dictation'],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState("PTE Student");

  useEffect(() => {
    const loadUser = async () => {
      const name = await scoreService.getUserName();
      if (name) setUserName(name);
    };
    loadUser();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header with User Name */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
            <View style={styles.avatarPlaceholder} />
          </TouchableOpacity>
        </View>

        {/* Daily Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>Daily Goal</Text>
            <Text style={styles.progressSub}>3/5 modules completed</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '60%' }]} />
          </View>
        </View>

        {/* Mock Exam Section */}
        <TouchableOpacity 
          style={styles.mockExamCard} 
          onPress={() => router.push('/module/mock-exam')}
        >
          <View style={styles.mockExamIcon}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={32} color="#fff" />
          </View>
          <View style={styles.mockExamInfo}>
            <Text style={styles.mockExamTitle}>Full Mock Exam</Text>
            <Text style={styles.mockExamSub}>Timed practice with all 20+ task types</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Practice Modules Grid */}
        <Text style={styles.sectionTitle}>Practice Modules</Text>
        <View style={styles.grid}>
          {PRACTICE_MODULES.map((module) => (
            <TouchableOpacity 
              key={module.id} 
              style={styles.moduleCard}
              onPress={() => router.push(`/module/${module.id}`)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${module.color}15` }]}>
                <Ionicons name={module.icon as any} size={28} color={module.color} />
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleTasks}>{module.tasks.length} Task Types</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Read Aloud Practice</Text>
            <Text style={styles.activityTime}>2 hours ago • Score: 78/90</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  welcomeText: { fontSize: 14, color: '#64748B' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  profileButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },

  progressCard: { backgroundColor: '#2563EB', padding: 20, borderRadius: 20, marginBottom: 24 },
  progressInfo: { marginBottom: 12 },
  progressTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  progressSub: { color: '#BFDBFE', fontSize: 14, marginBottom: 12 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },

  mockExamCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#10B981', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  mockExamIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  mockExamInfo: { flex: 1 },
  mockExamTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mockExamSub: { color: '#D1FAE5', fontSize: 12 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: { 
    backgroundColor: '#fff', 
    width: '48%', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  moduleTasks: { fontSize: 12, color: '#64748B' },

  activityCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  activityIcon: { marginRight: 12 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  activityTime: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
